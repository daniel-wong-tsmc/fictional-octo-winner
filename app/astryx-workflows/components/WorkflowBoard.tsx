import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {CalendarClock, CircleAlert, CircleCheck, Clock, Inbox} from 'lucide-react';

/** Where a workflow run stands. The board picks the lane and the wording from this. */
export type WorkflowBoardState = 'scheduled' | 'unscheduled' | 'draft' | 'dataReady' | 'dataFailed' | 'upstreamFailed' | 'needsApproval' | 'missingData' | 'complete';

/**
 * One card on the board: a workflow's next run, data someone else's workflow handed you, or a run that needs
 * you or has finished.
 */
export type WorkflowBoardItem = {
  id: string;
  /** Name of the workflow. For shared data, the other person's workflow that made it. */
  workflow: string;
  state: WorkflowBoardState;
  /** For shared data: what the other workflow hands you, shown as the card's title. */
  data?: string;
  /** For shared data, and for your workflow that didn't run because shared data failed: who owns the workflow that makes it. */
  owner?: string;
  /** The step the card is about, counting from 1, and how many steps the workflow has. */
  stepNumber?: number;
  stepCount?: number;
  /** For a scheduled run: when the workflow runs, such as "Every Monday, 8:00". */
  schedule?: string;
  /** The date and time that goes with the state, such as "Nov 2, 08:30". */
  at?: string;
  /** Where the card opens: its ticket or its workflow. */
  href?: string;
};

export type WorkflowBoardProps = {
  items: WorkflowBoardItem[];
};

const STATE: Record<WorkflowBoardState, {dot: 'info' | 'success' | 'warning' | 'error' | 'neutral'; step: string; when: string}> = {
  scheduled: {dot: 'neutral', step: '', when: 'Next run'},
  unscheduled: {dot: 'neutral', step: 'hasn’t run yet', when: 'Not scheduled'},
  draft: {dot: 'neutral', step: 'hasn’t run yet', when: 'Not scheduled'},
  dataReady: {dot: 'success', step: '', when: 'Ready'},
  dataFailed: {dot: 'error', step: '', when: 'Failed'},
  upstreamFailed: {dot: 'error', step: '', when: 'Didn’t run'},
  needsApproval: {dot: 'info', step: 'needs approval', when: 'Notified'},
  missingData: {dot: 'warning', step: 'is missing data', when: 'Notified'},
  complete: {dot: 'success', step: 'ran completely', when: 'Finished'},
};

/**
 * The lanes, left to right. To-run holds two groups. New data ready for use holds what other people's workflows
 * hand you that none of your workflows reads yet, including a failed run. Needs attention holds everything that
 * needs you, including your workflow that didn't run because the data it reads failed.
 */
const LANES: {title: string; icon: typeof Clock; empty: string; groups: {title?: string; states: WorkflowBoardState[]}[]}[] = [
  {
    title: 'To-run',
    icon: CalendarClock,
    empty: 'No workflows are waiting to run.',
    groups: [
      {title: 'Scheduled', states: ['scheduled']},
      {title: 'Unscheduled', states: ['unscheduled', 'draft']},
    ],
  },
  {title: 'New data ready for use', icon: Inbox, empty: 'No new data has been shared with you.', groups: [{states: ['dataReady', 'dataFailed']}]},
  {title: 'Needs attention', icon: CircleAlert, empty: 'Nothing needs you right now.', groups: [{states: ['upstreamFailed', 'needsApproval', 'missingData']}]},
  {title: 'Done', icon: CircleCheck, empty: 'Finished runs show here.', groups: [{states: ['complete']}]},
];

/** What a card says when another person's workflow failed before it made the data you use. */
export const upstreamFailedLine = (owner: string) => `Previous workflow failed to produce an output. Please ask ${owner} to check workflow.`;

/** "Step 3 of 3 needs approval", the schedule for a scheduled run, or where shared data comes from. */
export function boardLine(item: WorkflowBoardItem): string {
  if (item.state === 'scheduled') return item.schedule ?? '';
  if (item.state === 'dataReady') return `From ${item.owner ?? 'someone'}’s ${item.workflow}`;
  if (item.state === 'dataFailed' || item.state === 'upstreamFailed') return upstreamFailedLine(item.owner ?? 'its owner');
  const s = STATE[item.state];
  if (item.stepNumber && item.stepCount) return `Step ${item.stepNumber} of ${item.stepCount} ${s.step}`;
  if (item.state === 'draft') return 'Draft, not turned on yet';
  return item.state === 'unscheduled' ? 'Runs when you start it' : item.state === 'complete' ? 'Ran completely' : s.step;
}

/** "Next run Dec 1, 08:00", "Notified Nov 2, 08:30", or "Not scheduled". */
export function boardWhen(item: WorkflowBoardItem): string {
  const s = STATE[item.state];
  return item.at ? `${s.when} ${item.at}` : s.when;
}

function BoardCard({item}: {item: WorkflowBoardItem}) {
  const body = (
    <VStack gap={1.5}>
      <HStack gap={1.5} vAlign="center">
        <StatusDot variant={STATE[item.state].dot} label={boardLine(item)} />
        <Text weight="medium">{item.data ?? item.workflow}</Text>
      </HStack>
      <Text type="supporting">{boardLine(item)}</Text>
      <HStack gap={1} vAlign="center">
        <Icon icon={Clock} size="xsm" color="secondary" />
        <Text type="supporting" hasTabularNumbers>{boardWhen(item)}</Text>
      </HStack>
    </VStack>
  );
  return item.href ? (
    <ClickableCard label={`${item.data ?? item.workflow}: ${boardLine(item)}`} href={item.href} padding={3} width="100%">
      {body}
    </ClickableCard>
  ) : (
    <Card padding={3} width="100%">
      {body}
    </Card>
  );
}

/**
 * Home's board of workflow runs in four lanes: To-run (Scheduled and Unscheduled), New data ready for use, Needs attention
 * and Done. Each card is placed and worded from its state, so runs from any workflow look the same. Lanes sit
 * side by side and stack on narrow screens.
 */
export function WorkflowBoard({items}: WorkflowBoardProps) {
  return (
    <Grid columns={{minWidth: 240, max: 4, repeat: 'fit'}} gap={4} align="stretch">
      {LANES.map(lane => {
        const inLane = items.filter(i => lane.groups.some(g => g.states.includes(i.state)));
        return (
          <Card key={lane.title} variant="muted" padding={3} height="100%">
            <VStack gap={3}>
              <HStack gap={2} hAlign="between" vAlign="center">
                <HStack gap={1.5} vAlign="center">
                  <Icon icon={lane.icon} size="sm" color="secondary" />
                  <Text weight="medium">{lane.title}</Text>
                </HStack>
                <Text type="supporting" hasTabularNumbers>{String(inLane.length)}</Text>
              </HStack>
              {inLane.length === 0 ? (
                <EmptyState isCompact title={lane.empty} />
              ) : (
                lane.groups.map(g => {
                  const inGroup = items.filter(i => g.states.includes(i.state));
                  return (
                    <VStack key={g.title ?? lane.title} gap={2}>
                      {g.title && (
                        <HStack gap={1.5} vAlign="center">
                          <Text type="supporting" weight="medium">{g.title}</Text>
                          <Text type="supporting" hasTabularNumbers>{String(inGroup.length)}</Text>
                        </HStack>
                      )}
                      {inGroup.length ? inGroup.map(i => <BoardCard key={i.id} item={i} />) : g.title && <Text type="supporting">None</Text>}
                    </VStack>
                  );
                })
              )}
            </VStack>
          </Card>
        );
      })}
    </Grid>
  );
}
