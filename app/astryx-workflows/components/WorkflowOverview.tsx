import {useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Icon} from '@astryxdesign/core/Icon';
import {CalendarClock, Pencil, Play, Send, Trash2, UserCheck} from 'lucide-react';
import {NOT_SCHEDULED, RUNS_WHEN_STARTED} from './WorkflowBoard';
import {OverviewFrame, OverviewDetails, OverviewHeading, OverviewRuns, overviewMarkdown, type OverviewRun} from '../parts/OverviewParts';
import {WORKFLOW_TILE_KINDS, tileText, type WorkflowTileContent} from './WorkflowTile';
export {OverviewFrame, OverviewHeading, OverviewSection, markdownTable, overviewMarkdown} from '../parts/OverviewParts';

/** One run. period names the data it covered and identifies the row; started and finished are shown as date and time. */
export type WorkflowRun = OverviewRun;

export type WorkflowOverviewProps = {
  name: string;
  /** One sentence on what the workflow does. */
  summary: string;
  schedule: string;
  /** Leave it out for a workflow without a schedule: the page says Not scheduled. */
  nextRun?: string;
  approvers: string[];
  sendTo: string[];
  runs: WorkflowRun[];
  /** Where Edit workflow goes. */
  editHref: string;
  onRunNow: () => void;
  /** Called after the person confirms the delete. */
  onDelete: () => void;
  homeHref?: string;
  /** A draft hasn't been turned on: the page says Draft and shows no next run. */
  isDraft?: boolean;
  /** Shown in a side panel, which has its own header: leaves out the breadcrumbs. */
  isInPanel?: boolean;
  /** The page's own address: Copy link copies it, and in a side panel the title links there. */
  fullPageHref?: string;
  /** The workflow's tiles in run order, for Copy as Markdown's Steps. */
  tiles?: WorkflowTileContent[];
};

/**
 * The page for one workflow: what it is, when it runs, who approves, where it sends, and its recent runs.
 * Every workflow page uses it, so they all look the same. It is built from the same parts as
 * SharedDataOverview (parts/OverviewParts.tsx). Its tiles live on the board, which Edit workflow opens.
 */
export function WorkflowOverview({
  name, summary, schedule, nextRun, approvers, sendTo, runs, editHref, onRunNow, onDelete,
  homeHref = '#home',
  isDraft = false,
  isInPanel = false,
  fullPageHref,
  tiles,
}: WorkflowOverviewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const note = isDraft ? 'Not turned on yet' : nextRun ? `Next run: ${nextRun}` : NOT_SCHEDULED;
  const details = [
    {label: 'Starts', icon: CalendarClock, value: schedule},
    {label: 'Needs approval from', icon: UserCheck, value: approvers.length ? approvers.join(', ') : 'Nobody'},
    {label: 'Sends to', icon: Send, value: sendTo.length ? sendTo.join(', ') : 'Nobody yet'},
  ];
  const markdown = overviewMarkdown({
    name,
    status: `${isDraft ? 'Draft' : 'On'}, ${note.replace(/^Next run: /, 'next run ')}`,
    summary,
    details,
    sections: tiles?.length ? [{title: 'Steps', body: tiles.map((t, i) => {
      const {title, details: d} = tileText(t);
      const rest = d.filter(x => x.value !== title);
      return `${i + 1}. **${WORKFLOW_TILE_KINDS[t.kind].label}: ${title}**${rest.length ? ` (${rest.map(x => `${x.label}: ${x.value}`).join('; ')})` : ''}`;
    }).join('\n')}] : [],
    runs,
  });
  return (
    <OverviewFrame crumbs={[{label: name}]} homeHref={homeHref} isInPanel={isInPanel} aside={<OverviewDetails items={details} />}>
      <OverviewHeading
        status={isDraft ? 'draft' : 'on'}
        note={note}
        name={name}
        share={fullPageHref ? {href: fullPageHref, markdown} : undefined}
        nameHref={isInPanel ? fullPageHref : undefined}
        summary={summary}
        actions={
          <>
            <Button label="Run now" icon={<Icon icon={Play} />} onClick={onRunNow} />
            <Button label="Edit workflow" icon={<Icon icon={Pencil} />} href={editHref} />
            <Button label="Delete workflow" variant="ghost" icon={<Icon icon={Trash2} />} onClick={() => setIsDeleting(true)} />
          </>
        }
      />

      <OverviewRuns runs={runs} emptyTitle="No runs yet" emptyDescription={isDraft ? 'It runs once it’s turned on.' : nextRun ? `The first run is ${nextRun}.` : `${RUNS_WHEN_STARTED}.`} />

      <AlertDialog
        isOpen={isDeleting}
        onOpenChange={setIsDeleting}
        title={`Delete ${name}?`}
        description="It stops running and is removed for everyone. Its open tasks leave Home. Outputs that were already sent stay where they went."
        actionLabel="Delete workflow"
        onAction={() => {
          setIsDeleting(false);
          onDelete();
        }}
      />
    </OverviewFrame>
  );
}
