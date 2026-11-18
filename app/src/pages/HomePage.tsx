import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {List, ListItem} from '@astryxdesign/core/List';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Icon} from '@astryxdesign/core/Icon';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {ChevronRight, Plus, Sparkles} from 'lucide-react';
import {useState} from 'react';
import {TICKETS, ticketCondition, type Task, type TicketCondition} from '../data';
import {stepPosition} from '../workflow';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const CONDITION: Record<TicketCondition, {dot: 'info' | 'success' | 'warning' | 'neutral'; label: string}> = {
  needsApproval: {dot: 'info', label: 'needs approval'},
  complete: {dot: 'success', label: 'ran completely'},
  missingData: {dot: 'warning', label: 'is missing data'},
  notRun: {dot: 'neutral', label: 'hasn’t run yet'},
};

/** "Nov 2, 08:30": when the step finished and the person was notified. */
function notifiedLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const time = d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
  return `${date}, ${time}`;
}

type Row = {task: Task; condition: TicketCondition};

/**
 * One task, read from its ticket: the workflow's name, the step's position and the ticket's condition,
 * then when the step finished. The position is counted from the workflow's steps where they are on record.
 */
function TaskRow({row: {task, condition}}: {row: Row}) {
  const t = TICKETS[task.ticketId];
  const c = CONDITION[condition];
  const line = `${stepPosition(t.workflow, t.step) ?? t.position} ${c.label}`;
  return (
    <ListItem
      itemKey={task.id}
      href={`#ticket-${task.ticketId}`}
      align="first-line"
      startContent={<StatusDot variant={c.dot} label={line} />}
      label={<Text weight="medium">{t.workflow}</Text>}
      description={line}
      endContent={
        <HStack gap={2} vAlign="center">
          {t.finishedAt && <Text type="supporting" hasTabularNumbers>{notifiedLabel(t.finishedAt)}</Text>}
          <Icon icon={ChevronRight} size="sm" color="secondary" />
        </HStack>
      }
    />
  );
}

export function HomePage({tasks, approved}: {tasks: Task[]; approved: number[]}) {
  const [ask, setAsk] = useState('');
  const today = new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});
  // Each row's condition comes from its ticket. Newest first; steps that ran completely move to Done.
  const rows: Row[] = tasks
    .map(task => ({task, condition: ticketCondition(TICKETS[task.ticketId], approved.includes(task.ticketId))}))
    .sort((x, y) => (TICKETS[y.task.ticketId].finishedAt ?? '').localeCompare(TICKETS[x.task.ticketId].finishedAt ?? ''));
  const done = rows.filter(r => r.condition === 'complete');
  const open = rows.filter(r => r.condition !== 'complete');

  return (
    <Layout
      height="fill"
      contentWidth={720}
      header={
        <LayoutHeader hasDivider padding={4}>
          <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
            <HStack gap={2} vAlign="center">
              <Heading level={5} accessibilityLevel={1}>{greeting()}</Heading>
              <Text type="supporting">{today}</Text>
            </HStack>
            <Button label="New workflow" variant="ghost" icon={<Icon icon={Plus} />} href="#workflow-new" />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={8}>
            <TextInput
              label="Ask the agent"
              isLabelHidden
              size="lg"
              startIcon={Sparkles}
              placeholder="Ask the agent to set up a workflow or explain a number…"
              value={ask}
              onChange={setAsk}
              isDisabled
              disabledMessage="Coming soon: ask the agent from here."
            />
            <VStack gap={6}>
              <Heading level={2}>To do</Heading>
              {open.length === 0 && (
                <EmptyState isCompact title="Nothing needs you right now" description="New tasks show up here when a workflow needs your OK or runs into a problem." />
              )}
              {open.length > 0 && (
                <List density="balanced" edge="outset">
                  {open.map(r => <TaskRow key={r.task.id} row={r} />)}
                </List>
              )}
              {done.length > 0 && (
                <Collapsible
                  defaultIsOpen={false}
                  chevronPosition="start"
                  trigger={<Text type="label" color="secondary">{`Done · ${done.length}`}</Text>}>
                  <List density="balanced" edge="outset">
                    {done.map(r => <TaskRow key={r.task.id} row={r} />)}
                  </List>
                </Collapsible>
              )}
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
