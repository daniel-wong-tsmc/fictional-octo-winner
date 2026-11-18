// Handoffs: named values a step passes on for other workflows to use.
// A handoff is saved by meaning (column name, a row's key, a total), never by
// cell position, because rows move and grow between runs.

import type {Sheet} from './data';

export type HandoffRule =
  | {kind: 'column'; column: string}
  | {kind: 'sum'; column: string}
  | {kind: 'count'}
  | {kind: 'rowsWhere'; column: string; equals: string}
  | {kind: 'row'; keyColumn: string; key: string}
  | {kind: 'cell'; column: string; keyColumn: string; key: string};

export type CheckKind = 'none' | 'notEmpty' | 'positive' | 'atLeastOneRow' | 'fresh';

export type Handoff = {
  id: string;
  name: string;
  /** Ticket that produces it. */
  ticketId: number;
  workflow: string;
  rule: HandoffRule;
  /** Value from the last full run. Handoffs made in the prototype compute from sample rows instead. */
  value?: string;
  check: CheckKind;
  /** Set when the last run failed the check. */
  checkFailure?: string;
  usedBy: string[];
};

export type Pick =
  | {kind: 'column'; col: number}
  | {kind: 'row'; row: number}
  | {kind: 'cell'; col: number; row: number};

export const CHECK_LABEL: Record<CheckKind, string> = {
  none: 'No check',
  notEmpty: 'Is not empty',
  positive: 'Is a number above 0',
  atLeastOneRow: 'Has at least 1 row',
  fresh: 'Data is less than 2 days old',
};

export type ValueShape = 'One value' | 'A column' | 'Some rows' | 'One row';

export function shapeOf(rule: HandoffRule): ValueShape {
  switch (rule.kind) {
    case 'sum': case 'count': case 'cell': return 'One value';
    case 'column': return 'A column';
    case 'rowsWhere': return 'Some rows';
    case 'row': return 'One row';
  }
}

/** The rule in plain words, shown to the user to confirm. */
export function describeRule(rule: HandoffRule): string {
  switch (rule.kind) {
    case 'column': return `The column "${rule.column}"`;
    case 'sum': return `Sum of ${rule.column}`;
    case 'count': return 'Number of rows';
    case 'rowsWhere': return `Rows where ${rule.column} is ${rule.equals}`;
    case 'row': return `The row where ${rule.keyColumn} is ${rule.key}`;
    case 'cell': return `${rule.column} in the row where ${rule.keyColumn} is ${rule.key}`;
  }
}

const toNumber = (v: string) => Number(v.replace(/[,+%]/g, ''));
const isNumeric = (v: string) => /^[+-]?[\d,]+(\.\d+)?%?$/.test(v);
const fmt = (n: number) => n.toLocaleString(undefined, {maximumFractionDigits: 2});

/** Value computed from the sample rows in the prototype. */
export function previewValue(rule: HandoffRule, sheet: Sheet): string {
  const cols = sheet.columns ?? [];
  const rows = sheet.rows ?? [];
  const idx = (name: string) => cols.indexOf(name);
  switch (rule.kind) {
    case 'column': return `${rows.length} values`;
    case 'sum': return fmt(rows.reduce((t, r) => t + toNumber(r[idx(rule.column)]), 0));
    case 'count': return `${rows.length}`;
    case 'rowsWhere': return `${rows.filter(r => r[idx(rule.column)] === rule.equals).length} rows`;
    case 'row': return '1 row';
    case 'cell': {
      const r = rows.find(row => row[idx(rule.keyColumn)] === rule.key);
      return r ? r[idx(rule.column)] : 'Not found';
    }
  }
}

/**
 * Turns a click in the output sheet into rules saved by meaning.
 * The first option is the recommended one.
 */
export function rulesForPick(pick: Pick, sheet: Sheet): {rule: HandoffRule; suggestedName: string}[] {
  const cols = sheet.columns ?? [];
  const rows = sheet.rows ?? [];
  const keyColumn = cols[0];
  const numericCol = (c: number) => rows.length > 0 && rows.every(r => isNumeric(r[c]));
  // Text columns with repeated values make good "rows where" filters (Region, Currency).
  const groupCols = cols
    .map((name, c) => ({name, c}))
    .filter(({c}) => c > 0 && !numericCol(c) && new Set(rows.map(r => r[c])).size < rows.length);

  if (pick.kind === 'column') {
    const name = cols[pick.col];
    const out: {rule: HandoffRule; suggestedName: string}[] = [];
    if (numericCol(pick.col)) out.push({rule: {kind: 'sum', column: name}, suggestedName: `Total ${name}`});
    out.push({rule: {kind: 'column', column: name}, suggestedName: name});
    return out;
  }
  const row = rows[pick.row - 2];
  const key = row[0];
  if (pick.kind === 'row') {
    return [
      {rule: {kind: 'row', keyColumn, key}, suggestedName: `${keyColumn} ${key}`},
      ...groupCols.map(({name, c}) => ({
        rule: {kind: 'rowsWhere' as const, column: name, equals: row[c]},
        suggestedName: `${row[c]} rows`,
      })),
    ];
  }
  const colName = cols[pick.col];
  const out: {rule: HandoffRule; suggestedName: string}[] = [];
  if (pick.col > 0) out.push({rule: {kind: 'cell', column: colName, keyColumn, key}, suggestedName: `${colName} for ${key}`});
  if (numericCol(pick.col)) out.push({rule: {kind: 'sum', column: colName}, suggestedName: `Total ${colName}`});
  if (pick.col > 0 && !numericCol(pick.col) && groupCols.some(g => g.c === pick.col)) {
    out.push({rule: {kind: 'rowsWhere', column: colName, equals: row[pick.col]}, suggestedName: `${row[pick.col]} rows`});
  }
  if (!out.length) out.push({rule: {kind: 'row', keyColumn, key}, suggestedName: `${keyColumn} ${key}`});
  return out;
}

export function checksFor(rule: HandoffRule): CheckKind[] {
  switch (shapeOf(rule)) {
    case 'One value': return rule.kind === 'sum' || rule.kind === 'count' ? ['positive', 'notEmpty', 'fresh', 'none'] : ['notEmpty', 'fresh', 'none'];
    case 'Some rows': return ['atLeastOneRow', 'fresh', 'none'];
    default: return ['notEmpty', 'fresh', 'none'];
  }
}

export const SEED_HANDOFFS: Handoff[] = [
  {
    id: 'h-total-usd', name: 'Total revenue (USD)', ticketId: 2, workflow: 'Weekly revenue report',
    rule: {kind: 'sum', column: 'Amount (USD)'}, value: '1,482,906.17', check: 'positive',
    usedBy: ['Monthly sales close'],
  },
  {
    id: 'h-europe', name: 'Europe orders', ticketId: 2, workflow: 'Weekly revenue report',
    rule: {kind: 'rowsWhere', column: 'Region', equals: 'Europe'}, value: '412 rows', check: 'atLeastOneRow',
    usedBy: [],
  },
  {
    id: 'h-gap', name: 'October gap to target', ticketId: 3, workflow: 'Monthly sales close',
    rule: {kind: 'sum', column: 'Gap'}, value: '-137,200', check: 'notEmpty',
    usedBy: ['Google Drive: Finance close pack'],
  },
  {
    id: 'h-low-stock', name: 'Low-stock item count', ticketId: 5, workflow: 'Inventory snapshot',
    rule: {kind: 'count'}, value: '41', check: 'fresh',
    checkFailure: 'The stock data is 3 days old.',
    usedBy: ['Q1 forecast'],
  },
];
