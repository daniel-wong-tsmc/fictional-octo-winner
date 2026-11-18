import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {
  Background, BackgroundVariant, BaseEdge, EdgeLabelRenderer, Handle, Panel, Position, ReactFlow, ReactFlowProvider,
  applyNodeChanges, getBezierPath, useReactFlow, useUpdateNodeInternals, useViewport,
  type Connection, type Edge, type EdgeChange, type EdgeProps, type Node, type NodeChange, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {Layout, LayoutContent, LayoutFooter, LayoutHeader, LayoutPanel} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {List, ListItem} from '@astryxdesign/core/List';
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
import {Slider} from '@astryxdesign/core/Slider';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Token} from '@astryxdesign/core/Token';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Toolbar} from '@astryxdesign/core/Toolbar';
import {Popover} from '@astryxdesign/core/Popover';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Icon} from '@astryxdesign/core/Icon';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {useToast} from '@astryxdesign/core/Toast';
import {Eye, Maximize, X, Minus, Play, Plug, ArrowUpRight, Library, Pencil, Plus, Save, Trash2, Upload, Workflow as WorkflowIcon} from 'lucide-react';
import {MCP_APPS, PEOPLE, type BuiltStage, type Workflow} from '../workflow';
import {TICKETS, type Sheet} from '../data';
import type {TileRun} from '../tasks';
import {WorkflowSheetTable} from '@workspace/astryx-workflows/components/WorkflowSheetTable';
import {WORKFLOW_TILE_KINDS, WorkflowTile, tileText, type WorkflowTileContent, type WorkflowTileKind} from '@workspace/astryx-workflows/components/WorkflowTile';

/* ---------- Steps ---------- */

type StepKind = 'input' | 'instructions' | 'output';

/** source 'workflow' reads a value another workflow hands over: app is that workflow, resource the value. */
type InputStep = {kind: 'input'; source: 'upload' | 'mcp' | 'workflow' | null; fileName: string; sheets: string[]; app: string; resource: string};
/**
 * An LLM step. python is the code it runs: written by the AI on its last run (empty until it runs), or by the
 * person when isCodeEdited. topP and temperature are its advanced settings.
 */
type InstructionsStep = {kind: 'instructions'; name: string; text: string; python: string; isCodeEdited: boolean; topP: number; temperature: number};
/** Settings a new LLM step starts with: no code yet, and low temperature, since these steps work on numbers. */
const LLM_DEFAULTS = {python: '', isCodeEdited: false, topP: 1, temperature: 0.2};
type OutputStep = {kind: 'output'; name: string; format: string; needsOk: boolean; approver: string; sendTo: string[]; shareWithWorkflows: boolean};
type Step = InputStep | InstructionsStep | OutputStep;

/** The board's step kinds, named and drawn from the shared WORKFLOW_TILE_KINDS. */
const KIND_INFO: Record<StepKind, (typeof WORKFLOW_TILE_KINDS)[WorkflowTileKind]> = {
  input: WORKFLOW_TILE_KINDS.input,
  instructions: WORKFLOW_TILE_KINDS.step,
  output: WORKFLOW_TILE_KINDS.output,
};
const KINDS: StepKind[] = ['input', 'instructions', 'output'];
/** Drag type used when a node is dragged from the toolbar onto the board. */
const DRAG_TYPE = 'application/x-workflow-node';
/** Drag type used when a saved workflow is dragged from the Library onto the board. */
const DRAG_WORKFLOW = 'application/x-saved-workflow';

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
  if (kind === 'instructions') return {kind, name: '', text: INSTRUCTION_EXAMPLES[n % INSTRUCTION_EXAMPLES.length][1], ...LLM_DEFAULTS};
  return {kind, name: 'October summary', format: 'Excel sheet', needsOk: true, approver: PEOPLE[0], sendTo: ['Slack: #finance-close'], shareWithWorkflows: false};
}

