import {useState} from 'react';
import {Layout, LayoutContent, LayoutFooter, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Selector} from '@astryxdesign/core/Selector';
import {List, ListItem} from '@astryxdesign/core/List';
import {Token} from '@astryxdesign/core/Token';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Divider} from '@astryxdesign/core/Divider';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Table, pixel, type TableColumn} from '@astryxdesign/core/Table';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Icon} from '@astryxdesign/core/Icon';
import {useToast} from '@astryxdesign/core/Toast';
import {ArrowRight, ArrowRightLeft, CalendarClock, ChevronRight, Pencil, Play, Plus, Power, Send, Sparkles, UserCheck} from 'lucide-react';
import {
  DESTINATION_OPTIONS, DRAFT_DESCRIPTION, DRAFT_FILE_NAME, DRAFT_QUESTIONS, DRAFT_STEPS, EXAMPLE_DESCRIPTIONS,
  MONTHLY_SALES_CLOSE, PEOPLE, SCHEDULES, TEMPLATES, type WorkflowStep,
} from '../workflow';
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

/* ---------- Create: describe and/or drop a file ---------- */

export function CreateWorkflowPage() {
  const [description, setDescription] = useState(DRAFT_DESCRIPTION);
  const [file, setFile] = useState<File | null>(() => new File([''], DRAFT_FILE_NAME));
  const [isDrafting, setIsDrafting] = useState(false);
  const draft = () => {
    setIsDrafting(true);
    window.setTimeout(() => (window.location.hash = 'workflow-draft'), 1200);
  };
  return (
    <Layout
      height="fill"
      contentWidth={720}
      header={
        <LayoutHeader hasDivider padding={4}>
          <Breadcrumbs>
            <BreadcrumbItem href="#home">Home</BreadcrumbItem>
            <BreadcrumbItem isCurrent>New workflow</BreadcrumbItem>
          </Breadcrumbs>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <VStack gap={1}>
              <Heading level={1}>Set up a workflow</Heading>
              <Text type="supporting">
                Describe how you do it today, or drop the spreadsheet you use. The agent drafts the steps and asks about anything unclear.
              </Text>
            </VStack>
            <TextArea
              label="Describe the process"
              description="In your own words, like you’d explain it to a new colleague."
              value={description}
              onChange={setDescription}
              rows={5}
            />
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Text type="supporting">Examples:</Text>
              <Token size="sm" label="Monthly sales close" onClick={() => setDescription(EXAMPLE_DESCRIPTIONS[0])} />
              <Token size="sm" label="Overdue invoices" onClick={() => setDescription(EXAMPLE_DESCRIPTIONS[1])} />
              <Token size="sm" label="Low stock alert" onClick={() => setDescription(EXAMPLE_DESCRIPTIONS[2])} />
            </HStack>
            <FileInput
              label="And/or drop the file you use today"
              description="A workbook, a how-to doc or an email. The agent reads its steps and formulas."
              mode="dropzone"
              accept=".xlsx,.xls,.csv,.docx,.pdf"
              value={file}
              onChange={files => setFile(Array.isArray(files) ? files[0] ?? null : files)}
            />
            <HStack hAlign="end">
              <Button
                label="Draft my workflow"
                variant="primary"
                icon={<Icon icon={Sparkles} />}
                isLoading={isDrafting}
                isDisabled={!description.trim() && !file}
                onClick={draft}
              />
            </HStack>
            <Divider />
            <List
              header={<Text type="label" color="secondary">Or start from a template</Text>}
              hasDividers
              edge="outset">
              {TEMPLATES.map(t => (
                <ListItem
                  key={t.name}
                  label={<Text weight="medium">{t.name}</Text>}
                  description={t.about}
                  endContent={<Icon icon={ChevronRight} size="sm" color="secondary" />}
                  onClick={draft}
                />
              ))}
            </List>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

/* ---------- Draft review ---------- */

export function DraftWorkflowPage({onTurnOn}: {onTurnOn: () => void}) {
  const toast = useToast();
  const [name, setName] = useState(MONTHLY_SALES_CLOSE.name);
  const [answers, setAnswers] = useState<Record<string, string>>(Object.fromEntries(DRAFT_QUESTIONS.map(q => [q.id, q.answer])));
  const [steps, setSteps] = useState<WorkflowStep[]>(DRAFT_STEPS);
  const [schedule, setSchedule] = useState(SCHEDULES[0]);
  const [destinations, setDestinations] = useState<string[]>(MONTHLY_SALES_CLOSE.destinations);
  const [trial, setTrial] = useState<'none' | 'running' | 'done'>('none');
  const [openStep, setOpenStep] = useState<number | null>(null);
  const approver = answers['q-approver'];
  const answered = DRAFT_QUESTIONS.filter(q => answers[q.id]).length;
  const waitingOnConnection = steps.some(s => s.inputs.some(i => i.status === 'needsConnection'));

  return (
    <Layout
      height="fill"
      contentWidth={1240}
      header={
        <LayoutHeader hasDivider padding={4}>
          <Breadcrumbs>
            <BreadcrumbItem href="#home">Home</BreadcrumbItem>
            <BreadcrumbItem href="#workflow-new">New workflow</BreadcrumbItem>
            <BreadcrumbItem isCurrent>Draft</BreadcrumbItem>
          </Breadcrumbs>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={5}>
            <Banner
              status="info"
              title="Your draft is ready"
              description={`Drafted from your description and ${DRAFT_FILE_NAME}. Answer the questions, check the steps, then try it on last month.`}
              collapsible={false}
            />
            <TextInput label="Workflow name" value={name} onChange={setName} width={420} />

            <Card padding={4}>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
                  <Text type="label">Questions from the agent</Text>
                  <Text type="supporting">{`${answered} of ${DRAFT_QUESTIONS.length} answered`}</Text>
                </HStack>
                <Grid columns={{minWidth: 300, max: 3, repeat: 'fit'}} gap={4}>
                  {DRAFT_QUESTIONS.map(q => (
                    <Selector
                      key={q.id}
                      label={q.question}
                      description={q.why}
                      options={q.options}
                      value={answers[q.id]}
                      onChange={v => setAnswers(prev => ({...prev, [q.id]: v}))}
                    />
                  ))}
                </Grid>
              </VStack>
            </Card>

            <VStack gap={2}>
              <HStack hAlign="between" vAlign="end" wrap="wrap" gap={2}>
                <VStack gap={0.5}>
                  <Text type="label">How it will run</Text>
                  <Text type="supporting">Click a step to change it.</Text>
                </VStack>
                {waitingOnConnection && (
                  <HStack gap={1.5} vAlign="center">
                    <StatusDot variant="warning" label="Needs connection" />
                    <Text type="supporting">Shopify isn’t connected yet. You can still finish setup.</Text>
                  </HStack>
                )}
              </HStack>
              <FlowChart
                steps={steps}
                mode={trial === 'done' ? 'trial' : 'draft'}
                schedule={schedule}
                approver={approver}
                destinations={destinations}
                onOpenStep={s => setOpenStep(steps.findIndex(x => x.id === s.id))}
              />
            </VStack>

            <Card padding={4}>
              <VStack gap={4}>
                <Text type="label">Settings</Text>
                <Grid columns={{minWidth: 260, max: 3, repeat: 'fit'}} gap={4}>
                  <Selector label="When it runs" options={SCHEDULES} value={schedule} onChange={setSchedule} />
                  <Selector
                    label="Who gives the OK"
                    options={PEOPLE}
                    value={approver}
                    onChange={v => setAnswers(prev => ({...prev, 'q-approver': v}))}
                  />
                  <VStack gap={1.5}>
                    <Text type="label">Sends results to</Text>
                    <HStack gap={1.5} wrap="wrap" vAlign="center">
                      {destinations.map(d => (
                        <Token key={d} label={d} onRemove={() => setDestinations(prev => prev.filter(x => x !== d))} />
                      ))}
                      <DropdownMenu
                        button={{label: 'Add', variant: 'ghost', size: 'sm', icon: <Icon icon={Plus} />}}
                        items={
                          DESTINATION_OPTIONS.filter(d => !destinations.includes(d)).map(d => ({
                            label: d,
                            onClick: () => setDestinations(prev => [...prev, d]),
                          }))
                        }
                      />
                    </HStack>
                  </VStack>
                </Grid>
              </VStack>
            </Card>

            {trial === 'done' && (
              <Banner
                status="success"
                title="Tried on September 2026"
                description="Every step ran. Each step shows what it produced. If the numbers look right, turn it on."
                collapsible={false}
              />
            )}
            <HStack gap={2} hAlign="end" wrap="wrap">
              <Button
                label={trial === 'done' ? 'Try again' : 'Try on last month'}
                icon={<Icon icon={Play} />}
                isLoading={trial === 'running'}
                onClick={() => {
                  setTrial('running');
                  window.setTimeout(() => setTrial('done'), 1500);
                }}
              />
              <Button
                label="Turn on"
                variant="primary"
                icon={<Icon icon={Power} />}
                isDisabled={trial !== 'done'}
                tooltip={trial !== 'done' ? 'Try it on last month first' : undefined}
                onClick={() => {
                  onTurnOn();
                  toast({
                    body: waitingOnConnection
                      ? `${name} is on. Step 1 waits for Shopify access; it reads your workbook until then.`
                      : `${name} is on. Next run: ${MONTHLY_SALES_CLOSE.nextRun}.`,
                  });
                }}
              />
            </HStack>
          </VStack>
          {openStep !== null && (
            <StepDialog
              key={openStep}
              step={steps[openStep]}
              index={openStep}
              isEditable
              onClose={() => setOpenStep(null)}
              onSave={updated => {
                setSteps(prev => prev.map((s, i) => (i === openStep ? updated : s)));
                setOpenStep(null);
                setTrial(t => (t === 'done' ? 'none' : t));
              }}
            />
          )}
        </LayoutContent>
      }
    />
  );
}

/* ---------- Live ---------- */

type RunRow = Record<string, unknown> & {period: string; result: 'review' | 'approved' | 'rerun'; detail: string; finished: string};

export function LiveWorkflowPage({handoffs, isStep3Approved}: {handoffs: Handoff[]; isStep3Approved: boolean}) {
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
                <Button label="Edit workflow" icon={<Icon icon={Pencil} />} href="#workflow-draft" />
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
