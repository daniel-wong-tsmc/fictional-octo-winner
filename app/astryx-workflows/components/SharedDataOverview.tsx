import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Icon} from '@astryxdesign/core/Icon';
import {CalendarClock, FileSpreadsheet, Plus, Send, User, Workflow as WorkflowIcon} from 'lucide-react';
import {OverviewFrame, OverviewHeading, OverviewRuns, OverviewSection, type OverviewRun} from '../parts/OverviewParts';
import {WorkflowSheetTable, type WorkflowSheet} from './WorkflowSheetTable';

export type SharedDataOverviewProps = {
  /** What the data is called, shown as the heading and in the breadcrumb. */
  name: string;
  /** One sentence on what it holds. */
  summary: string;
  /** When it was last updated, or when its last run failed. */
  updated: string;
  /** Who shares it. */
  sharedBy: string;
  /** Their workflow that makes it. */
  workflow: string;
  /** How often it updates. */
  updates: string;
  format: string;
  /** Its rows. */
  sheet: WorkflowSheet;
  /** Above the rows: how many, and which run they come from. */
  sheetNote: string;
  /** Runs of the workflow that makes it, newest first. */
  runs: OverviewRun[];
  /** Where Use in a new workflow goes. */
  useHref: string;
  /** Set when the last run failed: the message to show and how to ask the owner. The page then offers no Use button. */
  failure?: {message: string; askLabel: string; onAsk: () => void};
  homeHref?: string;
};

/**
 * The page for data someone else's workflow shares with you. It is built from the same parts as
 * WorkflowOverview (frame, heading, details row, Recent runs), so it reads like a workflow page.
 */
export function SharedDataOverview({
  name, summary, updated, sharedBy, workflow, updates, format, sheet, sheetNote, runs, useHref, failure,
  homeHref = '#home',
}: SharedDataOverviewProps) {
  return (
    <OverviewFrame name={name} homeHref={homeHref}>
      <OverviewHeading
        status={failure ? {tone: 'error', label: 'Failed'} : {tone: 'success', label: 'Ready'}}
        note={failure ? `Last run failed ${updated}` : `Updated ${updated}`}
        name={name}
        summary={summary}
        actions={
          failure ? (
            <Button label={failure.askLabel} icon={<Icon icon={Send} />} onClick={failure.onAsk} />
          ) : (
            <Button label="Use in a new workflow" variant="primary" icon={<Icon icon={Plus} />} href={useHref} />
          )
        }
      />

      {failure && <Banner status="error" title="No new data this time." description={failure.message} collapsible={false} />}

      <MetadataList orientation="horizontal">
        <MetadataListItem label="Shared by" icon={<Icon icon={User} size="sm" />}>{sharedBy}</MetadataListItem>
        <MetadataListItem label="From their workflow" icon={<Icon icon={WorkflowIcon} size="sm" />}>{workflow}</MetadataListItem>
        <MetadataListItem label="Updates" icon={<Icon icon={CalendarClock} size="sm" />}>{updates}</MetadataListItem>
        <MetadataListItem label="Format" icon={<Icon icon={FileSpreadsheet} size="sm" />}>{format}</MetadataListItem>
      </MetadataList>

      <OverviewRuns runs={runs} emptyTitle="No runs yet" emptyDescription={`It appears here once ${workflow} runs.`} />

      <OverviewSection title="The data" description={sheetNote}>
        <WorkflowSheetTable sheet={sheet} />
      </OverviewSection>
    </OverviewFrame>
  );
}
