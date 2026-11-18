import {Button} from '@astryxdesign/core/Button';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Table, pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {Text} from '@astryxdesign/core/Text';
import {FileSpreadsheet} from 'lucide-react';

/** One sheet of a data set: column names, then rows of text. Column numbers (addedColumns, missingColumns) count from 0. */
export type WorkflowSheet = {
  columns?: string[];
  rows?: string[][];
  /** Columns the agent added. Marked with a dot and shown a little bolder. */
  addedColumns?: number[];
  /** Columns whose values are missing. Each cell says Missing. */
  missingColumns?: number[];
  isEmpty?: boolean;
  /** File the sheet came from, when the user uploaded it. */
  fromFile?: string;
  emptyNote?: string;
};

/** What a person clicked when picking from the sheet. Rows count from 2, since row 1 is the column names. */
export type WorkflowSheetPick =
  | {kind: 'column'; col: number}
  | {kind: 'row'; row: number}
  | {kind: 'cell'; col: number; row: number};

const isNumeric = (v: string) => /^[+-]?[\d,]+(\.\d+)?%?$/.test(v);
const letter = (i: number) => String.fromCharCode(65 + i);

type Row = Record<string, unknown> & {_row: number};

/** A spreadsheet-style table with lettered columns and numbered rows. Read-only, or pickable when onPick is given. */
export function WorkflowSheetTable({sheet, shownColumns, onPick}: {sheet: WorkflowSheet; shownColumns?: string[]; onPick?: (p: WorkflowSheetPick) => void}) {
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
      // A floor wide enough for a full number, so narrow screens scroll the sheet instead of cutting values off.
      width: proportional(1, {minWidth: 104}),
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
