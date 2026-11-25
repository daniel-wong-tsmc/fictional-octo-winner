import {STATUSES} from '@workspace/astryx-workflows/components/StatusText';
import type {WorkflowBoardItem, WorkflowBoardState} from '@workspace/astryx-workflows/components/WorkflowBoard';
import {TICKETS, ticketCondition, type Task, type TicketCondition} from './data';
import {SCHEDULES, stepPosition} from './workflow';
import {personName, sharedHref, type SharedData} from './sharedData';

/** "Nov 2, 08:30": a date and time as Home's board shows it. */
export function shortDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}, ${d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}`;
}

/** A workflow as Home's board needs it: its schedule, next run, page, and its last finished run. */
export type BoardWorkflow = {
  key: string; name: string; schedule: string; nextRunAt: string; href: string; lastFinished?: string; isDraft?: boolean;
  /** Names of the shared data (SHARED_DATA) its inputs read. */
  sharedInputs: string[];
  /** When its last run stopped, when that run is the latest one. */
  lastStopped?: string;
};

const LANE_OF: Record<TicketCondition, WorkflowBoardState> = {
  needsApproval: 'needsApproval',
  missingData: 'missingData',
  complete: 'complete',
  notRun: 'unscheduled',
};

/**
 * Everything on Home's board, from data only: each workflow's next run (Scheduled, or Unscheduled when it
 * only runs when started), each task read from its ticket (Needs attention, Done, or Unscheduled for a draft),
 * each workflow's last finished run (Done), and data other people's workflows hand you that none of your
 * workflows reads yet (New data ready for use, or a failed run). A workflow that reads shared data whose run
 * failed goes to Needs attention, since it can't process. Tasks whose step isn't in their workflow's step list
 * are left out. Shared data opens its own page, which shows its rows and can start a workflow with it.
 */
export function boardItems(tasks: Task[], approved: number[], workflows: BoardWorkflow[], shared: SharedData[]): WorkflowBoardItem[] {
  const next: WorkflowBoardItem[] = [...workflows]
    .sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))
    .map(w =>
      w.isDraft
        ? {id: `next-${w.key}`, workflow: w.name, state: 'draft', href: w.href}
        : w.schedule === SCHEDULES[3]
        ? {id: `next-${w.key}`, workflow: w.name, state: 'unscheduled', href: w.href}
        : {id: `next-${w.key}`, workflow: w.name, state: 'scheduled', schedule: w.schedule, at: shortDateTime(w.nextRunAt), href: w.href},
    );
  const fromTickets: WorkflowBoardItem[] = tasks.flatMap(task => {
    const t = TICKETS[task.ticketId];
    const pos = t && stepPosition(t.workflow, t.step);
    if (!t || !pos) return [];
    return [{
      id: `task-${task.id}`,
      workflow: t.workflow,
      state: LANE_OF[ticketCondition(t, approved.includes(task.ticketId))],
      stepNumber: pos.number,
      stepCount: pos.count,
      at: t.finishedAt ? shortDateTime(t.finishedAt) : undefined,
      href: `#ticket-${task.ticketId}`,
    }];
  });
  const finished: WorkflowBoardItem[] = workflows.flatMap(w =>
    w.lastFinished ? [{id: `done-${w.key}`, workflow: w.name, state: 'complete' as const, at: w.lastFinished, href: w.href}] : [],
  );
  const read = new Set(workflows.flatMap(w => w.sharedInputs));
  const data: WorkflowBoardItem[] = shared.filter(d => !read.has(d.name)).map(d => ({
    id: `data-${d.id}`,
    workflow: d.workflow,
    data: d.name,
    owner: personName(d.owner),
    state: d.lastRun.result === 'ready' ? 'dataReady' : 'dataFailed',
    at: shortDateTime(d.lastRun.at),
    href: sharedHref(d),
  }));
  const blocked: WorkflowBoardItem[] = workflows.flatMap(w => {
    const failed = shared.find(d => w.sharedInputs.includes(d.name) && d.lastRun.result === 'failed');
    return failed
      ? [{id: `blocked-${w.key}`, workflow: w.name, owner: personName(failed.owner), state: 'upstreamFailed' as const, at: w.lastStopped ?? shortDateTime(failed.lastRun.at), href: w.href}]
      : [];
  });
  return [...next, ...data, ...blocked, ...fromTickets, ...finished];
}

/** How many cards are in Needs attention: the number Home shows in the sidebar. */
export const attentionCount = (items: WorkflowBoardItem[]) =>
  items.filter(i => i.state === 'needsApproval' || i.state === 'missingData' || i.state === 'upstreamFailed').length;

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

// A step's last run, in the shared statuses: a step that has never run is "Not run yet".
const RUN_STATUS = {
  needsApproval: STATUSES.needsApproval,
  complete: STATUSES.done,
  missingData: STATUSES.missingData,
  notRun: STATUSES.neverRun,
} as const;

/** Reads a ticket's last run: its condition, when it ran, and what the agent did. */
export function ticketRun(ticketId: number, approved: number[]): TileRun {
  const t = TICKETS[ticketId];
  const isApproved = approved.includes(ticketId);
  const condition = ticketCondition(t, isApproved);
  // A step that hasn't run has no time to add; its label already says so.
  const ran = isApproved ? 'Approved just now' : condition === 'notRun' ? '' : t.ran;
  return {ticketId, ...RUN_STATUS[condition], ran, summary: t.agentSummary ?? []};
}
