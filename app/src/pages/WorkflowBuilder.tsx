import {useState, type DragEvent} from 'react';
import {Layout, LayoutContent, LayoutHeader, LayoutPanel} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Selector} from '@astryxdesign/core/Selector';
import {MultiSelector} from '@astryxdesign/core/MultiSelector';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Switch} from '@astryxdesign/core/Switch';
import {List, ListItem} from '@astryxdesign/core/List';
import {Token} from '@astryxdesign/core/Token';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Toolbar} from '@astryxdesign/core/Toolbar';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Icon} from '@astryxdesign/core/Icon';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {useToast} from '@astryxdesign/core/Toast';
import {ArrowDown, FileSpreadsheet, GripVertical, Play, Plus, Power, Send, Sparkles, Trash2, WandSparkles} from 'lucide-react';
import {PEOPLE} from '../workflow';

/* ---------- Blocks ---------- */

type BlockKind = 'file' | 'instructions' | 'output';

type FileBlock = {id: string; kind: 'file'; source: 'upload' | 'connection'; fileName: string; connection: string; sheets: string[]};
type InstructionsBlock = {id: string; kind: 'instructions'; text: string; writtenAs: string};
type OutputBlock = {
  id: string;
  kind: 'output';
  name: string;
  format: string;
  needsOk: boolean;
  approver: string;
  sendTo: string[];
  shareWithWorkflows: boolean;
};
type Block = FileBlock | InstructionsBlock | OutputBlock;

const KINDS: {kind: BlockKind; title: string; about: string; icon: typeof FileSpreadsheet; stage: string}[] = [
  {kind: 'file', title: 'File', about: 'An Excel or CSV you upload, or a file from a connected app.', icon: FileSpreadsheet, stage: 'Files'},
  {kind: 'instructions', title: 'Instructions', about: 'Tell the AI, in plain words, what to do with the files.', icon: WandSparkles, stage: 'Instructions'},
  {kind: 'output', title: 'Output', about: 'What it produces, and who gets it.', icon: Send, stage: 'Output'},
];
const kindInfo = (k: BlockKind) => KINDS.find(x => x.kind === k)!;

// Example content, so every block arrives filled in when you click around.
const FILE_PRESETS: Omit<FileBlock, 'id' | 'kind'>[] = [
  {source: 'upload', fileName: 'Sales close – Oct 2026.xlsx', connection: '', sheets: ['Orders', 'Rates', 'Notes']},
  {source: 'connection', fileName: '', connection: 'Google Drive: FY26 targets.xlsx', sheets: ['Targets']},
  {source: 'connection', fileName: '', connection: 'Shopify: Orders, last month', sheets: ['Orders']},
];
const INSTRUCTION_PRESETS = [
  'Convert every order to US dollars using the exchange rate on its order date.',
  'Total sales by region. Show each region’s target and the gap in dollars and percent. Biggest miss first.',
  'Flag any region more than 5% below target.',
];
const OUTPUT_PRESETS: Omit<OutputBlock, 'id' | 'kind'>[] = [
  {name: 'October summary', format: 'Excel sheet', needsOk: true, approver: PEOPLE[0], sendTo: ['Slack: #finance-close', 'Google Drive: Finance close pack'], shareWithWorkflows: true},
  {name: 'Regions below target', format: 'Excel sheet', needsOk: false, approver: PEOPLE[0], sendTo: ['Email: Marco Ruiz'], shareWithWorkflows: false},
];
const TRIAL_RESULT: Record<BlockKind, string[]> = {
  file: ['4,988 rows read', '60 rows read', '4,988 rows read'],
  instructions: ['4,988 orders converted', '5 regions, 2.1% below target overall', '2 regions flagged'],
  output: ['October summary, 5 rows', 'Regions below target, 2 rows'],
};

const SEND_OPTIONS = [
  {type: 'section' as const, title: 'People', options: ['Email: Priya Shah', 'Email: Marco Ruiz', 'Email: finance@company.com'].map(v => ({value: v, label: v}))},
  {type: 'section' as const, title: 'Channels and folders', options: ['Slack: #finance-close', 'Google Drive: Finance close pack', 'SharePoint: Close archive'].map(v => ({value: v, label: v}))},
];
const CONNECTED_FILES = ['Google Drive: FY26 targets.xlsx', 'Shopify: Orders, last month', 'SharePoint: stock_levels.xlsx', 'Snowflake: sales_history'];

