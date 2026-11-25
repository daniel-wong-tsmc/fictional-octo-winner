import {useState} from 'react';
import {FileInput} from '@astryxdesign/core/FileInput';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {TextArea} from '@astryxdesign/core/TextArea';
import {List, ListItem} from '@astryxdesign/core/List';
import {Token} from '@astryxdesign/core/Token';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Divider} from '@astryxdesign/core/Divider';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {Icon} from '@astryxdesign/core/Icon';
import {Toolbar} from '@astryxdesign/core/Toolbar';
import {useToast} from '@astryxdesign/core/Toast';
import {
  ArrowRightLeft, Check, ChevronDown, ChevronRight, Download, FileSpreadsheet, Pencil, RotateCcw, Sparkles, Trash2,
} from 'lucide-react';
import {STATUS, TICKETS, type DataSet, type Sheet} from '../data';
import {PREFILLED_WORKFLOWS} from '../workflow';
import {CHECK_LABEL, describeRule, shapeOf, type Handoff} from '../handoffs';
import {WorkflowSheetTable} from '@workspace/astryx-workflows/components/WorkflowSheetTable';
import {OverviewFrame, OverviewHeading} from '@workspace/astryx-workflows/components/WorkflowOverview';
import {StatusText} from '@workspace/astryx-workflows/components/StatusText';
import {RefLabel} from './shared';
import {AgentDidList, ShowCode} from './runParts';

/* ---------- Inputs, result and handoffs as list rows ---------- */

/** A data set row. Clicking it opens its sheet below. */
function DataRow({data, onSelect}: {data: DataSet; onSelect: () => void}) {
  return (
    <ListItem
      onClick={onSelect}
      align="first-line"
      startContent={<Icon icon={FileSpreadsheet} size="sm" color="secondary" />}
      label={<Text weight="medium">{data.name}</Text>}
      description={
        <VStack gap={1}>
          {data.source && <RefLabel kind={data.source[0]} label={data.source[1]} />}
          {data.emptyNote && <Text type="supporting">{data.emptyNote}</Text>}
          {data.stats && <Text type="supporting" hasTabularNumbers>{data.stats.join(' · ')}</Text>}
          {data.warning && (
            <StatusText status={data.isWarningStale ? 'stale' : 'missingData'} note={data.warning} />
          )}
        </VStack>
      }
      endContent={<Icon icon={ChevronRight} size="sm" color="secondary" />}
    />
  );
}

/** An input that arrives from another workflow's handoff. Fills in on every run. */
function HandoffInputRow({handoff, onRemove}: {handoff: Handoff; onRemove: () => void}) {
  const failed = !!handoff.checkFailure;
  return (
    <ListItem
      align="first-line"
      startContent={<Icon icon={ArrowRightLeft} size="sm" color="secondary" />}
      label={<Text weight="medium">{handoff.name}</Text>}
      description={
        <VStack gap={1}>
          <RefLabel kind="workflow" label={`Shared value from ${handoff.workflow}`} />
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Token size="sm" label={shapeOf(handoff.rule)} />
            <Text weight="semibold" hasTabularNumbers>{handoff.value ?? '—'}</Text>
          </HStack>
          <StatusText
            status={failed ? 'failed' : 'ready'}
            note={failed ? `${handoff.checkFailure} This step won't run until it passes.` : 'Fills in automatically on every run'}
          />
        </VStack>
      }
      endContent={<IconButton label={`Remove ${handoff.name}`} icon={<Icon icon={Trash2} />} variant="ghost" size="sm" onClick={onRemove} />}
    />
  );
}

/** A page region on the ticket. One card per region; what sits inside is rows, never more cards. */
function Region({title, count, endContent, variant = 'section', isFullHeight, children}: {
  title: string;
  count?: number;
  endContent?: React.ReactNode;
  variant?: 'section' | 'muted';
  /** Fills its grid cell, so boxes side by side are the same height. */
  isFullHeight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card variant={variant === 'muted' ? 'muted' : 'default'} padding={4} height={isFullHeight ? '100%' : undefined}>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center" gap={2}>
          <Text type="label" color="secondary">{count !== undefined ? `${title} · ${count}` : title}</Text>
          {endContent}
        </HStack>
        {children}
      </VStack>
    </Card>
  );
}

