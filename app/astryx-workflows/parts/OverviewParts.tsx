import type {ReactNode} from 'react';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Card} from '@astryxdesign/core/Card';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Table, pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Link} from '@astryxdesign/core/Link';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {ChevronRight, type LucideIcon} from 'lucide-react';
import type {WorkflowTileTone} from '../components/WorkflowTile';
import {StatusText, type StatusKey, type StatusTone} from '../components/StatusText';

/*
 * The pieces every overview page is made of: WorkflowOverview (a workflow) and SharedDataOverview (data
 * someone shares with you). Both pages build from these, so a change here changes both and they stay alike.
 */

/**
 * One run. period identifies the row; started and finished are shown as date and time. With href, the result
 * links to that run and the row gets an open arrow.
 */
export type OverviewRun = {period: string; started: string; tone: WorkflowTileTone; result: string; finished: string; href?: string};

/**
 * The page frame: breadcrumbs from Home, then the content at the same width and padding. crumbs are the
 * pages after Home, the last being this page (it has no link). In a side panel the panel has its own
 * header, so the breadcrumbs are left out.
 */
export function OverviewFrame({crumbs, homeHref = '#home', isInPanel = false, children}: {
  crumbs: {label: string; href?: string}[];
  homeHref?: string;
  isInPanel?: boolean;
  children: ReactNode;
}) {
  return (
    <Layout
      height="fill"
      contentWidth={1240}
      header={
        isInPanel ? undefined : <LayoutHeader hasDivider padding={4}>
          <Breadcrumbs>
            <BreadcrumbItem href={homeHref}>Home</BreadcrumbItem>
            {crumbs.map((c, i) => (
              i === crumbs.length - 1
                ? <BreadcrumbItem key={c.label} isCurrent>{c.label}</BreadcrumbItem>
                : <BreadcrumbItem key={c.label} href={c.href}>{c.label}</BreadcrumbItem>
            ))}
          </Breadcrumbs>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>{children}</VStack>
        </LayoutContent>
      }
    />
  );
}

/** Status line, name and one sentence on the left; the page's buttons on the right, with an optional note under them. */
export function OverviewHeading({status, note, name, summary, actions, actionsNote}: {
  /** A status from STATUSES, or a tone and label of its own. */
  status: StatusKey | {tone: StatusTone; label: string};
  /** Next to the status, such as "Next run: …" or "Updated …". */
  note: string;
  name: string;
  summary: string;
  actions: ReactNode;
  /** Under the actions, such as where approving sends the result. */
  actionsNote?: string;
}) {
  return (
    <HStack gap={4} hAlign="between" vAlign="start" wrap="wrap">
      <VStack gap={1.5}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <StatusText status={status} />
          <Text type="supporting">{note}</Text>
        </HStack>
        <Heading level={1} textWrap="balance">{name}</Heading>
        <Text type="supporting">{summary}</Text>
      </VStack>
      <VStack gap={1.5} hAlign="end">
        <HStack gap={2} wrap="wrap">{actions}</HStack>
        {actionsNote && <Text type="supporting">{actionsNote}</Text>}
      </VStack>
    </HStack>
  );
}

/** The details row under the heading: each item a label, a small icon and its value. */
export function OverviewDetails({items}: {items: {label: string; icon: LucideIcon; value: ReactNode}[]}) {
  return (
    <MetadataList orientation="horizontal">
      {items.map(i => (
        <MetadataListItem key={i.label} label={i.label} icon={<Icon icon={i.icon} size="sm" />}>{i.value}</MetadataListItem>
      ))}
    </MetadataList>
  );
}

/** A titled card, such as Recent runs. */
export function OverviewSection({title, description, children}: {title: string; description?: string; children: ReactNode}) {
  return (
    <Card padding={0}>
      <VStack>
        <VStack gap={0.5} padding={4}>
          <Text type="label">{title}</Text>
          {description && <Text type="supporting">{description}</Text>}
        </VStack>
        {children}
      </VStack>
    </Card>
  );
}

type RunRow = OverviewRun & Record<string, unknown>;
const RUN_COLUMNS: TableColumn<RunRow>[] = [
  {key: 'started', header: 'Started', width: pixel(140), renderCell: r => <Text hasTabularNumbers type="supporting">{r.started}</Text>},
  {
    key: 'result',
    header: 'Result',
    // Keeps room for the result on a narrow screen; the table scrolls sideways instead of squeezing it.
    width: proportional(1, {minWidth: 180}),
    renderCell: r => (
      r.href
        ? <Link href={r.href} color="primary"><StatusText status={{tone: r.tone, label: r.result}} /></Link>
        : <StatusText status={{tone: r.tone, label: r.result}} />
    ),
  },
  {key: 'finished', header: 'Finished', width: pixel(140), renderCell: r => <Text hasTabularNumbers type="supporting">{r.finished}</Text>},
];

const OPEN_COLUMN: TableColumn<RunRow> = {
  key: 'open',
  header: '',
  width: pixel(56),
  align: 'end',
  renderCell: r => (r.href ? <Button label={`Open the run of ${r.started}`} tooltip="Open this run on the board" variant="ghost" size="sm" isIconOnly icon={<Icon icon={ChevronRight} />} href={r.href} /> : null),
};

/** Recent runs, newest first. Runs with an href open on the board. With none, says what's next. */
export function OverviewRuns({runs, emptyTitle, emptyDescription}: {runs: OverviewRun[]; emptyTitle: string; emptyDescription: string}) {
  const isLinked = runs.some(r => r.href);
  return (
    <OverviewSection title="Recent runs" description={isLinked ? 'Open a run to see each step’s numbers on the board, and where it stopped.' : undefined}>
      {runs.length ? (
        <Table data={runs as RunRow[]} columns={isLinked ? [...RUN_COLUMNS, OPEN_COLUMN] : RUN_COLUMNS} idKey="period" density="balanced" />
      ) : (
        <EmptyState isCompact title={emptyTitle} description={emptyDescription} />
      )}
    </OverviewSection>
  );
}
