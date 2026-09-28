'use client';

import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { avatarPath } from '@/lib/avatars';

export function AvatarImage({
  value,
  className,
  imageClassName,
  style,
}: {
  value?: string | null;
  className?: string;
  imageClassName?: string;
  style?: CSSProperties;
}) {
  const avatarNumber = value?.match(/^\/assets\/avatars\/(\d+)\.jpg$/)?.[1];
  const src = avatarNumber ? avatarPath(Number(avatarNumber)) : null;

  return (
    <span style={style} className={clsx('inline-flex shrink-0 items-center justify-center overflow-hidden', className)}>
      {src ? (
        <img src={src} alt="" className={clsx('h-full w-full object-cover', imageClassName)} />
      ) : (
        value || '🙂'
      )}
    </span>
  );
}
