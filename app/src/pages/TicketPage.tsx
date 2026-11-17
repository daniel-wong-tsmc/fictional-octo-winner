import {useState} from 'react';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Layout, LayoutContent, LayoutFooter, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {List, ListItem} from '@astryxdesign/core/List';
import {Token} from '@astryxdesign/core/Token';
import {MultiSelector} from '@astryxdesign/core/MultiSelector';
import {Selector} from '@astryxdesign/core/Selector';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Divider} from '@astryxdesign/core/Divider';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {Table, pixel, type TableColumn} from '@astryxdesign/core/Table';
import {Icon} from '@astryxdesign/core/Icon';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Toolbar} from '@astryxdesign/core/Toolbar';
import {useToast} from '@astryxdesign/core/Toast';
import {
  ArrowRightLeft, Bot, Check, ChevronDown, ChevronRight, Download, FileSpreadsheet, MousePointerClick, Pencil, Plug, Plus, RotateCcw, Sparkles, Trash2,
} from 'lucide-react';
import {AVAILABLE_CONNECTIONS, TICKETS, type DataSet, type Sheet} from '../data';
import {
  CHECK_LABEL, checksFor, describeRule, previewValue, rulesForPick, shapeOf,
  type CheckKind, type Handoff, type Pick,
} from '../handoffs';
import {RefLabel, StatusLabel} from './shared';

const isNumeric = (v: string) => /^[+-]?[\d,]+(\.\d+)?%?$/.test(v);
const letter = (i: number) => String.fromCharCode(65 + i);

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
            <HStack gap={1.5} vAlign="center">
              <StatusDot variant={data.isWarningStale ? 'warning' : 'error'} label={data.isWarningStale ? 'Out of date' : 'Problem'} />
              <Text type="supporting" weight="medium">{data.warning}</Text>
            </HStack>
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
          <RefLabel kind="workflow" label={`Handoff from ${handoff.workflow}`} />
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Token size="sm" label={shapeOf(handoff.rule)} />
            <Text weight="semibold" hasTabularNumbers>{handoff.value ?? '—'}</Text>
          </HStack>
          <HStack gap={1.5} vAlign="center">
            <StatusDot variant={failed ? 'error' : 'success'} label={failed ? 'Waiting' : 'Ready'} />
            <Text type="supporting" weight="medium">
              {failed ? `Waiting: ${handoff.checkFailure} This step won't run until it passes.` : 'Fills in automatically on every run'}
            </Text>
          </HStack>
        </VStack>
      }
      endContent={<IconButton label={`Remove ${handoff.name}`} icon={<Icon icon={Trash2} />} variant="ghost" size="sm" onClick={onRemove} />}
    />
  );
}

