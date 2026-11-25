// What happened on each tile in each past run of a prefilled workflow: how it went, the numbers it worked
// with, what the agent did, and a few rows of what it made. A workflow page's Recent runs opens a run on the
// board (#workflow-N-run-K, K counting from the newest run, 0), and the board reads it from here.
// Keyed by workflow id, then by run period, then by tile id as boardFromWorkflow names tiles:
// a step's id (s1), its inputs (s1-in-0) and the Handoff ('out').

import type {StatusKey} from '@workspace/astryx-workflows/components/StatusText';

export type TileRunStatus = 'done' | 'review' | 'failed' | 'notRun' | 'sent' | 'waiting';

export type TileRunDetail = {
  status: TileRunStatus;
  /** The numbers it worked with, label then value, such as ['Rows in', '5,402']. */
  numbers?: [string, string][];
  /** What the agent did, in its own short lines. */
  did?: string[];
  /** Why it failed, or why it didn't run. */
  problem?: string;
  /** A few rows of what it made. */
  output?: {columns: string[]; rows: string[][]; total: string};
  /**
   * The step page for this run, when this is the run the page shows (each LLM step's latest run). On a failed
   * input it is the page of the step the input feeds, so you can go straight to it.
   */
  ticketId?: number;
};

/** How a tile did in a past run, in the shared statuses. A Handoff waiting on a step's approval needs approval too. */
export const TILE_RUN_STATUS: Record<TileRunStatus, StatusKey> = {
  done: 'done',
  review: 'needsApproval',
  failed: 'failed',
  notRun: 'notRun',
  sent: 'sent',
  waiting: 'needsApproval',
};

const notRun = (problem: string): TileRunDetail => ({status: 'notRun', problem});

