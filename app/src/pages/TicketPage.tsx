import {useState} from 'react';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {List, ListItem} from '@astryxdesign/core/List';
import {Token} from '@astryxdesign/core/Token';
import {MultiSelector} from '@astryxdesign/core/MultiSelector';
import {TextInput} from '@astryxdesign/core/TextInput';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Divider} from '@astryxdesign/core/Divider';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {Table, pixel, type TableColumn} from '@astryxdesign/core/Table';
import {Icon} from '@astryxdesign/core/Icon';
import {useToast} from '@astryxdesign/core/Toast';
import {Bot, Check, Download, FileSpreadsheet, Plug, Plus, RotateCcw, Sparkles} from 'lucide-react';
import {AVAILABLE_CONNECTIONS, TICKETS, type DataSet, type Sheet} from '../data';
import {REF_ICON, RefLabel, StatusLabel} from './shared';

const isNumeric = (v: string) => /^[+-]?[\d,]+(\.\d+)?%?$/.test(v);

/* ---------- Inputs and output ---------- */

function DataCard({data, isSelected, onSelect}: {data: DataSet; isSelected: boolean; onSelect: () => void}) {
  return (
    <ClickableCard
      label={`Show ${data.name} in the workbook`}
      onClick={onSelect}
      padding={3}
      variant={data.emptyNote ? 'muted' : 'default'}
      elevation={isSelected ? 'low' : 'none'}>
      <VStack gap={1.5}>
        <HStack gap={2} vAlign="center">
          <Icon icon={FileSpreadsheet} size="sm" color="secondary" />
          <Text weight="medium">{data.name}</Text>
          {isSelected && <Token size="sm" label="Shown below" />}
        </HStack>
        {data.source && <RefLabel kind={data.source[0]} label={data.source[1]} />}
        {data.emptyNote && <Text type="supporting">{data.emptyNote}</Text>}
        {data.stats && <Text type="supporting" hasTabularNumbers>{data.stats.join(' · ')}</Text>}
        {data.warning && (
          <HStack gap={1.5} vAlign="center">
            <StatusDot variant={data.isWarningStale ? 'warning' : 'error'} label={data.isWarningStale ? 'Out of date' : 'Problem'} />
            <Text type="supporting" weight="medium">{data.warning}</Text>
          </HStack>
        )}
        {data.feedsInto && (
          <VStack gap={0.5} hAlign="start">
            <Divider />
            <Text type="supporting">Feeds into</Text>
            {data.feedsInto.map(([kind, label, href]) => (
              <Button key={label} label={label} href={href} variant="ghost" size="sm" icon={<Icon icon={REF_ICON[kind]} />} />
            ))}
          </VStack>
        )}
      </VStack>
    </ClickableCard>
  );
}

function Column({title, count, children}: {title: string; count?: number; children: React.ReactNode}) {
  return (
    <Card padding={3}>
      <VStack gap={3}>
        <Text type="label" color="secondary">{count !== undefined ? `${title} · ${count}` : title}</Text>
        {children}
      </VStack>
    </Card>
  );
}

/* ---------- Connections (MCP servers) ---------- */

