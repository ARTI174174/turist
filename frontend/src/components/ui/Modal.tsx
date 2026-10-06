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
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-adventure flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl border border-brass/50 shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-brass/40 bg-panel/95 px-4 py-3">
          <h2 className="font-display text-lg text-parchment">{title}</h2>
          <button onClick={onClose} aria-label="Закрыть" className="rounded-full p-1.5 text-parchment/60 hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
