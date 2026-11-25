// Example data for the UI prototype. Nothing here is real or saved anywhere.

import type {StatusKey} from '@workspace/astryx-workflows/components/StatusText';

export type Status = 'failed' | 'review' | 'stale' | 'draft' | 'done';
export type RefKind = 'workflow' | 'step' | 'dataset' | 'file' | 'connection';

/** A step page's status, as one of the shared statuses (STATUSES), so it reads the same as everywhere else. */
export const STATUS: Record<Status, StatusKey> = {
  failed: 'failed',
  review: 'needsApproval',
  stale: 'stale',
  draft: 'draft',
  done: 'done',
};

/** A task on Home points at a ticket. Everything the row says is read from that ticket. */
export type Task = {id: number; ticketId: number};

export type DataSet = {
  name: string;
  source?: [RefKind, string];
  stats?: string[];
  warning?: string;
  isWarningStale?: boolean;
  emptyNote?: string;
  feedsInto?: [RefKind, string, string][];
  sheet: string;
  /** Set when this input is a handoff from another workflow. */
  handoffId?: string;
};

export type Sheet = {
  kind: 'Input' | 'Output';
  columns?: string[];
  rows?: string[][];
  addedColumns?: number[];
  missingColumns?: number[];
  signedColumns?: number[];
  isEmpty?: boolean;
  /** File the sheet came from, when the user uploaded it. */
  fromFile?: string;
  emptyNote?: string;
};

export type Ticket = {
  workflow: string;
  step: string;
  status: Status;
  ran: string;
  /** When the step finished and the person was notified, as an ISO date and time. */
  finishedAt?: string;
  banner?: {status: 'error' | 'warning'; title: string; description: string};
  inputs: DataSet[];
  instructions: string;
  agentSummary?: string[];
  python: string;
  outputs: DataSet[];
  sheets: Record<string, Sheet>;
  canApprove?: boolean;
  isDraft?: boolean;
};

export const TASKS: Task[] = [{id: 3, ticketId: 3}, {id: 1, ticketId: 1}];

const ORDERS_USD: Sheet = {
  kind: 'Output',
  columns: ['Order ID', 'Date', 'Region', 'Currency', 'Amount', 'Amount (USD)'],
  addedColumns: [5],
  rows: [
    ['SO-48211', '2026-11-09', 'Europe', 'EUR', '1,240.00', '1,344.28'],
    ['SO-48212', '2026-11-09', 'Japan', 'JPY', '182,500', '1,208.15'],
    ['SO-48215', '2026-11-08', 'UK', 'GBP', '860.50', '1,111.34'],
    ['SO-48219', '2026-11-08', 'Europe', 'EUR', '312.00', '337.96'],
    ['SO-48223', '2026-11-10', 'Canada', 'CAD', '2,045.75', '1,487.46'],
    ['SO-48230', '2026-11-10', 'US', 'USD', '975.00', '975.00'],
    ['SO-48236', '2026-11-11', 'UK', 'GBP', '4,120.00', '5,327.16'],
    ['SO-48241', '2026-11-12', 'Europe', 'EUR', '58.90', '64.00'],
  ],
};
const NET_ORDERS: Sheet = {
  kind: 'Input',
  columns: ORDERS_USD.columns!.slice(0, 5),
  rows: ORDERS_USD.rows!.map(r => r.slice(0, 5)),
};