const MONTHLY_SALES_CLOSE: Record<string, Record<string, TileRunDetail>> = {
  'October 2026': {
    's1-in-0': {status: 'done', numbers: [['Rows read', '5,402'], ['Columns', '5'], ['Synced', 'Nov 2, 08:01']]},
    s1: {
      status: 'done',
      numbers: [['Rows in', '5,402'], ['Rows out', '5,402'], ['Orders in other currencies', '1,968']],
      did: ['Kept every order placed in October', 'Kept each order’s region and currency'],
      output: {columns: ['Order ID', 'Date', 'Region', 'Currency', 'Amount'], rows: [['SO-47102', '2026-10-01', 'Europe', 'EUR', '1,120.00'], ['SO-47103', '2026-10-01', 'US', 'USD', '640.00'], ['SO-47109', '2026-10-02', 'Japan', 'JPY', '98,400']], total: '5,402 rows'},
      ticketId: 5,
    },
    's2-in-0': {status: 'done', numbers: [['Rates read', '31 days × 4 currencies'], ['Updated', 'Nov 2, 06:00']]},
    s2: {
      status: 'done',
      numbers: [['Rows in', '5,402'], ['Rows out', '5,402'], ['Weekend orders using Friday’s rate', '412']],
      did: ['Looked up the rate for each order’s currency and date', 'Added one column: Amount (USD)'],
      output: {columns: ['Order ID', 'Region', 'Amount', 'Amount (USD)'], rows: [['SO-47102', 'Europe', '1,120.00', '1,214.08'], ['SO-47103', 'US', '640.00', '640.00'], ['SO-47109', 'Japan', '98,400', '651.42']], total: '5,402 rows'},
      ticketId: 6,
    },
    's3-in-0': {status: 'done', numbers: [['Rows read', '60'], ['October targets', '5 regions']]},
    's3-in-1': {status: 'done', numbers: [['Value', '$968,920'], ['From run', 'Weekly revenue report, Nov 2']]},
    s3: {
      status: 'review',
      numbers: [['Orders totalled', '5,402'], ['Regions', '5'], ['Below target', '3']],
      did: ['Totaled 5,402 orders into 5 regions', 'Matched each region to its October target', 'Sorted by gap, biggest shortfall first'],
      output: {columns: ['Region', 'Sales (USD)', 'Target', 'Gap %'], rows: [['Europe', '1,121,480', '1,240,000', '-9.6%'], ['US', '1,792,300', '1,850,000', '-3.1%'], ['Japan', '401,950', '420,000', '-4.3%']], total: '5 rows'},
      ticketId: 3,
    },
    out: {status: 'waiting', numbers: [['Rows', '5']], problem: 'Needs your approval on Step 3 before it is sent.'},
  },
  'September 2026': {
    's1-in-0': {status: 'done', numbers: [['Rows read', '5,118'], ['Columns', '5']]},
    s1: {status: 'done', numbers: [['Rows in', '5,118'], ['Rows out', '5,118']], did: ['Kept every order placed in September']},
    's2-in-0': {status: 'done', numbers: [['Rates read', '30 days × 4 currencies']]},
    s2: {status: 'done', numbers: [['Rows in', '5,118'], ['Rows out', '5,118'], ['Weekend orders using Friday’s rate', '389']], did: ['Added one column: Amount (USD)']},
    's3-in-0': {status: 'done', numbers: [['Rows read', '60'], ['September targets', '5 regions']]},
    's3-in-1': {status: 'done', numbers: [['Value', '$941,300']]},
    s3: {
      status: 'done',
      numbers: [['Orders totalled', '5,118'], ['Regions', '5'], ['Below target', '2']],
      did: ['Totaled 5,118 orders into 5 regions', 'Matched each region to its September target', 'Sorted by gap, biggest shortfall first'],
      output: {columns: ['Region', 'Sales (USD)', 'Target', 'Gap %'], rows: [['Japan', '388,200', '410,000', '-5.3%'], ['Europe', '1,198,700', '1,220,000', '-1.7%'], ['US', '1,861,050', '1,820,000', '+2.3%']], total: '5 rows'},
    },
    out: {status: 'sent', numbers: [['Rows', '5'], ['Approved by', 'Daniel, Oct 1 09:12']]},
  },
  'August 2026': {
    's1-in-0': {status: 'done', numbers: [['Rows read', '4,876']]},
    s1: {status: 'done', numbers: [['Rows in', '4,876'], ['Rows out', '4,876']], did: ['Kept every order placed in August']},
    's2-in-0': {status: 'done', numbers: [['Rates read', '31 days × 4 currencies']]},
    s2: {status: 'done', numbers: [['Rows in', '4,876'], ['Rows out', '4,876']], did: ['Added one column: Amount (USD)']},
    's3-in-0': {status: 'done', numbers: [['Rows read', '60'], ['August targets', '5 regions, after the fix']]},
    's3-in-1': {status: 'done', numbers: [['Value', '$912,780']]},
    s3: {
      status: 'done',
      numbers: [['Orders totalled', '4,876'], ['Regions', '5'], ['Runs', '2']],
      did: ['First run failed Sep 1, 08:20: FY26 targets.xlsx had no Japan row for August', 'Priya Shah added the row, and it ran again Sep 2, 14:10', 'Totaled 4,876 orders into 5 regions'],
      output: {columns: ['Region', 'Sales (USD)', 'Target', 'Gap %'], rows: [['Europe', '1,050,900', '1,100,000', '-4.5%'], ['Japan', '372,400', '380,000', '-2.0%'], ['US', '1,702,600', '1,690,000', '+0.7%']], total: '5 rows'},
    },
    out: {status: 'sent', numbers: [['Rows', '5'], ['Approved by', 'Daniel, Sep 2 14:40']]},
  },
};

