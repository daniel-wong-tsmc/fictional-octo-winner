import {useToast} from '@astryxdesign/core/Toast';
import {
  WorkflowOverview, type WorkflowStage, type WorkflowTone,
} from '@workspace/astryx-workflows/components/WorkflowOverview';
import type {BuiltWorkflow, StepRunStatus, Workflow, WorkflowStep} from '../workflow';
import {toColumns, type SavedBoard} from './WorkflowBuilder';
import {sharedByName} from '../sharedData';

/* ---------- Workflow pages ----------
 * Every workflow page is the WorkflowOverview component from the app's Astryx integration
 * (app/astryx-workflows). These functions only map a workflow's data into its props.
 */

const STEP_STATUS: Record<StepRunStatus, {tone: WorkflowTone; label: string}> = {
  done: {tone: 'success', label: 'Done'},
  review: {tone: 'info', label: 'Needs approval'},
  waiting: {tone: 'neutral', label: 'Waiting'},
  stopped: {tone: 'error', label: 'Stopped'},
  draft: {tone: 'neutral', label: 'Draft'},
};
const NOT_RUN = {tone: 'neutral' as const, label: 'Not run yet'};
const SOURCE_TONE = {
  connected: {tone: 'success', label: 'Connected'},
  needsConnection: {tone: 'warning', label: 'App not connected'},
  handoff: {tone: 'info', label: 'From a workflow'},
  shared: {tone: 'info', label: 'Shared with you'},
  upload: {tone: 'neutral', label: 'Uploaded'},
} as const;
const UPSTREAM_FAILED = {tone: 'error' as const, label: 'Previous workflow failed'};
const RUN_TONE = {review: 'info', approved: 'success', rerun: 'success', stopped: 'error'} as const;
const runNow = (toast: ReturnType<typeof useToast>) => () => toast({body: 'Preview only. Running a workflow comes with the real build.'});

/**
 * A workflow that comes with the prototype, such as Monthly sales close or Weekly revenue report. Its tiles
 * come from its stored board, the same board Edit opens, so the page and the board always match. The last
 * run adds a status to the tiles it knows about; an approved ticket marks its step done.
 */
export function LiveWorkflowPage({workflow: w, name, saved, approved, onDelete, isInPanel}: {
  workflow: Workflow;
  name: string;
  saved: SavedBoard;
  /** Tickets approved here. */
  approved: number[];
  onDelete: () => void;
  /** Shown in Home's side panel. */
  isInPanel?: boolean;
}) {
  const toast = useToast();
  const isApproved = (s: WorkflowStep) => !!s.ticketId && approved.includes(s.ticketId);
  const steps = w.steps.map(s => (isApproved(s) ? {...s, status: 'done' as const} : s));
  const last = steps[steps.length - 1];
  // Shared data whose workflow failed shows that, so you know why this workflow didn't process.
  const sourceStatus = (input: WorkflowStep['inputs'][number]) =>
    input.status === 'shared' && sharedByName(input.reads)?.lastRun.result === 'failed' ? UPSTREAM_FAILED : SOURCE_TONE[input.status];
  const inputStatus = new Map<string, {tone: WorkflowTone; label: string}>(steps.flatMap(s => s.inputs.map((input, k) => [`${s.id}-in-${k}`, sourceStatus(input)])));
  // The Handoff follows the last step: sent once it is done, waiting while it needs approval.
  const handoffStatus = last.status === 'done' ? {tone: 'success' as const, label: 'Sent'} : last.status === 'review' ? {tone: 'info' as const, label: 'Waiting for approval'} : NOT_RUN;
  const statusOf = (id: string) =>
    inputStatus.get(id) ?? (steps.find(s => s.id === id) ? STEP_STATUS[steps.find(s => s.id === id)!.status] : undefined) ?? (id === 'out' ? handoffStatus : NOT_RUN);
  // An input from another workflow shows as one, even when it came from a section on the board.
  const statusFor = (st: WorkflowStage) =>
    st.content.kind === 'input' && st.content.via === 'workflow' && !inputStatus.has(st.id) ? SOURCE_TONE.handoff : statusOf(st.id);
  const columns: WorkflowStage[][] = toColumns(saved.board, saved.links, saved.sections).map(col => col.map(st => ({...st, status: statusFor(st)})));
  const outputs = columns.flat().flatMap(st => (st.content.kind === 'output' ? [st.content] : []));
  const runs = w.runs.map(r =>
    r.result === 'review' && last.status === 'done'
      ? {period: r.period, started: r.started, tone: 'success' as const, result: 'Approved by Daniel', finished: r.finished}
      : {period: r.period, started: r.started, tone: RUN_TONE[r.result], result: r.detail, finished: r.finished},
  );

  return (
    <WorkflowOverview
      name={name}
      summary={w.description}
      schedule={w.schedule}
      nextRun={w.nextRun}
      approvers={[...new Set(outputs.map(o => o.approver).filter(Boolean))]}
      sendTo={[...new Set(outputs.flatMap(o => o.sendTo))]}
      columns={columns}
      onOpenStage={st => (window.location.hash = `workflow-edit-${w.id}?tile=${st.id}`)}
      runs={runs}
      editHref={`#workflow-edit-${w.id}`}
      onRunNow={runNow(toast)}
      onDelete={onDelete}
      isDraft={w.isDraft}
      isInPanel={isInPanel}
    />
  );
}

export function BuiltWorkflowPage({workflow: w, onDelete, isInPanel}: {workflow: BuiltWorkflow; onDelete: () => void; isInPanel?: boolean}) {
  const toast = useToast();
  const stages = w.columns.flat().map(st => st.content);
  const outputs = stages.flatMap(c => (c.kind === 'output' ? [c] : []));
  const count = (k: string) => stages.filter(c => c.kind === k).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  // Saved tiles carry the same content the board showed; the page adds only their run status.
  const columns: WorkflowStage[][] = w.columns.map(col => col.map(st => ({...st, status: NOT_RUN})));
  return (
    <WorkflowOverview
      name={w.name}
      summary={`${plural(count('input'), 'input', 'inputs')}, ${plural(count('step'), 'LLM step', 'LLM steps')}, ${plural(count('output'), 'handoff', 'handoffs')}. Turned on ${w.createdOn}.`}
      schedule={w.schedule}
      nextRun={w.nextRun}
      approvers={[...new Set(outputs.map(o => o.approver).filter(Boolean))]}
      sendTo={[...new Set(outputs.flatMap(o => o.sendTo))]}
      columns={columns}
      onOpenStage={st => (window.location.hash = `workflow-edit-${w.id}?tile=${st.id}`)}
      runs={[]}
      editHref={`#workflow-edit-${w.id}`}
      onRunNow={runNow(toast)}
      onDelete={onDelete}
      isInPanel={isInPanel}
    />
  );
}
