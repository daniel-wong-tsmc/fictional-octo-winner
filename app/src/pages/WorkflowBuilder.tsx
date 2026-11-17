import {useCallback, useEffect, useMemo, useState, type CSSProperties} from 'react';
import {
  Background, BackgroundVariant, Handle, Panel, Position, ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow, useViewport,
  type Edge, type Node, type NodeChange, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {Layout, LayoutContent, LayoutFooter, LayoutHeader, LayoutPanel} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Selector} from '@astryxdesign/core/Selector';
import {MultiSelector} from '@astryxdesign/core/MultiSelector';
import {Switch} from '@astryxdesign/core/Switch';
import {Token} from '@astryxdesign/core/Token';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Toolbar} from '@astryxdesign/core/Toolbar';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Icon} from '@astryxdesign/core/Icon';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {useToast} from '@astryxdesign/core/Toast';
import {Database, Eye, Maximize, Minus, Play, Plug, Plus, Power, Send, Trash2, Upload, WandSparkles} from 'lucide-react';
import {PEOPLE} from '../workflow';
import {TICKETS, type Sheet} from '../data';
import {SheetTable} from './TicketPage';

/* ---------- Steps ---------- */

type StepKind = 'input' | 'instructions' | 'output';

type InputStep = {kind: 'input'; source: 'upload' | 'mcp' | null; fileName: string; sheets: string[]; app: string; resource: string};
type InstructionsStep = {kind: 'instructions'; text: string};
type OutputStep = {kind: 'output'; name: string; format: string; needsOk: boolean; approver: string; sendTo: string[]; shareWithWorkflows: boolean};
type Step = InputStep | InstructionsStep | OutputStep;

const KIND_INFO: Record<StepKind, {label: string; icon: typeof Send; hint: string}> = {
  input: {label: 'Input', icon: Database, hint: 'Excel upload or an app through MCP'},
  instructions: {label: 'LLM', icon: WandSparkles, hint: 'Tell the AI what to do with the data'},
  output: {label: 'Pass on to', icon: Send, hint: 'Who gets the result, and who OKs it'},
};
const KINDS: StepKind[] = ['input', 'instructions', 'output'];
/** Drag type used when a node is dragged from the toolbar onto the board. */
const DRAG_TYPE = 'application/x-workflow-node';

/** Apps the workspace admin has connected through MCP. */
const MCP_APPS: {name: string; isConnected: boolean; reads: string[]}[] = [
  {name: 'Google Drive', isConnected: true, reads: ['FY26 targets.xlsx', 'Finance close pack (folder)']},
  {name: 'SharePoint', isConnected: true, reads: ['stock_levels.xlsx', 'Close archive (folder)']},
  {name: 'Shopify', isConnected: false, reads: ['Orders, last month', 'Refunds, last month']},
  {name: 'Salesforce', isConnected: true, reads: ['Active customers', 'Open opportunities']},
  {name: 'Snowflake', isConnected: true, reads: ['sales_history', 'inventory_daily']},
];
const appInfo = (name: string) => MCP_APPS.find(a => a.name === name);

const INSTRUCTION_EXAMPLES: [string, string][] = [
  ['Convert to USD', 'Convert every order to US dollars using the exchange rate on its order date.'],
  ['Total vs target', 'Total sales by region. Show each region’s target and the gap in dollars and percent. Biggest miss first.'],
  ['Flag misses', 'Flag any region more than 5% below target.'],
];
const SEND_OPTIONS = [
  {type: 'section' as const, title: 'People', options: ['Email: Priya Shah', 'Email: Marco Ruiz', 'Email: finance@company.com'].map(v => ({value: v, label: v}))},
  {type: 'section' as const, title: 'Channels and folders', options: ['Slack: #finance-close', 'Google Drive: Finance close pack', 'SharePoint: Close archive'].map(v => ({value: v, label: v}))},
];
const UPLOAD_EXAMPLE = {fileName: 'Sales close – Oct 2026.xlsx', sheets: ['Orders', 'Rates']};

function blankStep(kind: StepKind, n: number): Step {
  if (kind === 'input') return {kind, source: null, fileName: '', sheets: [], app: '', resource: ''};
  if (kind === 'instructions') return {kind, text: INSTRUCTION_EXAMPLES[n % INSTRUCTION_EXAMPLES.length][1]};
  return {kind, name: 'October summary', format: 'Excel sheet', needsOk: true, approver: PEOPLE[0], sendTo: ['Slack: #finance-close'], shareWithWorkflows: false};
}

