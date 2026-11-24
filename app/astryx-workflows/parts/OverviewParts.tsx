import type {ReactNode} from 'react';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Card} from '@astryxdesign/core/Card';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Table, pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import type {WorkflowTileTone} from '../components/WorkflowTile';

/*
 * The pieces every overview page is made of: WorkflowOverview (a workflow) and SharedDataOverview (data
 * someone shares with you). Both pages build from these, so a change here changes both and they stay alike.
 */

/** One run. period identifies the row; started and finished are shown as date and time. */
export type OverviewRun = {period: string; started: string; tone: WorkflowTileTone; result: string; finished: string};

/**
 * The page frame: breadcrumbs from Home, then the content at the same width and padding. In a side panel
 * the panel has its own header, so the breadcrumbs are left out.
 */
export function OverviewFrame({name, homeHref, isInPanel = false, children}: {name: string; homeHref: string; isInPanel?: boolean; children: ReactNode}) {
  return (
    <Layout
      height="fill"
      contentWidth={1240}
      header={
        isInPanel ? undefined : <LayoutHeader hasDivider padding={4}>
          <Breadcrumbs>
            <BreadcrumbItem href={homeHref}>Home</BreadcrumbItem>
            <BreadcrumbItem isCurrent>{name}</BreadcrumbItem>
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

/** Status line, name and one sentence on the left; the page's buttons on the right. */
export function OverviewHeading({status, note, name, summary, actions}: {
  status: {tone: WorkflowTileTone; label: string};
  /** Next to the status, such as "Next run: …" or "Updated …". */
  note: string;
  name: string;
  summary: string;
  actions: ReactNode;
}) {
  return (
    <HStack gap={4} hAlign="between" vAlign="start" wrap="wrap">
      <VStack gap={1.5}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <HStack gap={1.5} vAlign="center">
            <StatusDot variant={status.tone} label={status.label} />
            <Text type="supporting" weight="medium">{status.label}</Text>
          </HStack>
          <Text type="supporting">{note}</Text>
        </HStack>
        <Heading level={1}>{name}</Heading>
        <Text type="supporting">{summary}</Text>
      </VStack>
      <HStack gap={2} wrap="wrap">{actions}</HStack>
    </HStack>
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
      <HStack gap={1.5} vAlign="center">
        <StatusDot variant={r.tone} label={r.result} />
        <Text>{r.result}</Text>
      </HStack>
    ),
  },
  {key: 'finished', header: 'Finished', width: pixel(140), renderCell: r => <Text hasTabularNumbers type="supporting">{r.finished}</Text>},
];

/** Recent runs, newest first. With none, says what's next. */
export function OverviewRuns({runs, emptyTitle, emptyDescription}: {runs: OverviewRun[]; emptyTitle: string; emptyDescription: string}) {
  return (
    <OverviewSection title="Recent runs">
      {runs.length ? (
        <Table data={runs as RunRow[]} columns={RUN_COLUMNS} idKey="period" density="balanced" />
      ) : (
        <EmptyState isCompact title={emptyTitle} description={emptyDescription} />
      )}
    </OverviewSection>
  );
}
