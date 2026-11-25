import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Sparkles} from 'lucide-react';
import {useState} from 'react';
import {NOW} from '../schedule';
import {WorkflowBoard, type WorkflowBoardItem} from '@workspace/astryx-workflows/components/WorkflowBoard';

function greeting(): string {
  const h = NOW.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Home: the agent box, then the board of workflow runs in four lanes. */
export function HomePage({items}: {items: WorkflowBoardItem[]}) {
  const [ask, setAsk] = useState('');
  // The prototype's today, the same one every schedule and next run counts from.
  const today = NOW.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});

  return (
    <Layout
      height="fill"
      contentWidth={1240}
      header={
        <LayoutHeader hasDivider padding={4}>
          <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
            <HStack gap={2} vAlign="center">
              <Heading level={5} accessibilityLevel={1}>{greeting()}</Heading>
              <Text type="supporting">{today}</Text>
            </HStack>
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
            <WorkflowBoard items={items} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
