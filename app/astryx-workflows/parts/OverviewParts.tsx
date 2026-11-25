import type {ReactNode} from 'react';
import {Layout, LayoutContent, LayoutHeader, LayoutPanel} from '@astryxdesign/core/Layout';
import {ButtonGroup} from '@astryxdesign/core/ButtonGroup';
import {Button} from '@astryxdesign/core/Button';
import {useToast} from '@astryxdesign/core/Toast';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Card} from '@astryxdesign/core/Card';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {List, ListItem} from '@astryxdesign/core/List';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Link} from '@astryxdesign/core/Link';
import {Icon} from '@astryxdesign/core/Icon';
import {ChevronRight, FileText, Link2, type LucideIcon} from 'lucide-react';
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
export function OverviewFrame({crumbs, homeHref = '#home', isInPanel = false, aside, children}: {
  crumbs: {label: string; href?: string}[];
  homeHref?: string;
  isInPanel?: boolean;
  /**
   * The page's quick facts, such as Starts or Format, in a column on the right beside the content, which
   * scrolls on its own. Keep it short enough not to scroll. On a phone it follows the content.
   */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const isPhone = useMediaQuery('(max-width: 640px)');
  const asideBelow = !!aside && isPhone;
  return (
    <Layout
      height="fill"
      contentWidth={aside ? undefined : 1240}
      end={aside && !isPhone ? <LayoutPanel width={isInPanel ? 240 : 300} padding={isInPanel ? 4 : 6} hasDivider isScrollable={false} label="Details">{aside}</LayoutPanel> : undefined}
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
        <LayoutContent padding={isInPanel ? 4 : 6}>
          <VStack gap={6}>
            {children}
            {asideBelow && aside}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

/** Status line, name and one sentence on the left; the page's buttons on the right, with an optional note under them. */
export function OverviewHeading({status, note, name, nameHref, share, summary, actions, actionsNote}: {
  /** A status from STATUSES, or a tone and label of its own. */
  status: StatusKey | {tone: StatusTone; label: string};
  /** Next to the status, such as "Next run: …" or "Updated …". */
  note: string;
  name: string;
  /** In Home's side panel: the page's own address, so its title opens the full page. */
  nameHref?: string;
  /** Copy link and Copy as Markdown at the top, so the page can be shared: its address and a Markdown summary. */
  share?: {href: string; markdown: string};
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
        <Heading level={1} textWrap="balance">
          {nameHref ? <Link href={nameHref} type="inherit" color="inherit" tooltip="Open full page">{name}</Link> : name}
        </Heading>
        <Text type="supporting">{summary}</Text>
      </VStack>
      <VStack gap={1.5} hAlign="end">
        <HStack gap={2} wrap="wrap">
          {share && <ShareButtons {...share} />}
          {actions}
        </HStack>
        {actionsNote && <Text type="supporting">{actionsNote}</Text>}
      </VStack>
    </HStack>
  );
}

/**
 * A page as Markdown, for Copy as Markdown: its name, status and summary, its details, then any sections
 * (such as the steps or a table of rows) and its recent runs. Every overview page builds its copy with this,
 * so they paste the same way.
 */
export function overviewMarkdown({name, status, summary, details, sections = [], runs = []}: {
  name: string;
  status: string;
  summary: string;
  details: {label: string; value: string}[];
  sections?: {title: string; body: string}[];
  runs?: OverviewRun[];
}): string {
  const cell = (v: string) => v.replace(/\|/g, '\\|');
  return [
    `# ${name}`,
    `**${status}.** ${summary}`,
    details.map(d => `- **${d.label}:** ${d.value}`).join('\n'),
    ...sections.map(s => `## ${s.title}\n\n${s.body}`),
    runs.length
      ? `## Recent runs\n\n| Started | Result | Finished |\n| --- | --- | --- |\n${runs.map(r => `| ${cell(r.started)} | ${cell(r.result)} | ${cell(r.finished)} |`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n\n');
}

/** A Markdown table from column names and rows of text. */
export const markdownTable = (columns: string[], rows: string[][]) =>
  [`| ${columns.join(' | ')} |`, `| ${columns.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');

/** Copy link and Copy as Markdown. The link is the page's full address; Markdown is a summary to paste anywhere. */
function ShareButtons({href, markdown}: {href: string; markdown: string}) {
  const toast = useToast();
  const copy = (text: string, done: string) => {
    void navigator.clipboard?.writeText(text).then(() => toast({body: done}), () => toast({body: 'Couldn’t copy. Your browser blocked the clipboard.'}));
  };
  const url = new URL(href, window.location.href).href;
  return (
    <ButtonGroup label="Share">
      <Button label="Copy link" tooltip="Copy link" variant="ghost" isIconOnly icon={<Icon icon={Link2} />} onClick={() => copy(url, 'Link copied.')} />
      <Button label="Copy as Markdown" tooltip="Copy as Markdown" variant="ghost" isIconOnly icon={<Icon icon={FileText} />} onClick={() => copy(`${markdown}\n\n[Open in Workspace](${url})\n`, 'Copied as Markdown.')} />
    </ButtonGroup>
  );
}

/** The details row under the heading: each item a label, a small icon and its value. */
export function OverviewDetails({items}: {items: {label: string; icon: LucideIcon; value: ReactNode}[]}) {
  return (
    <MetadataList title={<Text type="label">Details</Text>} label={{position: 'top'}}>
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
