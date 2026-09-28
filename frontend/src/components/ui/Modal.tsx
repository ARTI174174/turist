'use client';

import { X } from 'lucide-react';

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-topo sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone/20 bg-parchment/95 px-4 py-3">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Закрыть" className="rounded-full p-1.5 text-ink/60 hover:bg-black/5">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