function isReady(s: Step): boolean {
  if (s.kind === 'input') return s.source === 'upload' ? !!s.fileName : s.source === 'mcp' ? !!s.app && !!s.resource : false;
  if (s.kind === 'instructions') return !!s.text.trim();
  return !!s.name.trim();
}

function summary(s: Step): string {
  if (s.kind === 'input') {
    if (s.source === 'upload') return s.fileName ? `${s.fileName} · ${s.sheets.join(', ')}` : 'Upload an Excel file';
    if (s.source === 'mcp') return s.app ? `${s.app}${s.resource ? `: ${s.resource}` : ''} (via MCP)` : 'Pick an app';
    return 'Select this tile to add your data: upload Excel or connect an app.';
  }
  if (s.kind === 'instructions') return s.text;
  return `${s.format}${s.needsOk ? `, after an OK from ${s.approver.replace(' (you)', '')}` : ''} → ${s.sendTo.length ? s.sendTo.join(', ') : 'nobody yet'}`;
}

/* ---------- Trial run (prefilled) ---------- */

/** "Try on last month" runs on the last full month. Today is in November 2026. */
const TRIAL_MONTH = 'October 2026';
const TRIAL_ORDERS: Sheet = {
  kind: 'Output',
  columns: ['Order ID', 'Date', 'Region', 'Currency', 'Amount', 'Amount (USD)'],
  addedColumns: [5],
  rows: [
    ['SO-47102', '2026-10-01', 'Europe', 'EUR', '1,240.00', '1,344.28'],
    ['SO-47118', '2026-10-02', 'Japan', 'JPY', '182,500', '1,208.15'],
    ['SO-47240', '2026-10-06', 'UK', 'GBP', '860.50', '1,111.34'],
    ['SO-47311', '2026-10-09', 'Europe', 'EUR', '312.00', '337.96'],
    ['SO-47506', '2026-10-15', 'Canada', 'CAD', '2,045.75', '1,487.46'],
    ['SO-47622', '2026-10-20', 'US', 'USD', '975.00', '975.00'],
    ['SO-47815', '2026-10-27', 'UK', 'GBP', '4,120.00', '5,327.16'],
    ['SO-47930', '2026-10-31', 'Europe', 'EUR', '58.90', '64.00'],
  ],
};
const TRIAL_SUMMARY: Sheet = TICKETS[3].sheets['October summary'];

type TrialResult = {line: string; sheet?: Sheet; rowsShown?: string};

/** What each tile produced on the trial. The last LLM step and every Pass on to tile end with the summary. */
function trialFor(node: BoardNode, board: BoardNode[]): TrialResult {
  const steps = board.filter(n => n.step.kind === 'instructions');
  if (node.step.kind === 'input') return {line: node.step.source === 'mcp' ? '60 rows read' : '4,988 rows read'};
  if (node.step.kind === 'instructions') {
    return node.id === steps[steps.length - 1]?.id
      ? {line: '5 rows: sales by region against target', sheet: TRIAL_SUMMARY}
      : {line: '4,988 rows, 1 column added', sheet: TRIAL_ORDERS, rowsShown: `First ${TRIAL_ORDERS.rows!.length} of 4,988 rows`};
  }
  return {line: `${node.step.name || 'Output'}, 5 rows`, sheet: TRIAL_SUMMARY};
}

function sendSentence(s: OutputStep): string {
  const to = s.sendTo.length ? s.sendTo.join(', ') : 'nobody yet (pick who gets it in the tile)';
  return s.needsOk ? `On a real run this waits for an OK from ${s.approver}, then goes to ${to}.` : `On a real run this goes straight to ${to}.`;
}

/* ---------- Tile (a node on the board) ---------- */

type TileData = {
  step: Step;
  title: string;
  trial: TrialResult | null;
  /** Pass on to tile whose trial output nobody has opened yet. */
  isUnchecked: boolean;
  onOpenTrial: (id: string) => void;
  next: {label: string; kind: StepKind}[];
  onAdd: (from: string, kind: StepKind) => void;
};
type TileNode = Node<TileData, 'tile'>;

