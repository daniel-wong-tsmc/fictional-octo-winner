/** Date formats the app shows, in one place. All use explicit options, so the output doesn't depend on the locale's defaults. */

/** "Nov 17": a date without a year. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

/** "Nov 2, 08:30": a date and a 24-hour time, as Home's board and chats show them. */
export function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
}

/** "November 24": a full month name and day, for a date made now. */
export function longDate(date: Date): string {
  return date.toLocaleDateString('en-US', {month: 'long', day: 'numeric'});
}