function Connections({items, onAdd, onRemove}: {items: string[]; onAdd: (n: string) => void; onRemove: (n: string) => void}) {
  const available = AVAILABLE_CONNECTIONS.filter(([n]) => !items.includes(n));
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="center">
        <Text type="label">Connections the agent can use</Text>
        <Text type="supporting">MCP servers</Text>
      </HStack>
      <HStack gap={1.5} wrap="wrap" vAlign="center">
        {items.map(name => (
          <Token
            key={name}
            label={name}
            icon={<StatusDot variant="success" label="Connected" />}
            onRemove={() => onRemove(name)}
          />
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

/* ---------- Workbook ---------- */

type Row = Record<string, unknown> & {_row: number};

/** What the user chose to show from an output sheet after each run. */
type SheetView = {mode: 'columns' | 'cells'; columns: string[]; range: string};
type ResolvedView = {cols: number[]; rowFrom: number; rowTo: number; summary: string; isAll: boolean};

const letter = (i: number) => String.fromCharCode(65 + i);

/** Parses an Excel-style range like "F2:F9", "A1:C5" or "B:D". Row 1 is the header row. */
function parseRange(range: string, colCount: number): {cols: number[]; rowFrom: number; rowTo: number} | null {
  const m = range.trim().toUpperCase().match(/^([A-Z])(\d*)(?::([A-Z])(\d*))?$/);
  if (!m) return null;
  const c1 = m[1].charCodeAt(0) - 65;
  const c2 = (m[3] ?? m[1]).charCodeAt(0) - 65;
  if (c1 >= colCount || c2 >= colCount || c2 < c1) return null;
  const r1 = m[2] ? Number(m[2]) : 1;
  const r2 = m[4] ? Number(m[4]) : m[2] && !m[3] ? r1 : Infinity;
  if (r2 < r1) return null;
  return {cols: Array.from({length: c2 - c1 + 1}, (_, i) => c1 + i), rowFrom: Math.max(r1, 2), rowTo: r2};
}

function resolveView(sheet: Sheet, view?: SheetView): ResolvedView {
  const n = sheet.columns?.length ?? 0;
  const all: ResolvedView = {cols: Array.from({length: n}, (_, i) => i), rowFrom: 2, rowTo: Infinity, summary: 'Everything', isAll: true};
  if (!view || !sheet.columns) return all;
  if (view.mode === 'columns') {
    const cols = sheet.columns.map((c, i) => (view.columns.includes(c) ? i : -1)).filter(i => i >= 0);
    if (!cols.length || cols.length === n) return all;
    return {...all, cols, isAll: false, summary: cols.map(i => sheet.columns![i]).join(', ')};
  }
  const r = parseRange(view.range, n);
  if (!r) return all;
  return {...r, isAll: false, summary: `Cells ${view.range.trim().toUpperCase()}`};
}

function SheetTable({sheet, view}: {sheet: Sheet; view?: ResolvedView}) {
  if (sheet.isEmpty || !sheet.columns || !sheet.rows) {
    return (
      <VStack padding={8} hAlign="center" gap={1}>
        <Icon icon={FileSpreadsheet} color="secondary" />
        <Text type="supporting">{sheet.emptyNote ?? 'This sheet fills in when the step runs.'}</Text>
      </VStack>
    );
  }
  const added = sheet.addedColumns ?? [];
  const missing = sheet.missingColumns ?? [];
  const v = view ?? resolveView(sheet);
  const data: Row[] = sheet.rows
    .map((r, i) => {
      const row: Row = {_row: i + 2};
      r.forEach((val, c) => (row[`c${c}`] = val));
      return row;
    })
    .filter(row => row._row >= v.rowFrom && row._row <= v.rowTo);
  const columns: TableColumn<Row>[] = [
    {key: '_row', header: <Text type="supporting">1</Text>, width: pixel(44), align: 'end',
      renderCell: item => <Text type="supporting" hasTabularNumbers>{item._row}</Text>},
    ...v.cols.map(c => [sheet.columns![c], c] as const).map(([name, c]): TableColumn<Row> => ({
      key: `c${c}`,
      align: isNumeric(sheet.rows![0][c]) ? 'end' : 'start',
      header: (
        <VStack gap={0}>
          <Text type="supporting">{letter(c)}</Text>
          <HStack gap={1} vAlign="center">
            <Text weight="semibold">{name}</Text>
            {added.includes(c) && <StatusDot variant="info" label="Added by the agent" tooltip="Added by the agent" />}
          </HStack>
        </VStack>
      ),
      renderCell: item =>
        missing.includes(c) ? (
          <HStack gap={1} vAlign="center">
            <StatusDot variant="error" label="Missing" />
            <Text type="supporting">Missing</Text>
          </HStack>
        ) : (
          <Text hasTabularNumbers weight={added.includes(c) ? 'medium' : 'normal'}>{String(item[`c${c}`])}</Text>
        ),
    })),
  ];
  return <Table data={data} columns={columns} idKey="_row" density="compact" dividers="grid" textOverflow="truncate" />;
}

function Workbook({
  title, description, sheets, selected, onSelect, actions, views,
}: {
  views?: Record<string, SheetView>;
  title: string;
  description: string;
  sheets: [string, Sheet][];
  selected: string;
  onSelect: (name: string) => void;
  actions: React.ReactNode;
}) {
  const current = sheets.find(([n]) => n === selected)?.[1] ?? sheets[0][1];
  const currentName = sheets.find(([n]) => n === selected)?.[0] ?? sheets[0][0];
  const view = resolveView(current, views?.[currentName]);
  const shownRows = current.rows?.filter((_, i) => i + 2 >= view.rowFrom && i + 2 <= view.rowTo).length ?? 0;
  return (
    <Card padding={0}>
      <VStack>
        <HStack gap={3} padding={3} vAlign="center" hAlign="between" wrap="wrap">
          <HStack gap={2} vAlign="center">
            <Icon icon={FileSpreadsheet} color="success" />
            <VStack gap={0}>
              <Text weight="medium">{`${title} · ${sheets.length}`}</Text>
              <Text type="supporting">{description}</Text>
            </VStack>
          </HStack>
          <HStack gap={2} wrap="wrap">{actions}</HStack>
        </HStack>
        <TabList value={currentName} onChange={onSelect} size="sm" hasDivider>
          {sheets.map(([name, s]) => (
            <Tab key={name} value={name} label={name} endContent={s.fromFile ? <Text type="supporting">Uploaded</Text> : undefined} />
          ))}
        </TabList>
        <SheetTable sheet={current} view={view} />
        <HStack gap={4} padding={3} wrap="wrap">
          <Text type="supporting">
            {current.fromFile
              ? `From ${current.fromFile}`
              : !current.rows
                ? 'No rows yet'
                : view.isAll
                  ? `Showing ${current.rows.length} sample rows`
                  : `Showing your selection: ${view.cols.length} of ${current.columns!.length} columns, ${shownRows} rows`}
          </Text>
          {!!current.addedColumns?.length && (
            <HStack gap={1.5} vAlign="center">
              <StatusDot variant="info" label="Added by the agent" />
              <Text type="supporting">Column added by the agent</Text>
            </HStack>
          )}
        </HStack>
      </VStack>
    </Card>
  );
}

function ShowPicker({sheet, view, onChange}: {sheet: Sheet; view: SheetView; onChange: (v: SheetView) => void}) {
  if (sheet.isEmpty || !sheet.columns) {
    return (
      <Card variant="muted" padding={3}>
        <VStack gap={1}>
          <Text type="label">Show after each run</Text>
          <Text type="supporting">Available after the agent has run. Then pick the columns or cells you want to see here.</Text>
        </VStack>
      </Card>
    );
  }
  const resolved = resolveView(sheet, view);
  const rangeInvalid = view.mode === 'cells' && view.range.trim() !== '' && !parseRange(view.range, sheet.columns.length);
  return (
    <Card variant="muted" padding={3}>
      <VStack gap={3}>
        <VStack gap={0.5}>
          <Text type="label">Show after each run</Text>
          <Text type="supporting">Only changes what you see on this ticket. The full output still goes to the next step.</Text>
        </VStack>
        <SegmentedControl label="Pick by" value={view.mode} onChange={m => onChange({...view, mode: m as SheetView['mode']})} size="sm">
          <SegmentedControlItem value="columns" label="Columns" />
          <SegmentedControlItem value="cells" label="Cells" />
        </SegmentedControl>
        {view.mode === 'columns' ? (
          <MultiSelector
            label="Columns to show"
            isLabelHidden
            placeholder="All columns"
            options={sheet.columns.map((c, i) => ({value: c, label: `${letter(i)}  ${c}`}))}
            value={view.columns}
            onChange={cols => onChange({...view, columns: cols})}
            triggerDisplay="labels"
            hasSelectAll
            width="100%"
          />
        ) : (
          <TextInput
            label="Cell range"
            isLabelHidden
            placeholder={`For example F2:F9 or A1:${letter(sheet.columns.length - 1)}5`}
            value={view.range}
            onChange={r => onChange({...view, range: r})}
            status={rangeInvalid ? {type: 'error', message: `Use a range like F2:F9, within columns A to ${letter(sheet.columns.length - 1)}.`} : undefined}
            width="100%"
          />
        )}
        <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
          <Text type="supporting">{`Showing: ${resolved.summary}`}</Text>
          {!resolved.isAll && (
            <Button label="Show everything" variant="ghost" size="sm" onClick={() => onChange({mode: view.mode, columns: [], range: ''})} />
          )}
        </HStack>
      </VStack>
    </Card>
  );
}

/* ---------- Page ---------- */

export function TicketPage({id, onApprove}: {id: number; onApprove: (id: number) => void}) {
  const t = TICKETS[id];
  const toast = useToast();
  const [inputSheet, setInputSheet] = useState(t.inputs[0].sheet);
  const [outputSheet, setOutputSheet] = useState(t.outputs[0].sheet);
  const [uploadedSheets, setUploadedSheets] = useState<[string, Sheet][]>([]);
  const [views, setViews] = useState<Record<string, SheetView>>({});
  const viewFor = (name: string): SheetView => views[name] ?? {mode: 'columns', columns: [], range: ''};
  const [engine, setEngine] = useState('python');
  const [instructions, setInstructions] = useState(t.instructions);
  const [connections, setConnections] = useState(t.connections);
  const [isApproved, setIsApproved] = useState(t.status === 'done');
  const [upload, setUpload] = useState<File | null>(null);

  const preview = (what: string) => toast({body: `Preview only. ${what} comes with the real build.`});
  const status = isApproved ? 'done' : t.status;
  const inputSheets: [string, Sheet][] = [
    ...Object.entries(t.sheets).filter(([, s]) => s.kind === 'Input'),
    ...uploadedSheets,
  ];
  const outputSheets = Object.entries(t.sheets).filter(([, s]) => s.kind === 'Output');

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
            <BreadcrumbItem href="#home">{t.workflow}</BreadcrumbItem>
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
                  <Text type="supporting">{`${t.position} in ${t.workflow}`}</Text>
                </HStack>
                <Heading level={1} textWrap="balance">{t.step}</Heading>
                <Text type="supporting">
                  {isApproved && t.status !== 'done' ? 'Approved just now. The next step will use this output.' : t.ran}
                </Text>
              </VStack>
              <HStack gap={2} wrap="wrap">
                <Button label={t.isDraft ? 'Run step' : 'Run again'} icon={<Icon icon={RotateCcw} />} onClick={() => preview('Running steps')} />
                {t.canApprove && !isApproved && (
                  <Button
                    label="Approve output"
                    variant="primary"
                    icon={<Icon icon={Check} />}
                    onClick={() => {
                      setIsApproved(true);
                      onApprove(id);
                      toast({body: `Approved. ${t.outputs[0].feedsInto?.map(f => f[1]).join(' and ') ?? 'The next step'} will use this output.`});
                    }}
                  />
                )}
              </HStack>
            </HStack>

            {t.banner && !isApproved && (
              <Banner status={t.banner.status} title={t.banner.title} description={t.banner.description} collapsible={false} />
            )}

            {/* Inputs and output on the left, instructions on the right */}
            <Grid columns={{minWidth: 380, repeat: 'fit'}} gap={3} align="start">
              <VStack gap={3}>
                <Column title="Inputs" count={t.inputs.length}>
                  {t.inputs.map(d => (
                    <DataCard key={d.name} data={d} isSelected={inputSheet === d.sheet} onSelect={() => setInputSheet(d.sheet)} />
                  ))}
                </Column>
                <Column title="Output">
                  {t.outputs.map(d => (
                    <DataCard key={d.name} data={d} isSelected={outputSheet === d.sheet} onSelect={() => setOutputSheet(d.sheet)} />
                  ))}
                  {t.outputs.map(d => (
                    <ShowPicker key={`${d.sheet}-show`} sheet={t.sheets[d.sheet]} view={viewFor(d.sheet)} onChange={v => setViews(prev => ({...prev, [d.sheet]: v}))} />
                  ))}
                </Column>
              </VStack>

              <Card variant="muted" padding={3}>
                <VStack gap={4}>
                  <Text type="label" color="secondary">Instructions to the agent</Text>
                  <TextArea label="What should happen to the inputs?" value={instructions} onChange={setInstructions} rows={5} />
                  <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
                    <HStack gap={2} vAlign="center">
                      <Text type="supporting">Agent writes it as</Text>
                      <SegmentedControl label="Agent writes it as" value={engine} onChange={setEngine} size="sm">
                        <SegmentedControlItem value="python" label="Python" />
                        <SegmentedControlItem value="excel" label="Excel formulas" />
                      </SegmentedControl>
                    </HStack>
                    <Button label="Update and rerun" size="sm" icon={<Icon icon={Sparkles} />} onClick={() => preview('Rerunning')} />
                  </HStack>
                  <Card padding={3}>
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
                  </Card>
                  <Collapsible
                    defaultIsOpen={false}
                    chevronPosition="start"
                    trigger={<Text type="supporting" weight="medium">{engine === 'python' ? 'Show the Python' : 'Show the Excel formulas'}</Text>}>
                    <CodeBlock
                      code={engine === 'python' ? t.python : t.excel}
                      language={engine === 'python' ? 'python' : 'plaintext'}
                      width="100%"
                      size="sm"
                      isWrapped
                    />
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
              </Card>
            </Grid>

            {/* Sheets: inputs and outputs kept apart */}
            <Workbook
              title="Input sheets"
              description="What the agent reads. Upload an Excel to add its sheets here."
              sheets={inputSheets}
              selected={inputSheet}
              onSelect={setInputSheet}
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
                      setUpload(f ?? null);
                      if (f) addUpload(f);
                    }}
                  />
                  <Button label="Download inputs" icon={<Icon icon={Download} />} onClick={() => preview('Download')} />
                </>
              }
            />
            <Workbook
              title="Output sheets"
              description="What the agent writes. Read only; change the instructions to change these."
              sheets={outputSheets}
              selected={outputSheet}
              onSelect={setOutputSheet}
              views={views}
              actions={<Button label="Download output" icon={<Icon icon={Download} />} onClick={() => preview('Download')} />}
            />
            <Text type="supporting" justify="center">Design prototype. Example data. Runs, uploads and downloads are not connected yet.</Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
