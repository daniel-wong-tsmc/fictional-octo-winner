import {Fragment} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Divider} from '@astryxdesign/core/Divider';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {ArrowDown, ArrowRight, CalendarClock, Send, UserCheck} from 'lucide-react';
import type {SourceStatus, StepRunStatus, WorkflowStep} from '../workflow';

export type FlowMode = 'live' | 'draft' | 'trial';

const STEP_STATUS: Record<StepRunStatus, {dot: 'success' | 'info' | 'warning' | 'neutral'; label: string}> = {
  done: {dot: 'success', label: 'Done'},
  review: {dot: 'info', label: 'Needs your OK'},
  waiting: {dot: 'warning', label: 'Waiting'},
  draft: {dot: 'neutral', label: 'Draft'},
};

const SOURCE_STATUS: Record<SourceStatus, {dot: 'success' | 'warning' | 'info' | 'neutral'; label: string}> = {
  connected: {dot: 'success', label: 'Connected'},
  needsConnection: {dot: 'warning', label: 'Needs connection'},
  handoff: {dot: 'info', label: 'From another workflow'},
  upload: {dot: 'neutral', label: 'Uploaded'},
};

const NODE_WIDTH = 230;
const SIDE_WIDTH = 176;

function Arrow({isVertical}: {isVertical: boolean}) {
  return (
    <VStack hAlign="center" vAlign="center">
      <Icon icon={isVertical ? ArrowDown : ArrowRight} color="secondary" />
    </VStack>
  );
}

function StepNode({step, index, mode, isVertical, onOpen}: {
  step: WorkflowStep;
  index: number;
  mode: FlowMode;
  isVertical: boolean;
  onOpen: () => void;
}) {
  const s = mode === 'trial' ? {dot: 'success' as const, label: 'Tried'} : STEP_STATUS[step.status];
  return (
    <ClickableCard
      label={`Open step ${index + 1}: ${step.name}`}
      onClick={onOpen}
      padding={3}
      width={isVertical ? '100%' : NODE_WIDTH}
      elevation={step.status === 'review' && mode === 'live' ? 'low' : 'none'}>
      <VStack gap={2}>
        <HStack hAlign="between" vAlign="center" gap={2}>
          <Text type="supporting">{`Step ${index + 1}`}</Text>
          <HStack gap={1} vAlign="center">
            <StatusDot variant={s.dot} label={s.label} />
            <Text type="supporting" weight="medium">{s.label}</Text>
          </HStack>
        </HStack>
        <Text weight="semibold" maxLines={2}>{step.name}</Text>
        <Text type="supporting" maxLines={3}>{step.does}</Text>
        <Divider />
        <VStack gap={1}>
          {step.inputs.map(input => {
            const src = SOURCE_STATUS[input.status];
            return (
              <HStack key={input.label} gap={1.5} vAlign="center">
                <StatusDot variant={src.dot} label={src.label} tooltip={`${src.label}: ${input.detail}`} />
                <Text type="supporting" maxLines={2}>{input.status === 'needsConnection' ? `${input.label} (not connected)` : input.label}</Text>
              </HStack>
            );
          })}
          <HStack gap={1.5} vAlign="center">
            <Icon icon={ArrowRight} size="xsm" color="secondary" />
            <Text type="supporting" maxLines={1}>{step.output}</Text>
          </HStack>
        </VStack>
        {mode === 'trial' && (
          <>
            <Divider />
            <Text weight="medium">{step.trialResult}</Text>
          </>
        )}
      </VStack>
    </ClickableCard>
  );
}

function SideNode({icon, title, lines, width, status}: {
  icon: typeof Send;
  title: string;
  lines: string[];
  width: number | string;
  status?: {dot: 'info' | 'success' | 'neutral'; label: string};
}) {
  return (
    <Card padding={3} variant="muted" width={width}>
      <VStack gap={1.5}>
        <HStack gap={1.5} vAlign="center">
          <Icon icon={icon} size="sm" color="secondary" />
          <Text type="label">{title}</Text>
        </HStack>
        {lines.map(l => <Text key={l} type="supporting">{l}</Text>)}
        {status && (
          <HStack gap={1} vAlign="center">
            <StatusDot variant={status.dot} label={status.label} />
            <Text type="supporting" weight="medium">{status.label}</Text>
          </HStack>
        )}
      </VStack>
    </Card>
  );
}

/**
 * The workflow as a left-to-right flowchart: when it starts, each step, the approval, where results go.
 * It lays itself out; nobody drags boxes. Below 900px wide it turns top-to-bottom.
 */
export function FlowChart({steps, mode, schedule, approver, destinations, onOpenStep}: {
  steps: WorkflowStep[];
  mode: FlowMode;
  schedule: string;
  approver: string;
  destinations: string[];
  onOpenStep: (step: WorkflowStep) => void;
}) {
  const isVertical = useMediaQuery('(max-width: 900px)');
  const sideWidth = isVertical ? '100%' : SIDE_WIDTH;
  const waitingForOk = mode === 'live' && steps.some(s => s.status === 'review');
  const nodes = [
    <SideNode key="start" icon={CalendarClock} title="Starts" lines={[schedule]} width={sideWidth} />,
    ...steps.map((step, i) => (
      <StepNode key={step.id} step={step} index={i} mode={mode} isVertical={isVertical} onOpen={() => onOpenStep(step)} />
    )),
    <SideNode
      key="ok"
      icon={UserCheck}
      title="Needs an OK"
      lines={[approver]}
      width={sideWidth}
      status={waitingForOk ? {dot: 'info', label: 'Waiting for you'} : undefined}
    />,
    <SideNode key="send" icon={Send} title="Sends to" lines={destinations.length ? destinations : ['Nowhere yet']} width={sideWidth} />,
  ];
  const Stack = isVertical ? VStack : HStack;
  return (
    <Stack gap={2} vAlign={isVertical ? undefined : 'center'} isScrollable={!isVertical} paddingBlock={1}>
      {nodes.map((node, i) => (
        <Fragment key={i}>
          {i > 0 && <Arrow isVertical={isVertical} />}
          {node}
        </Fragment>
      ))}
    </Stack>
  );
}
