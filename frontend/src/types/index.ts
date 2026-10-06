export interface Crystal {
  id: string;
  lat: number;
  lng: number;
  reward: number;
  distanceMeters: number;
}

export interface PoiCategory {
  id: string;
  code: string;
  title: string;
  colorHex: string;
  iconAsset?: string | null;
}

export interface Poi {
  id: string;
  title: string;
  categoryId: string;
  markerAsset?: string | null;
  category: PoiCategory;
  lat: number;
  lng: number;
  descriptionHistory?: string | null;
  interestingFacts: string[];
  bestSeason: string[];
  visibility: 'public' | 'secret' | 'hidden_map';
  secretFoundAt?: string | null;
  secretFinder?: { nickname: string } | null;
  flag?: { design: unknown; user: { nickname: string } } | null;
  difficulty: string;
  visitCount: number;
  baseXp: number;
  baseCoins: number;
  baseCrystals: number;
  requiresProof: boolean;
  geofenceRadiusM: number;
  distanceMeters?: number;
}

export interface UserProgress {
  xp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number | null;
  xpToNextLevel: number | null;
  hasSecretAccess: boolean;
}

export interface Wallet {
  id: string;
  coinsBalance: number;
  crystalsBalance: number;
}

export interface CharacterProfile {
  id: string;
  archetype: 'male' | 'female';
  avatarEmoji: string;
  ownedAvatarIds?: number[];
  equippedItems: Record<string, string>;
}

export interface AuthUser {
  id: string;
  nickname: string;
  role: string;
  campThemeId?: string;
  character: CharacterProfile;
  wallet: Wallet;
  progress: { xp: number; rankCode: string };
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface VisitAttemptStart {
  attemptId: string;
  distanceMeters: number;
  withinGeofence: boolean;
  lowAccuracyWarning: boolean;
  requiredDwellSeconds: number;
  requiredProof: 'none' | 'photo' | 'selfie' | 'qr';
}

export interface VisitCompleteResult {
  status: 'verified' | 'flagged_for_review';
  visit?: unknown;
  xpAwarded?: number;
  coinsAwarded?: number;
  crystalsAwarded?: number;
  level?: number;
  newMilestones?: { count: number; reward: number; crystalReward: number }[];
  message?: string;
}
