import {useToast} from '@astryxdesign/core/Toast';
import {WorkflowOverview} from '@workspace/astryx-workflows/components/WorkflowOverview';
import type {WorkflowTileContent} from '@workspace/astryx-workflows/components/WorkflowTile';
import {YOU, type BuiltWorkflow, type Workflow} from '../workflow';
import {toColumns, type SavedBoard} from './WorkflowBuilder';
import {RUN_DETAILS, runHref} from '../runs';

/* ---------- Workflow pages ----------
 * Every workflow page is the WorkflowOverview component from the app's Astryx integration
 * (app/astryx-workflows). These functions only map a workflow's data into its props.
 */

const RUN_TONE = {review: 'info', approved: 'success', rerun: 'success', stopped: 'error'} as const;
const runNow = (toast: ReturnType<typeof useToast>) => () => toast({body: 'Preview only. Running a workflow comes with the real build.'});

/** Who approves and where results go, read from the workflow's Handoff tiles. */
function handoffDetails(contents: WorkflowTileContent[]) {
  const outputs = contents.flatMap(c => (c.kind === 'output' ? [c] : []));
  return {
    approvers: [...new Set(outputs.map(o => o.approver).filter(Boolean))],
    sendTo: [...new Set(outputs.flatMap(o => o.sendTo))],
  };
}

/**
 * A workflow that comes with the prototype, such as Monthly sales close or Weekly revenue report. Who
 * approves and where it sends come from its stored board, the same board Edit opens, so the page and the
 * board always match. An approved ticket marks its run approved.
 */
export function LiveWorkflowPage({workflow: w, name, saved, approved, onDelete, isInPanel, fullPageHref}: {
  workflow: Workflow;
  name: string;
  saved: SavedBoard;
  /** Tickets approved here. */
  approved: number[];
  onDelete: () => void;
  /** Shown in Home's side panel. */
  isInPanel?: boolean;
  /** In Home's side panel: this page's own address. Its title links there. */
  fullPageHref?: string;
}) {
  const toast = useToast();
  const last = w.steps[w.steps.length - 1];
  const isLastApproved = last.status === 'done' || (!!last.ticketId && approved.includes(last.ticketId));
  // Each run with recorded tile results opens on the board, showing what every step did in it.
  const runs = w.runs.map((r, i) => ({
    ...(r.result === 'review' && isLastApproved
      ? {period: r.period, started: r.started, tone: 'success' as const, result: `Approved by ${YOU}`, finished: r.finished}
      : {period: r.period, started: r.started, tone: RUN_TONE[r.result], result: r.detail, finished: r.finished}),
    href: RUN_DETAILS[w.id]?.[r.period] ? runHref(w.id, i) : undefined,
  }));

  const tiles = toColumns(saved.board, saved.links, saved.sections).flat().map(st => st.content);
  return (
    <WorkflowOverview
      name={name}
      summary={w.description}
      schedule={w.schedule}
      nextRun={w.nextRun}
      {...handoffDetails(tiles)}
      tiles={tiles}
      runs={runs}
      editHref={`#workflow-edit-${w.id}`}
      onRunNow={runNow(toast)}
      onDelete={onDelete}
      isDraft={w.isDraft}
      isInPanel={isInPanel}
      fullPageHref={fullPageHref}
    />
  );
}

export function BuiltWorkflowPage({workflow: w, onDelete, isInPanel, fullPageHref}: {workflow: BuiltWorkflow; onDelete: () => void; isInPanel?: boolean; fullPageHref?: string}) {
  const toast = useToast();
  const stages = w.columns.flat().map(st => st.content);
  const count = (k: string) => stages.filter(c => c.kind === k).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return (
    <WorkflowOverview
      name={w.name}
      summary={`${plural(count('input'), 'input', 'inputs')}, ${plural(count('step'), 'LLM step', 'LLM steps')}, ${plural(count('output'), 'handoff', 'handoffs')}. Turned on ${w.createdOn}.`}
      schedule={w.schedule}
      nextRun={w.nextRunAt ? w.nextRun : undefined}
      {...handoffDetails(stages)}
      tiles={stages}
      runs={[]}
      editHref={`#workflow-edit-${w.id}`}
      onRunNow={runNow(toast)}
      onDelete={onDelete}
      isInPanel={isInPanel}
      fullPageHref={fullPageHref}
    />
  );
}