/** A page region on the ticket. One card per region; what sits inside is rows, never more cards. */
function Region({title, count, endContent, variant = 'section', children}: {
  title: string;
  count?: number;
  endContent?: React.ReactNode;
  variant?: 'section' | 'muted';
  children: React.ReactNode;
}) {
  return (
    <Card variant={variant === 'muted' ? 'muted' : 'default'} padding={4}>
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
            <HStack gap={1.5} vAlign="center">
              <StatusDot variant={failed ? 'error' : 'success'} label={failed ? 'Check failed' : 'Check passed'} />
              <Text type="supporting" weight="medium">
                {failed
                  ? `Check failed: ${CHECK_LABEL[handoff.check].toLowerCase()}. ${handoff.checkFailure}`
                  : `Check passed: ${CHECK_LABEL[handoff.check].toLowerCase()}`}
              </Text>
            </HStack>
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

function AddHandoffDialog({
  pick, sheet, existing, onClose, onAdd,
}: {
  existing: Handoff[];
  pick: Pick | null;
  sheet: Sheet;
  onClose: () => void;
  onAdd: (h: Omit<Handoff, 'id' | 'ticketId' | 'workflow' | 'usedBy'>) => void;
}) {
  const options = pick ? rulesForPick(pick, sheet) : [];
  const [choice, setChoice] = useState('0');
  const [name, setName] = useState(options[0]?.suggestedName ?? '');
  const chosen = options[Number(choice)] ?? options[0];
  const checks = chosen ? checksFor(chosen.rule) : [];
  const [check, setCheck] = useState<CheckKind>(checks[0] ?? 'none');
  if (!pick || !chosen) return null;
  const duplicate = existing.find(h => JSON.stringify(h.rule) === JSON.stringify(chosen.rule));
  const valueNote = (r: Parameters<typeof previewValue>[0]) =>
    r.kind === 'cell' || r.kind === 'row' ? `now ${previewValue(r, sheet)}` : 'worked out from all rows on the next run';

  const clicked =
    pick.kind === 'column' ? `column ${letter(pick.col)}` : pick.kind === 'row' ? `row ${pick.row}` : `cell ${letter(pick.col)}${pick.row}`;

  return (
    <Dialog isOpen onOpenChange={open => !open && onClose()} width={520} purpose="form">
      <Layout
        height="auto"
        header={<DialogHeader title="Add a handoff" subtitle={`You clicked ${clicked}. Choose what to pass on.`} onOpenChange={open => !open && onClose()} />}
        content={
          <LayoutContent padding={4}>
      <VStack gap={4}>
        <RadioList
          label="Save it as"
          description="We find it by its name or ID, not its cell position, so it stays right when rows move or new rows arrive."
          value={choice}
          onChange={v => {
            setChoice(v);
            const o = options[Number(v)];
            setName(o.suggestedName);
            setCheck(checksFor(o.rule)[0]);
          }}>
          {options.map((o, i) => (
            <RadioListItem
              key={i}
              value={String(i)}
              label={describeRule(o.rule)}
              description={`${shapeOf(o.rule)} · ${valueNote(o.rule)}${i === 0 ? ' · recommended' : ''}`}
            />
          ))}
        </RadioList>
        <Text type="supporting">{`We won't save ${clicked} itself. After the next run it may hold different data.`}</Text>
        {duplicate && (
          <Banner
            status="warning"
            title={`Already handed off as "${duplicate.name}"`}
            description="Other workflows can already pick it. Use that one so there is only one name for this value."
            collapsible={false}
          />
        )}
        <TextInput label="Name" description="How other workflows will see it." value={name} onChange={setName} />
        <Selector
          label="Check before passing it on"
          description="If the check fails, workflows that use it wait and you get a task on Home."
          value={check}
          onChange={v => setCheck(v as CheckKind)}
          options={checks.map(c => ({value: c, label: CHECK_LABEL[c]}))}
        />
      </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter padding={4}>
        <HStack gap={2} hAlign="end">
          <Button label="Cancel" variant="ghost" onClick={onClose} />
          <Button
            label="Add handoff"
            variant="primary"
            isDisabled={!name.trim() || !!duplicate}
            onClick={() => onAdd({
              name: name.trim(),
              rule: chosen.rule,
              value: chosen.rule.kind === 'cell' || chosen.rule.kind === 'row' ? previewValue(chosen.rule, sheet) : 'Worked out on the next run',
              check,
            })}
          />
        </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

/* ---------- Connections (MCP servers) ---------- */

function Connections({items, onAdd, onRemove}: {items: string[]; onAdd: (n: string) => void; onRemove: (n: string) => void}) {
  const available = AVAILABLE_CONNECTIONS.filter(([n]) => !items.includes(n));
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="center">
        <Text type="label">Connections the agent can use</Text>
      </HStack>
      <HStack gap={1.5} wrap="wrap" vAlign="center">
        {items.map(name => (
          <Token key={name} label={name} icon={<StatusDot variant="success" label="Connected" />} onRemove={() => onRemove(name)} />
        ))}
        <DropdownMenu
          button={{label: 'Add connection', variant: 'ghost', size: 'sm', icon: <Icon icon={Plus} />}}
          header={<Text type="supporting">Approved by your workspace admin</Text>}
          items={
            available.length
              ? available.map(([name, kind]) => ({label: name, description: kind, icon: <Icon icon={Plug} />, onClick: () => onAdd(name)}))
              : [{label: 'All approved connections are added', isDisabled: true}]
          }
        />
      </HStack>
    </VStack>
  );
}

/* ---------- Sheets ---------- */

type Row = Record<string, unknown> & {_row: number};

function SheetTable({sheet, shownColumns, onPick}: {sheet: Sheet; shownColumns?: string[]; onPick?: (p: Pick) => void}) {
  if (sheet.isEmpty || !sheet.columns || !sheet.rows) {
    return (
      <VStack padding={6}>
        <EmptyState
          isCompact
          icon={<Icon icon={FileSpreadsheet} color="secondary" />}
          title={sheet.fromFile ? 'Uploaded' : 'No rows yet'}
          description={sheet.emptyNote ?? 'This sheet fills in when the step runs.'}
        />
      </VStack>
    );
  }
  const added = sheet.addedColumns ?? [];
  const missing = sheet.missingColumns ?? [];
  const cols = sheet.columns
    .map((name, c) => [name, c] as const)
    .filter(([name]) => !shownColumns?.length || shownColumns.includes(name));
  const data: Row[] = sheet.rows.map((r, i) => {
    const row: Row = {_row: i + 2};
    r.forEach((val, c) => (row[`c${c}`] = val));
    return row;
  });
  const columns: TableColumn<Row>[] = [
    {
      key: '_row', header: <Text type="supporting">1</Text>, width: pixel(52), align: 'end',
      renderCell: item =>
        onPick ? (
          <Button label={String(item._row)} variant="ghost" size="sm" tooltip={`Hand off row ${item._row}`} onClick={() => onPick({kind: 'row', row: item._row})} />
        ) : (
          <Text type="supporting" hasTabularNumbers>{item._row}</Text>
        ),
    },
    ...cols.map(([name, c]): TableColumn<Row> => ({
      key: `c${c}`,
      align: isNumeric(sheet.rows![0][c]) ? 'end' : 'start',
      header: (
        <VStack gap={0}>
          <Text type="supporting">{letter(c)}</Text>
          {onPick ? (
            <Button label={name} variant="ghost" size="sm" tooltip={`Hand off column ${letter(c)}`} onClick={() => onPick({kind: 'column', col: c})} />
          ) : (
            <HStack gap={1} vAlign="center">
              <Text weight="semibold">{name}</Text>
              {added.includes(c) && <StatusDot variant="info" label="Added by the agent" tooltip="Added by the agent" />}
            </HStack>
          )}
        </VStack>
      ),
      renderCell: item => {
        const v = String(item[`c${c}`]);
        if (missing.includes(c)) {
          return (
            <HStack gap={1} vAlign="center">
              <StatusDot variant="error" label="Missing" />
              <Text type="supporting">Missing</Text>
            </HStack>
          );
        }
        if (onPick) {
          return <Button label={v} variant="ghost" size="sm" tooltip={`Hand off cell ${letter(c)}${item._row}`} onClick={() => onPick({kind: 'cell', col: c, row: item._row})} />;
        }
        return <Text hasTabularNumbers weight={added.includes(c) ? 'medium' : 'normal'}>{v}</Text>;
      },
    })),
  ];
  return <Table data={data} columns={columns} idKey="_row" density="compact" dividers="grid" textOverflow="truncate" hasHover={!!onPick} />;
}

function Workbook({
  title, description, sheets, selected, onSelect, actions, banner, shownColumns, onPick, anchorId, rowTotals, isOpen = true, onToggle,
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
  shownColumns?: string[];
  onPick?: (p: Pick) => void;
}) {
  const current = sheets.find(([n]) => n === selected)?.[1] ?? sheets[0][1];
  const currentName = sheets.find(([n]) => n === selected)?.[0] ?? sheets[0][0];
  const hidden = shownColumns?.length && current.columns ? current.columns.length - shownColumns.length : 0;
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
            <SheetTable sheet={current} shownColumns={shownColumns} onPick={onPick} />
            </VStack>
            <HStack gap={4} padding={3} wrap="wrap">
              <Text type="supporting">
                {current.fromFile ? `From ${current.fromFile}` : current.rows ? (hidden ? `${hidden} columns hidden` : 'All columns shown') : 'No rows yet'}
              </Text>
              {!!current.addedColumns?.length && (
                <HStack gap={1.5} vAlign="center">
                  <StatusDot variant="info" label="Added by the agent" />
                  <Text type="supporting">Column added by the agent</Text>
                </HStack>
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
  id, handoffs, onApprove, onUndoApprove, onAddHandoff, onRemoveHandoff,
}: {
  id: number;
  handoffs: Handoff[];
  onApprove: (id: number) => void;
  onUndoApprove: (id: number) => void;
  onAddHandoff: (h: Handoff) => void;
  onRemoveHandoff: (handoffId: string) => void;
}) {
  const t = TICKETS[id];
  const toast = useToast();
  const [inputSheet, setInputSheet] = useState(t.inputs.find(d => d.sheet)?.sheet ?? '');
  const [outputSheet, setOutputSheet] = useState(t.outputs[0].sheet);
  const [uploadedSheets, setUploadedSheets] = useState<[string, Sheet][]>([]);
  const [linkedInputs, setLinkedInputs] = useState<string[]>(t.inputs.filter(d => d.handoffId).map(d => d.handoffId!));
  const [shownColumns, setShownColumns] = useState<string[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [pick, setPick] = useState<Pick | null>(null);
  const [engine, setEngine] = useState('python');
  const [instructions, setInstructions] = useState(t.instructions);
  const [connections, setConnections] = useState(t.connections);
  const [isApproved, setIsApproved] = useState(t.status === 'done');
  const [upload, setUpload] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputsOpen, setInputsOpen] = useState(false);

  const preview = (what: string) => toast({body: `Preview only. ${what} comes with the real build.`});
  // One run button. It turns into "Update and run" once the instructions or the code language change.
  const hasEdits = instructions !== t.instructions || engine !== 'python';
  const runLabel = hasEdits ? 'Update and run' : t.isDraft ? 'Run step' : 'Run again';
  const status = isApproved ? 'done' : t.status;
  const myHandoffs = handoffs.filter(h => h.ticketId === id);
  const otherHandoffs = handoffs.filter(h => h.ticketId !== id && !linkedInputs.includes(h.id));
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
    toast({body: `Added ${names.length} ${names.length === 1 ? 'sheet' : 'sheets'} from ${file.name} to Input sheets.`});
  };

  return (
    <Layout
      height="fill"
      contentWidth={1240}
      header={
        <LayoutHeader hasDivider padding={4}>
          <Breadcrumbs>
            <BreadcrumbItem href="#home">Home</BreadcrumbItem>
            {t.workflow === 'Monthly sales close' && <BreadcrumbItem href="#workflow-1">{t.workflow}</BreadcrumbItem>}
            <BreadcrumbItem isCurrent>{t.step}</BreadcrumbItem>
          </Breadcrumbs>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={5}>
            {/* Title and actions */}
            <HStack gap={4} hAlign="between" vAlign="start" wrap="wrap">
              <VStack gap={1.5}>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <StatusLabel status={status} />
                  <Text type="supporting">{`Part of ${t.workflow}`}</Text>
                </HStack>
                <Heading level={1} textWrap="balance">{t.step}</Heading>
                <Text type="supporting">
                  {isApproved && t.status !== 'done' ? 'Approved just now. The next step and any handoffs use this output.' : t.ran}
                </Text>
              </VStack>
              <VStack gap={1.5} hAlign="end">
              <HStack gap={2} wrap="wrap">
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
              </HStack>
              {t.canApprove && !isApproved && destinations.length > 0 && (
                <Text type="supporting">{`Approving sends it to: ${destinations.join(', ')}`}</Text>
              )}
              </VStack>
            </HStack>

            {t.banner && !isApproved && (
              <Banner status={t.banner.status} title={t.banner.title} description={t.banner.description} collapsible={false} />
            )}
            {failedChecks.length > 0 && (
              <Banner
                status="error"
                title={`${failedChecks.length === 1 ? 'A handoff check failed' : `${failedChecks.length} handoff checks failed`}.`}
                description={`${failedChecks.map(h => `${h.name}: ${h.checkFailure}`).join(' ')} Workflows that use it are waiting.`}
                collapsible={false}
              />
            )}

            {/* Inputs and output on the left, instructions on the right */}
            <Grid columns={{minWidth: 320, max: 2, repeat: 'fit'}} gap={3} align="start">
              <VStack gap={3}>
                <Region
                  title="Inputs"
                  count={inputCount}
                  endContent={
                    <DropdownMenu
                      button={{label: 'Add input', variant: 'ghost', size: 'sm', icon: <Icon icon={Plus} />}}
                      header={<Text type="supporting">From another workflow</Text>}
                      alignment="end"
                      items={
                        otherHandoffs.length
                          ? otherHandoffs.map(h => ({
                              label: h.name,
                              description: `${h.workflow} · ${shapeOf(h.rule)} · ${h.value ?? ''}`,
                              icon: <Icon icon={ArrowRightLeft} />,
                              onClick: () => {
                                setLinkedInputs(prev => [...prev, h.id]);
                                toast({body: `${h.name} from ${h.workflow} is now an input. It fills in on every run.`});
                              },
                            }))
                          : [{label: 'No other handoffs yet', isDisabled: true}]
                      }
                    />
                  }>
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

                <Region title="Output">
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
                    <Text type="label">{`Handoffs · ${myHandoffs.length}`}</Text>
                    <Text type="supporting">
                      {hasResult
                        ? 'Values from the result that other workflows can use as inputs. Add one from the output sheet below.'
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
              </VStack>

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
                            setEngine('python');
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
                    <VStack gap={2}>
                      <HStack gap={1.5} vAlign="center">
                        <Icon icon={Bot} size="sm" color="secondary" />
                        <Text type="label">What the agent did</Text>
                      </HStack>
                      {t.agentSummary ? (
                        <List listStyle="disc" density="compact">
                          {t.agentSummary.map(line => <ListItem key={line} label={<Text>{line}</Text>} />)}
                        </List>
                      ) : (
                        <Text type="supporting">Nothing yet. Run the step and the agent explains its work here in plain words.</Text>
                      )}
                    </VStack>
                  <Collapsible
                    defaultIsOpen={false}
                    chevronPosition="start"
                    trigger={<Text type="supporting" weight="medium">Show the code</Text>}>
                    <VStack gap={2}>
                      <HStack gap={2} vAlign="center" wrap="wrap">
                        <Text type="supporting">Written as</Text>
                        <SegmentedControl
                          label="Written as"
                          value={engine}
                          onChange={v => {
                            setEngine(v);
                            setIsEditing(true);
                          }}
                          size="sm">
                          <SegmentedControlItem value="python" label="Python" />
                          <SegmentedControlItem value="excel" label="Excel formulas" />
                        </SegmentedControl>
                      </HStack>
                      <CodeBlock code={engine === 'python' ? t.python : t.excel} language={engine === 'python' ? 'python' : 'plaintext'} width="100%" size="sm" isWrapped />
                    </VStack>
                  </Collapsible>
                  <Divider />
                  <Connections
                    items={connections}
                    onAdd={name => {
                      setConnections(c => [...c, name]);
                      toast({body: `Connected ${name} to this ticket.`});
                    }}
                    onRemove={name => {
                      setConnections(c => c.filter(x => x !== name));
                      toast({body: `Disconnected ${name}. The agent can't read from it on this ticket.`});
                    }}
                  />
                </VStack>
              </Region>
            </Grid>

            {/* Sheets: output first (what you approve), inputs collapsed */}
            <Workbook
              title="Output sheets"
              description="What the agent writes. Read only; change the instructions to change these."
              sheets={outputSheets}
              selected={outputSheet}
              onSelect={setOutputSheet}
              anchorId="output-sheets"
              rowTotals={rowTotals}
              shownColumns={isPicking ? [] : shownColumns}
              onPick={isPicking ? p => setPick(p) : undefined}
              banner={
                isPicking && (
                  <Banner
                    status="info"
                    container="section"
                    title="Click what you want to hand off"
                    description="A column name, a row number, or a single cell."
                    endContent={<Button label="Cancel" size="sm" onClick={() => setIsPicking(false)} />}
                    collapsible={false}
                  />
                )
              }
              actions={
                <>
                  {!!t.sheets[outputSheet]?.columns && (
                    <MultiSelector
                      label="Columns shown"
                      isLabelHidden
                      placeholder="All columns shown"
                      variant="secondary"
                      size="sm"
                      options={t.sheets[outputSheet].columns!.map((c, i) => ({value: c, label: `${letter(i)}  ${c}`}))}
                      value={shownColumns}
                      onChange={setShownColumns}
                      formatValue={items => `${items.length} columns shown`}
                      hasSelectAll
                      isDisabled={isPicking}
                    />
                  )}
                  <Button
                    label={isPicking ? 'Picking…' : 'Add handoff'}
                    icon={<Icon icon={MousePointerClick} />}
                    isDisabled={!hasResult || isPicking}
                    tooltip={hasResult ? 'Click a column, row or cell in this sheet' : 'Available after the agent has run'}
                    onClick={() => {
                      setOutputSheet(result.sheet);
                      setShownColumns([]);
                      setIsPicking(true);
                    }}
                  />
                  <Button label="Download output" icon={<Icon icon={Download} />} onClick={() => preview('Download')} />
                </>
              }
            />
            {inputSheets.length > 0 && (
              <Workbook
                title="Input sheets"
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
          </VStack>
          {pick && (
            <AddHandoffDialog
              key={JSON.stringify(pick)}
              pick={pick}
              sheet={t.sheets[outputSheet]}
              existing={myHandoffs}
              onClose={() => setPick(null)}
              onAdd={h => {
                onAddHandoff({...h, id: `h-${Date.now()}`, ticketId: id, workflow: t.workflow, usedBy: []});
                setPick(null);
                setIsPicking(false);
                toast({body: `Added handoff "${h.name}". Other workflows can now pick it as an input.`});
              }}
            />
          )}
        </LayoutContent>
      }
    />
  );
}
