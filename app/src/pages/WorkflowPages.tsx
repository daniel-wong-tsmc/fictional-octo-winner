import {useState} from 'react';
import {Layout, LayoutContent, LayoutFooter, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Card} from '@astryxdesign/core/Card';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {List, ListItem} from '@astryxdesign/core/List';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Table, pixel, type TableColumn} from '@astryxdesign/core/Table';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {Icon} from '@astryxdesign/core/Icon';
import {Divider} from '@astryxdesign/core/Divider';
import {useToast} from '@astryxdesign/core/Toast';
import {ArrowDown, ArrowRight, ArrowRightLeft, CalendarClock, Database, Pencil, Play, Send, Trash2, UserCheck, WandSparkles} from 'lucide-react';
import {MONTHLY_SALES_CLOSE, type BuiltStage, type BuiltWorkflow, type WorkflowStep} from '../workflow';
import type {Handoff} from '../handoffs';
import {FlowChart} from './FlowChart';

const SOURCE_LABEL = {
  connected: {dot: 'success', label: 'Connected'},
  needsConnection: {dot: 'warning', label: 'Needs connection'},
  handoff: {dot: 'info', label: 'From another workflow'},
  upload: {dot: 'neutral', label: 'Uploaded'},
} as const;

/* ---------- Step detail ---------- */

