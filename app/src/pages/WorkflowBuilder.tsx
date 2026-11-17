import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {
  Background, BackgroundVariant, BaseEdge, EdgeLabelRenderer, Handle, Panel, Position, ReactFlow, ReactFlowProvider,
  applyNodeChanges, getBezierPath, useReactFlow, useViewport,
  type Connection, type Edge, type EdgeChange, type EdgeProps, type Node, type NodeChange, type NodeProps,
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
import {Database, Eye, Maximize, X, Minus, Play, Plug, Plus, Power, Send, Trash2, Upload, WandSparkles} from 'lucide-react';
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
function trialFor(node: BoardNode, board: BoardNode[], links: Link[]): TrialResult {
  if (node.step.kind === 'input') return {line: node.step.source === 'mcp' ? '60 rows read' : '4,988 rows read'};
  if (node.step.kind === 'instructions') {
    const feedsOutput = links.some(l => l.source === node.id && board.find(n => n.id === l.target)?.step.kind === 'output');
    return feedsOutput
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
  /** Has the lines it needs: inputs lead somewhere, LLM steps have both sides, Pass on to has something coming in. */
  isLinked: boolean;
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
    : ready && !data.isLinked
    ? {dot: 'warning' as const, label: 'Not connected'}
    : ready
      ? {dot: 'success' as const, label: 'Ready'}
      : {dot: 'warning' as const, label: 'Needs setup'};
  return (
    <Card padding={3} width={250} elevation={selected ? 'high' : 'low'}>
      {step.kind !== 'input' && <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />}
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
      {step.kind !== 'output' && <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />}
    </Card>
  );
}
const nodeTypes = {tile: Tile};
/** Dots big enough to grab with a mouse or a finger. */
const HANDLE_STYLE: CSSProperties = {width: 'var(--spacing-3)', height: 'var(--spacing-3)'};

/* ---------- Connection (a line between tiles) ---------- */

type LinkEdge = Edge<{onRemove: (id: string) => void}, 'link'>;

/** A line that shows a delete button at its middle once it's selected. */
function LinkLine({id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data, style}: EdgeProps<LinkEdge>) {
  const [path, midX, midY] = getBezierPath({sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition});
  return (
    <>
      <BaseEdge id={id} path={path} style={style} interactionWidth={24} />
      {selected && data && (
        <EdgeLabelRenderer>
          <IconButton
            className="nodrag nopan"
            label="Delete connection"
            tooltip="Delete connection"
            size="sm"
            variant="primary"
            elevation="med"
            icon={<Icon icon={X} />}
            style={{position: 'absolute', transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`, pointerEvents: 'all'}}
            onClick={() => data.onRemove(id)}
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const edgeTypes = {link: LinkLine};

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

/** A line between two tiles. People draw these; the app only draws them for tiles added with a click. */
type Link = {id: string; source: string; target: string};
const link = (source: string, target: string): Link => ({id: `${source}-${target}`, source, target});

/** The lines a new or edited workflow starts with: inputs → first LLM step → next … → every Pass on to. */
function startingLinks(board: BoardNode[]): Link[] {
  const inputs = board.filter(n => n.step.kind === 'input');
  const steps = board.filter(n => n.step.kind === 'instructions');
  const outputs = board.filter(n => n.step.kind === 'output');
  if (!steps.length) return [];
  return [
    ...inputs.map(i => link(i.id, steps[0].id)),
    ...steps.slice(1).map((st, i) => link(steps[i].id, st.id)),
    ...outputs.map(o => link(steps[steps.length - 1].id, o.id)),
  ];
}

/** Why a line can't be drawn, or null when it can. Keeps the flow input → LLM → Pass on to, with no loops. */
function linkProblem(board: BoardNode[], links: Link[], source: string | null, target: string | null): string | null {
  const from = board.find(n => n.id === source);
  const to = board.find(n => n.id === target);
  if (!from || !to || from.id === to.id) return 'Pick two different tiles.';
  if (from.step.kind === 'output') return 'Pass on to is the last stage. Nothing comes after it.';
  if (to.step.kind === 'input') return 'Inputs are the first stage. Nothing goes into them.';
  if (from.step.kind === 'input' && to.step.kind === 'output') return 'Data needs an LLM step before it’s passed on.';
  if (links.some(l => l.source === from.id && l.target === to.id)) return 'These tiles are already connected.';
  // A loop would mean a tile waits on its own result.
  const reaches = (a: string, b: string, seen = new Set<string>()): boolean =>
    a === b || links.some(l => l.source === a && !seen.has(l.target) && (seen.add(l.target), reaches(l.target, b, seen)));
  if (reaches(to.id, from.id)) return 'That would make a loop.';
  return null;
}

function isLinked(n: BoardNode, links: Link[]): boolean {
  const out = links.some(l => l.source === n.id);
  const into = links.some(l => l.target === n.id);
  return n.step.kind === 'input' ? out : n.step.kind === 'output' ? into : into && out;
}

/** The LLM step at the end of the chain: no line from it to another LLM step. */
function lastStep(board: BoardNode[], links: Link[]): BoardNode | undefined {
  const steps = board.filter(n => n.step.kind === 'instructions');
  const ends = steps.filter(st => !links.some(l => l.source === st.id && board.find(n => n.id === l.target)?.step.kind === 'instructions'));
  return ends[ends.length - 1] ?? steps[steps.length - 1];
}

/** React Flow's colours, pointed at the Astryx theme tokens. */
const flowTheme = {
  '--xy-edge-stroke-default': 'var(--color-text-secondary)',
  '--xy-edge-stroke-width-default': 1.5,
  '--xy-edge-stroke-selected-default': 'var(--color-text-primary)',
  '--xy-connectionline-stroke-default': 'var(--color-text-primary)',
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
  const [links, setLinks] = useState<Link[]>(() => startingLinks(board));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
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
  const allLinked = board.every(n => isLinked(n, links));
  const allReady = board.every(n => isReady(n.step)) && allLinked && count('input') > 0 && count('instructions') > 0 && count('output') > 0;
  const nextHint = !board.some(n => n.step.kind === 'input' && isReady(n.step))
    ? 'Start here: select the Input tile and add your data.'
    : !count('instructions')
      ? 'Next: drag an LLM node from the toolbar, or click “Add LLM step” on the Input tile.'
      : !count('output')
        ? 'Next: drag a Pass on to node from the toolbar, or click “Add pass on to”.'
        : !allLinked
          ? 'Connect the tiles marked Not connected: drag from the dot on a tile’s right edge to the next tile. Click a line to delete it.'
          : 'Finish the tiles marked Needs setup.';

  /**
   * Adds a tile. A dropped tile (`at`) lands unconnected where it was dropped. A clicked one is placed
   * in the flow and wired in: after the tile it came from, or after the last LLM step.
   */
  const place = (kind: StepKind, at?: {x: number; y: number}, fromId?: string) => {
    const id = newId();
    const end = lastStep(board, links);
    const from = at ? undefined : board.find(n => n.id === fromId) ?? (kind === 'input' ? undefined : end);
    // A new LLM step slots in after `from` and takes over its lines onward, so nothing gets left behind.
    const isInsert = kind === 'instructions' && !!from && from.step.kind === 'instructions';
    const firstStep = board.find(n => n.step.kind === 'instructions');
    let nextLinks = links;
    if (!at) {
      if (kind === 'input') nextLinks = firstStep ? [...links, link(id, firstStep.id)] : links;
      else if (from) {
        nextLinks = isInsert
          ? [...links.map(l => (l.source === from.id ? link(id, l.target) : l)), link(from.id, id)]
          : [...links, link(from.id, id)];
      } else if (kind === 'instructions') {
        nextLinks = [...links, ...board.filter(n => n.step.kind === 'input').map(n => link(n.id, id))];
      }
    }
    const position = at ?? placeFor(board, kind, from?.id);
    setBoard(prev => {
      const sameKind = prev.filter(n => n.step.kind === kind).length;
      // Make room: when a step slots in, everything to its right moves one column over.
      const shifted = isInsert ? prev.map(n => (n.position.x >= position.x ? {...n, position: {...n.position, x: n.position.x + COL}} : n)) : prev;
      return [...shifted, {id, step: blankStep(kind, sameKind), position}];
    });
    setLinks(nextLinks);
    if (!at) setFitKey(k => k + 1);
    setSelectedId(id);
    setSelectedLinkId(null);
    setTrial('none');
  };
  const add = (fromId: string, kind: StepKind) => place(kind, undefined, fromId);

  const changeLinks = (next: Link[]) => {
    setLinks(next);
    setTrial('none');
  };
  const removeLink = (id: string) => {
    changeLinks(links.filter(l => l.id !== id));
    setSelectedLinkId(null);
  };
  const connect = (c: Connection) => {
    const problem = linkProblem(board, links, c.source, c.target);
    if (problem) return toast({body: problem});
    changeLinks([...links, link(c.source, c.target)]);
  };
  // Dragging the end of a line: drop it on another tile to move it, or on empty board to delete it.
  const reconnected = useRef(false);
  const reconnect = (old: Edge, c: Connection) => {
    reconnected.current = true;
    const rest = links.filter(l => l.id !== old.id);
    const problem = linkProblem(board, rest, c.source, c.target);
    if (problem) return toast({body: problem});
    changeLinks([...rest, link(c.source, c.target)]);
  };

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
    setLinks(prev => prev.filter(l => l.source !== id && l.target !== id));
    setSelectedId(null);
    setTrial('none');
  };

  const nodes: TileNode[] = useMemo(() => {
    const steps = board.filter(n => n.step.kind === 'instructions');
    return board.map(n => {
      // Tiles with nothing after them offer the next stage.
      const hasNext = links.some(l => l.source === n.id);
      let next: TileData['next'] = [];
      if (!hasNext && n.step.kind === 'input') next = [{label: 'Add LLM step', kind: 'instructions'}];
      if (!hasNext && n.step.kind === 'instructions') next = [{label: 'Add LLM step', kind: 'instructions'}, {label: 'Add pass on to', kind: 'output'}];
      const title =
        n.step.kind === 'input'
          ? n.step.source === 'mcp' ? n.step.app || 'Connect an app' : n.step.source === 'upload' ? 'Excel upload' : 'Add your data'
          : n.step.kind === 'instructions'
            ? `Step ${steps.findIndex(st => st.id === n.id) + 1}`
            : n.step.name || 'Output';
      const result = trial === 'done' ? trialFor(n, board, links) : null;
      const isUnchecked = !!result && n.step.kind === 'output' && !checked.includes(n.id);
      return {
        id: n.id, type: 'tile' as const, position: n.position, measured: n.measured, selected: n.id === selectedId,
        data: {step: n.step, title, trial: result, isLinked: isLinked(n, links), isUnchecked, onOpenTrial: openTrial, next, onAdd: add},
      };
    });
    // `add` is rebuilt each render; the tiles only need the latest board and links, which are deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, links, selectedId, trial, checked, openTrial]);
  const titleOf = (id: string) => nodes.find(n => n.id === id)?.data.title ?? '';
  const viewing = board.find(n => n.id === viewingId) ?? null;
  const edges: LinkEdge[] = links.map(l => ({...l, type: 'link', selected: l.id === selectedLinkId, data: {onRemove: removeLink}}));
  // Delete or Backspace removes a selected line. Selection itself lives in our own state.
  const onEdgesChange = (changes: EdgeChange<LinkEdge>[]) => {
    const gone = changes.filter(c => c.type === 'remove').map(c => c.id);
    if (gone.length) {
      changeLinks(links.filter(l => !gone.includes(l.id)));
      setSelectedLinkId(null);
    }
  };

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
    <ReactFlow<TileNode, LinkEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => {
        setSelectedId(node.id);
        setSelectedLinkId(null);
      }}
      onEdgeClick={(_, edge) => {
        setSelectedLinkId(edge.id);
        setSelectedId(null);
      }}
      onPaneClick={() => {
        setSelectedId(null);
        setSelectedLinkId(null);
      }}
      onConnect={connect}
      onReconnectStart={() => {
        reconnected.current = false;
      }}
      onReconnect={reconnect}
      onReconnectEnd={(_, edge) => {
        if (!reconnected.current) removeLink(edge.id);
        reconnected.current = false;
      }}
      edgesReconnectable
      deleteKeyCode={['Backspace', 'Delete']}
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
      connectionRadius={32}
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
                  : 'Nothing was sent. Click “See output” on the Pass on to tile and check it before you turn this on.'
              }
              collapsible={false}
            />
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
      trial={selected && isTried ? trialFor(selected, board, links) : null}
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
        <TrialDialog title={titleOf(viewing.id)} step={viewing.step} trial={trialFor(viewing, board, links)} onClose={() => setViewingId(null)} />
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
