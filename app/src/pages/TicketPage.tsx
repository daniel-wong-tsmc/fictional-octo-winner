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

function SheetTable({sheet}: {sheet: Sheet}) {
  if (sheet.isEmpty || !sheet.columns || !sheet.rows) {
    return (
      <VStack padding={8} hAlign="center" gap={1}>
        <Icon icon={FileSpreadsheet} color="secondary" />
        <Text type="supporting">This sheet fills in when the step runs.</Text>
      </VStack>
    );
  }
  const added = sheet.addedColumns ?? [];
  const missing = sheet.missingColumns ?? [];
  const data: Row[] = sheet.rows.map((r, i) => {
    const row: Row = {_row: i + 2};
    r.forEach((v, c) => (row[`c${c}`] = v));
    return row;
  });
  const columns: TableColumn<Row>[] = [
    {key: '_row', header: <Text type="supporting">1</Text>, width: pixel(44), align: 'end',
      renderCell: item => <Text type="supporting" hasTabularNumbers>{item._row}</Text>},
    ...sheet.columns.map((name, c): TableColumn<Row> => ({
      key: `c${c}`,
      align: isNumeric(sheet.rows![0][c]) ? 'end' : 'start',
      header: (
        <VStack gap={0}>
          <Text type="supporting">{String.fromCharCode(65 + c)}</Text>
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

/* ---------- Page ---------- */

export function TicketPage({id, onApprove}: {id: number; onApprove: (id: number) => void}) {
  const t = TICKETS[id];
  const toast = useToast();
  const firstSheet = t.outputs[0].emptyNote ? t.inputs[0].sheet : t.outputs[0].sheet;
  const [sheet, setSheet] = useState(firstSheet);
  const [engine, setEngine] = useState('python');
  const [instructions, setInstructions] = useState(t.instructions);
  const [connections, setConnections] = useState(t.connections);
  const [isApproved, setIsApproved] = useState(t.status === 'done');
  const [upload, setUpload] = useState<File | null>(null);

  const preview = (what: string) => toast({body: `Preview only. ${what} comes with the real build.`});
  const status = isApproved ? 'done' : t.status;
  const fileName = `${t.step.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}.xlsx`;

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

            {/* Inputs → instructions → output */}
            <Grid columns={{minWidth: 300, repeat: 'fit'}} gap={3} align="start">
              <Column title="Inputs" count={t.inputs.length}>
                {t.inputs.map(d => (
                  <DataCard key={d.name} data={d} isSelected={sheet === d.sheet} onSelect={() => setSheet(d.sheet)} />
                ))}
              </Column>

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

              <Column title="Output">
                {t.outputs.map(d => (
                  <DataCard key={d.name} data={d} isSelected={sheet === d.sheet} onSelect={() => setSheet(d.sheet)} />
                ))}
              </Column>
            </Grid>

            {/* Workbook */}
            <Card padding={0}>
              <VStack>
                <HStack gap={3} padding={3} vAlign="center" hAlign="between" wrap="wrap">
                  <HStack gap={2} vAlign="center">
                    <Icon icon={FileSpreadsheet} color="success" />
                    <VStack gap={0}>
                      <Text weight="medium">{fileName}</Text>
                      <Text type="supporting">
                        {upload ? `You uploaded ${upload.name} just now` : `${Object.keys(t.sheets).length} sheets: inputs and output in one workbook`}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack gap={2}>
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
                        if (f) toast({body: `Received ${f.name}. In the real build this replaces the matching input sheet.`});
                      }}
                    />
                    <Button label="Download" icon={<Icon icon={Download} />} onClick={() => preview('Download')} />
                  </HStack>
                </HStack>
                <TabList value={sheet} onChange={setSheet} size="sm" hasDivider>
                  {Object.entries(t.sheets).map(([name, s]) => (
                    <Tab key={name} value={name} label={name} endContent={<Text type="supporting">{s.kind}</Text>} />
                  ))}
                </TabList>
                <SheetTable sheet={t.sheets[sheet]} />
                <HStack gap={4} padding={3} wrap="wrap">
                  <Text type="supporting">
                    {t.sheets[sheet].rows ? `Showing ${t.sheets[sheet].rows!.length} sample rows` : 'No rows yet'}
                  </Text>
                  {!!t.sheets[sheet].addedColumns?.length && (
                    <HStack gap={1.5} vAlign="center">
                      <StatusDot variant="info" label="Added by the agent" />
                      <Text type="supporting">Column added by the agent</Text>
                    </HStack>
                  )}
                </HStack>
              </VStack>
            </Card>
            <Text type="supporting" justify="center">Design prototype. Example data. Runs, uploads and downloads are not connected yet.</Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
