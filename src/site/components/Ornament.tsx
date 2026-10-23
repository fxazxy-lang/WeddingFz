/**
 * Line ornaments inspired by the flame-and-lotus finials (kbach) that crown
 * Khmer temple doorways and wedding invitations. Original drawings.
 */
export function Finial({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={(size * 34) / 48}
      viewBox="0 0 48 34"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M24 2.5c4.2 5.6 5 11.4 0 19.5-5-8.1-4.2-13.9 0-19.5z" />
      <path d="M24 9.5c1.6 2.6 1.9 5.4 0 8.6-1.9-3.2-1.6-6 0-8.6z" />
      <path d="M23.2 24.5C17 23.4 11.6 19.4 9.4 11.8c5.4 1.8 10.2 6.2 13.8 12.7z" />
      <path d="M24.8 24.5c6.2-1.1 11.6-5.1 13.8-12.7-5.4 1.8-10.2 6.2-13.8 12.7z" />
      <path d="M4.5 28.5c6.2-3 12.6-3.8 19.5-3.8s13.3.8 19.5 3.8" />
      <circle cx="24" cy="31.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Divider({ className }: { className?: string }) {
  return (
    <div className={`divider ${className ?? ''}`} aria-hidden="true">
      <span className="divider__line" />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M7 0.5 8.4 5.6 13.5 7 8.4 8.4 7 13.5 5.6 8.4 0.5 7 5.6 5.6z" />
      </svg>
      <span className="divider__line" />
    </div>
  );
}
