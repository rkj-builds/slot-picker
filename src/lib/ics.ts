/**
 * A one-event iCalendar file (RFC 5545), generated in the browser, so "Add to
 * calendar" works offline and with every calendar app. Times are written in
 * UTC, which every client converts to the reader's own zone correctly.
 */

export interface CalendarEvent {
  uid: string;
  /** Epoch ms. */
  start: number;
  end: number;
  summary: string;
  location: string;
  description: string;
  /** Epoch ms the file was made. */
  stamp: number;
}

export function buildIcs(event: CalendarEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Project 831//Court booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(event.stamp)}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(event.end)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** 2026-10-17T13:30:00Z → "20261017T133000Z". */
export function utcStamp(instant: number): string {
  return new Date(instant).toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function escapeText(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += i === 0 ? 75 : 74) parts.push(line.slice(i, i + (i === 0 ? 75 : 74)));
  return parts.join("\r\n ");
}