function Tile({id, data, selected}: NodeProps<TileNode>) {
  const {step} = data;
  const info = KIND_INFO[step.kind];
  const ready = isReady(step);
  const status = data.isUnchecked
    ? {dot: 'info' as const, label: 'Check output'}
    : data.trial
    ? {dot: 'success' as const, label: 'Tried'}
    : ready
      ? {dot: 'success' as const, label: 'Ready'}
      : {dot: 'warning' as const, label: 'Needs setup'};
  return (
    <Card padding={3} width={250} elevation={selected ? 'high' : 'low'}>
      {step.kind !== 'input' && <Handle type="target" position={Position.Left} />}
      <VStack gap={2}>
        <HStack hAlign="between" vAlign="center" gap={2}>
          <HStack gap={1.5} vAlign="center">
            <Icon icon={info.icon} size="sm" color="secondary" />
            <Text type="supporting" weight="medium">{info.label}</Text>
          </HStack>
          <HStack gap={1} vAlign="center">
            <StatusDot variant={status.dot} label={status.label} />
            <Text type="supporting">{status.label}</Text>
          </HStack>
        </HStack>
        <Text weight="semibold">{data.title}</Text>
        <Text type="supporting" maxLines={3}>{summary(step)}</Text>
        {data.trial && (
          <VStack gap={1}>
            <Text weight="medium">{data.trial.line}</Text>
            {data.trial.sheet && (
              <HStack>
                <Button
                  className="nodrag"
                  label={step.kind === 'output' ? 'See output' : 'See result'}
                  size="sm"
                  variant={data.isUnchecked ? 'primary' : 'secondary'}
                  icon={<Icon icon={Eye} />}
                  onClick={e => {
                    e.stopPropagation();
                    data.onOpenTrial(id);
                  }}
                />
              </HStack>
            )}
          </VStack>
        )}
        {!data.trial && ready && data.next.length > 0 && (
          <HStack gap={1} wrap="wrap">
            {data.next.map(n => (
              <Button
                key={n.kind}
                className="nodrag"
                label={n.label}
                size="sm"
                variant="ghost"
                icon={<Icon icon={Plus} />}
                onClick={e => {
                  e.stopPropagation();
                  data.onAdd(id, n.kind);
                }}
              />
            ))}
          </HStack>
        )}
      </VStack>
      {step.kind !== 'output' && <Handle type="source" position={Position.Right} />}
    </Card>
  );
}
const nodeTypes = {tile: Tile};

/* ---------- Side panel ---------- */

function InputPanel({step, onChange}: {step: InputStep; onChange: (s: InputStep) => void}) {
  const toast = useToast();
  const chooseUpload = () => onChange({...step, source: 'upload', ...UPLOAD_EXAMPLE});
  const chooseApp = () => onChange({...step, source: 'mcp', app: 'Google Drive', resource: 'FY26 targets.xlsx'});

  if (step.source === null) {
    return (
      <VStack gap={3}>
        <Text>Where does the data come from?</Text>
        <ClickableCard label="Upload Excel" padding={3} onClick={chooseUpload}>
          <VStack gap={1}>
            <HStack gap={2} vAlign="center">
              <Icon icon={Upload} size="sm" />
              <Text weight="semibold">Upload Excel</Text>
            </HStack>
            <Text type="supporting">Drop an Excel or CSV file. You can upload a new one each run.</Text>
          </VStack>
        </ClickableCard>
        <ClickableCard label="Connect an app through MCP" padding={3} onClick={chooseApp}>
          <VStack gap={1}>
            <HStack gap={2} vAlign="center">
              <Icon icon={Plug} size="sm" />
              <Text weight="semibold">Connect an app (MCP)</Text>
            </HStack>
            <Text type="supporting">Read straight from Google Drive, SharePoint, Shopify and other apps your admin connected.</Text>
          </VStack>
        </ClickableCard>
      </VStack>
    );
  }

  if (step.source === 'upload') {
    return (
      <VStack gap={4}>
        <FileInput
          label="Excel file"
          description="Excel or CSV. Upload a new one each run, or keep this one."
          mode="dropzone"
          accept=".xlsx,.xls,.csv"
          value={step.fileName ? new File([''], step.fileName) : null}
          onChange={files => {
            const f = Array.isArray(files) ? files[0] : files;
            onChange({...step, fileName: f?.name ?? '', sheets: f ? ['Sheet1', 'Sheet2'] : []});
          }}
        />
        {step.sheets.length > 0 && (
          <VStack gap={1.5}>
            <Text type="label">Sheets the AI will read</Text>
            <HStack gap={1.5} wrap="wrap">
              {step.sheets.map(s => (
                <Token key={s} label={s} onRemove={() => onChange({...step, sheets: step.sheets.filter(x => x !== s)})} />
              ))}
            </HStack>
          </VStack>
        )}
        <HStack>
          <Button label="Connect an app instead" variant="ghost" icon={<Icon icon={Plug} />} onClick={chooseApp} />
        </HStack>
      </VStack>
    );
  }

  const app = appInfo(step.app);
  return (
    <VStack gap={4}>
      <Selector
        label="App"
        description="Apps your workspace admin connected through MCP."
        options={MCP_APPS.map(a => ({value: a.name, label: a.name, description: a.isConnected ? 'Connected' : 'Not connected yet'}))}
        value={step.app}
        onChange={appName => onChange({...step, app: appName, resource: appInfo(appName)?.reads[0] ?? ''})}
      />
      {app && (
        <HStack gap={1.5} vAlign="center" hAlign="between" wrap="wrap">
          <HStack gap={1.5} vAlign="center">
            <StatusDot variant={app.isConnected ? 'success' : 'warning'} label={app.isConnected ? 'Connected' : 'Not connected'} />
            <Text type="supporting">{app.isConnected ? 'Connected through MCP. Read only.' : 'Not connected yet. The step waits until it is.'}</Text>
          </HStack>
          {!app.isConnected && (
            <Button label="Request access" size="sm" onClick={() => toast({body: `Asked your workspace admin to connect ${app.name}. You can keep building meanwhile.`})} />
          )}
        </HStack>
      )}
      {app && <Selector label="What to read" options={app.reads} value={step.resource} onChange={resource => onChange({...step, resource})} />}
      <HStack>
        <Button label="Upload a file instead" variant="ghost" icon={<Icon icon={Upload} />} onClick={chooseUpload} />
      </HStack>
    </VStack>
  );
}