export const TICKETS: Record<number, Ticket> = {
  1: {
    workflow: 'Weekly revenue report', step: 'Combine orders and refunds', status: 'failed', ran: 'Failed Nov 16 at 09:12', finishedAt: '2026-11-16T09:12',
    banner: {status: 'error', title: 'The run failed.', description: "This week's orders file has no Currency column, so the agent can't keep each order's currency for the next step. Ask the sender to add it back, or tell the agent which currency to assume."},
    inputs: [
      {name: 'Orders this week', source: ['connection', 'From connection: SharePoint, Orders this week.xlsx'], stats: ['1,284 rows', '5 columns', 'Received 09:02'], warning: 'Missing column: Currency', sheet: 'Orders this week'},
      {name: 'Refunds this week', source: ['connection', 'From connection: Shopify, Refunds this week'], stats: ['63 rows', '3 columns', 'Synced Mon'], sheet: 'Refunds'},
    ],
    instructions: "Combine this week's orders with refunds. Subtract each refund from its order using the order number. Keep the currency of each order so the next step can convert it to USD.",
    agentSummary: ['Matched 63 refunds to orders by Order ID', 'Subtracted each refund from its order amount', 'Stopped before writing the output: no Currency column to carry forward'],
    python: `orders = read_sheet("Orders this week")\nrefunds = read_sheet("Refunds")\n\nnet = orders.merge(refunds, on="Order ID", how="left")\nnet["Amount"] = net["Amount"] - net["Refund amount"].fillna(0)\nnet = net[["Order ID", "Date", "Region", "Currency", "Amount"]]  # fails: no Currency`,
    outputs: [{name: 'Net orders', emptyNote: 'Not produced. The run stopped before this step finished.', feedsInto: [['step', 'Convert to USD', '#ticket-2']], sheet: 'Net orders'}],
    sheets: {
      'Orders this week': {kind: 'Input', columns: ['Order ID', 'Date', 'Customer', 'Region', 'Amount', 'Currency'], missingColumns: [5], rows: [
        ['SO-48211', '2026-11-09', 'Lindqvist AB', 'Europe', '1,240.00', ''], ['SO-48212', '2026-11-09', 'Tanaka Trading', 'Japan', '182,500', ''],
        ['SO-48215', '2026-11-08', 'Harper & Cole', 'UK', '860.50', ''], ['SO-48219', '2026-11-08', 'Maison Ferrand', 'Europe', '312.00', ''],
        ['SO-48223', '2026-11-10', 'Northpeak Ltd', 'Canada', '2,045.75', ''], ['SO-48230', '2026-11-10', 'Rivera Supply', 'US', '975.00', '']]},
      Refunds: {kind: 'Input', columns: ['Order ID', 'Refund date', 'Refund amount'], rows: [['SO-48215', '2026-11-10', '120.00'], ['SO-48230', '2026-11-11', '975.00'], ['SO-48241', '2026-11-12', '58.90']]},
      'Net orders': {kind: 'Output', isEmpty: true},
    },
  },
  2: {
    workflow: 'Weekly revenue report', step: 'Convert to USD', status: 'done', ran: 'Finished Nov 9 at 08:18', finishedAt: '2026-11-09T08:18',
    inputs: [
      {name: 'Net orders', source: ['step', 'From step: Combine orders and refunds'], stats: ['1,221 rows', '5 columns', "Last week's run"], sheet: 'Net orders'},
      {name: 'Exchange rates', source: ['connection', 'From connection: ECB exchange rates'], stats: ['Daily rates', 'Updated today 06:00'], sheet: 'Exchange rates'},
    ],
    instructions: "Convert every order amount to US dollars using the exchange rate on the order date. If there's no rate for that day, use the most recent earlier rate. Round to 2 decimals.",
    agentSummary: ["Looked up the rate for each order's currency and date", "Used Friday's rate for 37 weekend orders", 'Added one new column: Amount (USD)'],
    python: `orders = read_sheet("Net orders").sort_values("Date")\nrates = read_sheet("Exchange rates").sort_values("Date")\n\nout = pd.merge_asof(orders, rates, on="Date", by="Currency",\n                    direction="backward")\nout["Amount (USD)"] = (out["Amount"] * out["Rate to USD"]).round(2)\nwrite_sheet("Orders in USD", out.drop(columns="Rate to USD"))`,
    outputs: [{name: 'Orders in USD', stats: ['1,221 rows', '6 columns', '+1 column vs input'], feedsInto: [['step', 'Revenue by region', '#workflow-2'], ['workflow', 'Monthly sales close', '#workflow-1']], sheet: 'Orders in USD'}],
    sheets: {
      'Net orders': NET_ORDERS,
      'Exchange rates': {kind: 'Input', columns: ['Date', 'Currency', 'Rate to USD'], rows: [['2026-11-06', 'EUR', '1.0832'], ['2026-11-06', 'GBP', '1.2915'], ['2026-11-09', 'EUR', '1.0841'], ['2026-11-09', 'JPY', '0.00662'], ['2026-11-10', 'CAD', '0.7271'], ['2026-11-11', 'GBP', '1.2930'], ['2026-11-12', 'EUR', '1.0866']]},
      'Orders in USD': ORDERS_USD,
    },
  },
  3: {
    workflow: 'Monthly sales close', step: 'Sales summary for Finance', status: 'review', ran: 'Agent finished at 08:30', finishedAt: '2026-11-02T08:30',
    inputs: [
      {name: 'Orders in USD', source: ['step', 'From step: Convert to USD (October)'], stats: ['5,402 rows', '6 columns'], sheet: 'Orders in USD'},
      {name: 'Sales targets', source: ['connection', 'From connection: Google Drive, FY26 targets.xlsx'], stats: ['60 rows', '3 columns', 'Edited Oct 2'], sheet: 'Targets'},
      {name: 'Total revenue (USD)', sheet: '', handoffId: 'h-total-usd'},
    ],
    instructions: "Total October sales by region. Show each region's target and the difference in dollars and percent. Sort by the biggest miss first.",
    agentSummary: ['Totaled 5,402 orders into 5 regions', 'Matched each region to its October target', 'Sorted by gap, biggest shortfall first'],
    python: `orders = read_sheet("Orders in USD")\ntargets = read_sheet("Targets").query("Month == 'Oct'")\n\nsales = orders.groupby("Region")["Amount (USD)"].sum().rename("Sales (USD)")\nout = targets.join(sales, on="Region")\nout["Gap"] = out["Sales (USD)"] - out["Target"]\nout["Gap %"] = out["Gap"] / out["Target"]\nwrite_sheet("October summary", out.sort_values("Gap"))`,
    outputs: [{name: 'October summary', stats: ['5 rows', '5 columns'], feedsInto: [['connection', 'Slack: #finance-close', '#home'], ['file', 'Google Drive: Finance close pack', '#home']], sheet: 'October summary'}],
    sheets: {
      'Orders in USD': {...ORDERS_USD, kind: 'Input', addedColumns: []},
      Targets: {kind: 'Input', columns: ['Region', 'Month', 'Target (USD)'], rows: [['US', 'Oct', '1,850,000'], ['Europe', 'Oct', '1,240,000'], ['UK', 'Oct', '610,000'], ['Japan', 'Oct', '420,000'], ['Canada', 'Oct', '300,000']]},
      'October summary': {kind: 'Output', columns: ['Region', 'Sales (USD)', 'Target', 'Gap', 'Gap %'], addedColumns: [1, 3, 4], signedColumns: [3, 4], rows: [
        ['Europe', '1,121,480', '1,240,000', '-118,520', '-9.6%'], ['US', '1,792,300', '1,850,000', '-57,700', '-3.1%'], ['Japan', '401,950', '420,000', '-18,050', '-4.3%'],
        ['Canada', '311,200', '300,000', '+11,200', '+3.7%'], ['UK', '655,870', '610,000', '+45,870', '+7.5%']]},
    },
    canApprove: true,
  },

  // Monthly sales close, run of Nov 2 (October). Steps 1 and 2 finished; Step 3 waits for approval (ticket 3).
  5: {
    workflow: 'Monthly sales close', step: 'Collect last month’s orders', status: 'done', ran: 'Finished Nov 2 at 08:06', finishedAt: '2026-11-02T08:06',
    inputs: [
      {name: 'Orders, last month', source: ['connection', 'From connection: Shopify, Orders, last month'], stats: ['5,402 rows', '5 columns', 'Synced Nov 2, 08:01'], sheet: 'Shopify orders'},
    ],
    instructions: 'Pull every order placed last month, with its region and currency.',
    agentSummary: ['Kept every order placed in October: 5,402', 'Kept each order’s region and currency', '1,968 orders are in other currencies, for Step 2 to convert'],
    python: `orders = read_app("Shopify", "Orders, last month")\norders = orders[["Order ID", "Date", "Region", "Currency", "Amount"]]\nwrite_sheet("Orders this month", orders)`,
    outputs: [{name: 'Orders this month', stats: ['5,402 rows', '5 columns'], feedsInto: [['step', 'Convert to USD', '#ticket-6']], sheet: 'Orders this month'}],
    sheets: {
      'Shopify orders': {kind: 'Input', columns: ['Order ID', 'Date', 'Region', 'Currency', 'Amount'], rows: [['SO-47102', '2026-10-01', 'Europe', 'EUR', '1,120.00'], ['SO-47103', '2026-10-01', 'US', 'USD', '640.00'], ['SO-47109', '2026-10-02', 'Japan', 'JPY', '98,400'], ['SO-47115', '2026-10-02', 'UK', 'GBP', '455.20'], ['SO-47121', '2026-10-03', 'Canada', 'CAD', '1,310.00']]},
      'Orders this month': {kind: 'Output', columns: ['Order ID', 'Date', 'Region', 'Currency', 'Amount'], rows: [['SO-47102', '2026-10-01', 'Europe', 'EUR', '1,120.00'], ['SO-47103', '2026-10-01', 'US', 'USD', '640.00'], ['SO-47109', '2026-10-02', 'Japan', 'JPY', '98,400'], ['SO-47115', '2026-10-02', 'UK', 'GBP', '455.20'], ['SO-47121', '2026-10-03', 'Canada', 'CAD', '1,310.00']]},
    },
  },
  6: {
    workflow: 'Monthly sales close', step: 'Convert to USD', status: 'done', ran: 'Finished Nov 2 at 08:14', finishedAt: '2026-11-02T08:14',
    inputs: [
      {name: 'Orders this month', source: ['step', 'From step: Collect last month’s orders'], stats: ['5,402 rows', '5 columns'], sheet: 'Orders this month'},
      {name: 'Daily rates', source: ['connection', 'From connection: ECB exchange rates'], stats: ['31 days × 4 currencies', 'Updated Nov 2, 06:00'], sheet: 'Rates'},
    ],
    instructions: 'Convert each order to US dollars using the exchange rate on its order date.',
    agentSummary: ['Looked up the rate for each order’s currency and date', 'Used Friday’s rate for 412 weekend orders', 'Added one column: Amount (USD)'],
    python: `orders = read_sheet("Orders this month").sort_values("Date")\nrates = read_app("ECB exchange rates", "Daily rates").sort_values("Date")\n\nout = pd.merge_asof(orders, rates, on="Date", by="Currency", direction="backward")\nout["Amount (USD)"] = (out["Amount"] * out["Rate to USD"]).round(2)\nwrite_sheet("Orders in USD", out.drop(columns="Rate to USD"))`,
    outputs: [{name: 'Orders in USD', stats: ['5,402 rows', '6 columns', '+1 column vs input'], feedsInto: [['step', 'Sales summary for Finance', '#ticket-3']], sheet: 'Orders in USD (October)'}],
    sheets: {
      'Orders this month': {kind: 'Input', columns: ['Order ID', 'Date', 'Region', 'Currency', 'Amount'], rows: [['SO-47102', '2026-10-01', 'Europe', 'EUR', '1,120.00'], ['SO-47103', '2026-10-01', 'US', 'USD', '640.00'], ['SO-47109', '2026-10-02', 'Japan', 'JPY', '98,400']]},
      Rates: {kind: 'Input', columns: ['Date', 'Currency', 'Rate to USD'], rows: [['2026-10-01', 'EUR', '1.0840'], ['2026-10-01', 'JPY', '0.00662'], ['2026-10-02', 'GBP', '1.2891']]},
      'Orders in USD (October)': {kind: 'Output', columns: ['Order ID', 'Date', 'Region', 'Currency', 'Amount', 'Amount (USD)'], addedColumns: [5], rows: [['SO-47102', '2026-10-01', 'Europe', 'EUR', '1,120.00', '1,214.08'], ['SO-47103', '2026-10-01', 'US', 'USD', '640.00', '640.00'], ['SO-47109', '2026-10-02', 'Japan', 'JPY', '98,400', '651.42']]},
    },
  },
  // Weekly revenue report, run of Nov 9 (week of Nov 2), the last time Steps 2 to 4 ran. Step 1 stopped on
  // Nov 16 (ticket 1), so these steps didn't run that week.
  7: {
    workflow: 'Weekly revenue report', step: 'Revenue by region', status: 'done', ran: 'Finished Nov 9 at 08:22', finishedAt: '2026-11-09T08:22',
    inputs: [
      {name: 'Orders in USD', source: ['step', 'From step: Convert to USD'], stats: ['1,221 rows', '6 columns'], sheet: 'Orders in USD'},
    ],
    instructions: 'Total the week’s USD revenue for each region.',
    agentSummary: ['Totaled Amount (USD) for each of the 5 regions', 'Every order had a region, so none were left out'],
    python: `orders = read_sheet("Orders in USD")\nby_region = orders.groupby("Region")["Amount (USD)"].sum().round(2)\nwrite_sheet("Revenue by region", by_region.reset_index())`,
    outputs: [{name: 'Revenue by region', stats: ['5 rows', '2 columns'], feedsInto: [['step', 'Total revenue', '#ticket-8']], sheet: 'Revenue by region'}],
    sheets: {
      'Orders in USD': {...ORDERS_USD, kind: 'Input', addedColumns: []},
      'Revenue by region': {kind: 'Output', columns: ['Region', 'Amount (USD)'], rows: [['US', '402,180.00'], ['Europe', '251,940.00'], ['UK', '146,300.00'], ['Canada', '118,520.00'], ['Japan', '93,510.00']]},
    },
  },
  8: {
    workflow: 'Weekly revenue report', step: 'Total revenue', status: 'done', ran: 'Finished Nov 9 at 08:23', finishedAt: '2026-11-09T08:23',
    inputs: [
      {name: 'Revenue by region', source: ['step', 'From step: Revenue by region'], stats: ['5 rows', '2 columns'], sheet: 'Revenue by region'},
    ],
    instructions: 'Add up all regions into one total revenue figure in USD.',
    agentSummary: ['Added up all five regions: $1,012,450.00', 'Shared it with Monthly sales close as Total revenue (USD)'],
    python: `by_region = read_sheet("Revenue by region")\ntotal = round(by_region["Amount (USD)"].sum(), 2)\nwrite_value("Total revenue (USD)", total)`,
    outputs: [{name: 'Total revenue (USD)', stats: ['1 value'], feedsInto: [['workflow', 'Monthly sales close', '#workflow-1']], sheet: 'Total revenue (USD)'}],
    sheets: {
      'Revenue by region': {kind: 'Input', columns: ['Region', 'Amount (USD)'], rows: [['US', '402,180.00'], ['Europe', '251,940.00'], ['UK', '146,300.00'], ['Canada', '118,520.00'], ['Japan', '93,510.00']]},
      'Total revenue (USD)': {kind: 'Output', columns: ['Total revenue (USD)'], rows: [['1,012,450.00']]},
    },
  },
  // At-risk account follow-ups. Step 1 couldn't run on Nov 16: Marco Ruiz’s Pipeline health check didn't
  // produce its at-risk accounts. Step 2 last ran on Nov 9.
  9: {
    workflow: 'At-risk account follow-ups', step: 'Add amounts owed', status: 'failed', ran: 'Couldn’t run Nov 16 at 08:00', finishedAt: '2026-11-16T08:00',
    banner: {status: 'error', title: 'This step couldn’t run.', description: 'Marco Ruiz’s Pipeline health check failed on Nov 16 at 07:40, so the at-risk accounts it shares with you were never produced. Ask Marco to check his workflow, then run this step again.'},
    inputs: [
      {name: 'At-risk accounts', source: ['dataset', 'Shared with you: Marco Ruiz’s Pipeline health check'], stats: ['0 rows', 'Last ready Nov 9, 07:40'], warning: 'Not produced on Nov 16', sheet: 'At-risk accounts'},
      {name: 'Orders, last month', source: ['connection', 'From connection: Shopify, Orders, last month'], stats: ['5,118 rows', 'Not read this run'], sheet: 'Shopify orders'},
    ],
    instructions: 'Match each at-risk account to its orders from last month and add the amount it still owes.',
    agentSummary: ['Waited for At-risk accounts from Pipeline health check', 'Stopped before reading orders: there were no accounts to match'],
    python: `accounts = read_shared("Pipeline health check", "At-risk accounts")\norders = read_app("Shopify", "Orders, last month")\nowed = orders[orders["Status"] != "Paid"].groupby("Account")["Amount"].sum().rename("Owed")\nwrite_sheet("At-risk accounts with amounts owed", accounts.join(owed, on="Account").fillna({"Owed": 0}))`,
    outputs: [{name: 'At-risk accounts with amounts owed', emptyNote: 'Not produced. This step couldn’t run without the at-risk accounts.', feedsInto: [['step', 'Follow-up list for Finance', '#ticket-10']], sheet: 'Accounts with amounts owed'}],
    sheets: {
      'At-risk accounts': {kind: 'Input', isEmpty: true, emptyNote: 'Pipeline health check failed before it produced this.'},
      'Shopify orders': {kind: 'Input', columns: ['Order ID', 'Account', 'Status', 'Amount'], rows: [['SO-46810', 'Bluefin Logistics', 'Unpaid', '71,200.00'], ['SO-46833', 'Northwind Traders', 'Unpaid', '48,950.00'], ['SO-46851', 'Harbor Health', 'Unpaid', '39,300.00']]},
      'Accounts with amounts owed': {kind: 'Output', isEmpty: true},
    },
  },
  10: {
    workflow: 'At-risk account follow-ups', step: 'Follow-up list for Finance', status: 'done', ran: 'Finished Nov 9 at 08:12', finishedAt: '2026-11-09T08:12',
    inputs: [
      {name: 'At-risk accounts with amounts owed', source: ['step', 'From step: Add amounts owed'], stats: ['5 rows', '4 columns', 'Run of Nov 9'], sheet: 'Accounts with amounts owed'},
    ],
    instructions: 'Rank the accounts by amount owed and write one line on why each is at risk.',
    agentSummary: ['Ranked 5 accounts by amount owed, highest first', 'Wrote one line on why each is at risk', 'Kept each account owner for Finance to call'],
    python: `accounts = read_sheet("At-risk accounts with amounts owed").sort_values("Owed", ascending=False)\naccounts["Why"] = accounts.apply(lambda a: f"{a['Signal']}, owes {a['Owed']:,.0f}", axis=1)\nwrite_sheet("Follow-up list", accounts[["Account", "Owner", "Owed", "Why"]])`,
    outputs: [{name: 'Follow-up list', stats: ['5 rows', '4 columns'], feedsInto: [['connection', 'Slack: #finance-close', '#home']], sheet: 'Follow-up list'}],
    sheets: {
      'Accounts with amounts owed': {kind: 'Input', columns: ['Account', 'Owner', 'Signal', 'Owed'], rows: [['Bluefin Logistics', 'Sam Okafor', 'Renewal in 14 days, no reply', '71,200'], ['Northwind Traders', 'Ana Lopez', 'Usage down 60% in 30 days', '48,950'], ['Harbor Health', 'Lee Tanaka', 'Invoice 45 days overdue', '39,300']]},
      'Follow-up list': {kind: 'Output', columns: ['Account', 'Owner', 'Owed', 'Why'], addedColumns: [3], rows: [['Bluefin Logistics', 'Sam Okafor', '71,200', 'Renewal in 14 days, no reply, owes 71,200'], ['Northwind Traders', 'Ana Lopez', '48,950', 'Usage down 60% in 30 days, owes 48,950'], ['Harbor Health', 'Lee Tanaka', '39,300', 'Invoice 45 days overdue, owes 39,300']]},
    },
  },
};


/** The condition of a ticket. Home's board turns it into a lane and wording. */
export type TicketCondition = 'needsApproval' | 'complete' | 'missingData' | 'notRun';

/**
 * Reads a ticket's condition from its own contents, in this order:
 * an input with a warning, a missing column or no rows means missing data; an approved step ran completely;
 * a step waiting for approval needs approval; anything else has not run yet.
 */
export function ticketCondition(t: Ticket, isApproved: boolean): TicketCondition {
  const inputGap = t.inputs.some(i => {
    const sheet = t.sheets[i.sheet];
    return !!i.warning || !!sheet?.isEmpty || !!sheet?.missingColumns?.length;
  });
  if (inputGap) return 'missingData';
  if (isApproved || t.status === 'done') return 'complete';
  if (t.canApprove) return 'needsApproval';
  return 'notRun';
}
