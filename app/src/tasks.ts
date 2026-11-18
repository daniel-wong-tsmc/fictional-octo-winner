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