/* ---------- Handoffs (step 2) and checks (step 3) ---------- */

function HandoffRow({handoff, onRemove}: {handoff: Handoff; onRemove: () => void}) {
  const failed = !!handoff.checkFailure;
  return (
    <ListItem
      align="first-line"
      label={<Text weight="medium">{handoff.name}</Text>}
      description={
        <VStack gap={1}>
          <Text type="supporting">{describeRule(handoff.rule)}</Text>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Token size="sm" label={shapeOf(handoff.rule)} />
            <Text weight="semibold" hasTabularNumbers>{handoff.value ?? '—'}</Text>
          </HStack>
          {handoff.check !== 'none' && (
            <StatusText
              status={failed ? {tone: 'error', label: 'Check failed'} : {tone: 'success', label: 'Check passed'}}
              note={failed
                ? `${CHECK_LABEL[handoff.check]}. ${handoff.checkFailure}`
                : CHECK_LABEL[handoff.check]}
            />
          )}
          <HStack gap={1.5} vAlign="center" wrap="wrap">
            <Text type="supporting">Used by</Text>
            {handoff.usedBy.length ? (
              handoff.usedBy.map(w => <RefLabel key={w} kind="workflow" label={failed ? `${w} (waiting)` : w} />)
            ) : (
              <Text type="supporting">Not used yet</Text>
            )}
          </HStack>
        </VStack>
      }
      endContent={<IconButton label={`Remove ${handoff.name}`} icon={<Icon icon={Trash2} />} variant="ghost" size="sm" onClick={onRemove} />}
    />
  );
}

/* ---------- Sheets ---------- */

/** The workflow builder's trial dialog imports the sheet table from here. */

function Workbook({
  title, description, sheets, selected, onSelect, actions, banner, anchorId, rowTotals, isOpen = true, onToggle,
}: {
  anchorId: string;
  rowTotals: Record<string, string>;
  isOpen?: boolean;
  onToggle?: () => void;
  title: string;
  description: string;
  sheets: [string, Sheet][];
  selected: string;
  onSelect: (name: string) => void;
  actions: React.ReactNode;
  banner?: React.ReactNode;
}) {
  const current = sheets.find(([n]) => n === selected)?.[1] ?? sheets[0][1];
  const currentName = sheets.find(([n]) => n === selected)?.[0] ?? sheets[0][0];
  return (
    <Card padding={0}>
      <VStack>
        <VStack padding={3}>
          <Toolbar
            label={title}
            gap={2}
            startContent={
              <HStack gap={2} vAlign="center">
                <Icon icon={FileSpreadsheet} color="success" />
                <VStack gap={0}>
                  <Text weight="medium" id={anchorId}>{`${title} · ${sheets.length}`}</Text>
                  <Text type="supporting">{description}</Text>
                </VStack>
              </HStack>
            }
            endContent={
              <>
                {isOpen && actions}
                {onToggle && (
                  <Button
                    label={isOpen ? 'Hide sheets' : 'Show sheets'}
                    variant="ghost"
                    icon={<Icon icon={isOpen ? ChevronDown : ChevronRight} />}
                    onClick={onToggle}
                  />
                )}
              </>
            }
          />
        </VStack>
        {isOpen && banner}
        {isOpen && (
          <>
            <TabList value={currentName} onChange={onSelect} size="sm" hasDivider role="tablist">
              {sheets.map(([name, s]) => (
                <Tab key={name} value={name} label={name} panelId={`${anchorId}-panel`} endContent={s.fromFile ? <Text type="supporting">Uploaded</Text> : undefined} />
              ))}
            </TabList>
            <VStack id={`${anchorId}-panel`} role="tabpanel" aria-label={currentName}>
            {current.rows && !current.fromFile && (
              <HStack paddingInline={3} paddingBlockStart={2}>
                <Text type="supporting" weight="medium" hasTabularNumbers>
                  {`Preview: ${current.rows.length} of ${rowTotals[currentName] ?? `${current.rows.length} rows`}. The agent works on all of them.`}
                </Text>
              </HStack>
            )}
            <WorkflowSheetTable sheet={current} />
            </VStack>
            <HStack gap={4} padding={3} wrap="wrap">
              {(current.fromFile || !current.rows) && (
                <Text type="supporting">{current.fromFile ? `From ${current.fromFile}` : 'No rows yet'}</Text>
              )}
              {!!current.addedColumns?.length && (
                <StatusText status={{tone: 'info', label: 'Added by the agent'}} note="Column added by the agent" />
              )}
            </HStack>
          </>
        )}
      </VStack>
    </Card>
  );
}