function StepDialog({step, index, isEditable, onClose, onSave}: {
  step: WorkflowStep;
  index: number;
  isEditable: boolean;
  onClose: () => void;
  onSave?: (s: WorkflowStep) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(step.name);
  const [does, setDoes] = useState(step.does);
  return (
    <Dialog isOpen onOpenChange={open => !open && onClose()} width={520} purpose={isEditable ? 'form' : 'info'}>
      <Layout
        height="auto"
        header={<DialogHeader title={`Step ${index + 1}: ${step.name}`} subtitle={isEditable ? 'Change anything that’s wrong.' : undefined} onOpenChange={open => !open && onClose()} />}
        content={
          <LayoutContent padding={4}>
            <VStack gap={4}>
              {isEditable ? (
                <>
                  <TextInput label="Step name" value={name} onChange={setName} />
                  <TextArea label="What happens" value={does} onChange={setDoes} rows={3} />
                </>
              ) : (
                <VStack gap={1}>
                  <Text type="label">What happens</Text>
                  <Text>{step.does}</Text>
                </VStack>
              )}
              <List header={<Text type="label">Uses</Text>} hasDividers edge="outset">
                {step.inputs.map(input => {
                  const src = SOURCE_LABEL[input.status];
                  return (
                    <ListItem
                      key={input.label}
                      label={<Text>{input.label}</Text>}
                      description={
                        <HStack gap={1.5} vAlign="center">
                          <StatusDot variant={src.dot} label={src.label} />
                          <Text type="supporting">{`${src.label} · ${input.detail}`}</Text>
                        </HStack>
                      }
                      endContent={
                        input.status === 'needsConnection' ? (
                          <Button
                            label="Request access"
                            size="sm"
                            onClick={() => toast({body: `Asked your workspace admin to connect ${input.label}. Setup can carry on meanwhile.`})}
                          />
                        ) : undefined
                      }
                    />
                  );
                })}
              </List>
              <VStack gap={1}>
                <Text type="label">Produces</Text>
                <HStack gap={1.5} vAlign="center">
                  <Icon icon={ArrowRight} size="sm" color="secondary" />
                  <Text>{step.output}</Text>
                </HStack>
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter padding={4}>
            <HStack gap={2} hAlign="end">
              {isEditable ? (
                <>
                  <Button label="Cancel" variant="ghost" onClick={onClose} />
                  <Button label="Save step" variant="primary" onClick={() => onSave?.({...step, name: name.trim() || step.name, does})} />
                </>
              ) : (
                <Button label="Close" onClick={onClose} />
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

/* ---------- Delete ---------- */

/** Asks before deleting, since a deleted workflow stops running and can't be brought back. */
function DeleteWorkflowButton({name, onDelete}: {name: string; onDelete: () => void}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button label="Delete workflow" variant="ghost" icon={<Icon icon={Trash2} />} onClick={() => setIsOpen(true)} />
      <AlertDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={`Delete ${name}?`}
        description="It stops running and is removed for everyone. Its open tasks leave Home. Past outputs that were already sent stay where they went."
        actionLabel="Delete workflow"
        onAction={() => {
          setIsOpen(false);
          onDelete();
        }}
      />
    </>
  );
}

/* ---------- Live ---------- */

type RunRow = Record<string, unknown> & {period: string; result: 'review' | 'approved' | 'rerun'; detail: string; finished: string};

export function LiveWorkflowPage({handoffs, isStep3Approved, onDelete}: {handoffs: Handoff[]; isStep3Approved: boolean; onDelete: () => void}) {
  const toast = useToast();
  const w = MONTHLY_SALES_CLOSE;
  const steps = w.steps.map(s => (s.ticketId === 3 && isStep3Approved ? {...s, status: 'done' as const} : s));
  const [openStep, setOpenStep] = useState<number | null>(null);
  const uses = handoffs.filter(h => w.uses.includes(h.id));
  const shares = handoffs.filter(h => h.workflow === w.name);
  const runs: RunRow[] = w.runs.map(r => (r.result === 'review' && isStep3Approved ? {...r, result: 'approved', detail: 'Approved by Daniel'} : r));
  const columns: TableColumn<RunRow>[] = [
    {key: 'period', header: 'Month', renderCell: r => <Text weight="medium">{r.period}</Text>},
    {
      key: 'result',
      header: 'Result',
      renderCell: r => (
        <HStack gap={1.5} vAlign="center">
          <StatusDot variant={r.result === 'review' ? 'info' : 'success'} label={r.detail} />
          <Text>{r.detail}</Text>
        </HStack>
      ),
    },
    {key: 'finished', header: 'Finished', width: pixel(140), renderCell: r => <Text hasTabularNumbers type="supporting">{r.finished}</Text>},
  ];

  return (
    <Layout
      height="fill"
      contentWidth={1240}
      header={
        <LayoutHeader hasDivider padding={4}>
          <Breadcrumbs>
            <BreadcrumbItem href="#home">Home</BreadcrumbItem>
            <BreadcrumbItem isCurrent>{w.name}</BreadcrumbItem>
          </Breadcrumbs>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <HStack gap={4} hAlign="between" vAlign="start" wrap="wrap">
              <VStack gap={1.5}>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <HStack gap={1.5} vAlign="center">
                    <StatusDot variant="success" label="On" />
                    <Text type="supporting" weight="medium">On</Text>
                  </HStack>
                  <Text type="supporting">{`Next run: ${w.nextRun}`}</Text>
                </HStack>
                <Heading level={1}>{w.name}</Heading>
                <Text type="supporting">{w.description}</Text>
              </VStack>
              <HStack gap={2} wrap="wrap">
                <Button label="Run now" icon={<Icon icon={Play} />} onClick={() => toast({body: 'Preview only. Running a workflow comes with the real build.'})} />
                <Button label="Edit workflow" icon={<Icon icon={Pencil} />} href="#workflow-edit" />
                <DeleteWorkflowButton name={w.name} onDelete={onDelete} />
              </HStack>
            </HStack>

            <MetadataList orientation="horizontal">
              <MetadataListItem label="Starts" icon={<Icon icon={CalendarClock} size="sm" />}>{w.schedule}</MetadataListItem>
              <MetadataListItem label="Needs an OK from" icon={<Icon icon={UserCheck} size="sm" />}>{w.approver}</MetadataListItem>
              <MetadataListItem label="Sends to" icon={<Icon icon={Send} size="sm" />}>{w.destinations.join(', ')}</MetadataListItem>
            </MetadataList>

            <VStack gap={2}>
              <VStack gap={0.5}>
                <Text type="label">How it runs</Text>
                <Text type="supporting">This month’s run. Click a step to see it; the step waiting for you opens its ticket.</Text>
              </VStack>
              <FlowChart
                steps={steps}
                mode="live"
                schedule={w.schedule}
                approver={w.approver}
                destinations={w.destinations}
                onOpenStep={s => {
                  if (s.ticketId) window.location.hash = `ticket-${s.ticketId}`;
                  else setOpenStep(steps.findIndex(x => x.id === s.id));
                }}
              />
            </VStack>

            <Grid columns={{minWidth: 320, max: 2, repeat: 'fit'}} gap={3} align="start">
              <Card padding={4}>
                <List header={<Text type="label">Uses from other workflows</Text>} hasDividers edge="outset">
                  {uses.map(h => (
                    <ListItem
                      key={h.id}
                      startContent={<Icon icon={ArrowRightLeft} size="sm" color="secondary" />}
                      label={<Text weight="medium">{h.name}</Text>}
                      description={`From ${h.workflow} · ${h.value ?? ''}`}
                    />
                  ))}
                </List>
              </Card>
              <Card padding={4}>
                <List header={<Text type="label">Shares with other workflows</Text>} hasDividers edge="outset">
                  {shares.length ? (
                    shares.map(h => (
                      <ListItem
                        key={h.id}
                        startContent={<Icon icon={ArrowRightLeft} size="sm" color="secondary" />}
                        label={<Text weight="medium">{h.name}</Text>}
                        description={`${h.value ?? ''} · used by ${h.usedBy.length ? h.usedBy.join(', ') : 'nothing yet'}`}
                      />
                    ))
                  ) : (
                    <ListItem label={<Text type="supporting">Nothing shared yet. Add a handoff from a step’s output sheet.</Text>} />
                  )}
                </List>
              </Card>
            </Grid>

            <Card padding={0}>
              <VStack>
                <HStack padding={4}>
                  <Text type="label">Recent runs</Text>
                </HStack>
                <Table data={runs} columns={columns} idKey="period" density="balanced" />
              </VStack>
            </Card>
          </VStack>
          {openStep !== null && (
            <StepDialog key={openStep} step={steps[openStep]} index={openStep} isEditable={false} onClose={() => setOpenStep(null)} />
          )}
        </LayoutContent>
      }
    />
  );
}

/* ---------- A workflow built on the board ---------- */

const STAGE_ICON = {input: Database, instructions: WandSparkles, output: Send} as const;

function StageCard({stage}: {stage: BuiltStage}) {
  return (
    <Card padding={3} width="100%">
      <VStack gap={2}>
        <HStack gap={1.5} vAlign="center">
          <Icon icon={STAGE_ICON[stage.kind]} size="sm" color="secondary" />
          <Text type="supporting">{stage.label}</Text>
        </HStack>
        {stage.kind !== 'instructions' && <Text weight="semibold">{stage.title}</Text>}
        <Text type={stage.kind === 'instructions' ? 'body' : 'supporting'}>{stage.detail}</Text>
        {stage.kind === 'output' && (
          <>
            <Divider />
            <Text type="supporting">{stage.approver ? `Waits for an OK from ${stage.approver}` : 'Goes out without an OK'}</Text>
            <Text type="supporting">{`Goes to ${stage.sendTo?.length ? stage.sendTo.join(', ') : 'nobody yet'}`}</Text>
          </>
        )}
      </VStack>
    </Card>
  );
}

export function BuiltWorkflowPage({workflow: w, onDelete}: {workflow: BuiltWorkflow; onDelete: () => void}) {
  const toast = useToast();
  const isVertical = useMediaQuery('(max-width: 900px)');
  const stages = w.columns.flat();
  const outputs = stages.filter(s => s.kind === 'output');
  const approvers = [...new Set(outputs.map(o => o.approver).filter(Boolean))] as string[];
  const sendTo = [...new Set(outputs.flatMap(o => o.sendTo ?? []))];
  const count = (k: BuiltStage['kind']) => stages.filter(s => s.kind === k).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return (
    <Layout
      height="fill"
      contentWidth={1240}
      header={
        <LayoutHeader hasDivider padding={4}>
          <Breadcrumbs>
            <BreadcrumbItem href="#home">Home</BreadcrumbItem>
            <BreadcrumbItem isCurrent>{w.name}</BreadcrumbItem>
          </Breadcrumbs>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <HStack gap={4} hAlign="between" vAlign="start" wrap="wrap">
              <VStack gap={1.5}>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <HStack gap={1.5} vAlign="center">
                    <StatusDot variant="success" label="On" />
                    <Text type="supporting" weight="medium">On</Text>
                  </HStack>
                  <Text type="supporting">{`Next run: ${w.nextRun}`}</Text>
                </HStack>
                <Heading level={1}>{w.name}</Heading>
                <Text type="supporting">
                  {`${plural(count('input'), 'input', 'inputs')}, ${plural(count('instructions'), 'LLM step', 'LLM steps')}, ${plural(count('output'), 'pass on to', 'pass on tos')}. Turned on ${w.createdOn}.`}
                </Text>
              </VStack>
              <HStack gap={2} wrap="wrap">
                <Button label="Run now" icon={<Icon icon={Play} />} onClick={() => toast({body: 'Preview only. Running a workflow comes with the real build.'})} />
                <DeleteWorkflowButton name={w.name} onDelete={onDelete} />
              </HStack>
            </HStack>

            <MetadataList orientation="horizontal">
              <MetadataListItem label="Starts" icon={<Icon icon={CalendarClock} size="sm" />}>{w.schedule}</MetadataListItem>
              <MetadataListItem label="Needs an OK from" icon={<Icon icon={UserCheck} size="sm" />}>{approvers.length ? approvers.join(', ') : 'Nobody'}</MetadataListItem>
              <MetadataListItem label="Sends to" icon={<Icon icon={Send} size="sm" />}>{sendTo.length ? sendTo.join(', ') : 'Nobody yet'}</MetadataListItem>
            </MetadataList>

            <VStack gap={2}>
              <VStack gap={0.5}>
                <Text type="label">How it runs</Text>
                <Text type="supporting">The tiles you placed on the board, in the order they run. Tiles stacked together run side by side.</Text>
              </VStack>
              {isVertical ? (
                <VStack gap={2}>
                  {w.columns.map((col, i) => (
                    <VStack key={i} gap={2}>
                      {i > 0 && (
                        <HStack hAlign="center">
                          <Icon icon={ArrowDown} color="secondary" />
                        </HStack>
                      )}
                      {col.map(st => <StageCard key={st.id} stage={st} />)}
                    </VStack>
                  ))}
                </VStack>
              ) : (
                <HStack gap={2} vAlign="center" isScrollable>
                  {w.columns.map((col, i) => (
                    <HStack key={i} gap={2} vAlign="center">
                      {i > 0 && <Icon icon={ArrowRight} color="secondary" />}
                      <VStack gap={2} width={260}>
                        {col.map(st => <StageCard key={st.id} stage={st} />)}
                      </VStack>
                    </HStack>
                  ))}
                </HStack>
              )}
            </VStack>

            <Card padding={0}>
              <VStack>
                <HStack padding={4}>
                  <Text type="label">Recent runs</Text>
                </HStack>
                <EmptyState isCompact title="No runs yet" description={`The first run is ${w.nextRun}.`} />
              </VStack>
            </Card>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
