import {Fragment, useState} from 'react';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Icon} from '@astryxdesign/core/Icon';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {
  ArrowDown, ArrowRight, CalendarClock, Pencil, Play, Send, Trash2, UserCheck,
} from 'lucide-react';
import {WorkflowTile, type WorkflowTileContent, type WorkflowTileTone} from './WorkflowTile';
import {OverviewFrame, OverviewHeading, OverviewRuns, type OverviewRun} from '../parts/OverviewParts';

export type WorkflowTone = WorkflowTileTone;

/** One tile of the workflow, drawn with WorkflowTile: where data comes from, an LLM step, or who the result is passed on to. */
export type WorkflowStage = {
  id: string;
  /** What the tile says. Its kind sets which details it shows. */
  content: WorkflowTileContent;
  status?: {tone: WorkflowTone; label: string};
};


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
  /** Stages in run order. Each column runs after the one before it; stages in one column run side by side. */
  columns: WorkflowStage[][];
  /** Called when a stage is clicked. Without it, stages are not clickable. */
  onOpenStage?: (stage: WorkflowStage) => void;
  runs: WorkflowRun[];
  /** Where Edit workflow goes. */
  editHref: string;
  onRunNow: () => void;
  /** Called after the person confirms the delete. */
  onDelete: () => void;
  homeHref?: string;
  /** A draft hasn't been turned on: the page says Draft and shows no next run. */
  isDraft?: boolean;
};

/** Each column takes an equal share of the row, up to this width. Narrow screens stack the columns instead. */
const STAGE_MAX_WIDTH = 280;

function StageCard({stage, onOpen}: {stage: WorkflowStage; onOpen?: (s: WorkflowStage) => void}) {
  return (
    <WorkflowTile content={stage.content} status={stage.status} onClick={onOpen ? () => onOpen(stage) : undefined} />
  );
}

/**
 * The page for one workflow: what it is, when it runs, its recent runs, and its stages in order.
 * Every workflow page uses it, so they all look the same.
 */
export function WorkflowOverview({
  name, summary, schedule, nextRun, approvers, sendTo, columns, onOpenStage, runs, editHref, onRunNow, onDelete,
  homeHref = '#home',
  isDraft = false,
}: WorkflowOverviewProps) {
  const isVertical = useMediaQuery('(max-width: 900px)');
  const [isDeleting, setIsDeleting] = useState(false);
  return (
    <OverviewFrame name={name} homeHref={homeHref}>
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

      <VStack gap={2}>
        <VStack gap={0.5}>
          <Text type="label">How it runs</Text>
          <Text type="supporting">
            {`The tiles in the order they run. Tiles stacked together run side by side.${onOpenStage ? ' Click a tile to open it on the board.' : ''}`}
          </Text>
        </VStack>
        {isVertical ? (
          <VStack gap={2}>
            {columns.map((col, i) => (
              <VStack key={i} gap={2}>
                {i > 0 && (
                  <HStack hAlign="center">
                    <Icon icon={ArrowDown} color="secondary" />
                  </HStack>
                )}
                {col.map(st => <StageCard key={st.id} stage={st} onOpen={onOpenStage} />)}
              </VStack>
            ))}
          </VStack>
        ) : (
          // Columns share the width, so a five-column workflow fits without scrolling on a laptop.
          <HStack gap={2} vAlign="center" isScrollable>
            {columns.map((col, i) => (
              <Fragment key={i}>
                {i > 0 && <Icon icon={ArrowRight} color="secondary" />}
                <VStack gap={2} width={`${100 / columns.length}%`} maxWidth={STAGE_MAX_WIDTH}>
                  {col.map(st => <StageCard key={st.id} stage={st} onOpen={onOpenStage} />)}
                </VStack>
              </Fragment>
            ))}
          </HStack>
        )}
      </VStack>
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