/* ---------- Page ---------- */

export function TicketPage({
  id, code, handoffs, onApprove, onUndoApprove, onRemoveHandoff, isInPanel = false,
}: {
  id: number;
  /** The step's current code from its workflow's saved board, so code edited on the board shows here too. */
  code?: string;
  handoffs: Handoff[];
  onApprove: (id: number) => void;
  onUndoApprove: (id: number) => void;
  onRemoveHandoff: (handoffId: string) => void;
  /** Shown in Home's side panel, which has its own header: leaves out the breadcrumbs. */
  isInPanel?: boolean;
}) {
  const t = TICKETS[id];
  // The step's workflow, for the breadcrumb.
  const workflowId = PREFILLED_WORKFLOWS.find(w => w.name === t.workflow)?.id;
  const toast = useToast();
  const [inputSheet, setInputSheet] = useState(t.inputs.find(d => d.sheet)?.sheet ?? '');
  const [outputSheet, setOutputSheet] = useState(t.outputs[0].sheet);
  const [uploadedSheets, setUploadedSheets] = useState<[string, Sheet][]>([]);
  const [linkedInputs, setLinkedInputs] = useState<string[]>(t.inputs.filter(d => d.handoffId).map(d => d.handoffId!));
  const [instructions, setInstructions] = useState(t.instructions);
  const [isApproved, setIsApproved] = useState(t.status === 'done');
  const [upload, setUpload] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputsOpen, setInputsOpen] = useState(false);

  const preview = (what: string) => toast({body: `Preview only. ${what} comes with the real build.`});
  // One run button. It turns into "Update and run" once the instructions change.
  const hasEdits = instructions !== t.instructions;
  const runLabel = hasEdits ? 'Update and run' : t.isDraft ? 'Run step' : 'Run again';
  const status = isApproved ? 'done' : t.status;
  const myHandoffs = handoffs.filter(h => h.ticketId === id);
  const result = t.outputs[0];
  const resultSheet = t.sheets[result.sheet];
  const hasResult = !resultSheet.isEmpty;
  const failedChecks = myHandoffs.filter(h => h.checkFailure);

  const fileInputs = t.inputs.filter(d => !d.handoffId);
  const inputCount = fileInputs.length + linkedInputs.length;
  const inputSheets: [string, Sheet][] = [
    ...Object.entries(t.sheets).filter(([, s]) => s.kind === 'Input'),
    ...uploadedSheets,
  ];
  const outputSheets = Object.entries(t.sheets).filter(([, s]) => s.kind === 'Output');
  // Full row counts per sheet, read from the cards ("5,402 rows"), for the preview line above each table.
  const rowTotals: Record<string, string> = Object.fromEntries(
    [...t.inputs, ...t.outputs].flatMap(d => {
      const rows = d.stats?.find(x => /rows$/.test(x));
      return d.sheet && rows ? [[d.sheet, rows]] : [];
    }),
  );
  // Where an approval sends the numbers, shown before the click.
  const destinations = [...new Set([...(result.feedsInto?.map(f => f[1]) ?? []), ...myHandoffs.flatMap(h => h.usedBy)])];
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollTo = (anchorId: string) =>
    window.setTimeout(() => document.getElementById(anchorId)?.scrollIntoView({behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center'}), 50);
  const goToInput = (sheet: string) => {
    setInputSheet(sheet);
    setInputsOpen(true);
    scrollTo('input-sheets');
  };
  const goToOutput = (sheet: string) => {
    setOutputSheet(sheet);
    scrollTo('output-sheets');
  };

  // Prototype only: a real upload reads the workbook's sheet names. Here we stand in two.
  const addUpload = (file: File) => {
    const base = file.name.replace(/\.(xlsx|xls|csv)$/i, '');
    const names = file.name.toLowerCase().endsWith('.csv') ? [base] : [`${base}: Sheet1`, `${base}: Sheet2`];
    const added: [string, Sheet][] = names.map(n => [n, {
      kind: 'Input', isEmpty: true, fromFile: file.name,
      emptyNote: 'Uploaded. The sheet preview appears once uploads are connected.',
    }]);
    setUploadedSheets(prev => [...prev.filter(([, s]) => s.fromFile !== file.name), ...added]);
    setInputSheet(names[0]);
    setInputsOpen(true);
    setUpload(null);
    toast({body: `Added ${names.length} ${names.length === 1 ? 'sheet' : 'sheets'} from ${file.name} to Input data.`});
  };

  return (
    <OverviewFrame
      isInPanel={isInPanel}
      crumbs={[
        ...(workflowId !== undefined ? [{label: t.workflow, href: `#workflow-${workflowId}`}] : []),
        {label: t.step},
      ]}
    >
      <OverviewHeading
        status={STATUS[status]}
        note={`Part of ${t.workflow}`}
        name={t.step}
        summary={isApproved && t.status !== 'done' ? 'Approved just now. The next step and any shared values use this output.' : t.ran}
        actions={
          <>
            <Button
              label={runLabel}
              variant={hasEdits && !(t.canApprove && !isApproved) ? 'primary' : 'secondary'}
              icon={<Icon icon={hasEdits ? Sparkles : RotateCcw} />}
              tooltip={hasEdits ? 'The agent rewrites the code from your new instructions, then runs it' : 'Runs the same code on the latest inputs'}
              onClick={() => preview(hasEdits ? 'Updating and running' : 'Running steps')}
            />
            {t.canApprove && !isApproved && (
              <Button
                label="Approve output"
                variant="primary"
                icon={<Icon icon={Check} />}
                onClick={() => {
                  setIsApproved(true);
                  onApprove(id);
                  let dismiss = () => {};
                  dismiss = toast({
                    body: `Approved. Sent to ${destinations.length ? destinations.join(', ') : 'the next step'}.`,
                    autoHideDuration: 10000,
                    endContent: (
                      <Button
                        label="Undo"
                        size="sm"
                        onClick={() => {
                          setIsApproved(false);
                          onUndoApprove(id);
                          dismiss();
                          toast({body: 'Approval undone. Nothing was sent.'});
                        }}
                      />
                    ),
                  });
                }}
              />
            )}
          </>
        }
        actionsNote={t.canApprove && !isApproved && destinations.length > 0 ? `Approving sends it to: ${destinations.join(', ')}` : undefined}
      />

            {t.banner && !isApproved && (
              <Banner status={t.banner.status} title={t.banner.title} description={t.banner.description} collapsible={false} />
            )}
            {failedChecks.length > 0 && (
              <Banner
                status="error"
                title={`${failedChecks.length === 1 ? 'A shared value check failed' : `${failedChecks.length} shared value checks failed`}.`}
                description={`${failedChecks.map(h => `${h.name}: ${h.checkFailure}`).join(' ')} Workflows that use it are waiting.`}
                collapsible={false}
              />
            )}

            {/* Instructions on top, then inputs beside outputs. The sheets follow: output results, then input data. */}
              <Region title="Instructions to the agent" variant="muted">
                <VStack gap={4}>
                  {isEditing ? (
                    <VStack gap={2}>
                      <TextArea label="What should happen to the inputs?" value={instructions} onChange={setInstructions} rows={5} hasAutoFocus />
                      <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
                        <HStack gap={1.5} vAlign="center">
                          {hasEdits && <StatusDot variant="info" label="Changed" />}
                          <Text type="supporting">{hasEdits ? 'Changed. Use Update and run at the top to apply it.' : 'Editing. Nothing changes until you run it.'}</Text>
                        </HStack>
                        <Button
                          label={hasEdits ? 'Discard changes' : 'Done'}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setInstructions(t.instructions);
                            setIsEditing(false);
                          }}
                        />
                      </HStack>
                    </VStack>
                  ) : (
                    <VStack gap={2} hAlign="start">
                      <Text as="p">{instructions}</Text>
                      <Button label="Edit instructions" variant="ghost" size="sm" icon={<Icon icon={Pencil} />} onClick={() => setIsEditing(true)} />
                    </VStack>
                  )}
                  <Divider />
                  <AgentDidList lines={t.agentSummary ?? []} emptyText="Nothing yet. Run the step and the agent explains its work here in plain words." />
                  <ShowCode code={code ?? t.python} />
                </VStack>
              </Region>
            <Grid columns={{minWidth: 320, max: 2, repeat: 'fit'}} gap={3} align="stretch">
              <Region
                title="Inputs"
                count={inputCount}
                isFullHeight>
                <List hasDividers edge="outset">
                  {fileInputs.map(d => <DataRow key={d.name} data={d} onSelect={() => goToInput(d.sheet)} />)}
                </List>
                {linkedInputs.length > 0 && (
                  <List hasDividers edge="outset" header={<Text type="supporting">From other workflows</Text>}>
                    {linkedInputs.map(hid => {
                      const h = handoffs.find(x => x.id === hid);
                      return h ? <HandoffInputRow key={hid} handoff={h} onRemove={() => setLinkedInputs(prev => prev.filter(x => x !== hid))} /> : null;
                    })}
                  </List>
                )}
              </Region>
              <Region title="Outputs" isFullHeight>
                {/* Step 1: the result, always passed on */}
                <VStack gap={1.5}>
                  <Text type="label">Result</Text>
                  <Text type="supporting">The full output. Always passed on to the next step in this workflow.</Text>
                </VStack>
                <List edge="outset">
                  <DataRow data={result} onSelect={() => goToOutput(result.sheet)} />
                </List>

                <Divider />

                {/* Step 2: handoffs, with step 3: checks */}
                <VStack gap={0.5}>
                  <Text type="label">{`Shared values · ${myHandoffs.length}`}</Text>
                  <Text type="supporting">
                    {hasResult
                      ? 'Values from the result that other workflows can use as inputs.'
                      : 'Values other workflows can use as inputs. Available after the agent has run.'}
                  </Text>
                </VStack>

                <List hasDividers edge="outset">
                {myHandoffs.map(h => (
                  <HandoffRow
                    key={h.id}
                    handoff={h}
                    onRemove={() => {
                      onRemoveHandoff(h.id);
                      toast({body: h.usedBy.length ? `Removed ${h.name}. ${h.usedBy.join(' and ')} lost this input.` : `Removed ${h.name}.`});
                    }}
                  />
                ))}
                </List>
              </Region>
            </Grid>

            {/* Sheets: output first (what you approve), inputs collapsed */}
            <Workbook
              title="Output results"
              description="What the agent writes. Read only; change the instructions to change these."
              sheets={outputSheets}
              selected={outputSheet}
              onSelect={setOutputSheet}
              anchorId="output-sheets"
              rowTotals={rowTotals}
              actions={
                <>
                  <Button label="Download output" icon={<Icon icon={Download} />} onClick={() => preview('Download')} />
                </>
              }
            />
            {inputSheets.length > 0 && (
              <Workbook
                title="Input data"
                description="What the agent reads. Upload an Excel to add its sheets here."
                sheets={inputSheets}
                selected={inputSheet}
                onSelect={setInputSheet}
                anchorId="input-sheets"
                rowTotals={rowTotals}
                isOpen={inputsOpen}
                onToggle={() => setInputsOpen(o => !o)}
                actions={
                  <>
                    <FileInput
                      label="Upload Excel"
                      isLabelHidden
                      placeholder="Upload Excel"
                      accept=".xlsx,.xls,.csv"
                      width={220}
                      value={upload}
                      onChange={files => {
                        const f = Array.isArray(files) ? files[0] : files;
                        if (f) addUpload(f);
                      }}
                    />
                    <Button label="Download inputs" icon={<Icon icon={Download} />} onClick={() => preview('Download')} />
                  </>
                }
              />
            )}
            <Text type="supporting" justify="center">Design prototype. Example data. Runs, uploads and downloads are not connected yet.</Text>
    </OverviewFrame>
  );
}
