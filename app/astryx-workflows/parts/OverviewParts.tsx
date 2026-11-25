import type {ReactNode} from 'react';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Card} from '@astryxdesign/core/Card';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {List, ListItem} from '@astryxdesign/core/List';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {ChevronRight, type LucideIcon} from 'lucide-react';
import type {WorkflowTileTone} from '../components/WorkflowTile';
import {StatusText, type StatusKey, type StatusTone} from '../components/StatusText';

/*
 * The pieces every overview page is made of: WorkflowOverview (a workflow) and SharedDataOverview (data
 * someone shares with you). Both pages build from these, so a change here changes both and they stay alike.
 */

/**
 * One run. period identifies the row; started and finished are shown as date and time. With href, the whole row
 * links to that run and shows an open arrow.
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
    <Card padding={4}>
      <VStack gap={3}>
        <VStack gap={0.5}>
          <Text type="label">{title}</Text>
          {description && <Text type="supporting">{description}</Text>}
        </VStack>
        {children}
      </VStack>
    </Card>
  );
}

/** Recent runs, newest first. Runs with an href open on the board. With none, says what's next. */
export function OverviewRuns({runs, emptyTitle, emptyDescription}: {runs: OverviewRun[]; emptyTitle: string; emptyDescription: string}) {
  const isLinked = runs.some(r => r.href);
  return (
    <OverviewSection title="Recent runs" description={isLinked ? 'Open a run to see each step’s numbers on the board, and where it failed.' : undefined}>
      {runs.length ? (
        // A list, not a table: each run with an href is one link, so the whole row opens it.
        <List hasDividers edge="bleed">
          {runs.map(r => (
            <ListItem
              key={r.period}
              label={<StatusText status={{tone: r.tone, label: r.result}} />}
              description={`Started ${r.started}, finished ${r.finished}`}
              href={r.href}
              endContent={r.href ? <Icon icon={ChevronRight} color="secondary" /> : undefined}
            />
          ))}
        </List>
      ) : (
        <EmptyState isCompact title={emptyTitle} description={emptyDescription} />
      )}
    </OverviewSection>
  );
}