function isReady(s: Step): boolean {
  if (s.kind === 'input') return s.source === 'upload' ? !!s.fileName : s.source ? !!s.app && !!s.resource : false;
  if (s.kind === 'instructions') return !!s.text.trim();
  return !!s.name.trim();
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

/** What each tile produced on the trial. The last LLM step and every Handoff tile end with the summary. */
function trialFor(node: BoardNode, board: BoardNode[], links: Link[]): TrialResult {
  if (node.step.kind === 'input') return {line: node.step.source === 'workflow' ? '1 value read' : node.step.source === 'mcp' ? '60 rows read' : '4,988 rows read'};
  if (node.step.kind === 'instructions') {
    const feedsOutput = links.some(l => l.source === node.id && board.find(n => n.id === l.target)?.step.kind === 'output');
    return feedsOutput
      ? {line: '5 rows: sales by region against target', sheet: TRIAL_SUMMARY}
      : {line: '4,988 rows, 1 column added', sheet: TRIAL_ORDERS, rowsShown: `First ${TRIAL_ORDERS.rows!.length} of 4,988 rows`};
  }
  return {line: `${node.step.name || 'Output'}, 5 rows`, sheet: TRIAL_SUMMARY};
}

/** The button that opens a tile's trial output. Same words on the tile and in the side panel. */
const trialButtonLabel = (step: Step) => (step.kind === 'output' ? 'See output' : 'See result');

function sendSentence(s: OutputStep): string {
  const to = s.sendTo.length ? s.sendTo.join(', ') : 'nobody yet (pick who gets it in the tile)';
  return s.needsOk ? `On a real run this waits for approval from ${s.approver}, then goes to ${to}.` : `On a real run this goes straight to ${to}.`;
}

/* ---------- Tile (a node on the board) ---------- */

type TileData = {
  step: Step;
  /** With another workflow on the board, a Handoff gets a dot on its right so its result can feed that workflow. */
  canFeedOtherWorkflow: boolean;
  content: WorkflowTileContent;
  trial: TrialResult | null;
  /** Has the lines it needs: inputs lead somewhere, LLM steps have both sides, Handoff has something coming in. */
  isLinked: boolean;
  /** Handoff tile whose trial output nobody has opened yet. */
  isUnchecked: boolean;
  onOpenTrial: (id: string) => void;
  next: {label: string; kind: StepKind}[];
  onAdd: (from: string, kind: StepKind) => void;
};
type TileNode = Node<TileData, 'tile'>;

/** A tile on the board: the shared WorkflowTile, plus the dots that lines attach to. */
function Tile({id, data, selected}: NodeProps<TileNode>) {
  const {step} = data;
  const ready = isReady(step);
  const status = data.isUnchecked
    ? {tone: 'info' as const, label: 'Check output'}
    : data.trial
    ? {tone: 'success' as const, label: 'Tried'}
    : ready && !data.isLinked
    ? {tone: 'warning' as const, label: 'Not connected'}
    : ready
      ? {tone: 'success' as const, label: 'Ready'}
      : {tone: 'warning' as const, label: 'Needs setup'};
  const footer = data.trial ? (
    <VStack gap={1}>
      <Text weight="medium">{data.trial.line}</Text>
      {data.trial.sheet && (
        <HStack>
          <Button
            className="nodrag"
            label={trialButtonLabel(step)}
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
  ) : ready && data.next.length > 0 ? (
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
  ) : undefined;
  return (
    <>
      {step.kind !== 'input' && <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />}
      <WorkflowTile
        content={data.content}
        detailMaxLines={2}
        detailLayout="inline"
        status={status}
        footer={footer}
        width={250}
        elevation={selected ? 'high' : 'low'}
      />
      {(step.kind !== 'output' || data.canFeedOtherWorkflow) && <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />}
    </>
  );
}
type SectionData = {title: string; summary: string};
type SectionNode = Node<SectionData, 'section'>;
type BoardFlowNode = TileNode | SectionNode;

/** The frame of a section. Dragging it moves every tile inside. */
function SectionFrame({data, selected}: NodeProps<SectionNode>) {
  return (
    <Card variant="muted" width="100%" height="100%" padding={4} elevation={selected ? 'low' : 'none'}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <Icon icon={WorkflowIcon} size="sm" color="secondary" />
        <Text weight="semibold">{data.title}</Text>
        <Text type="supporting">{data.summary}</Text>
      </HStack>
    </Card>
  );
}
const nodeTypes = {tile: Tile, section: SectionFrame};
/** Dots big enough to grab with a mouse or a finger. */
const HANDLE_STYLE: CSSProperties = {
  width: 'var(--spacing-5)',
  height: 'var(--spacing-5)',
  borderWidth: 'var(--spacing-0-5)',
};

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

/** One way to give an Input its data: an icon, a title and a line of help, as a button. Used twice in the input panel. */
function SourceChoice({icon, label, title, description, onClick}: {icon: typeof Upload; label: string; title: string; description: string; onClick: () => void}) {
  return (
    <ClickableCard label={label} padding={3} onClick={onClick}>
      <VStack gap={1}>
        <HStack gap={2} vAlign="center">
          <Icon icon={icon} size="sm" />
          <Text weight="semibold">{title}</Text>
        </HStack>
        <Text type="supporting">{description}</Text>
      </VStack>
    </ClickableCard>
  );
}

function InputPanel({step, onChange}: {step: InputStep; onChange: (s: InputStep) => void}) {
  const toast = useToast();
  const chooseUpload = () => onChange({...step, source: 'upload', ...UPLOAD_EXAMPLE});
  const chooseApp = () => onChange({...step, source: 'mcp', app: 'Google Drive', resource: 'FY26 targets.xlsx'});

  if (step.source === null) {
    return (
      <VStack gap={3}>
        <Text>Where does the data come from?</Text>
        <SourceChoice icon={Upload} label="Upload Excel" title="Upload Excel" description="Drop an Excel or CSV file. You can upload a new one each run." onClick={chooseUpload} />
        <SourceChoice icon={Plug} label="Connect an app through MCP" title="Connect an app (MCP)" description="Read straight from Google Drive, SharePoint, Shopify and other apps your admin connected." onClick={chooseApp} />
      </VStack>
    );
  }

  if (step.source === 'workflow') {
    return (
      <VStack gap={3}>
        <VStack gap={1}>
          <Text type="label">From another workflow</Text>
          <Text>{`${step.resource}, from ${step.app}`}</Text>
          <Text type="supporting">That workflow hands this value over each time it runs. Change it from that workflow’s output.</Text>
        </VStack>
        <HStack>
          <Button label="Use a file or app instead" variant="ghost" onClick={() => onChange({...step, source: null, app: '', resource: ''})} />
        </HStack>
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
        options={MCP_APPS.map(a => ({value: a.name, label: a.name, description: a.isConnected ? 'Connected' : 'App not connected yet'}))}
        value={step.app}
        onChange={appName => onChange({...step, app: appName, resource: appInfo(appName)?.reads[0] ?? ''})}
      />
      {app && (
        <HStack gap={1.5} vAlign="center" hAlign="between" wrap="wrap">
          <HStack gap={1.5} vAlign="center">
            <StatusDot variant={app.isConnected ? 'success' : 'warning'} label={app.isConnected ? 'Connected' : 'App not connected'} />
            <Text type="supporting">{app.isConnected ? 'Connected through MCP. Read only.' : 'This app isn’t connected yet. The step waits until it is.'}</Text>
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

/**
 * An LLM step's Python. It shows the code with an Edit button; editing swaps in a text box with Save code and
 * Cancel. A step with no code yet can have code written by hand. Saved code is marked as edited by you.
 */
function PythonCode({code, isEdited, onSave}: {code: string; isEdited: boolean; onSave: (code: string) => void}) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft !== null) {
    return (
      <VStack gap={2}>
        <TextArea label="Python code" value={draft} onChange={setDraft} rows={12} hasSpellCheck={false} hasAutoFocus />
        <HStack gap={2}>
          <Button
            label="Save code"
            variant="primary"
            size="sm"
            isDisabled={draft === code}
            onClick={() => {
              onSave(draft);
              setDraft(null);
            }}
          />
          <Button label="Cancel" variant="ghost" size="sm" onClick={() => setDraft(null)} />
        </HStack>
        <Text type="supporting">Saved code runs instead of the AI’s on the next run.</Text>
      </VStack>
    );
  }
  return (
    <VStack gap={1.5}>
      <Text type="label">Python code</Text>
      {code ? (
        <>
          <CodeBlock
            code={code}
            language="python"
            width="100%"
            size="sm"
            isWrapped
            endContent={<Button label="Edit" variant="ghost" size="sm" icon={<Icon icon={Pencil} />} onClick={() => setDraft(code)} />}
          />
          <Text type="supporting">{isEdited ? 'Edited by you. It runs instead of the AI’s code.' : 'Written by the AI on the last run.'}</Text>
        </>
      ) : (
        <>
          <Text type="supporting">No code yet. The AI writes it the first time this step runs.</Text>
          <HStack>
            <Button label="Write code yourself" variant="ghost" size="sm" icon={<Icon icon={Pencil} />} onClick={() => setDraft('')} />
          </HStack>
        </>
      )}
    </VStack>
  );
}

/** The side panel for a selected section: which workflow it is, and how to open or remove it. */
function SectionPanel({section, openHref, onOpen, onRemove}: {section: Section; openHref?: string; onOpen: (href: string) => void; onRemove: () => void}) {
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <HStack gap={2} vAlign="center">
          <Icon icon={WorkflowIcon} size="sm" color="secondary" />
          <Text type="supporting" weight="medium">Saved workflow</Text>
        </HStack>
        <Heading level={3}>{section.title}</Heading>
        <Text type="supporting">{section.summary}</Text>
      </VStack>
      <Text type="supporting">
        Drag the section to move everything in it. Draw a line from its Handoff into an LLM step of this workflow to use its result.
      </Text>
      <HStack gap={2} wrap="wrap">
        {openHref && <Button label="Open this workflow" icon={<Icon icon={ArrowUpRight} />} onClick={() => onOpen(openHref)} />}
        <Button label="Remove section" variant="ghost" icon={<Icon icon={Trash2} />} onClick={onRemove} />
      </HStack>
    </VStack>
  );
}

/** A tile the selected tile is linked to, for the panel's Comes from and Goes to lists. */
type PanelLink = {id: string; kind: StepKind; title: string};

/** Tiles linked to the selected one. Clicking one selects it, so you can walk the workflow from the panel. */
function LinkedTiles({label, items, emptyText, onSelect}: {label: string; items: PanelLink[]; emptyText: string; onSelect: (id: string) => void}) {
  return (
    <List header={<Text type="label">{label}</Text>} hasDividers edge="outset" density="compact">
      {items.length ? (
        items.map(l => (
          <ListItem
            key={l.id}
            onClick={() => onSelect(l.id)}
            startContent={<Icon icon={KIND_INFO[l.kind].icon} size="sm" color="secondary" />}
            label={<Text>{l.title}</Text>}
            description={KIND_INFO[l.kind].label}
          />
        ))
      ) : (
        <ListItem label={<Text type="supporting">{emptyText}</Text>} />
      )}
    </List>
  );
}

/**
 * The side panel for the selected tile: what flows in, its settings (for an LLM step, the agent's
 * instructions), what flows out, and its last run when it has a ticket.
 */
function StepPanel({tileId, step, title, comesFrom, goesTo, run, trial, onOpenTrial, onChange, onRemove, onSelect}: {
  /** The selected tile, so per-tile state such as a code edit in progress resets when the selection moves. */
  tileId: string;
  step: Step | null;
  title: string;
  comesFrom: PanelLink[];
  goesTo: PanelLink[];
  run?: TileRun;
  trial: TrialResult | null;
  onOpenTrial: () => void;
  onChange: (s: Step) => void;
  onRemove: () => void;
  onSelect: (id: string) => void;
}) {
  if (!step) {
    return <EmptyState isCompact title="Select a tile" description="Click a tile on the board to set it up." />;
  }
  const info = KIND_INFO[step.kind];
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <HStack gap={2} vAlign="center">
          <Icon icon={info.icon} size="sm" color="secondary" />
          <Text type="supporting" weight="medium">{info.label}</Text>
        </HStack>
        <Heading level={3}>{title}</Heading>
      </VStack>

      {run && (
        <>
          <VStack gap={1.5}>
            <Text type="label">Last run</Text>
            <HStack gap={1.5} vAlign="center">
              <StatusDot variant={run.tone} label={run.label} />
              <Text weight="medium">{run.label}</Text>
              {run.ran && <Text type="supporting">{run.ran}</Text>}
            </HStack>
            {step.kind === 'instructions' && run.summary.length > 0 && (
              <List hasDividers={false} density="compact" edge="outset">
                {run.summary.map(line => <ListItem key={line} label={<Text type="supporting">{line}</Text>} />)}
              </List>
            )}
            <HStack>
              <Button label="Open ticket" size="sm" href={`#ticket-${run.ticketId}`} />
            </HStack>
          </VStack>
          <Divider />
        </>
      )}

      {step.kind !== 'input' && (
        <LinkedTiles label="Comes from" items={comesFrom} emptyText="Nothing yet. Draw a line into this tile." onSelect={onSelect} />
      )}

      {trial && (
        <>
          <VStack gap={1.5}>
            <Text type="label">{`Trial result, ${TRIAL_MONTH}`}</Text>
            <Text>{trial.line}</Text>
            {step.kind === 'output' && <Text type="supporting">{`Not sent. ${sendSentence(step)}`}</Text>}
            {trial.sheet && (
              <HStack>
                <Button label={trialButtonLabel(step)} icon={<Icon icon={Eye} />} onClick={onOpenTrial} />
              </HStack>
            )}
          </VStack>
          <Divider />
        </>
      )}

      {step.kind === 'input' && <InputPanel step={step} onChange={onChange} />}

      {step.kind === 'instructions' && (
        <>
          <Text type="label">Agent instructions</Text>
          <TextInput
            label="Step name"
            description="Optional. A short name shows on the tile next to the step number."
            value={step.name}
            onChange={name => onChange({...step, name})}
          />
          <TextArea
            label="What should the AI do?"
            description="Plain words, like you’d tell a colleague. It can use everything that flows into this tile."
            value={step.text}
            onChange={text => onChange({...step, text})}
            rows={6}
          />
          <Collapsible defaultIsOpen={false} chevronPosition="start" trigger={<Text weight="medium">Advanced settings</Text>}>
            <VStack gap={4}>
              <PythonCode
                key={tileId}
                code={step.python}
                isEdited={step.isCodeEdited}
                onSave={python => onChange({...step, python, isCodeEdited: true})}
              />
              <VStack gap={1}>
                <Slider label="top_p" value={step.topP} min={0} max={1} step={0.05} valueDisplay="text" formatValue={v => v.toFixed(2)} onChange={(topP: number) => onChange({...step, topP})} />
                <Text type="supporting">How much of the likeliest wording the AI picks from. 1 uses all of it.</Text>
              </VStack>
              <VStack gap={1}>
                <Slider label="Temperature" value={step.temperature} min={0} max={2} step={0.1} valueDisplay="text" formatValue={v => v.toFixed(1)} onChange={(temperature: number) => onChange({...step, temperature})} />
                <Text type="supporting">Lower gives the same answer each run. Keep it low for numbers.</Text>
              </VStack>
            </VStack>
          </Collapsible>
        </>
      )}

      {step.kind === 'output' && (
        <>
          <TextInput label="Name" description="How people and other workflows will see it." value={step.name} onChange={name => onChange({...step, name})} />
          <Selector label="Format" options={['Excel sheet', 'CSV file', 'A single number']} value={step.format} onChange={format => onChange({...step, format})} />
          <Divider />
          <Text type="label">Who gets it</Text>
          <Switch label="Needs approval before it’s sent" value={step.needsOk} onChange={needsOk => onChange({...step, needsOk})} />
          {step.needsOk && <Selector label="Who approves it" options={PEOPLE} value={step.approver} onChange={approver => onChange({...step, approver})} />}
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

      {step.kind === 'input' && (
        <LinkedTiles label="Goes to" items={goesTo} emptyText="Nothing yet. Draw a line out of this tile." onSelect={onSelect} />
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
              <Card padding={0}>{trial.sheet && <WorkflowSheetTable sheet={trial.sheet} />}</Card>
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

/** A tile on the board. sectionId puts it inside a section, and then its position is relative to that section. */
type BoardNode = {id: string; step: Step; position: {x: number; y: number}; measured?: {width?: number; height?: number}; sectionId?: string};

/**
 * A saved workflow dropped onto the board: a frame around copies of its tiles that moves them together, like a
 * FigJam section. key is the workflow's Library key.
 */
type Section = {
  id: string; key: string; title: string; summary: string; position: {x: number; y: number}; size: {width: number; height: number};
  /** The size React Flow measured; kept and handed back like a tile's. */
  measured?: {width?: number; height?: number};
};
/** Room inside a section: around its tiles, and above them for its title. */
const SECTION_PAD = 32;
const SECTION_TOP = 72;
const TILE_W = 250;
const TILE_H = 180;

let nextId = 1;
const newId = () => `n${nextId++}`;
const COL = 360;
const ROW = 260;

function startingBoard(): BoardNode[] {
  return [{id: newId(), step: blankStep('input', 0), position: {x: 0, y: 0}}];
}

/**
 * A workflow's steps laid out as a board: its inputs in the first column, each step in its own column, then
 * the Handoff. Its page and its Edit board both read this, so they always show the same tiles.
 */
export function boardFromWorkflow(w: Workflow): SavedBoard {
  const inputs: BoardNode[] = w.steps.flatMap(st => st.inputs.map((input, k) => ({id: `${st.id}-in-${k}`, input})))
    .map(({id, input}, i) => ({
      id,
      position: {x: 0, y: i * ROW},
      step: {
        kind: 'input' as const,
        source: input.status === 'handoff' ? ('workflow' as const) : input.status === 'upload' ? ('upload' as const) : ('mcp' as const),
        fileName: input.status === 'upload' ? input.source : '',
        sheets: input.status === 'upload' ? [input.reads] : [],
        app: input.status === 'upload' ? '' : input.source,
        resource: input.status === 'upload' ? '' : input.reads,
      },
    }));
  const middle = ((inputs.length - 1) * ROW) / 2;
  const steps: BoardNode[] = w.steps.map((st, i) => ({
    id: st.id,
    position: {x: COL * (i + 1), y: middle},
    // The code from the last run: on the step's ticket when it has one, otherwise on the step. Drafts haven't run.
    step: {kind: 'instructions', name: st.name, text: st.does, ...LLM_DEFAULTS, python: w.isDraft ? '' : (st.ticketId ? TICKETS[st.ticketId]?.python : st.python) ?? ''},
  }));
  const output: BoardNode = {
    id: 'out',
    position: {x: COL * (w.steps.length + 1), y: middle},
    step: {kind: 'output', name: w.steps[w.steps.length - 1].output, format: w.outputFormat, needsOk: true, approver: w.approver, sendTo: w.destinations, shareWithWorkflows: w.shares.length > 0},
  };
  const links = [
    ...w.steps.flatMap(st => st.inputs.map((_, k) => link(`${st.id}-in-${k}`, st.id))),
    ...w.steps.slice(1).map((st, i) => link(w.steps[i].id, st.id)),
    link(w.steps[w.steps.length - 1].id, 'out'),
  ];
  return {board: [...inputs, ...steps, output], links};
}

/** A line between two tiles. People draw these; the app only draws them for tiles added with a click. */
type Link = {id: string; source: string; target: string};
const link = (source: string, target: string): Link => ({id: `${source}-${target}`, source, target});

/** The lines a new or edited workflow starts with: inputs → first LLM step → next … → every Handoff. */
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

/** Why a line can't be drawn, or null when it can. Keeps the flow input → LLM → Handoff, with no loops. */
function linkProblem(board: BoardNode[], links: Link[], source: string | null, target: string | null): string | null {
  const from = board.find(n => n.id === source);
  const to = board.find(n => n.id === target);
  if (!from || !to || from.id === to.id) return 'Pick two different tiles.';
  // A Handoff ends its workflow. Its only line out goes into a step of another workflow on the board.
  if (from.step.kind === 'output' && !(to.step.kind === 'instructions' && from.sectionId !== to.sectionId)) {
    return 'A Handoff only connects into an LLM step of another workflow.';
  }
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
/** Above every tile and section, including a selected one. */
const DRAWING_LINE_LAYER: CSSProperties = {zIndex: 2000};
/** Fit the whole board on screen. minZoom is low enough for two workflows side by side on a laptop. */
const FIT = {padding: 0.1, maxZoom: 1, minZoom: 0.25, duration: 250};
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

/** "4 inputs, 3 LLM steps, 1 handoff": what a saved workflow holds, for the Library list. */
function boardSummary(saved: SavedBoard): string {
  const n = (k: StepKind) => saved.board.filter(b => b.step.kind === k).length;
  const plural = (c: number, one: string, many: string) => `${c} ${c === 1 ? one : many}`;
  return `${plural(n('input'), 'input', 'inputs')}, ${plural(n('instructions'), 'LLM step', 'LLM steps')}, ${plural(n('output'), 'handoff', 'handoffs')}`;
}

/**
 * The bar at the bottom of the board. Nodes on the left add tiles; Library, set apart by a divider, lists
 * saved workflows to drop onto the board as sections, or open; zoom controls on the right.
 */
function BoardToolbar({onAdd, library, onAddWorkflow, onOpen}: {
  onAdd: (kind: StepKind) => void;
  /** Saved workflows. The one on the board now is shown but can't be added or reopened. */
  library: LibraryItem[];
  /** Adds a saved workflow to the board as a section. */
  onAddWorkflow: (item: LibraryItem) => void;
  onOpen: (href: string) => void;
}) {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
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
            <Divider orientation="vertical" />
            <Popover
              isOpen={isLibraryOpen}
              onOpenChange={setIsLibraryOpen}
              placement="above"
              width={340}
              isModal={false}
              label="Library"
              content={
                <VStack gap={2}>
                  <Text type="supporting">Saved workflows. Drag one onto the board, or click to add it.</Text>
                  {library.length === 0 && <Text type="supporting">No saved workflows yet.</Text>}
                  {library.map(w => (
                    <HStack key={w.key} gap={1} vAlign="center">
                      <ClickableCard
                        label={w.isCurrent ? `${w.name} is open now` : `Add ${w.name} to the board`}
                        padding={2}
                        width="100%"
                        isDisabled={w.isCurrent}
                        draggable={!w.isCurrent}
                        onDragStart={e => {
                          e.dataTransfer.setData(DRAG_WORKFLOW, w.key);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => {
                          onAddWorkflow(w);
                          setIsLibraryOpen(false);
                        }}>
                        <VStack gap={0.5}>
                          <HStack gap={1.5} vAlign="center">
                            <Icon icon={WorkflowIcon} size="sm" color="secondary" />
                            <Text weight="medium">{w.name}</Text>
                          </HStack>
                          <Text type="supporting">{w.isCurrent ? `${boardSummary(w.saved)} · Open now` : boardSummary(w.saved)}</Text>
                        </VStack>
                      </ClickableCard>
                      <IconButton
                        label={`Open ${w.name}`}
                        tooltip="Open its board"
                        variant="ghost"
                        size="sm"
                        icon={<Icon icon={ArrowUpRight} />}
                        isDisabled={w.isCurrent}
                        onClick={() => {
                          setIsLibraryOpen(false);
                          onOpen(w.href);
                        }}
                      />
                    </HStack>
                  ))}
                </VStack>
              }>
              <Button label="Library" variant="ghost" icon={<Icon icon={Library} />} isIconOnly={isSmall} tooltip="Saved workflows" />
            </Popover>
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

/* ---------- Saving ---------- */

/**
 * The board in run order. A tile's column is how many tiles come before it on its longest path from an
 * input; tiles in a column are ordered top to bottom.
 */
function runOrder(board: BoardNode[], links: Link[]): BoardNode[][] {
  const depth = new Map<string, number>();
  const depthOf = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    const before = links.filter(l => l.target === id).map(l => depthOf(l.source));
    const d = before.length ? Math.max(...before) + 1 : 0;
    depth.set(id, d);
    return d;
  };
  board.forEach(n => depthOf(n.id));
  const columns: BoardNode[][] = [];
  board.forEach(n => (columns[depth.get(n.id)!] ??= []).push(n));
  return columns.filter(Boolean).map(col => [...col].sort((a, b) => a.position.y - b.position.y));
}

/**
 * What every tile says, read from its own settings and its lines. The board tiles and the saved workflow
 * page both use this, so a tile reads the same in both places. LLM steps are numbered in run order.
 */
function tileContents(board: BoardNode[], links: Link[]): Map<string, WorkflowTileContent> {
  const number = new Map<string, number>();
  // Each workflow on the board counts its own steps, so a section keeps its Step 1.
  const counts = new Map<string, number>();
  runOrder(board, links).flat().filter(n => n.step.kind === 'instructions').forEach(n => {
    const k = (counts.get(n.sectionId ?? '') ?? 0) + 1;
    counts.set(n.sectionId ?? '', k);
    number.set(n.id, k);
  });
  const targets = (id: string) => links.filter(l => l.source === id).map(l => board.find(n => n.id === l.target)).filter((n): n is BoardNode => !!n);
  const contents = new Map<string, WorkflowTileContent>();
  for (const n of board) {
    const s = n.step;
    if (s.kind === 'input') {
      contents.set(n.id, {
        kind: 'input',
        source: s.source === 'upload' ? s.fileName : s.source ? s.app : '',
        via: s.source,
        reads: s.source === 'upload' ? s.sheets.join(', ') : s.source ? s.resource : '',
        goesTo: targets(n.id).map(t => `Step ${number.get(t.id)}`),
      });
    } else if (s.kind === 'instructions') {
      // An LLM step makes the output it feeds, or the data the next LLM step works on.
      const makes = targets(n.id).map(t => (t.step.kind === 'output' ? t.step.name || 'Output' : `Data for Step ${number.get(t.id)}`));
      contents.set(n.id, {kind: 'step', number: number.get(n.id) ?? 0, name: s.name.trim() || undefined, instructions: s.text, makes: makes.join(', ')});
    } else {
      contents.set(n.id, {kind: 'output', name: s.name, format: s.format, approver: s.needsOk ? s.approver : '', sendTo: s.sendTo});
    }
  }
  return contents;
}

/**
 * The board as saved workflow columns, for the workflow page: this workflow's own tiles, with the same content
 * the board shows. Another workflow dropped in as a section isn't copied onto the page; each of its Handoffs
 * that feeds this workflow shows as one input from that workflow instead.
 */
export function toColumns(board: BoardNode[], links: Link[], sections: Section[] = []): BuiltStage[][] {
  const own = board.filter(n => !n.sectionId);
  const isOwn = (id: string) => own.some(n => n.id === id);
  const contents = tileContents(board, links);
  const columns: BuiltStage[][] = runOrder(own, links.filter(l => isOwn(l.source) && isOwn(l.target))).map(col =>
    col.map(n => ({id: n.id, content: contents.get(n.id)!})),
  );
  const feeds: BuiltStage[] = board
    .filter(n => n.sectionId && n.step.kind === 'output' && links.some(l => l.source === n.id && isOwn(l.target)))
    .map(n => {
      const goesTo = links
        .filter(l => l.source === n.id && isOwn(l.target))
        .flatMap(l => {
          const c = contents.get(l.target);
          return c?.kind === 'step' ? [`Step ${c.number}`] : [];
        });
      const name = n.step.kind === 'output' ? n.step.name : '';
      const title = sections.find(x => x.id === n.sectionId)?.title ?? 'Another workflow';
      return {id: n.id, content: {kind: 'input', source: title, via: 'workflow', reads: name, goesTo}};
    });
  if (!feeds.length) return columns;
  // Inputs run first, so these join the first column when it holds inputs, or start a new one.
  return columns[0]?.every(st => st.content.kind === 'input') ? [[...columns[0], ...feeds], ...columns.slice(1)] : [feeds, ...columns];
}

/* ---------- Page ---------- */

/** The board as it was when the workflow was turned on, so Edit can reopen it. */
export type SavedBoard = {board: BoardNode[]; links: Link[]; sections?: Section[]};

type TurnOn = (name: string, columns: BuiltStage[][], saved: SavedBoard) => void;
/** The workflow being edited: its name, its page, and its saved board when it was built here. */
/**
 * The workflow being edited: its name, its page, its saved board when it has one, and the last run of each
 * tile that has a ticket (by tile id), for the side panel.
 */
export type Editing = {name: string; href: string; saved?: SavedBoard; runs?: Record<string, TileRun>};
/** selectTile opens the board with that tile selected, so its side panel is open. */
/** A saved workflow in the toolbar's Library: its name, where its board opens, and its saved board. */
export type LibraryItem = {key: string; name: string; href: string; saved: SavedBoard; isCurrent: boolean};
type BuilderProps = {editing?: Editing; selectTile?: string; library: LibraryItem[]; onTurnOn: TurnOn};

export function WorkflowBuilderPage(props: BuilderProps) {
  return (
    <ReactFlowProvider>
      <Builder {...props} />
    </ReactFlowProvider>
  );
}

function Builder({editing, selectTile, library, onTurnOn}: BuilderProps) {
  const isEditing = !!editing;
  const {screenToFlowPosition} = useReactFlow();
  const toast = useToast();
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const isPhone = useMediaQuery('(max-width: 640px)');
  const [name, setName] = useState(editing?.name ?? 'Untitled workflow');
  const [board, setBoard] = useState<BoardNode[]>(() => editing?.saved?.board ?? startingBoard());
  const [sections, setSections] = useState<Section[]>(() => editing?.saved?.sections ?? []);
  // A Handoff's right dot comes and goes with other workflows on the board. React Flow only learns a tile's
  // dots when it measures it, so ask it to measure the Handoffs again whenever that changes.
  const updateNodeInternals = useUpdateNodeInternals();
  const hasOtherWorkflows = sections.length > 0;
  useEffect(() => {
    updateNodeInternals(board.filter(n => n.step.kind === 'output').map(n => n.id));
    // Only the dot's presence matters here, not every board change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOtherWorkflows]);
  const [links, setLinks] = useState<Link[]>(() => editing?.saved?.links ?? startingLinks(board));
  // What the workflow looked like when editing started. Tile sizes are left out: the board measures them itself.
  const snapshot = (n: string, b: BoardNode[], l: Link[], sec: Section[]) =>
    JSON.stringify([n.trim(), b.map(({id, step, position}) => ({id, step, position})), l, sec.map(({id, position}) => ({id, position}))]);
  const [original] = useState(() => snapshot(name, board, links, sections));
  const isDirty = snapshot(name, board, links, sections) !== original;
  // Where the person asked to go while the board has unsaved changes. Set, it opens the discard check.
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const leaveTo = (href: string) => (isDirty ? setLeavingTo(href) : (window.location.hash = href.slice(1)));
  const [selectedId, setSelectedId] = useState<string | null>(() => (selectTile && board.some(n => n.id === selectTile) ? selectTile : null));
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [trial, setTrial] = useState<'none' | 'running' | 'done'>('none');
  // Bumped when a click adds a tile, so the board refits. A dropped tile stays where it was put.
  const [fitKey, setFitKey] = useState(0);
  // Trial output the user is looking at, and the Handoff tiles they've opened since the last trial.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const isTried = trial === 'done';
  const finalName = name.trim() || 'Untitled workflow';
  useEffect(() => {
    if (trial !== 'done') setChecked([]);
  }, [trial]);

  const selected = board.find(n => n.id === selectedId) ?? null;
  const selectedSection = sections.find(sec => sec.id === selectedId) ?? null;
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
        ? 'Next: drag a Handoff node from the toolbar, or click it there to add one after the last LLM step.'
        : !allLinked
          ? 'Connect the tiles marked Not connected: drag from the dot on a tile’s right edge to the next tile. Click a line to delete it.'
          : 'Finish the tiles marked Needs setup.';

  /**
   * Adds a tile. A dropped tile (`at`) lands unconnected where it was dropped. A clicked one is placed
   * in the flow and wired in: after the tile it came from, or after the last LLM step.
   */
  const place = (kind: StepKind, at?: {x: number; y: number}, fromId?: string) => {
    const id = newId();
    // Tiles inside sections belong to other workflows; new tiles attach only to this workflow's own.
    const own = board.filter(n => !n.sectionId);
    const end = lastStep(own, links);
    const from = at ? undefined : own.find(n => n.id === fromId) ?? (kind === 'input' ? undefined : end);
    // A new LLM step slots in after `from` and takes over its lines onward, so nothing gets left behind.
    const isInsert = kind === 'instructions' && !!from && from.step.kind === 'instructions';
    const firstStep = own.find(n => n.step.kind === 'instructions');
    let nextLinks = links;
    if (!at) {
      if (kind === 'input') nextLinks = firstStep ? [...links, link(id, firstStep.id)] : links;
      else if (from) {
        nextLinks = isInsert
          ? [...links.map(l => (l.source === from.id ? link(id, l.target) : l)), link(from.id, id)]
          : [...links, link(from.id, id)];
      } else if (kind === 'instructions') {
        nextLinks = [...links, ...own.filter(n => n.step.kind === 'input').map(n => link(n.id, id))];
      }
    }
    const position = at ?? placeFor(own, kind, from?.id);
    setBoard(prev => {
      const sameKind = prev.filter(n => n.step.kind === kind).length;
      // Make room: when a step slots in, everything to its right moves one column over.
      const shifted = isInsert ? prev.map(n => (!n.sectionId && n.position.x >= position.x ? {...n, position: {...n.position, x: n.position.x + COL}} : n)) : prev;
      return [...shifted, {id, step: blankStep(kind, sameKind), position}];
    });
    setLinks(nextLinks);
    if (!at) setFitKey(k => k + 1);
    setSelectedId(id);
    setSelectedLinkId(null);
    setTrial('none');
  };
  const add = (fromId: string, kind: StepKind) => place(kind, undefined, fromId);

  /**
   * Drops a saved workflow onto the board as a section: copies of all its tiles and lines inside one frame.
   * At `at` when dropped; otherwise to the left of everything, since a workflow you add usually feeds this one.
   */
  const addWorkflow = (item: LibraryItem, at?: {x: number; y: number}) => {
    // Its own prefix, so it can't clash with a tile id such as a prefilled workflow's s1.
    const sid = `section-${newId().slice(1)}`;
    // Absolute positions in the saved board, so a workflow that itself has sections still lays out right.
    const abs = (n: BoardNode) => {
      const parent = item.saved.sections?.find(x => x.id === n.sectionId);
      return parent ? {x: parent.position.x + n.position.x, y: parent.position.y + n.position.y} : n.position;
    };
    const src = item.saved.board;
    const minX = Math.min(...src.map(n => abs(n).x));
    const minY = Math.min(...src.map(n => abs(n).y));
    const idOf = (id: string) => `${sid}-${id}`;
    const tiles: BoardNode[] = src.map(n => ({
      id: idOf(n.id), step: n.step, sectionId: sid, measured: n.measured,
      position: {x: abs(n).x - minX + SECTION_PAD, y: abs(n).y - minY + SECTION_TOP},
    }));
    const size = {
      width: Math.max(...tiles.map(t => t.position.x + (t.measured?.width ?? TILE_W))) + SECTION_PAD,
      height: Math.max(...tiles.map(t => t.position.y + (t.measured?.height ?? TILE_H))) + SECTION_PAD,
    };
    const left = Math.min(0, ...board.filter(n => !n.sectionId).map(n => n.position.x), ...sections.map(x => x.position.x));
    const top = Math.min(0, ...board.filter(n => !n.sectionId).map(n => n.position.y), ...sections.map(x => x.position.y));
    const position = at ?? {x: left - size.width - COL / 2, y: top};
    setSections(prev => [...prev, {id: sid, key: item.key, title: item.name, summary: boardSummary(item.saved), position, size}]);
    setBoard(prev => [...prev, ...tiles]);
    setLinks(prev => [...prev, ...item.saved.links.map(l => link(idOf(l.source), idOf(l.target)))]);
    if (!at) setFitKey(k => k + 1);
    setSelectedId(null);
    setSelectedLinkId(null);
    setTrial('none');
  };
  /** Takes a section off the board, with its tiles and every line touching them. */
  const removeSection = (sid: string) => {
    const gone = new Set(board.filter(n => n.sectionId === sid).map(n => n.id));
    setBoard(prev => prev.filter(n => n.sectionId !== sid));
    setLinks(prev => prev.filter(l => !gone.has(l.source) && !gone.has(l.target)));
    setSections(prev => prev.filter(x => x.id !== sid));
    setSelectedId(null);
    setTrial('none');
  };

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

  const tileNodes: TileNode[] = useMemo(() => {
    const contents = tileContents(board, links);
    return board.map(n => {
      // An Input tile with nothing after it offers an LLM step. LLM tiles add nothing; use the toolbar.
      const hasNext = links.some(l => l.source === n.id);
      let next: TileData['next'] = [];
      if (!hasNext && n.step.kind === 'input') next = [{label: 'Add LLM step', kind: 'instructions'}];
      const result = trial === 'done' ? trialFor(n, board, links) : null;
      const isUnchecked = !!result && n.step.kind === 'output' && !checked.includes(n.id);
      return {
        id: n.id, type: 'tile' as const, position: n.position, measured: n.measured, selected: n.id === selectedId, parentId: n.sectionId,
        data: {step: n.step, canFeedOtherWorkflow: sections.length > 0, content: contents.get(n.id)!, trial: result, isLinked: isLinked(n, links), isUnchecked, onOpenTrial: openTrial, next, onAdd: add},
      };
    });
    // `add` is rebuilt each render; the tiles only need the latest board and links, which are deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, links, sections.length, selectedId, trial, checked, openTrial]);
  // Sections come first: React Flow needs a parent before the tiles inside it.
  const nodes: BoardFlowNode[] = [
    ...sections.map((sec): SectionNode => ({
      // Below the lines layer, so lines inside and between sections stay visible over the grey frame.
      zIndex: -1,
      id: sec.id, type: 'section', position: sec.position, width: sec.size.width, height: sec.size.height, measured: sec.measured,
      selected: sec.id === selectedId, data: {title: sec.title, summary: sec.summary},
    })),
    ...tileNodes,
  ];
  const linkedTo = (ids: string[]): PanelLink[] =>
    ids.flatMap(id => {
      const n = board.find(b => b.id === id);
      return n ? [{id, kind: n.step.kind, title: titleOf(id)}] : [];
    });
  const titleOf = (id: string) => {
    const content = tileNodes.find(n => n.id === id)?.data.content;
    return content ? tileText(content).title : '';
  };
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
  const onNodesChange = (changes: NodeChange<BoardFlowNode>[]) => {
    const kept = changes.filter(c => c.type === 'position' || c.type === 'dimensions');
    if (!kept.length) return;
    const next = applyNodeChanges(kept, nodes);
    setBoard(prev =>
      prev.map(n => {
        const m = next.find(x => x.id === n.id);
        return m ? {...n, position: m.position, measured: m.measured} : n;
      }),
    );
    // A dragged section moves; its tiles follow because their positions are relative to it.
    setSections(prev =>
      prev.map(sec => {
        const m = next.find(x => x.id === sec.id);
        return m ? {...sec, position: m.position, measured: m.measured} : sec;
      }),
    );
  };

  const canvas = (
    <ReactFlow<BoardFlowNode, LinkEdge>
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
      // A selected section would otherwise jump above the lines and hide them again.
      elevateNodesOnSelect={false}
      // The line being drawn shows above tiles and sections, so you can see where it is going.
      connectionLineContainerStyle={DRAWING_LINE_LAYER}
      deleteKeyCode={['Backspace', 'Delete']}
      onDragOver={e => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE) && !e.dataTransfer.types.includes(DRAG_WORKFLOW)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={e => {
        const workflowKey = e.dataTransfer.getData(DRAG_WORKFLOW);
        const item = library.find(w => w.key === workflowKey && !w.isCurrent);
        if (item) {
          e.preventDefault();
          const p = screenToFlowPosition({x: e.clientX, y: e.clientY});
          addWorkflow(item, {x: p.x - SECTION_PAD, y: p.y - SECTION_PAD});
          return;
        }
        const kind = e.dataTransfer.getData(DRAG_TYPE) as StepKind;
        if (!KINDS.includes(kind)) return;
        e.preventDefault();
        const p = screenToFlowPosition({x: e.clientX, y: e.clientY});
        // Centre the tile on the pointer (tiles are 250 wide, about 130 tall).
        place(kind, {x: p.x - 125, y: p.y - 60});
      }}
      connectionRadius={48}
      fitView
      fitViewOptions={FIT}
      minZoom={0.2}
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
                  : 'Nothing was sent. Click “See output” on the Handoff tile and check it before you turn this on.'
              }
              collapsible={false}
            />
          )}
          {!allReady && <Text type="supporting" weight="medium">{nextHint}</Text>}
        </VStack>
      </Panel>
      <Panel position="bottom-center">
        <BoardToolbar onAdd={kind => place(kind)} library={library} onAddWorkflow={item => addWorkflow(item)} onOpen={leaveTo} />
      </Panel>
    </ReactFlow>
  );

  const titleBlock = (
    <VStack gap={1}>
      <Breadcrumbs>
        <BreadcrumbItem href="#home">Home</BreadcrumbItem>
        {editing && <BreadcrumbItem href={editing.href}>{editing.name}</BreadcrumbItem>}
        <BreadcrumbItem isCurrent>{isEditing ? 'Edit' : 'New workflow'}</BreadcrumbItem>
      </Breadcrumbs>
      <TextInput label="Workflow name" isLabelHidden value={name} onChange={setName} width={isPhone ? '100%' : 320} />
    </VStack>
  );
  const actions = (
    <HStack gap={2} wrap="wrap">
      {editing && (
        <Button
          label="Cancel"
          variant="ghost"
          onClick={() => leaveTo(editing.href)}
        />
      )}
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
      {isEditing ? (
        <Button
          label="Save changes"
          variant="primary"
          icon={<Icon icon={Save} />}
          isDisabled={!isDirty || !allReady}
          tooltip={!isDirty ? 'Nothing has changed yet' : !allReady ? 'Finish the tiles first' : undefined}
          onClick={() => {
            onTurnOn(finalName, toColumns(board, links, sections), {board, links, sections});
            toast({body: `Changes to ${finalName} are saved.`});
          }}
        />
      ) : (
        <Button
          label="Save"
          variant="primary"
          icon={<Icon icon={Save} />}
          isDisabled={!allReady}
          tooltip={allReady ? 'Saves it to your library' : 'Finish the tiles first'}
          onClick={() => {
            onTurnOn(finalName, toColumns(board, links, sections), {board, links, sections});
            toast({body: `${finalName} is saved to your library.`});
          }}
        />
      )}
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

  const sectionItem = selectedSection ? library.find(w => w.key === selectedSection.key) : undefined;
  const panel = selectedSection ? (
    <SectionPanel section={selectedSection} openHref={sectionItem?.href} onOpen={leaveTo} onRemove={() => removeSection(selectedSection.id)} />
  ) : (
    <StepPanel
      tileId={selectedId ?? ''}
      step={selected?.step ?? null}
      title={selected ? titleOf(selected.id) : ''}
      comesFrom={linkedTo(links.filter(l => l.target === selectedId).map(l => l.source))}
      goesTo={linkedTo(links.filter(l => l.source === selectedId).map(l => l.target))}
      run={selectedId ? editing?.runs?.[selectedId] : undefined}
      onSelect={id => {
        setSelectedId(id);
        setSelectedLinkId(null);
      }}
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
          isNarrow || (!selected && !selectedSection) ? undefined : (
            <LayoutPanel hasDivider padding={4} width={360} label="Selected tile">
              {panel}
            </LayoutPanel>
          )
        }
      />
      <AlertDialog
        isOpen={leavingTo !== null}
        onOpenChange={open => !open && setLeavingTo(null)}
        title="Discard your changes?"
        description={editing ? `Your changes to ${editing.name} won’t be saved. The workflow stays as it was.` : 'This new workflow hasn’t been saved. It will be lost.'}
        actionLabel="Discard changes"
        cancelLabel="Keep editing"
        onAction={() => {
          const href = leavingTo;
          setLeavingTo(null);
          if (href) window.location.hash = href.slice(1);
        }}
      />
      {viewing && isTried && (
        <TrialDialog title={titleOf(viewing.id)} step={viewing.step} trial={trialFor(viewing, board, links)} onClose={() => setViewingId(null)} />
      )}
      {isNarrow && (
        <Dialog isOpen={!!selected || !!selectedSection} onOpenChange={open => !open && setSelectedId(null)} variant="fullscreen" purpose="form" padding={0}>
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
