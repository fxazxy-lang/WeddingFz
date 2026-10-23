import type { ReactElement } from 'react';
import type { ScheduleItemId } from '../../config/wedding';

/** Fine-line icons for each part of the celebration. Original drawings, 24px grid. */
const PATHS: Record<ScheduleItemId, ReactElement> = {
  // Incense sticks rising from an offering bowl
  krongPeali: (
    <>
      <path d="M5 15h14l-1.5 4.5a1.5 1.5 0 0 1-1.4 1H7.9a1.5 1.5 0 0 1-1.4-1z" />
      <path d="M9.5 15V8M12 15V6M14.5 15V8" />
      <path d="M12 4.2c.8-.6.8-1.4 0-2M9.5 6.2c.8-.6.8-1.4 0-2M14.5 6.2c.8-.6.8-1.4 0-2" />
    </>
  ),
  // Lotus for the monks' blessing
  monks: (
    <>
      <path d="M12 5c2 2.4 2.4 5.6 0 9.5-2.4-3.9-2-7.1 0-9.5z" />
      <path d="M11.4 15.5C8 15 5.3 12.8 4.5 9c2.9.6 5.3 2.7 6.9 6.5zM12.6 15.5c3.4-.5 6.1-2.7 6.9-6.5-2.9.6-5.3 2.7-6.9 6.5z" />
      <path d="M4 18.5c2.6-1.4 5.3-2 8-2s5.4.6 8 2" />
    </>
  ),
  // Fruit tray carried in procession
  procession: (
    <>
      <path d="M3.5 13.5h17M5 13.5l1.2 3.5h11.6l1.2-3.5M9 20h6M12 17v3" />
      <circle cx="9" cy="10.5" r="2.5" />
      <circle cx="15" cy="10.5" r="2.5" />
      <path d="M12 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zM12 4.5c.3-1 1-1.6 2-1.8" />
    </>
  ),
  // Scissors for the hair-cutting ceremony
  haircut: (
    <>
      <circle cx="7" cy="17" r="2.6" />
      <circle cx="17" cy="17" r="2.6" />
      <path d="M8.8 15.2 17 4M15.2 15.2 7 4" />
    </>
  ),
  // Red thread tied in a knot
  blessing: (
    <>
      <path d="M3 12c3 0 4.5-3 7-3 1.7 0 2.4 1.4 2 2.6-.5 1.4-2.4 1.6-3.2.5-.9-1.2.2-3.1 2.2-3.1H11c2.5 0 4 3 7 3h3" />
      <path d="M6 15.5c2.2 1.6 4 2.2 6 2.2s3.8-.6 6-2.2" />
    </>
  ),
  // Raised glasses for the banquet
  banquet: (
    <>
      <path d="M6.5 3.5h5l-.4 4.3a2.1 2.1 0 0 1-4.2 0zM9 10v7.5M6.5 20.5h5M9 17.5v3" />
      <path d="M13.5 5.5h5l-.4 4.3a2.1 2.1 0 0 1-4.2 0zM16 12v6.5M13.5 20.5h5M16 18.5v2" />
      <path d="M11.8 2.2l.7-1M15.5 3.2l.4-1.2" />
    </>
  ),
};

export function ScheduleIcon({ id }: { id: ScheduleItemId }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}
