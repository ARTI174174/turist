import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { resolveLevel, levelBorderColor } from '../progression/progression.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  /**
   * Поиск игрока — только по ПОЛНОМУ совпадению ника (регистронезависимо).
   * Список всех зарегистрированных пользователей никогда не отдаётся —
   * это осознанное решение по безопасности/приватности (см. требование заказчика).
   */
  async searchByExactNickname(currentUserId: string, nickname: string) {
    const user = await this.prisma.user.findUnique({
      where: { nicknameLower: nickname.toLowerCase() },
      include: { character: true, progress: true },
    });

    if (!user || user.id === currentUserId || user.status !== 'active') {
      return null;
    }

    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: user.id },
          { requesterId: user.id, addresseeId: currentUserId },
        ],
      },
    });

    const xp = user.progress?.xp ?? 0;
    return {
      id: user.id,
      nickname: user.nickname,
      avatarEmoji: user.character?.avatarEmoji ?? '🙂',
      level: resolveLevel(xp).level,
      friendshipStatus: existingFriendship?.status ?? null,
    };
  }

  async sendFriendRequest(requesterId: string, nickname: string) {
    const addressee = await this.prisma.user.findUnique({
      where: { nicknameLower: nickname.toLowerCase() },
    });

    if (!addressee || addressee.status !== 'active') {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Игрок с таким ником не найден' });
    }
    if (addressee.id === requesterId) {
      throw new BadRequestException({ code: 'SELF_REQUEST', message: 'Нельзя добавить самого себя' });
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: requesterId },
        ],
      },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'FRIENDSHIP_EXISTS',
        message:
          existing.status === 'accepted' ? 'Вы уже друзья' : 'Заявка уже отправлена и ожидает ответа',
      });
    }

    const friendship = await this.prisma.friendship.create({
      data: { requesterId, addresseeId: addressee.id, status: 'pending' },
    });

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    await this.prisma.notification.create({
      data: {
        userId: addressee.id,
        type: 'friend_request',
        payload: { friendshipId: friendship.id, fromNickname: requester?.nickname },
      },
    });

    return friendship;
  }

  async respondToRequest(userId: string, friendshipId: string, accept: boolean) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.addresseeId !== userId) {
      throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Заявка не найдена' });
    }
    if (friendship.status !== 'pending') {
      throw new BadRequestException({ code: 'ALREADY_RESOLVED', message: 'Заявка уже обработана' });
    }

    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: accept ? 'accepted' : 'declined', respondedAt: new Date() },
    });

    if (accept) {
      const addressee = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.prisma.notification.create({
        data: {
          userId: friendship.requesterId,
          type: 'friend_accepted',
          payload: { fromNickname: addressee?.nickname },
        },
      });
    }

    return updated;
  }

  /** Список принятых друзей, отсортирован по количеству баллов (у кого больше — выше). */
  async listFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });

    const friendIds = friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
    if (friendIds.length === 0) return [];

    const friends = await this.prisma.user.findMany({
      where: { id: { in: friendIds } },
      include: { character: true, progress: true },
    });

    return friends
      .map((f) => {
        const xp = f.progress?.xp ?? 0;
        const { level } = resolveLevel(xp);
        return {
          id: f.id,
          nickname: f.nickname,
          avatarEmoji: f.character?.avatarEmoji ?? '🙂',
          xp,
          level,
          borderColor: levelBorderColor(level),
        };
      })
      .sort((a, b) => b.xp - a.xp);
  }

  async listIncomingRequests(userId: string) {
    const requests = await this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const requesterIds = requests.map((r) => r.requesterId);
    const requesters = await this.prisma.user.findMany({
      where: { id: { in: requesterIds } },
      include: { character: true },
    });
    const requesterMap = new Map(requesters.map((r) => [r.id, r] as const));

    return requests.map((r) => ({
      friendshipId: r.id,
      nickname: requesterMap.get(r.requesterId)?.nickname ?? '???',
      avatarEmoji: requesterMap.get(r.requesterId)?.character?.avatarEmoji ?? '🙂',
      createdAt: r.createdAt,
    }));
  }

  private async assertAreFriends(userId: string, otherUserId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
    });
    if (!friendship) {
      throw new ForbiddenException({ code: 'NOT_FRIENDS', message: 'Переписка доступна только с друзьями' });
    }
  }

  /** Находит существующую личную комнату с другом либо создаёт новую. */
  async getOrCreateDirectRoom(userId: string, friendUserId: string) {
    await this.assertAreFriends(userId, friendUserId);

    // Ищем среди комнат текущего пользователя ту, где участвует именно этот друг
    const rooms = await this.prisma.chatParticipant.findMany({
      where: { userId },
      include: { chatRoom: { include: { participants: true } } },
    });

    for (const r of rooms) {
      const participantIds = r.chatRoom.participants.map((p) => p.userId);
      if (participantIds.includes(friendUserId) && participantIds.length === 2) {
        return r.chatRoom;
      }
    }

    return this.prisma.chatRoom.create({
      data: {
        participants: {
          create: [{ userId }, { userId: friendUserId }],
        },
      },
      include: { participants: true },
    });
  }

  async listChatRooms(userId: string) {
    const participations = await this.prisma.chatParticipant.findMany({
      where: { userId },
      include: {
        chatRoom: {
          include: {
            participants: { include: { user: { include: { character: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    return participations
      .map((p) => {
        const otherParticipant = p.chatRoom.participants.find((pp) => pp.userId !== userId);
        const lastMessage = p.chatRoom.messages[0] ?? null;
        return {
          roomId: p.chatRoom.id,
          otherUser: otherParticipant
            ? {
                id: otherParticipant.userId,
                nickname: otherParticipant.user.nickname,
                avatarEmoji: otherParticipant.user.character?.avatarEmoji ?? '🙂',
              }
            : null,
          lastMessage: lastMessage
            ? { content: lastMessage.content, createdAt: lastMessage.createdAt, senderId: lastMessage.senderId }
            : null,
        };
      })
      .sort((a, b) => {
        const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bt - at;
      });
  }

  private async assertRoomAccess(userId: string, roomId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatRoomId_userId: { chatRoomId: roomId, userId } },
    });
    if (!participant) {
      throw new ForbiddenException({ code: 'NOT_IN_ROOM', message: 'Нет доступа к этому чату' });
    }
  }

  async listMessages(userId: string, roomId: string) {
    await this.assertRoomAccess(userId, roomId);

    await this.prisma.chatParticipant.update({
      where: { chatRoomId_userId: { chatRoomId: roomId, userId } },
      data: { lastReadAt: new Date() },
    });

    return this.prisma.message.findMany({
      where: { chatRoomId: roomId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async sendMessage(userId: string, roomId: string, content: string) {
    await this.assertRoomAccess(userId, roomId);

    return this.prisma.message.create({
      data: { chatRoomId: roomId, senderId: userId, content },
    });
  }
}