function StepPanel({step, trial, onOpenTrial, onChange, onRemove}: {
  step: Step | null;
  trial: TrialResult | null;
  onOpenTrial: () => void;
  onChange: (s: Step) => void;
  onRemove: () => void;
}) {
  if (!step) {
    return <EmptyState isCompact title="Select a tile" description="Click a tile on the board to set it up." />;
  }
  const info = KIND_INFO[step.kind];
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center">
        <Icon icon={info.icon} size="sm" />
        <Heading level={3}>{info.label}</Heading>
      </HStack>

      {trial && (
        <>
          <VStack gap={1.5}>
            <Text type="label">{`Trial result, ${TRIAL_MONTH}`}</Text>
            <Text>{trial.line}</Text>
            {step.kind === 'output' && <Text type="supporting">{`Not sent. ${sendSentence(step)}`}</Text>}
            {trial.sheet && (
              <HStack>
                <Button label={step.kind === 'output' ? 'See output' : 'See result'} icon={<Icon icon={Eye} />} onClick={onOpenTrial} />
              </HStack>
            )}
          </VStack>
          <Divider />
        </>
      )}

      {step.kind === 'input' && <InputPanel step={step} onChange={onChange} />}

      {step.kind === 'instructions' && (
        <>
          <TextArea
            label="What should the AI do?"
            description="Plain words, like you’d tell a colleague. It can use everything that flows into this tile."
            value={step.text}
            onChange={text => onChange({...step, text})}
            rows={6}
          />
          <HStack gap={1.5} wrap="wrap" vAlign="center">
            <Text type="supporting">Examples:</Text>
            {INSTRUCTION_EXAMPLES.map(([label, text]) => (
              <Token key={label} size="sm" label={label} onClick={() => onChange({...step, text})} />
            ))}
          </HStack>
        </>
      )}

      {step.kind === 'output' && (
        <>
          <TextInput label="Name" description="How people and other workflows will see it." value={step.name} onChange={name => onChange({...step, name})} />
          <Selector label="Format" options={['Excel sheet', 'CSV file', 'A single number']} value={step.format} onChange={format => onChange({...step, format})} />
          <Divider />
          <Text type="label">Who gets it</Text>
          <Switch label="Needs an OK before it’s sent" value={step.needsOk} onChange={needsOk => onChange({...step, needsOk})} />
          {step.needsOk && <Selector label="Who gives the OK" options={PEOPLE} value={step.approver} onChange={approver => onChange({...step, approver})} />}
          <MultiSelector
            label="Send it to"
            placeholder="Pick people, channels or folders"
            options={SEND_OPTIONS}
            value={step.sendTo}
            onChange={sendTo => onChange({...step, sendTo})}
            triggerDisplay="labels"
            hasSearch
            width="100%"
          />
          <Switch
            label="Let other workflows use it"
            description="Other workflows can pick this output as an input."
            value={step.shareWithWorkflows}
            onChange={shareWithWorkflows => onChange({...step, shareWithWorkflows})}
          />
        </>
      )}

      <Divider />
      <HStack>
        <Button label="Remove tile" variant="ghost" icon={<Icon icon={Trash2} />} onClick={onRemove} />
      </HStack>
    </VStack>
  );
}

