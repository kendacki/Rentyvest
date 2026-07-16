/* Lucide Icons (ISC) for pools + auth. Custom RentyVest icons for NFT + live marketplace. */

type FeatureIconProps = {
  className?: string;
};

export function FeaturePoolsIcon({ className = 'h-8 w-8' }: FeatureIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </svg>
  );
}

export function FeatureAuthIcon({ className = 'h-8 w-8' }: FeatureIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

export function FeatureNftIcon({ className = 'h-8 w-8' }: FeatureIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 2.5 18.2 6v12L12 21.5 5.8 18V6L12 2.5z" />
      <path d="M7.5 13.5 12 9.5l4.5 4" />
      <path d="M8 16 12 12.5l4 3.5" />
      <path d="M8.5 18.5 12 15.5l3.5 3" />
      <circle cx="17" cy="7" r="1.35" fill="currentColor" stroke="none" />
      <path d="M15.6 8.4 13.8 9.8" strokeWidth="1.5" />
    </svg>
  );
}

export function FeatureRealtimeIcon({ className = 'h-8 w-8' }: FeatureIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3.5" y="7" width="7" height="13" rx="1.5" />
      <path d="M5 10.2 7 8.7 9 10.2" />
      <path d="M5.5 12h3M5.5 14h3M5.5 16h2" />

      <rect x="13.5" y="7" width="7" height="13" rx="1.5" />
      <path d="M15 10.2 17 8.7 19 10.2" />
      <path d="M15.5 12h3M15.5 14h3" />
      <rect
        x="15"
        y="16.5"
        width="4"
        height="2"
        rx="0.5"
        fill="currentColor"
        stroke="none"
        opacity="0.35"
      />
      <rect x="15" y="16.5" width="2.6" height="2" rx="0.5" fill="currentColor" stroke="none" />

      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9.4 5a4.2 4.2 0 0 1 5.2 0" strokeWidth="1.5" />
      <path d="M7.8 5a6.8 6.8 0 0 1 8.4 0" strokeWidth="1.5" />
    </svg>
  );
}
