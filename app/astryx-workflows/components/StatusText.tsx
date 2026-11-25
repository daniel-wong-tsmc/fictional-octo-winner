import type {ReactNode} from 'react';
import {HStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {StatusDot} from '@astryxdesign/core/StatusDot';

/** The colour of a status: StatusDot's variants. */
export type StatusTone = 'success' | 'info' | 'warning' | 'error' | 'neutral';

/**
 * Every status the app shows, with one tone and one set of words each, so the same state reads the same on
 * every screen: Home, workflow and shared data pages, the board, past runs and step pages.
 * - failed: a run, step or input broke. Never "Stopped".
 * - needsApproval: a result waits for someone to approve it. Never "Waiting for approval".
 * - notRun: skipped in a past run, because something before it failed.
 * - neverRun: has never run at all, such as a draft's step.
 */
export const STATUSES = {
  done: {tone: 'success', label: 'Done'},
  sent: {tone: 'success', label: 'Sent'},
  ready: {tone: 'success', label: 'Ready'},
  on: {tone: 'success', label: 'On'},
  needsApproval: {tone: 'info', label: 'Needs approval'},
  failed: {tone: 'error', label: 'Failed'},
  missingData: {tone: 'warning', label: 'Missing data'},
  stale: {tone: 'warning', label: 'Out of date'},
  notRun: {tone: 'neutral', label: 'Didn’t run'},
  neverRun: {tone: 'neutral', label: 'Not run yet'},
  draft: {tone: 'neutral', label: 'Draft'},
} as const satisfies Record<string, {tone: StatusTone; label: string}>;

export type StatusKey = keyof typeof STATUSES;

export type StatusTextProps = {
  /** A status from STATUSES, or a tone and label of its own. */
  status: StatusKey | {tone: StatusTone; label: string};
  /** Shown after the label, such as when it happened. */
  note?: ReactNode;
};

/**
 * A status: a coloured dot and its label, with an optional note after it. Use it everywhere a status is shown,
 * so every status looks and reads the same.
 */
export function StatusText({status, note}: StatusTextProps) {
  const {tone, label} = typeof status === 'string' ? STATUSES[status] : status;
  return (
    <HStack gap={1.5} vAlign="center" wrap="wrap">
      <StatusDot variant={tone} label={label} />
      <Text type="supporting" weight="medium">{label}</Text>
      {note && <Text type="supporting">{note}</Text>}
    </HStack>
  );
}
