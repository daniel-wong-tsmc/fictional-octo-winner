import {Layout, LayoutContent, LayoutFooter, LayoutHeader} from '@astryxdesign/core/Layout';
import {VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {TextInput} from '@astryxdesign/core/TextInput';
import {ChatMessage, ChatMessageBubble, ChatMessageList} from '@astryxdesign/core/Chat';
import {Sparkles} from 'lucide-react';
import type {Chat} from '../chats';

/** One past conversation with the agent, read only. Continuing it comes with the real build. */
export function ChatPage({chat}: {chat: Chat}) {
  const updated = new Date(chat.updatedAt).toLocaleString('en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false});
  return (
    <Layout
      height="fill"
      contentWidth={720}
      header={
        <LayoutHeader hasDivider padding={4}>
          <VStack gap={1}>
            <Breadcrumbs>
              <BreadcrumbItem href="#home">Home</BreadcrumbItem>
              <BreadcrumbItem isCurrent>Chat history</BreadcrumbItem>
            </Breadcrumbs>
            <Heading level={1}>{chat.title}</Heading>
            <Text type="supporting">{`Last message ${updated}`}</Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <ChatMessageList align="top">
            {chat.turns.map((turn, i) => (
              <ChatMessage key={i} sender={turn.sender}>
                <ChatMessageBubble name={turn.sender === 'assistant' && <Text type="supporting" weight="semibold" color="secondary">Agent</Text>}>
                  {turn.text}
                </ChatMessageBubble>
              </ChatMessage>
            ))}
          </ChatMessageList>
        </LayoutContent>
      }
      footer={
        <LayoutFooter hasDivider padding={4}>
          <TextInput
            label="Message the agent"
            isLabelHidden
            startIcon={Sparkles}
            placeholder="Ask a follow-up…"
            value=""
            onChange={() => {}}
            isDisabled
            disabledMessage="Coming soon: continue a chat with the agent."
          />
        </LayoutFooter>
      }
    />
  );
}
