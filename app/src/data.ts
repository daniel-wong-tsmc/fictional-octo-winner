// Example data for the UI prototype. Nothing here is real or saved anywhere.

export type Status = 'failed' | 'review' | 'stale' | 'draft' | 'done';
export type RefKind = 'workflow' | 'step' | 'dataset' | 'file' | 'connection';

export const STATUS: Record<Status, {dot: 'error' | 'warning' | 'info' | 'neutral' | 'success'; label: string}> = {
  failed: {dot: 'error', label: 'Stopped'},
  review: {dot: 'info', label: 'Needs approval'},
  stale: {dot: 'warning', label: 'Out of date'},
  draft: {dot: 'neutral', label: 'Draft'},
  done: {dot: 'success', label: 'Approved'},
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
    workflow: 'Weekly revenue report', step: 'Combine orders and refunds', status: 'failed', ran: 'Stopped Nov 16 at 09:12', finishedAt: '2026-11-16T09:12',
    banner: {status: 'error', title: 'The run stopped.', description: "This week's orders file has no Currency column, so the agent can't keep each order's currency for the next step. Ask the sender to add it back, or tell the agent which currency to assume."},
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
    workflow: 'Weekly revenue report', step: 'Convert to USD', status: 'done', ran: 'Approved Nov 9 by Daniel', finishedAt: '2026-11-09T10:05',
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
  4: {
    workflow: 'Customer churn list', step: 'Flag customers at risk', status: 'draft', ran: 'Not run yet',
    inputs: [
      {name: 'Active customers', source: ['connection', 'From connection: Salesforce'], stats: ['2,310 rows', '4 columns', 'Synced 5h ago'], sheet: 'Active customers'},
      {name: 'Support tickets, 90 days', source: ['connection', 'From connection: Zendesk'], stats: ['4,118 rows', '4 columns', 'Synced 5h ago'], sheet: 'Support tickets'},
    ],
    instructions: "Flag customers who haven't ordered in 60 days, or who opened 3 or more support tickets in the last 90 days. Add a column that says which rule they hit.",
    python: '# The agent writes this after the first run.',
    outputs: [{name: 'Customers at risk', emptyNote: 'Not produced yet. Run the step to see the result here.', feedsInto: [['step', 'Group by account owner', '#workflow-3']], sheet: 'Customers at risk'}],
    sheets: {
      'Active customers': {kind: 'Input', columns: ['Customer', 'Account owner', 'Last order', 'Plan'], rows: [['Lindqvist AB', 'M. Okafor', '2026-11-02', 'Pro'], ['Tanaka Trading', 'J. Weiss', '2026-08-21', 'Team'], ['Harper & Cole', 'M. Okafor', '2026-10-30', 'Pro'], ['Maison Ferrand', 'A. Dubois', '2026-07-14', 'Starter'], ['Northpeak Ltd', 'J. Weiss', '2026-11-10', 'Team']]},
      'Support tickets': {kind: 'Input', columns: ['Ticket', 'Customer', 'Opened', 'Topic'], rows: [['ZD-9921', 'Tanaka Trading', '2026-10-03', 'Billing'], ['ZD-9988', 'Tanaka Trading', '2026-10-19', 'Login'], ['ZD-10102', 'Tanaka Trading', '2026-11-04', 'Billing'], ['ZD-10140', 'Harper & Cole', '2026-11-06', 'Export']]},
      'Customers at risk': {kind: 'Output', isEmpty: true},
    },
    isDraft: true,
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