const WEEKLY_REVENUE_REPORT: Record<string, Record<string, TileRunDetail>> = {
  'Week of Nov 9': {
    'w1-in-0': {status: 'failed', numbers: [['Rows read', '1,284'], ['Columns', '5 (6 expected)']], problem: 'The orders file has no Currency column.', ticketId: 1},
    'w1-in-1': {status: 'done', numbers: [['Rows read', '63'], ['Columns', '3']]},
    w1: {
      status: 'failed',
      numbers: [['Orders in', '1,284'], ['Refunds in', '63'], ['Refunds matched', '63'], ['Rows out', '0']],
      did: ['Matched 63 refunds to orders by Order ID', 'Subtracted each refund from its order amount', 'Failed before writing the output: no Currency column to carry forward'],
      problem: 'This week’s orders file has no Currency column, so the agent can’t keep each order’s currency for the next step.',
      ticketId: 1,
    },
    'w2-in-0': notRun('Step 1 failed, so this wasn’t read.'),
    w2: notRun('Step 1 failed, so this step had nothing to convert.'),
    w3: notRun('Step 1 failed, so this step didn’t run.'),
    w4: notRun('Step 1 failed, so this step didn’t run.'),
    out: notRun('Nothing was sent.'),
  },
  'Week of Nov 2': {
    'w1-in-0': {status: 'done', numbers: [['Rows read', '1,256'], ['Columns', '6']]},
    'w1-in-1': {status: 'done', numbers: [['Rows read', '35']]},
    w1: {status: 'done', numbers: [['Orders in', '1,256'], ['Refunds matched', '35'], ['Rows out', '1,221']], did: ['Matched 35 refunds to orders by Order ID', 'Dropped 35 fully refunded orders'], output: {columns: ['Order ID', 'Region', 'Currency', 'Amount'], rows: [['SO-48211', 'Europe', 'EUR', '1,240.00'], ['SO-48212', 'Japan', 'JPY', '182,500'], ['SO-48215', 'UK', 'GBP', '860.50']], total: '1,221 rows'}},
    'w2-in-0': {status: 'done', numbers: [['Rates read', '7 days × 4 currencies']]},
    w2: {
      status: 'done',
      numbers: [['Rows in', '1,221'], ['Rows out', '1,221'], ['Weekend orders using Friday’s rate', '37']],
      did: ['Looked up the rate for each order’s currency and date', 'Used Friday’s rate for 37 weekend orders', 'Added one new column: Amount (USD)'],
      output: {columns: ['Order ID', 'Currency', 'Amount', 'Amount (USD)'], rows: [['SO-48211', 'EUR', '1,240.00', '1,344.28'], ['SO-48212', 'JPY', '182,500', '1,208.15'], ['SO-48215', 'GBP', '860.50', '1,111.34']], total: '1,221 rows'},
      ticketId: 2,
    },
    w3: {status: 'done', numbers: [['Rows in', '1,221'], ['Regions', '5']], did: ['Totaled Amount (USD) by region'], output: {columns: ['Region', 'Revenue (USD)'], rows: [['US', '402,180'], ['Europe', '251,940'], ['UK', '146,300']], total: '5 rows'}, ticketId: 7},
    w4: {status: 'done', numbers: [['Regions in', '5'], ['Total revenue', '$1,012,450']], did: ['Added up all five regions'], ticketId: 8},
    out: {status: 'sent', numbers: [['Value', '$1,012,450'], ['Approved by', 'Daniel, Nov 9 10:05']]},
  },
  'Week of Oct 26': {
    'w1-in-0': {status: 'done', numbers: [['Rows read', '1,198']]},
    'w1-in-1': {status: 'done', numbers: [['Rows read', '41']]},
    w1: {status: 'done', numbers: [['Orders in', '1,198'], ['Refunds matched', '41'], ['Rows out', '1,157']], did: ['Matched 41 refunds to orders by Order ID']},
    'w2-in-0': {status: 'done', numbers: [['Rates read', '7 days × 4 currencies']]},
    w2: {status: 'done', numbers: [['Rows in', '1,157'], ['Rows out', '1,157']], did: ['Added one new column: Amount (USD)']},
    w3: {status: 'done', numbers: [['Rows in', '1,157'], ['Regions', '5']], did: ['Totaled Amount (USD) by region']},
    w4: {status: 'done', numbers: [['Total revenue', '$968,920']], did: ['Added up all five regions']},
    out: {status: 'sent', numbers: [['Value', '$968,920'], ['Approved by', 'Daniel, Nov 2 09:48']]},
  },
};

