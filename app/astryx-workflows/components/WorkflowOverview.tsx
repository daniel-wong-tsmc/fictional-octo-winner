import {Fragment, useState, type CSSProperties} from 'react';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Card} from '@astryxdesign/core/Card';
import {List, ListItem} from '@astryxdesign/core/List';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Table, pixel, type TableColumn} from '@astryxdesign/core/Table';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {
  ArrowDown, ArrowRight, ArrowRightLeft, CalendarClock, Pencil, Play, Send, Trash2, UserCheck,
} from 'lucide-react';
import {WorkflowTile, type WorkflowTileContent, type WorkflowTileTone} from './WorkflowTile';

export type WorkflowTone = WorkflowTileTone;

/** One tile of the workflow, drawn with WorkflowTile: where data comes from, an LLM step, or who the result is passed on to. */
export type WorkflowStage = {
  id: string;
  /** What the tile says. Its kind sets which details it shows. */
  content: WorkflowTileContent;
  status?: {tone: WorkflowTone; label: string};
};

/** A value shared between workflows. */
export type WorkflowHandoff = {id: string; name: string; detail: string};

export type WorkflowRun = {period: string; tone: WorkflowTone; result: string; finished: string};

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
  uses: WorkflowHandoff[];
  shares: WorkflowHandoff[];
  runs: WorkflowRun[];
  /** Where Edit workflow goes. */
  editHref: string;
  onRunNow: () => void;
  /** Called after the person confirms the delete. */
  onDelete: () => void;
  homeHref?: string;
};

/** Each column takes an equal share of the row, down to a readable minimum, then the row scrolls. */
const STAGE_COLUMN: CSSProperties = {flex: '1 1 0', minWidth: 180, maxWidth: 280};

function StageCard({stage, onOpen}: {stage: WorkflowStage; onOpen?: (s: WorkflowStage) => void}) {
  return (
    <WorkflowTile content={stage.content} status={stage.status} onClick={onOpen ? () => onOpen(stage) : undefined} />
  );
}

function HandoffList({title, items, emptyText}: {title: string; items: WorkflowHandoff[]; emptyText: string}) {
  return (
    <Card padding={4}>
      <List header={<Text type="label">{title}</Text>} hasDividers edge="outset">
        {items.length ? (
          items.map(h => (
            <ListItem
              key={h.id}
              startContent={<Icon icon={ArrowRightLeft} size="sm" color="secondary" />}
              label={<Text weight="medium">{h.name}</Text>}
              description={h.detail}
            />
          ))
        ) : (
          <ListItem label={<Text type="supporting">{emptyText}</Text>} />
        )}
      </List>
    </Card>
  );
}

type RunRow = WorkflowRun & Record<string, unknown>;

/**
 * The page for one workflow: what it is, when it runs, its stages in order, what it shares, and its runs.
 * Every workflow page uses it, so they all look the same.
 */
export function WorkflowOverview({
  name, summary, schedule, nextRun, approvers, sendTo, columns, onOpenStage, uses, shares, runs, editHref, onRunNow, onDelete,
  homeHref = '#home',
}: WorkflowOverviewProps) {
  const isVertical = useMediaQuery('(max-width: 900px)');
  const [isDeleting, setIsDeleting] = useState(false);
  const runColumns: TableColumn<RunRow>[] = [
    {key: 'period', header: 'Month', renderCell: r => <Text weight="medium">{r.period}</Text>},
    {
      key: 'result',
      header: 'Result',
      renderCell: r => (
        <HStack gap={1.5} vAlign="center">
          <StatusDot variant={r.tone} label={r.result} />
          <Text>{r.result}</Text>
        </HStack>
      ),
    },
    {key: 'finished', header: 'Finished', width: pixel(140), renderCell: r => <Text hasTabularNumbers type="supporting">{r.finished}</Text>},
  ];

  return (
    <Layout
      height="fill"
      contentWidth={1240}
      header={
        <LayoutHeader hasDivider padding={4}>
          <Breadcrumbs>
            <BreadcrumbItem href={homeHref}>Home</BreadcrumbItem>
            <BreadcrumbItem isCurrent>{name}</BreadcrumbItem>
          </Breadcrumbs>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <HStack gap={4} hAlign="between" vAlign="start" wrap="wrap">
              <VStack gap={1.5}>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <HStack gap={1.5} vAlign="center">
                    <StatusDot variant="success" label="On" />
                    <Text type="supporting" weight="medium">On</Text>
                  </HStack>
                  <Text type="supporting">{`Next run: ${nextRun}`}</Text>
                </HStack>
                <Heading level={1}>{name}</Heading>
                <Text type="supporting">{summary}</Text>
              </VStack>
              <HStack gap={2} wrap="wrap">
                <Button label="Run now" icon={<Icon icon={Play} />} onClick={onRunNow} />
                <Button label="Edit workflow" icon={<Icon icon={Pencil} />} href={editHref} />
                <Button label="Delete workflow" variant="ghost" icon={<Icon icon={Trash2} />} onClick={() => setIsDeleting(true)} />
              </HStack>
            </HStack>

            <MetadataList orientation="horizontal">
              <MetadataListItem label="Starts" icon={<Icon icon={CalendarClock} size="sm" />}>{schedule}</MetadataListItem>
              <MetadataListItem label="Needs an OK from" icon={<Icon icon={UserCheck} size="sm" />}>{approvers.length ? approvers.join(', ') : 'Nobody'}</MetadataListItem>
              <MetadataListItem label="Sends to" icon={<Icon icon={Send} size="sm" />}>{sendTo.length ? sendTo.join(', ') : 'Nobody yet'}</MetadataListItem>
            </MetadataList>

            <VStack gap={2}>
              <VStack gap={0.5}>
                <Text type="label">How it runs</Text>
                <Text type="supporting">
                  {`The tiles in the order they run. Tiles stacked together run side by side.${onOpenStage ? ' Click a tile to see it.' : ''}`}
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
                      <VStack gap={2} style={STAGE_COLUMN}>
                        {col.map(st => <StageCard key={st.id} stage={st} onOpen={onOpenStage} />)}
                      </VStack>
                    </Fragment>
                  ))}
                </HStack>
              )}
            </VStack>

            <Grid columns={{minWidth: 320, max: 2, repeat: 'fit'}} gap={3} align="start">
              <HandoffList title="Uses from other workflows" items={uses} emptyText="Nothing from other workflows." />
              <HandoffList title="Shares with other workflows" items={shares} emptyText="Nothing shared yet. Add a handoff from a step’s output sheet." />
            </Grid>

            <Card padding={0}>
              <VStack>
                <HStack padding={4}>
                  <Text type="label">Recent runs</Text>
                </HStack>
                {runs.length ? (
                  <Table data={runs as RunRow[]} columns={runColumns} idKey="period" density="balanced" />
                ) : (
                  <EmptyState isCompact title="No runs yet" description={`The first run is ${nextRun}.`} />
                )}
              </VStack>
            </Card>
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
        </LayoutContent>
      }
    />
  );
}
