import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {List, ListItem} from '@astryxdesign/core/List';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {ChevronRight} from 'lucide-react';

/** The condition of one step, as its ticket reports it. Each has one fixed wording and dot color. */
export type WorkflowTaskCondition = 'needsApproval' | 'complete' | 'missingData' | 'notRun';

/** One task from any workflow. Every workflow hands its tasks over in this shape. */
export type WorkflowTask = {
  id: string;
  /** Name of the workflow the step belongs to. */
  workflow: string;
  /** Position of the step in its workflow, counting from 1. */
  stepNumber: number;
  /** How many steps the workflow has. */
  stepCount: number;
  condition: WorkflowTaskCondition;
  /** When the person was notified, as an ISO date and time. */
  notifiedAt?: string;
  /** Where the task opens, usually its ticket. */
  href?: string;
};

export type WorkflowTaskListProps = {
  tasks: WorkflowTask[];
  /** Heading above the list. */
  title?: string;
};

const CONDITION: Record<WorkflowTaskCondition, {dot: 'info' | 'success' | 'warning' | 'neutral'; label: string}> = {
  needsApproval: {dot: 'info', label: 'needs approval'},
  complete: {dot: 'success', label: 'ran completely'},
  missingData: {dot: 'warning', label: 'is missing data'},
  notRun: {dot: 'neutral', label: 'hasn’t run yet'},
};

/** "Step 3 of 3 needs approval". */
export function taskLine(t: WorkflowTask): string {
  return `Step ${t.stepNumber} of ${t.stepCount} ${CONDITION[t.condition].label}`;
}

/** "Nov 2, 08:30". */
function notifiedLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const time = d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
  return `${date}, ${time}`;
}

function TaskRow({task}: {task: WorkflowTask}) {
  const line = taskLine(task);
  return (
    <ListItem
      itemKey={task.id}
      href={task.href}
      align="first-line"
      startContent={<StatusDot variant={CONDITION[task.condition].dot} label={line} />}
      label={<Text weight="medium">{task.workflow}</Text>}
      description={line}
      endContent={
        <HStack gap={2} vAlign="center">
          {task.notifiedAt && <Text type="supporting" hasTabularNumbers>{notifiedLabel(task.notifiedAt)}</Text>}
          {task.href && <Icon icon={ChevronRight} size="sm" color="secondary" />}
        </HStack>
      }
    />
  );
}

/**
 * The to-do list: one row per task, newest first, each as the workflow name, "Step X of Y" with the step's
 * condition, and when the person was notified. Steps that ran completely move into a closed Done section.
 */
export function WorkflowTaskList({tasks, title = 'To do'}: WorkflowTaskListProps) {
  const sorted = [...tasks].sort((a, b) => (b.notifiedAt ?? '').localeCompare(a.notifiedAt ?? ''));
  const open = sorted.filter(t => t.condition !== 'complete');
  const done = sorted.filter(t => t.condition === 'complete');
  return (
    <VStack gap={6}>
      <Heading level={2}>{title}</Heading>
      {open.length ? (
        <List density="balanced" edge="outset">
          {open.map(t => <TaskRow key={t.id} task={t} />)}
        </List>
      ) : (
        <EmptyState isCompact title="Nothing needs you right now" description="New tasks show up here when a workflow needs your OK or runs into a problem." />
      )}
      {done.length > 0 && (
        <Collapsible defaultIsOpen={false} chevronPosition="start" trigger={<Text type="label" color="secondary">{`Done · ${done.length}`}</Text>}>
          <List density="balanced" edge="outset">
            {done.map(t => <TaskRow key={t.id} task={t} />)}
          </List>
        </Collapsible>
      )}
    </VStack>
  );
}
