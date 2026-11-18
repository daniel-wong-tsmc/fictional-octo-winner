import type {WorkflowTask} from '@workspace/astryx-workflows/components/WorkflowTaskList';
import {TICKETS, ticketCondition, type Task} from './data';
import {stepPosition} from './workflow';

/**
 * Turns a task into the shape WorkflowTaskList shows. Every part comes from the task's ticket and its
 * workflow's steps. Returns null when the step isn't in its workflow's step list, so a bad record never
 * shows up half filled.
 */
export function toWorkflowTask(task: Task, approved: number[]): WorkflowTask | null {
  const t = TICKETS[task.ticketId];
  const pos = t && stepPosition(t.workflow, t.step);
  if (!t || !pos) return null;
  return {
    id: String(task.id),
    workflow: t.workflow,
    stepNumber: pos.number,
    stepCount: pos.count,
    condition: ticketCondition(t, approved.includes(task.ticketId)),
    notifiedAt: t.finishedAt,
    href: `#ticket-${task.ticketId}`,
  };
}

/** The last run of a tile that has a ticket, as the board's side panel shows it. */
export type TileRun = {
  ticketId: number;
  tone: 'info' | 'success' | 'warning' | 'neutral';
  label: string;
  /** When it ran, or who approved it. */
  ran: string;
  /** What the agent did, in its own short lines. */
  summary: string[];
};

const RUN_STATUS = {
  needsApproval: {tone: 'info', label: 'Needs approval'},
  complete: {tone: 'success', label: 'Approved'},
  missingData: {tone: 'warning', label: 'Missing data'},
  notRun: {tone: 'neutral', label: 'Not run yet'},
} as const;

/** Reads a ticket's last run: its condition, when it ran, and what the agent did. */
export function ticketRun(ticketId: number, approved: number[]): TileRun {
  const t = TICKETS[ticketId];
  const isApproved = approved.includes(ticketId);
  const status = RUN_STATUS[ticketCondition(t, isApproved)];
  return {ticketId, ...status, ran: isApproved ? 'Approved just now' : t.ran, summary: t.agentSummary ?? []};
}
