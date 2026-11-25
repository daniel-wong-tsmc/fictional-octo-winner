// When a workflow runs: a recurring day and time. It's optional; a workflow without one says Not scheduled. Every schedule the app shows
// (the workflow page's Starts, Home's Scheduled cards, the board's Schedule button) is written by scheduleText
// and timed by nextRunOf, so the words and the next run always agree.

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** A day of the month: a date from 1 to 28 (every month has one), the first business day, or the last day. */
export type MonthDay = number | 'firstBusinessDay' | 'lastDay';

/** time is 24-hour "HH:MM". */
export type Schedule =
  | {repeat: 'daily'; time: string}
  | {repeat: 'weekly'; days: Weekday[]; time: string}
  | {repeat: 'monthly'; day: MonthDay; time: string};

/** What a new schedule starts as: weekly on Monday at 8:00, the most common example. */
export const DEFAULT_SCHEDULE: Schedule = {repeat: 'weekly', days: ['Monday'], time: '08:00'};

/** The prototype's "now": between the last runs in the example data (Nov 16) and the next ones. */
export const NOW = new Date('2026-11-18T09:00');

/** "08:00" reads "8:00". */
const clock = (time: string) => time.replace(/^0(\d)/, '$1');

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

/** "1st", "First business day", "Last day": the words for a day of the month. */
export const monthDayLabel = (day: MonthDay) =>
  day === 'firstBusinessDay' ? 'First business day' : day === 'lastDay' ? 'Last day' : `The ${ordinal(day)}`;

const joinWords = (words: string[]) =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;

/** The schedule in words, such as "Every Monday, 8:00" or "First business day of each month, 8:00". */
export function scheduleText(s: Schedule): string {
  if (s.repeat === 'daily') return `Every day, ${clock(s.time)}`;
  if (s.repeat === 'weekly') {
    const days = WEEKDAYS.filter(d => s.days.includes(d));
    const which = days.length === 7 ? 'day' : days.length === 5 && !days.some(d => d === 'Saturday' || d === 'Sunday') ? 'weekday' : joinWords(days);
    return `Every ${which}, ${clock(s.time)}`;
  }
  return `${monthDayLabel(s.day)} of each month, ${clock(s.time)}`;
}

/** Monday is 0, matching WEEKDAYS. */
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

function runsOn(s: Schedule, d: Date): boolean {
  if (s.repeat === 'daily') return true;
  if (s.repeat === 'weekly') return s.days.includes(WEEKDAYS[weekdayIndex(d)]);
  if (s.day === 'lastDay') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getDate() === 1;
  if (s.day === 'firstBusinessDay') {
    if (weekdayIndex(d) > 4) return false;
    for (let day = 1; day < d.getDate(); day++) if (weekdayIndex(new Date(d.getFullYear(), d.getMonth(), day)) <= 4) return false;
    return true;
  }
  return d.getDate() === s.day;
}

/** The next time it runs after `from`. Undefined when a weekly schedule has no day picked. */
export function nextRunOf(s: Schedule, from: Date = NOW): Date | undefined {
  if (s.repeat === 'weekly' && !s.days.length) return undefined;
  const [h, m] = s.time.split(':').map(Number);
  for (let i = 0; i < 400; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, h, m);
    if (d > from && runsOn(s, d)) return d;
  }
  return undefined;
}

/** "Monday, November 23, 8:00", as the workflow page shows the next run. */
export const nextRunText = (d: Date) =>
  `${d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

/** "2026-11-23T08:00", for sorting runs by time. */
const isoMinute = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** What a workflow without a schedule says. A schedule is optional; without one it runs only when started. */
import {NOT_SCHEDULED} from '@workspace/astryx-workflows/components/WorkflowBoard';
export {NOT_SCHEDULED, RUNS_WHEN_STARTED} from '@workspace/astryx-workflows/components/WorkflowBoard';

/**
 * A workflow's schedule fields from its Schedule: the words, the next run in words, and the next run's time.
 * Without a schedule it says Not scheduled and has no next run.
 */
type Timing = {schedule: string; nextRun: string; nextRunAt: string};
export function timing(when: Schedule): Timing & {when: Schedule};
export function timing(when?: Schedule): Timing & {when?: Schedule};
export function timing(when?: Schedule): Timing & {when?: Schedule} {
  if (!when) return {when, schedule: NOT_SCHEDULED, nextRun: NOT_SCHEDULED, nextRunAt: ''};
  const next = nextRunOf(when);
  return {when, schedule: scheduleText(when), nextRun: next ? nextRunText(next) : 'Not set', nextRunAt: next ? isoMinute(next) : ''};
}
