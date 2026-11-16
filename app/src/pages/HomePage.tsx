import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {List, ListItem} from '@astryxdesign/core/List';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Icon} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {ChevronRight, Plus, Sparkles} from 'lucide-react';
import {useState} from 'react';
import {STATUS, type Task} from '../data';
import {RefLabel} from './shared';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function TaskRow({task, hideWorkflow}: {task: Task; hideWorkflow?: boolean}) {
  const s = task.status ? STATUS[task.status] : STATUS.draft;
  return (
    <ListItem
      itemKey={task.id}
      href={task.ticketId ? `#ticket-${task.ticketId}` : undefined}
      align="first-line"
      startContent={<StatusDot variant={s.dot} label={s.label} />}
      label={
        <Text weight="medium" hasStrikethrough={task.group === 'done'} color={task.group === 'done' ? 'secondary' : 'primary'}>
          {task.title}
        </Text>
      }
      description={
        <HStack gap={3} wrap="wrap" vAlign="center">
          {task.status && task.group !== 'done' && <Text type="supporting" weight="medium">{s.label}</Text>}
          {task.ref && !(hideWorkflow && task.ref[0] === 'workflow') && <RefLabel kind={task.ref[0]} label={task.ref[1]} />}
          {task.why && <Text type="supporting">{task.why}</Text>}
        </HStack>
      }
      endContent={
        <HStack gap={2} vAlign="center">
          <Text type="supporting" hasTabularNumbers>{task.when}</Text>
          {task.ticketId && <Icon icon={ChevronRight} size="sm" color="secondary" />}
        </HStack>
      }
    />
  );
}

/** Workflow pages that exist in the prototype. */
const WORKFLOW_HREF: Record<string, string> = {'Monthly sales close': '#workflow-1'};

const workflowOf = (t: Task) => (t.ref?.[0] === 'workflow' ? t.ref[1] : 'Other');

/** Tasks for one workflow, under the workflow's name. The name opens the workflow page. */
function WorkflowGroup({name, tasks}: {name: string; tasks: Task[]}) {
  const href = WORKFLOW_HREF[name];
  return (
    <List
      density="balanced"
      edge="outset"
      header={
        <HStack gap={2} vAlign="center" hAlign="between">
          {href ? (
            <Link href={href} tooltip={`Open ${name}`}>
              <Text type="label">{name}</Text>
            </Link>
          ) : (
            <Text type="label">{name}</Text>
          )}
          <Text type="supporting">{`${tasks.length} ${tasks.length === 1 ? 'needs' : 'need'} you`}</Text>
        </HStack>
      }>
      {tasks.map(t => <TaskRow key={t.id} task={t} hideWorkflow />)}
    </List>
  );
}

export function HomePage({tasks}: {tasks: Task[]}) {
  const [ask, setAsk] = useState('');
  const today = new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});
  const done = tasks.filter(t => t.group === 'done');
  const open = tasks.filter(t => t.group !== 'done');

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
            />
            <VStack gap={6}>
              <VStack gap={1}>
                <Heading level={2}>To do</Heading>
                <Text type="supporting">
                  What your workflows need from you, grouped by workflow. Open a task to see its ticket. Rows are example data.
                </Text>
              </VStack>
              {open.length === 0 && <Text type="supporting">Nothing needs you right now.</Text>}
              {[...new Set(open.map(workflowOf))].map(name => (
                <WorkflowGroup key={name} name={name} tasks={open.filter(t => workflowOf(t) === name)} />
              ))}
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