const AT_RISK_FOLLOW_UPS: Record<string, Record<string, TileRunDetail>> = {
  'Week of Nov 9': {
    'f1-in-0': {status: 'failed', numbers: [['Rows read', '0']], problem: 'Marco Ruiz’s Pipeline health check failed on Nov 16 at 07:40, so there were no at-risk accounts to read.', ticketId: 9},
    'f1-in-1': notRun('Not read, because the at-risk accounts never arrived.'),
    f1: {...notRun('Couldn’t run: its at-risk accounts weren’t produced. Ask Marco Ruiz to check Pipeline health check.'), ticketId: 9},
    f2: notRun('Step 1 didn’t run, so this step didn’t either.'),
    out: notRun('Nothing was sent.'),
  },
  'Week of Nov 2': {
    'f1-in-0': {status: 'done', numbers: [['Rows read', '5'], ['From', 'Pipeline health check, Nov 9 07:40']]},
    'f1-in-1': {status: 'done', numbers: [['Rows read', '5,402']]},
    f1: {
      status: 'done',
      numbers: [['Accounts in', '5'], ['Orders matched', '214'], ['Amount owed', '$182,640']],
      did: ['Matched each account to its unpaid orders', 'Added Amount owed to each account'],
      output: {columns: ['Account', 'Owner', 'Signal', 'Owed'], rows: [['Bluefin Logistics', 'Sam Okafor', 'Renewal in 14 days, no reply', '$71,200'], ['Northwind Traders', 'Ana Lopez', 'Usage down 60% in 30 days', '$48,950'], ['Harbor Health', 'Lee Tanaka', 'Invoice 45 days overdue', '$39,300']], total: '5 rows'},
    },
    f2: {status: 'done', numbers: [['Accounts in', '5'], ['On the list', '5']], did: ['Ranked accounts by amount owed', 'Added each account owner for follow-up'], ticketId: 10},
    out: {status: 'sent', numbers: [['Rows', '5'], ['Approved by', 'Daniel, Nov 9 08:41']]},
  },
};

export const RUN_DETAILS: Record<number, Record<string, Record<string, TileRunDetail>>> = {
  1: MONTHLY_SALES_CLOSE,
  2: WEEKLY_REVENUE_REPORT,
  4: AT_RISK_FOLLOW_UPS,
};

/**
 * Why a run failed, in a few words: where the first failed tile sits. An Input means the data coming in was
 * wrong or missing, an LLM step means the agent couldn't process it, a Handoff means the result couldn't be
 * sent. The tile itself says exactly what went wrong.
 */
export function failureKind(tiles: Record<string, TileRunDetail>): string | undefined {
  const first = firstFailedTile(tiles);
  if (!first) return undefined;
  return first.includes('-in-') ? 'Data input error' : first === 'out' ? 'Handoff error' : 'LLM processing error';
}

/**
 * The red tile where a run first broke, in run order: a failed Input before a failed LLM step, and those
 * before the Handoff. A failed run opens on it, and failureKind names it.
 */
export function firstFailedTile(tiles: Record<string, TileRunDetail>): string | undefined {
  const failed = Object.keys(tiles).filter(id => tiles[id].status === 'failed');
  return failed.find(id => id.includes('-in-')) ?? failed.find(id => id !== 'out') ?? failed.find(id => id === 'out');
}

/**
 * "Nov 16, 08:00 to 09:12", with both dates when it ran into the next day, or one time when it stopped at once.
 * Both arguments are display strings already formatted as "Nov 16, 08:00" (RunRecord started/finished), not ISO dates,
 * so this splits them on ", " rather than parsing them.
 */
export const ranBetween = (started: string, finished: string) => {
  const [startDay] = started.split(', ');
  const [endDay, endTime] = finished.split(', ');
  if (started === finished) return started;
  return startDay === endDay ? `${started} to ${endTime}` : `${started} to ${finished}`;
};

/** #workflow-1-run-0: the newest run of workflow 1. */
export const runHref = (workflowId: number, index: number) => `#workflow-${workflowId}-run-${index}`;
