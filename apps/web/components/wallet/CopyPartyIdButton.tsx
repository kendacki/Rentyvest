'use client';

import { useCallback, useState } from 'react';
import { truncatePartyId } from '../../lib/format';

type CopyPartyIdButtonProps = {
  partyId: string;
  className?: string;
};

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1em] w-[1em]"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1em] w-[1em]"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function CopyPartyIdButton({
  partyId,
  className = '',
}: CopyPartyIdButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(partyId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [partyId]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs text-brand-black ${className}`}
    >
      <span title={partyId}>{truncatePartyId(partyId)}</span>
      <button
        type="button"
        onClick={() => {
          void handleCopy();
        }}
        className="inline-flex shrink-0 items-center justify-center rounded p-0.5 text-neutral-500 transition-colors hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/30"
        aria-label={copied ? 'Canton party ID copied' : 'Copy Canton party ID'}
        title={copied ? 'Copied' : 'Copy party ID'}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </span>
  );
}
