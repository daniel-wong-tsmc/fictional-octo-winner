import {useToast} from '@astryxdesign/core/Toast';
import {
  WorkflowOverview, type WorkflowStage, type WorkflowTone,
} from '@workspace/astryx-workflows/components/WorkflowOverview';
import {MONTHLY_SALES_CLOSE, type BuiltWorkflow, type StepRunStatus} from '../workflow';
import {toColumns, type SavedBoard} from './WorkflowBuilder';
import type {Handoff} from '../handoffs';

/* ---------- Workflow pages ----------
 * Every workflow page is the WorkflowOverview component from the app's Astryx integration
 * (app/astryx-workflows). These functions only map a workflow's data into its props.
 */

const STEP_STATUS: Record<StepRunStatus, {tone: WorkflowTone; label: string}> = {
  done: {tone: 'success', label: 'Done'},
  review: {tone: 'info', label: 'Needs approval'},
  waiting: {tone: 'warning', label: 'Waiting'},
  draft: {tone: 'neutral', label: 'Draft'},
};
const NOT_RUN = {tone: 'neutral' as const, label: 'Not run yet'};
const SOURCE_TONE = {
  connected: {tone: 'success', label: 'Connected'},
  needsConnection: {tone: 'warning', label: 'App not connected'},
  handoff: {tone: 'info', label: 'From a workflow'},
  upload: {tone: 'neutral', label: 'Uploaded'},
} as const;
const RUN_TONE = {review: 'info', approved: 'success', rerun: 'success'} as const;
const runNow = (toast: ReturnType<typeof useToast>) => () => toast({body: 'Preview only. Running a workflow comes with the real build.'});
const handoffDetail = (h: Handoff) => `${h.value ?? ''} · used by ${h.usedBy.length ? h.usedBy.join(', ') : 'nothing yet'}`;

/**
 * Monthly sales close. Its tiles come from its stored board, the same board Edit opens, so the page and the
 * board always match. This month's run adds a status to the tiles it knows about.
 */
export function LiveWorkflowPage({name, saved, handoffs, isStep3Approved, onDelete}: {
  name: string;
  saved: SavedBoard;
  handoffs: Handoff[];
  isStep3Approved: boolean;
  onDelete: () => void;
}) {
  const toast = useToast();
  const w = MONTHLY_SALES_CLOSE;
  const steps = w.steps.map(s => (s.ticketId === 3 && isStep3Approved ? {...s, status: 'done' as const} : s));
  const inputStatus = new Map<string, {tone: WorkflowTone; label: string}>(steps.flatMap(s => s.inputs.map((input, k) => [`${s.id}-in-${k}`, SOURCE_TONE[input.status]])));
  const statusOf = (id: string) =>
    inputStatus.get(id) ??
    (steps.find(s => s.id === id) ? STEP_STATUS[steps.find(s => s.id === id)!.status] : undefined) ??
    (id === 'out' ? (isStep3Approved ? {tone: 'success' as const, label: 'Sent'} : {tone: 'info' as const, label: 'Waiting for approval'}) : NOT_RUN);
  const columns: WorkflowStage[][] = toColumns(saved.board, saved.links).map(col => col.map(st => ({...st, status: statusOf(st.id)})));
  const outputs = columns.flat().flatMap(st => (st.content.kind === 'output' ? [st.content] : []));
  const runs = w.runs.map(r =>
    r.result === 'review' && isStep3Approved
      ? {period: r.period, tone: 'success' as const, result: 'Approved by Daniel', finished: r.finished}
      : {period: r.period, tone: RUN_TONE[r.result], result: r.detail, finished: r.finished},
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
      onOpenStage={st => {
        // A step waiting on you opens its ticket; anything else opens the board, as on every workflow.
        const ticketId = steps.find(s => s.id === st.id)?.ticketId ?? (st.id === 'out' ? 3 : undefined);
        window.location.hash = ticketId ? `ticket-${ticketId}` : 'workflow-edit';
      }}
      uses={handoffs.filter(h => w.uses.includes(h.id)).map(h => ({id: h.id, name: h.name, detail: `From ${h.workflow} · ${h.value ?? ''}`}))}
      shares={handoffs.filter(h => h.workflow === w.name).map(h => ({id: h.id, name: h.name, detail: handoffDetail(h)}))}
      runs={runs}
      editHref="#workflow-edit"
      onRunNow={runNow(toast)}
      onDelete={onDelete}
    />
  );
}

export function BuiltWorkflowPage({workflow: w, onDelete}: {workflow: BuiltWorkflow; onDelete: () => void}) {
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
      summary={`${plural(count('input'), 'input', 'inputs')}, ${plural(count('step'), 'LLM step', 'LLM steps')}, ${plural(count('output'), 'Pass on to', 'Pass on to tiles')}. Turned on ${w.createdOn}.`}
      schedule={w.schedule}
      nextRun={w.nextRun}
      approvers={[...new Set(outputs.map(o => o.approver).filter(Boolean))]}
      sendTo={[...new Set(outputs.flatMap(o => o.sendTo))]}
      columns={columns}
      onOpenStage={() => (window.location.hash = `workflow-edit-${w.id}`)}
      uses={[]}
      shares={[]}
      runs={[]}
      editHref={`#workflow-edit-${w.id}`}
      onRunNow={runNow(toast)}
      onDelete={onDelete}
    />
  );
}
