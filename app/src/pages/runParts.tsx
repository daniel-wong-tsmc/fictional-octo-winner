import {Bot} from 'lucide-react';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {List, ListItem} from '@astryxdesign/core/List';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Icon} from '@astryxdesign/core/Icon';

/**
 * What the agent did on a run, in plain words: a "What the agent did" label and the lines as a compact list.
 * With no lines it shows emptyText, or nothing when emptyText isn't given. Set hasLabel to false where the
 * surrounding heading already says it.
 */
export function AgentDidList({lines, emptyText, hasLabel = true}: {lines: string[]; emptyText?: string; hasLabel?: boolean}) {
  if (lines.length === 0 && !emptyText) return null;
  return (
    <VStack gap={1.5}>
      {hasLabel && (
        <HStack gap={1.5} vAlign="center">
          <Icon icon={Bot} size="sm" color="secondary" />
          <Text type="label">What the agent did</Text>
        </HStack>
      )}
      {lines.length > 0 ? (
        <List hasDividers={false} density="compact" edge="outset">
          {lines.map(line => <ListItem key={line} label={<Text type="supporting">{line}</Text>} />)}
        </List>
      ) : (
        <Text type="supporting">{emptyText}</Text>
      )}
    </VStack>
  );
}

/** The Python a step ran, folded away until asked for: a "Show the code" row that opens a wrapped code block. */
export function ShowCode({code}: {code: string}) {
  return (
    <Collapsible defaultIsOpen={false} chevronPosition="start" trigger={<Text type="supporting" weight="medium">Show the code</Text>}>
      <CodeBlock code={code} language="python" width="100%" size="sm" isWrapped />
    </Collapsible>
  );
}
