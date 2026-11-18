import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Icon} from '@astryxdesign/core/Icon';
import {Plus, Sparkles} from 'lucide-react';
import {useState} from 'react';
import {WorkflowTaskList, type WorkflowTask} from '@workspace/astryx-workflows/components/WorkflowTaskList';
import type {Task} from '../data';
import {toWorkflowTask} from '../tasks';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function HomePage({tasks, approved}: {tasks: Task[]; approved: number[]}) {
  const [ask, setAsk] = useState('');
  const today = new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});
  // Every task goes through the same mapping, so tasks from any workflow look the same.
  const items = tasks.map(t => toWorkflowTask(t, approved)).filter((t): t is WorkflowTask => !!t);

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
            <WorkflowTaskList tasks={items} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
