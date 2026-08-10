'use client';

import Link from 'next/link';

export function PrimeLockBadge() {
  return (
    <Link href="/pricing" className="group/prime">
      <div className="flex items-center gap-2 bg-prime-bg border border-prime/30 rounded-md px-3 py-1.5 hover:border-prime transition-colors">
        <span className="text-sm">🔒</span>
        <span className="text-xs font-semibold text-prime group-hover/prime:underline">
          Prix Gros — Passez à Prime
        </span>
      </div>
    </Link>
  );
}