let nextId = 1;
const newId = () => `b${nextId++}`;

function makeBlock(kind: BlockKind, existing: Block[]): Block {
  const n = existing.filter(b => b.kind === kind).length;
  if (kind === 'file') return {id: newId(), kind, ...FILE_PRESETS[n % FILE_PRESETS.length]};
  if (kind === 'instructions') return {id: newId(), kind, text: INSTRUCTION_PRESETS[n % INSTRUCTION_PRESETS.length], writtenAs: 'Let the AI choose'};
  return {id: newId(), kind, ...OUTPUT_PRESETS[n % OUTPUT_PRESETS.length]};
}

function exampleBlocks(): Block[] {
  const blocks: Block[] = [];
  for (const k of ['file', 'file', 'instructions', 'instructions', 'output'] as BlockKind[]) blocks.push(makeBlock(k, blocks));
  return blocks;
}

function summary(b: Block): string {
  if (b.kind === 'file') return b.source === 'upload' ? (b.fileName || 'No file yet') : (b.connection || 'No connection picked');
  if (b.kind === 'instructions') return b.text || 'No instructions yet';
  const send = b.sendTo.length ? b.sendTo.join(', ') : 'nobody yet';
  return `${b.format}${b.needsOk ? `, after an OK from ${b.approver.replace(' (you)', '')}` : ''} → ${send}`;
}

function title(b: Block): string {
  if (b.kind === 'file') return b.source === 'upload' ? 'Uploaded file' : 'From a connection';
  if (b.kind === 'instructions') return 'Instructions';
  return b.name || 'Output';
}

/* ---------- Drag and drop ---------- */

const DRAG_TYPE = 'application/x-workflow-block';

/* ---------- Palette ---------- */

function Palette({onAdd, onDragKind, onExample}: {onAdd: (k: BlockKind) => void; onDragKind: (k: BlockKind | null) => void; onExample: () => void}) {
  return (
    <VStack gap={4}>
      <VStack gap={0.5}>
        <Heading level={2}>Blocks</Heading>
        <Text type="supporting">Drag a block onto the canvas, or click Add.</Text>
      </VStack>
      {KINDS.map(k => (
        <Card
          key={k.kind}
          padding={3}
          draggable
          aria-label={`${k.title} block. Drag onto the canvas, or use Add.`}
          onDragStart={(e: DragEvent<HTMLDivElement>) => {
            e.dataTransfer.setData(DRAG_TYPE, k.kind);
            e.dataTransfer.effectAllowed = 'copy';
            onDragKind(k.kind);
          }}
          onDragEnd={() => onDragKind(null)}>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center">
              <Icon icon={GripVertical} size="sm" color="secondary" />
              <Icon icon={k.icon} size="sm" />
              <Text weight="semibold">{k.title}</Text>
            </HStack>
            <Text type="supporting">{k.about}</Text>
            <HStack>
              <Button label={`Add ${k.title.toLowerCase()}`} size="sm" icon={<Icon icon={Plus} />} onClick={() => onAdd(k.kind)} />
            </HStack>
          </VStack>
        </Card>
      ))}
      <Divider />
      <Button label="Fill in an example" variant="ghost" icon={<Icon icon={Sparkles} />} onClick={onExample} />
    </VStack>
  );
}

/* ---------- Canvas ---------- */

