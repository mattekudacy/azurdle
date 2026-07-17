type IconProps = { className?: string };

/** Minimal inline icon set, styled to match Material Symbols Outlined at
 * 20px/1.5px stroke — avoids an extra font request for a handful of glyphs. */

export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="9" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 7v4l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 4v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" className={className} aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17 17l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArchiveIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="4" width="14" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 7.5v6a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function StatsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" className={className} aria-hidden="true">
      <path d="M4 16.5v-5M10 16.5V4M16 16.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HelpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.8 8a2.2 2.2 0 1 1 3.4 1.85c-.6.4-1.2.85-1.2 1.65v.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" className={className} aria-hidden="true">
      <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.5" cy="14.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.8 9.1l5.9-2.8M6.8 10.9l5.9 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
