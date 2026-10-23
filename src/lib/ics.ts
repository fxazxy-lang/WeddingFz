export interface CalendarEvent {
  uid: string;
  title: string;
  start: string;
  end?: string;
  location?: string;
  description?: string;
}

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = (text: string) => text.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');

/** Build an iCalendar file that Google, Apple and Outlook calendars all accept. */
export function buildIcs(events: CalendarEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding//Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const event of events) {
    const end = event.end ?? new Date(new Date(event.start).getTime() + 2 * 3_600_000).toISOString();
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(event.start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escape(event.title)}`,
      ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
      ...(event.description ? [`DESCRIPTION:${escape(event.description)}`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Link that opens Google Calendar's "new event" screen pre-filled with one event. */
export function googleCalendarUrl(event: Omit<CalendarEvent, 'uid'>, timeZone: string): string {
  const end = event.end ?? new Date(new Date(event.start).getTime() + 2 * 3_600_000).toISOString();
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(event.start)}/${stamp(end)}`,
    ctz: timeZone,
  });
  if (event.location) params.set('location', event.location);
  if (event.description) params.set('details', event.description);
  return `https://calendar.google.com/calendar/render?${params}`;
}