function Stage({kind, index, blocks, selectedId, dragKind, trialRun, onSelect, onAdd}: {
  kind: BlockKind;
  index: number;
  blocks: Block[];
  selectedId: string | null;
  dragKind: BlockKind | null;
  trialRun: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const info = kindInfo(kind);
  const isTarget = dragKind === kind;
  return (
    <Card padding={3} variant={isTarget ? 'default' : 'muted'} elevation={isTarget ? 'med' : 'none'}>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center" gap={2}>
          <HStack gap={1.5} vAlign="center">
            <Icon icon={info.icon} size="sm" color="secondary" />
            <Text type="label">{`${index}. ${info.stage}`}</Text>
          </HStack>
          {isTarget && <Text type="supporting" weight="medium">Drop to add</Text>}
        </HStack>
        {blocks.length === 0 ? (
          <EmptyState
            isCompact
            title={`Drop ${kind === 'file' ? 'a' : 'an'} ${info.title} block here`}
            description={kind === 'file' ? 'Start with the file the work begins from.' : kind === 'instructions' ? 'Then say what the AI should do.' : 'Last: what it makes and who gets it.'}
            actions={<Button label={`Add ${info.title.toLowerCase()}`} size="sm" icon={<Icon icon={Plus} />} onClick={onAdd} />}
          />
        ) : (
          <>
            <List hasDividers edge="outset">
              {blocks.map((b, i) => (
                <ListItem
                  key={b.id}
                  isSelected={b.id === selectedId}
                  onClick={() => onSelect(b.id)}
                  align="first-line"
                  label={<Text weight="medium">{kind === 'instructions' ? `Step ${i + 1}` : title(b)}</Text>}
                  description={
                    <VStack gap={1}>
                      <Text type="supporting" maxLines={3}>{summary(b)}</Text>
                      {trialRun && (
                        <HStack gap={1.5} vAlign="center">
                          <StatusDot variant="success" label="Tried" />
                          <Text type="supporting" weight="medium">{TRIAL_RESULT[kind][i % TRIAL_RESULT[kind].length]}</Text>
                        </HStack>
                      )}
                    </VStack>
                  }
                />
              ))}
            </List>
            <HStack>
              <Button label={`Add ${info.title.toLowerCase()}`} variant="ghost" size="sm" icon={<Icon icon={Plus} />} onClick={onAdd} />
            </HStack>
          </>
        )}
      </VStack>
    </Card>
  );
}

/* ---------- Inspector ---------- */

function Inspector({block, onChange, onRemove}: {block: Block | null; onChange: (b: Block) => void; onRemove: () => void}) {
  if (!block) {
    return <EmptyState isCompact title="Select a block" description="Click a block on the canvas to fill it in." />;
  }
  const info = kindInfo(block.kind);
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center">
        <Icon icon={info.icon} size="sm" />
        <Heading level={3}>{info.title}</Heading>
      </HStack>

      {block.kind === 'file' && (
        <>
          <SegmentedControl label="Where the file comes from" value={block.source} onChange={v => onChange({...block, source: v as FileBlock['source']})} layout="fill">
            <SegmentedControlItem value="upload" label="Upload" />
            <SegmentedControlItem value="connection" label="From a connection" />
          </SegmentedControl>
          {block.source === 'upload' ? (
            <FileInput
              label="File"
              description="Excel or CSV. Upload a new one each run, or keep this one."
              mode="dropzone"
              accept=".xlsx,.xls,.csv"
              value={block.fileName ? new File([''], block.fileName) : null}
              onChange={files => {
                const f = Array.isArray(files) ? files[0] : files;
                onChange({...block, fileName: f?.name ?? '', sheets: f ? ['Sheet1', 'Sheet2'] : []});
              }}
            />
          ) : (
            <Selector
              label="File"
              description="From an app your admin has connected."
              options={CONNECTED_FILES}
              value={block.connection}
              onChange={v => onChange({...block, connection: v, sheets: [v.split(': ')[1]?.split('.')[0] ?? 'Sheet1']})}
            />
          )}
          {block.sheets.length > 0 && (
            <VStack gap={1.5}>
              <Text type="label">Sheets the AI will read</Text>
              <HStack gap={1.5} wrap="wrap">
                {block.sheets.map(s => (
                  <Token key={s} label={s} onRemove={() => onChange({...block, sheets: block.sheets.filter(x => x !== s)})} />
                ))}
              </HStack>
            </VStack>
          )}
        </>
      )}

      {block.kind === 'instructions' && (
        <>
          <TextArea
            label="What should the AI do?"
            description="Plain words, like you’d tell a colleague. It can use every file before this step."
            value={block.text}
            onChange={text => onChange({...block, text})}
            rows={6}
          />
          <HStack gap={1.5} wrap="wrap" vAlign="center">
            <Text type="supporting">Examples:</Text>
            {INSTRUCTION_PRESETS.map((p, i) => (
              <Token key={p} size="sm" label={['Convert to USD', 'Total vs target', 'Flag misses'][i]} onClick={() => onChange({...block, text: p})} />
            ))}
          </HStack>
          <Selector
            label="The AI writes it as"
            description="Leave this on automatic unless you have a reason."
            options={['Let the AI choose', 'Excel formulas', 'Python']}
            value={block.writtenAs}
            onChange={writtenAs => onChange({...block, writtenAs})}
          />
        </>
      )}

      {block.kind === 'output' && (
        <>
          <TextInput label="Name" description="How people and other workflows will see it." value={block.name} onChange={name => onChange({...block, name})} />
          <Selector label="Format" options={['Excel sheet', 'CSV file', 'A single number']} value={block.format} onChange={format => onChange({...block, format})} />
          <Divider />
          <Text type="label">Who gets it</Text>
          <Switch label="Needs an OK before it’s sent" value={block.needsOk} onChange={needsOk => onChange({...block, needsOk})} />
          {block.needsOk && (
            <Selector label="Who gives the OK" options={PEOPLE} value={block.approver} onChange={approver => onChange({...block, approver})} />
          )}
          <MultiSelector
            label="Send it to"
            placeholder="Pick people, channels or folders"
            options={SEND_OPTIONS}
            value={block.sendTo}
            onChange={sendTo => onChange({...block, sendTo})}
            triggerDisplay="labels"
            hasSearch
            width="100%"
          />
          <Switch
            label="Let other workflows use it"
            description="Other workflows can pick this output as one of their files."
            value={block.shareWithWorkflows}
            onChange={shareWithWorkflows => onChange({...block, shareWithWorkflows})}
          />
        </>
      )}

      <Divider />
      <HStack>
        <Button label="Remove block" variant="ghost" icon={<Icon icon={Trash2} />} onClick={onRemove} />
      </HStack>
    </VStack>
  );
}

