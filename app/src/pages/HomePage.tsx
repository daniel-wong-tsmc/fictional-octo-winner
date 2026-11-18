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
import type {Task, TaskState} from '../data';
import {stepPosition} from '../workflow';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const STATE: Record<TaskState, {dot: 'info' | 'success' | 'warning'; label: string}> = {
  needsApproval: {dot: 'info', label: 'needs approval'},
  complete: {dot: 'success', label: 'ran completely'},
  missingData: {dot: 'warning', label: 'is missing data'},
};

/** "Nov 2, 08:30": when the workflow notified the person. */
function notifiedLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const time = d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
  return `${date}, ${time}`;
}

/**
 * One task: the workflow's name, then which step it is about and its state, then when the person was told.
 * Every part comes from the task's fields; the step position is counted from the workflow.
 */
function TaskRow({task}: {task: Task}) {
  const s = STATE[task.state];
  const position = stepPosition(task.workflow, task.step) ?? task.step;
  return (
    <ListItem
      itemKey={task.id}
      href={task.ticketId ? `#ticket-${task.ticketId}` : undefined}
      align="first-line"
      startContent={<StatusDot variant={s.dot} label={`${position} ${s.label}`} />}
      label={<Text weight="medium">{task.workflow}</Text>}
      description={`${position} ${s.label}`}
      endContent={
        <HStack gap={2} vAlign="center">
          <Text type="supporting" hasTabularNumbers>{notifiedLabel(task.notifiedAt)}</Text>
          {task.ticketId && <Icon icon={ChevronRight} size="sm" color="secondary" />}
        </HStack>
      }
    />
  );
}

export function HomePage({tasks}: {tasks: Task[]}) {
  const [ask, setAsk] = useState('');
  const today = new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});
  // Newest first. Steps that ran completely move to Done.
  const sorted = [...tasks].sort((x, y) => y.notifiedAt.localeCompare(x.notifiedAt));
  const done = sorted.filter(t => t.state === 'complete');
  const open = sorted.filter(t => t.state !== 'complete');

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
                  {open.map(t => <TaskRow key={t.id} task={t} />)}
                </List>
              )}
              {done.length > 0 && (
                <Collapsible
                  defaultIsOpen={false}
                  chevronPosition="start"
                  trigger={<Text type="label" color="secondary">{`Done · ${done.length}`}</Text>}>
                  <List density="balanced" edge="outset">
                    {done.map(t => <TaskRow key={t.id} task={t} />)}
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