/* ---------- Trial result preview ---------- */

function TrialDialog({title, step, trial, onClose}: {title: string; step: Step; trial: TrialResult; onClose: () => void}) {
  const isOutput = step.kind === 'output';
  return (
    <Dialog isOpen onOpenChange={open => !open && onClose()} width={760} maxHeight="85dvh">
      <Layout
        height="auto"
        header={
          <DialogHeader
            title={isOutput ? `Output: ${title}` : `Result: ${title}`}
            subtitle={`Trial on ${TRIAL_MONTH} data. ${trial.rowsShown ?? trial.line}.`}
            onOpenChange={open => !open && onClose()}
          />
        }
        content={
          <LayoutContent padding={4}>
            <VStack gap={3}>
              {isOutput && (
                <Banner status="info" title="Not sent" description={sendSentence(step)} collapsible={false} />
              )}
              {!isOutput && (
                <Text type="supporting">What this step hands to the next one. Columns marked with a dot were added by the AI.</Text>
              )}
              <Card padding={0}>{trial.sheet && <SheetTable sheet={trial.sheet} />}</Card>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter padding={4}>
            <HStack gap={2} hAlign="end">
              <Button label={isOutput ? 'Looks right' : 'Close'} variant={isOutput ? 'primary' : 'secondary'} onClick={onClose} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

/* ---------- Board ---------- */

type BoardNode = {id: string; step: Step; position: {x: number; y: number}; measured?: {width?: number; height?: number}};

let nextId = 1;
const newId = () => `n${nextId++}`;
const COL = 310;
const ROW = 210;

function startingBoard(isEditing: boolean): BoardNode[] {
  if (!isEditing) return [{id: newId(), step: blankStep('input', 0), position: {x: 0, y: 0}}];
  return [
    {id: newId(), step: {kind: 'input', source: 'upload', ...UPLOAD_EXAMPLE, app: '', resource: ''}, position: {x: 0, y: 0}},
    {id: newId(), step: {kind: 'input', source: 'mcp', fileName: '', sheets: [], app: 'Google Drive', resource: 'FY26 targets.xlsx'}, position: {x: 0, y: ROW}},
    {id: newId(), step: blankStep('instructions', 0), position: {x: COL, y: ROW / 2}},
    {id: newId(), step: blankStep('instructions', 1), position: {x: COL * 2, y: ROW / 2}},
    {id: newId(), step: {...(blankStep('output', 0) as OutputStep), sendTo: ['Slack: #finance-close', 'Google Drive: Finance close pack'], shareWithWorkflows: true}, position: {x: COL * 3, y: ROW / 2}},
  ];
}

/**
 * The flow always reads input → instructions → output, so lines come from the tiles, not by hand:
 * every input feeds the first instructions tile, each instructions tile feeds the next,
 * and the last one feeds every output.
 */
function edgesFor(board: BoardNode[]): Edge[] {
  const inputs = board.filter(n => n.step.kind === 'input');
  const steps = board.filter(n => n.step.kind === 'instructions');
  const outputs = board.filter(n => n.step.kind === 'output');
  const e = (a: string, b: string): Edge => ({id: `${a}-${b}`, source: a, target: b});
  if (!steps.length) return [];
  return [
    ...inputs.map(i => e(i.id, steps[0].id)),
    ...steps.slice(1).map((s, i) => e(steps[i].id, s.id)),
    ...outputs.map(o => e(steps[steps.length - 1].id, o.id)),
  ];
}

/** React Flow's colours, pointed at the Astryx theme tokens. */
const flowTheme = {
  '--xy-edge-stroke-default': 'var(--color-text-secondary)',
  '--xy-edge-stroke-width-default': 1.5,
  '--xy-handle-background-color-default': 'var(--color-text-secondary)',
  '--xy-handle-border-color-default': 'var(--color-background-surface)',
  '--xy-background-color-default': 'transparent',
  '--xy-background-pattern-dots-color-default': 'var(--color-border)',
  '--xy-controls-button-background-color-default': 'var(--color-background-surface)',
  '--xy-controls-button-color-default': 'var(--color-text-primary)',
  '--xy-controls-button-border-color-default': 'var(--color-border)',
  '--xy-attribution-background-color-default': 'transparent',
} as CSSProperties;

/** Keeps every tile in view as tiles are added or removed, without shrinking text past readable. */
const FIT = {padding: 0.2, maxZoom: 1, minZoom: 0.6, duration: 250};
function FitOnChange({fitKey}: {fitKey: number}) {
  const {fitView} = useReactFlow();
  useEffect(() => {
    const t = window.setTimeout(() => fitView(FIT), 60);
    return () => window.clearTimeout(t);
  }, [fitKey, fitView]);
  return null;
}

/** Where a tile goes when it's added by a click rather than dropped: the flow reads left to right. */
function placeFor(board: BoardNode[], kind: StepKind, fromId?: string): {x: number; y: number} {
  const sameKind = board.filter(n => n.step.kind === kind).length;
  if (kind === 'input') return {x: 0, y: sameKind * ROW};
  const steps = board.filter(n => n.step.kind === 'instructions');
  const anchor = board.find(n => n.id === fromId) ?? steps[steps.length - 1] ?? board.find(n => n.step.kind === 'input');
  if (!anchor) return {x: kind === 'instructions' ? COL : COL * 2, y: 0};
  return {x: anchor.position.x + COL, y: anchor.position.y + (kind === 'output' ? sameKind * ROW : 0)};
}

/* ---------- Bottom toolbar (like a FigJam toolbar) ---------- */

function BoardToolbar({onAdd}: {onAdd: (kind: StepKind) => void}) {
  const {zoomIn, zoomOut, fitView} = useReactFlow();
  const {zoom} = useViewport();
  // On a phone the node buttons drop their words so the bar fits; tooltips and labels still name them.
  const isSmall = useMediaQuery('(max-width: 640px)');
  return (
    <Card padding={1.5} elevation="high">
      <Toolbar
        label="Board tools"
        size="sm"
        gap={2}
        startContent={
          <HStack gap={2} vAlign="center">
            {!isSmall && <Text type="supporting" weight="medium">Nodes</Text>}
            <HStack gap={1}>
              {KINDS.map(kind => {
                const info = KIND_INFO[kind];
                return (
                  <Button
                    key={kind}
                    label={info.label}
                    variant="ghost"
                    isIconOnly={isSmall}
                    icon={<Icon icon={info.icon} />}
                    tooltip={`${info.hint}. Drag onto the board, or click to add.`}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData(DRAG_TYPE, kind);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => onAdd(kind)}
                  />
                );
              })}
            </HStack>
          </HStack>
        }
        endContent={
          <HStack gap={1} vAlign="center">
            <Divider orientation="vertical" />
            <IconButton label="Zoom out" tooltip="Zoom out" variant="ghost" icon={<Icon icon={Minus} />} onClick={() => zoomOut({duration: 150})} />
            {!isSmall && <Text type="supporting" hasTabularNumbers>{`${Math.round(zoom * 100)}%`}</Text>}
            <IconButton label="Zoom in" tooltip="Zoom in" variant="ghost" icon={<Icon icon={Plus} />} onClick={() => zoomIn({duration: 150})} />
            <IconButton label="Fit board to screen" tooltip="Fit to screen" variant="ghost" icon={<Icon icon={Maximize} />} onClick={() => fitView(FIT)} />
          </HStack>
        }
      />
    </Card>
  );
}

/* ---------- Page ---------- */

export function WorkflowBuilderPage(props: {isEditing: boolean; onTurnOn: () => void}) {
  return (
    <ReactFlowProvider>
      <Builder {...props} />
    </ReactFlowProvider>
  );
}

function Builder({isEditing, onTurnOn}: {isEditing: boolean; onTurnOn: () => void}) {
  const {screenToFlowPosition} = useReactFlow();
  const toast = useToast();
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const isPhone = useMediaQuery('(max-width: 640px)');
  const [name, setName] = useState(isEditing ? 'Monthly sales close' : 'Untitled workflow');
  const [board, setBoard] = useState<BoardNode[]>(() => startingBoard(isEditing));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trial, setTrial] = useState<'none' | 'running' | 'done'>('none');
  // Bumped when a click adds a tile, so the board refits. A dropped tile stays where it was put.
  const [fitKey, setFitKey] = useState(0);
  // Trial output the user is looking at, and the Pass on to tiles they've opened since the last trial.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const isTried = trial === 'done';
  useEffect(() => {
    if (trial !== 'done') setChecked([]);
  }, [trial]);

  const selected = board.find(n => n.id === selectedId) ?? null;
  const count = (k: StepKind) => board.filter(n => n.step.kind === k).length;
  const outputs = board.filter(n => n.step.kind === 'output');
  const allChecked = outputs.every(o => checked.includes(o.id));
  const allReady = board.every(n => isReady(n.step)) && count('input') > 0 && count('instructions') > 0 && count('output') > 0;
  const nextHint = !board.some(n => n.step.kind === 'input' && isReady(n.step))
    ? 'Start here: select the Input tile and add your data.'
    : !count('instructions')
      ? 'Next: drag an LLM node from the toolbar, or click “Add LLM step” on the Input tile.'
      : !count('output')
        ? 'Next: drag a Pass on to node from the toolbar, or click “Add pass on to”.'
        : 'Finish the tiles marked Needs setup.';

  const place = useCallback((kind: StepKind, at?: {x: number; y: number}, fromId?: string) => {
    const id = newId();
    setBoard(prev => {
      const sameKind = prev.filter(n => n.step.kind === kind).length;
      return [...prev, {id, step: blankStep(kind, sameKind), position: at ?? placeFor(prev, kind, fromId)}];
    });
    if (!at) setFitKey(k => k + 1);
    setSelectedId(id);
    setTrial('none');
  }, []);
  const add = useCallback((fromId: string, kind: StepKind) => place(kind, undefined, fromId), [place]);

  const update = (id: string, step: Step) => {
    setBoard(prev => prev.map(n => (n.id === id ? {...n, step} : n)));
    setTrial('none');
  };
  const openTrial = useCallback(
    (id: string) => {
      setViewingId(id);
      setChecked(c => (c.includes(id) ? c : [...c, id]));
      // On small screens the tile panel is itself a full-screen dialog; close it so dialogs don't stack.
      if (isNarrow) setSelectedId(null);
    },
    [isNarrow],
  );
  const remove = (id: string) => {
    setBoard(prev => prev.filter(n => n.id !== id));
    setSelectedId(null);
    setTrial('none');
  };

  const nodes: TileNode[] = useMemo(() => {
    const steps = board.filter(n => n.step.kind === 'instructions');
    const lastStep = steps[steps.length - 1];
    const hasOutput = board.some(n => n.step.kind === 'output');
    return board.map(n => {
      let next: TileData['next'] = [];
      if (n.step.kind === 'input' && !steps.length) next = [{label: 'Add LLM step', kind: 'instructions'}];
      if (n.step.kind === 'instructions' && n.id === lastStep?.id) {
        next = [{label: 'Add LLM step', kind: 'instructions'}, ...(hasOutput ? [] : [{label: 'Add pass on to', kind: 'output' as StepKind}])];
      }
      const title =
        n.step.kind === 'input'
          ? n.step.source === 'mcp' ? n.step.app || 'Connect an app' : n.step.source === 'upload' ? 'Excel upload' : 'Add your data'
          : n.step.kind === 'instructions'
            ? `Step ${steps.findIndex(s => s.id === n.id) + 1}`
            : n.step.name || 'Output';
      const result = trial === 'done' ? trialFor(n, board) : null;
      const isUnchecked = !!result && n.step.kind === 'output' && !checked.includes(n.id);
      return {
        id: n.id, type: 'tile' as const, position: n.position, measured: n.measured, selected: n.id === selectedId,
        data: {step: n.step, title, trial: result, isUnchecked, onOpenTrial: openTrial, next, onAdd: add},
      };
    });
  }, [board, selectedId, trial, checked, add, openTrial]);
  const titleOf = (id: string) => nodes.find(n => n.id === id)?.data.title ?? '';
  const viewing = board.find(n => n.id === viewingId) ?? null;
  const edges = useMemo(() => edgesFor(board), [board]);

  // React Flow reports drags (position) and measured tile sizes (dimensions). We keep both;
  // selection and content live in our own state.
  const onNodesChange = (changes: NodeChange<TileNode>[]) => {
    const kept = changes.filter(c => c.type === 'position' || c.type === 'dimensions');
    if (!kept.length) return;
    const next = applyNodeChanges(kept, nodes);
    setBoard(prev =>
      prev.map(n => {
        const m = next.find(x => x.id === n.id);
        return m ? {...n, position: m.position, measured: m.measured} : n;
      }),
    );
  };

  const canvas = (
    <ReactFlow<TileNode>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={(_, node) => setSelectedId(node.id)}
      onPaneClick={() => setSelectedId(null)}
      onDragOver={e => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={e => {
        const kind = e.dataTransfer.getData(DRAG_TYPE) as StepKind;
        if (!KINDS.includes(kind)) return;
        e.preventDefault();
        const p = screenToFlowPosition({x: e.clientX, y: e.clientY});
        // Centre the tile on the pointer (tiles are 250 wide, about 130 tall).
        place(kind, {x: p.x - 125, y: p.y - 60});
      }}
      nodesConnectable={false}
      fitView
      fitViewOptions={FIT}
      minZoom={0.3}
      maxZoom={1.5}
      colorMode="system"
      style={flowTheme}
      aria-label="Workflow board">
      <FitOnChange fitKey={fitKey} />
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
      <Panel position="top-left">
        <VStack gap={2} maxWidth={420}>
          {trial === 'done' && (
            <Banner
              status={allChecked ? 'success' : 'info'}
              title={`Tried on ${TRIAL_MONTH}`}
              description={
                allChecked
                  ? 'You checked the output. Nothing was sent. If it looks right, turn it on.'
                  : 'Nothing was sent. Check the output before you turn this on.'
              }
              collapsible={false}
            />
          )}
          {isTried && !allChecked && (
            <HStack>
              <Button
                label="See output"
                variant="primary"
                icon={<Icon icon={Eye} />}
                onClick={() => {
                  const next = outputs.find(o => !checked.includes(o.id));
                  if (next) openTrial(next.id);
                }}
              />
            </HStack>
          )}
          {!allReady && <Text type="supporting" weight="medium">{nextHint}</Text>}
        </VStack>
      </Panel>
      <Panel position="bottom-center">
        <BoardToolbar onAdd={kind => place(kind)} />
      </Panel>
    </ReactFlow>
  );

  const titleBlock = (
    <VStack gap={1}>
      <Breadcrumbs>
        <BreadcrumbItem href="#home">Home</BreadcrumbItem>
        {isEditing && <BreadcrumbItem href="#workflow-1">Monthly sales close</BreadcrumbItem>}
        <BreadcrumbItem isCurrent>{isEditing ? 'Edit' : 'New workflow'}</BreadcrumbItem>
      </Breadcrumbs>
      <TextInput label="Workflow name" isLabelHidden value={name} onChange={setName} width={isPhone ? '100%' : 320} />
    </VStack>
  );
  const actions = (
    <HStack gap={2} wrap="wrap">
      <Button
        label={trial === 'done' ? 'Try again' : 'Try on last month'}
        icon={<Icon icon={Play} />}
        isDisabled={!allReady}
        tooltip={allReady ? `Runs every tile on ${TRIAL_MONTH} data, without sending anything` : 'Finish the tiles first'}
        isLoading={trial === 'running'}
        onClick={() => {
          setTrial('running');
          window.setTimeout(() => setTrial('done'), 1400);
        }}
      />
      <Button
        label="Turn on"
        variant="primary"
        icon={<Icon icon={Power} />}
        isDisabled={!isTried || !allChecked}
        tooltip={!isTried ? 'Try it on last month first' : !allChecked ? 'Open the output and check it first' : undefined}
        onClick={() => {
          onTurnOn();
          toast({body: `${name} is on. It runs on the first business day of each month.`});
        }}
      />
    </HStack>
  );
  // On a phone the name and the buttons stack, so neither gets cut off.
  const header = (
    <LayoutHeader hasDivider padding={4}>
      {isPhone ? (
        <VStack gap={3}>
          {titleBlock}
          {actions}
        </VStack>
      ) : (
        <Toolbar label="Workflow" gap={3} startContent={titleBlock} endContent={actions} />
      )}
    </LayoutHeader>
  );

  const panel = (
    <StepPanel
      step={selected?.step ?? null}
      trial={selected && isTried ? trialFor(selected, board) : null}
      onOpenTrial={() => selected && openTrial(selected.id)}
      onChange={s => selected && update(selected.id, s)} onRemove={() => selected && remove(selected.id)} />
  );

  return (
    <>
      <Layout
        height="fill"
        header={header}
        content={
          <LayoutContent padding={0} isScrollable={false} label="Workflow board">
            <VStack height="100%">{canvas}</VStack>
          </LayoutContent>
        }
        end={
          // The side panel only opens for a selected tile, so the board gets the full width otherwise.
          isNarrow || !selected ? undefined : (
            <LayoutPanel hasDivider padding={4} width={360} label="Selected tile">
              {panel}
            </LayoutPanel>
          )
        }
      />
      {viewing && isTried && (
        <TrialDialog title={titleOf(viewing.id)} step={viewing.step} trial={trialFor(viewing, board)} onClose={() => setViewingId(null)} />
      )}
      {isNarrow && (
        <Dialog isOpen={!!selected} onOpenChange={open => !open && setSelectedId(null)} variant="fullscreen" purpose="form" padding={0}>
          <Layout
            height="fill"
            header={<DialogHeader title="Set up tile" onOpenChange={open => !open && setSelectedId(null)} />}
            content={<LayoutContent padding={4}>{panel}</LayoutContent>}
          />
        </Dialog>
      )}
    </>
  );
}