/* ---------- Page ---------- */

export function WorkflowBuilderPage({isEditing, onTurnOn}: {isEditing: boolean; onTurnOn: () => void}) {
  const toast = useToast();
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const [name, setName] = useState(isEditing ? 'Monthly sales close' : 'Untitled workflow');
  const [blocks, setBlocks] = useState<Block[]>(() => (isEditing ? exampleBlocks() : []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragKind, setDragKind] = useState<BlockKind | null>(null);
  const [trial, setTrial] = useState<'none' | 'running' | 'done'>('none');

  const selected = blocks.find(b => b.id === selectedId) ?? null;
  const has = (k: BlockKind) => blocks.some(b => b.kind === k);
  const missing = KINDS.filter(k => !has(k.kind)).map(k => k.title.toLowerCase());
  const isReady = missing.length === 0;

  const add = (kind: BlockKind) => {
    const b = makeBlock(kind, blocks);
    setBlocks([...blocks, b]);
    setSelectedId(b.id);
    setTrial('none');
  };
  const update = (b: Block) => {
    setBlocks(prev => prev.map(x => (x.id === b.id ? b : x)));
    setTrial('none');
  };
  const remove = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setSelectedId(null);
    setTrial('none');
  };

  // Drop anywhere on the canvas: the block lands in its own stage, so the order is always files → instructions → output.
  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDrop = (e: DragEvent<HTMLElement>) => {
    const kind = e.dataTransfer.getData(DRAG_TYPE) as BlockKind;
    if (kind) {
      e.preventDefault();
      add(kind);
    }
    setDragKind(null);
  };

  const stages = KINDS.map((k, i) => (
    <Stage
      key={k.kind}
      kind={k.kind}
      index={i + 1}
      blocks={blocks.filter(b => b.kind === k.kind)}
      selectedId={selectedId}
      dragKind={dragKind}
      trialRun={trial === 'done'}
      onSelect={setSelectedId}
      onAdd={() => add(k.kind)}
    />
  ));

  const canvas = (
    <VStack gap={4} onDragOver={onDragOver} onDrop={onDrop} aria-label="Workflow canvas">
      {trial === 'done' && (
        <Banner status="success" title="Tried on September 2026" description="Every block ran. Each one shows what it produced. If it looks right, turn it on." collapsible={false} />
      )}
      {!isReady && blocks.length > 0 && (
        <Text type="supporting">{`Still needed before you can try it: ${missing.join(', ')}.`}</Text>
      )}
      {/* Top to bottom: files, then instructions, then output. Reads like the process, at any width. */}
      <VStack gap={2}>
        {stages.map((st, i) => (
          <VStack key={i} gap={2}>
            {i > 0 && (
              <HStack hAlign="center">
                <Icon icon={ArrowDown} color="secondary" />
              </HStack>
            )}
            {st}
          </VStack>
        ))}
      </VStack>
    </VStack>
  );

  const header = (
    <LayoutHeader hasDivider padding={4}>
      <Toolbar
        label="Workflow"
        gap={3}
        startContent={
          <VStack gap={1}>
            <Breadcrumbs>
              <BreadcrumbItem href="#home">Home</BreadcrumbItem>
              {isEditing && <BreadcrumbItem href="#workflow-1">Monthly sales close</BreadcrumbItem>}
              <BreadcrumbItem isCurrent>{isEditing ? 'Edit' : 'New workflow'}</BreadcrumbItem>
            </Breadcrumbs>
            <TextInput label="Workflow name" isLabelHidden value={name} onChange={setName} width={320} />
          </VStack>
        }
        endContent={
          <HStack gap={2} wrap="wrap">
            <Button
              label={trial === 'done' ? 'Try again' : 'Try on last month'}
              icon={<Icon icon={Play} />}
              isDisabled={!isReady}
              tooltip={isReady ? 'Runs every block on September’s data, without sending anything' : `Add ${missing.join(', ')} first`}
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
              isDisabled={trial !== 'done'}
              tooltip={trial !== 'done' ? 'Try it on last month first' : undefined}
              onClick={() => {
                onTurnOn();
                toast({body: `${name} is on. It runs on the first business day of each month.`});
              }}
            />
          </HStack>
        }
      />
    </LayoutHeader>
  );

  if (isNarrow) {
    // Phones and small windows: the palette sits above the canvas, and the selected block opens in a full-screen dialog.
    return (
      <>
        <Layout
          height="fill"
          header={header}
          content={
            <LayoutContent padding={4}>
              <VStack gap={4}>
                <HStack gap={2} wrap="wrap" vAlign="center">
                  {KINDS.map(k => (
                    <Button key={k.kind} label={`Add ${k.title.toLowerCase()}`} size="sm" icon={<Icon icon={k.icon} />} onClick={() => add(k.kind)} />
                  ))}
                  <Button label="Fill in an example" variant="ghost" size="sm" onClick={() => { setBlocks(exampleBlocks()); setTrial('none'); }} />
                </HStack>
                {canvas}
              </VStack>
            </LayoutContent>
          }
        />
        <Dialog isOpen={!!selected} onOpenChange={open => !open && setSelectedId(null)} variant="fullscreen" purpose="form" padding={0}>
          <Layout
            height="fill"
            header={<DialogHeader title="Edit block" onOpenChange={open => !open && setSelectedId(null)} />}
            content={
              <LayoutContent padding={4}>
                <Inspector block={selected} onChange={update} onRemove={() => selected && remove(selected.id)} />
              </LayoutContent>
            }
          />
        </Dialog>
      </>
    );
  }

  return (
    <Layout
      height="fill"
      header={header}
      start={
        <LayoutPanel hasDivider padding={4} width={280} label="Blocks">
          <Palette
            onAdd={add}
            onDragKind={setDragKind}
            onExample={() => {
              setBlocks(exampleBlocks());
              setSelectedId(null);
              setTrial('none');
            }}
          />
        </LayoutPanel>
      }
      content={<LayoutContent padding={6}><VStack maxWidth={760}>{canvas}</VStack></LayoutContent>}
      end={
        <LayoutPanel hasDivider padding={4} width={340} label="Selected block">
          <Inspector block={selected} onChange={update} onRemove={() => selected && remove(selected.id)} />
        </LayoutPanel>
      }
    />
  );
}
