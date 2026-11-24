import {useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Icon} from '@astryxdesign/core/Icon';
import {CalendarClock, Pencil, Play, Send, Trash2, UserCheck} from 'lucide-react';
import {OverviewFrame, OverviewHeading, OverviewRuns, type OverviewRun} from '../parts/OverviewParts';

/** One run. period names the data it covered and identifies the row; started and finished are shown as date and time. */
export type WorkflowRun = OverviewRun;

export type WorkflowOverviewProps = {
  name: string;
  /** One sentence on what the workflow does. */
  summary: string;
  schedule: string;
  nextRun: string;
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
}: WorkflowOverviewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  return (
    <OverviewFrame name={name} homeHref={homeHref} isInPanel={isInPanel}>
      <OverviewHeading
        status={isDraft ? {tone: 'neutral', label: 'Draft'} : {tone: 'success', label: 'On'}}
        note={isDraft ? 'Not turned on yet' : `Next run: ${nextRun}`}
        name={name}
        summary={summary}
        actions={
          <>
            <Button label="Run now" icon={<Icon icon={Play} />} onClick={onRunNow} />
            <Button label="Edit workflow" icon={<Icon icon={Pencil} />} href={editHref} />
            <Button label="Delete workflow" variant="ghost" icon={<Icon icon={Trash2} />} onClick={() => setIsDeleting(true)} />
          </>
        }
      />

      <MetadataList orientation="horizontal">
        <MetadataListItem label="Starts" icon={<Icon icon={CalendarClock} size="sm" />}>{schedule}</MetadataListItem>
        <MetadataListItem label="Needs approval from" icon={<Icon icon={UserCheck} size="sm" />}>{approvers.length ? approvers.join(', ') : 'Nobody'}</MetadataListItem>
        <MetadataListItem label="Sends to" icon={<Icon icon={Send} size="sm" />}>{sendTo.length ? sendTo.join(', ') : 'Nobody yet'}</MetadataListItem>
      </MetadataList>

      <OverviewRuns runs={runs} emptyTitle="No runs yet" emptyDescription={isDraft ? 'It runs once it’s turned on.' : `The first run is ${nextRun}.`} />

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
