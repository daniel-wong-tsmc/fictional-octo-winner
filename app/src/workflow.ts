import type {WorkflowTileContent} from '@workspace/astryx-workflows/components/WorkflowTile';
// Example workflow for the UI prototype. Nothing here runs.

export type SourceStatus = 'connected' | 'needsConnection' | 'handoff' | 'upload';
export type StepRunStatus = 'done' | 'review' | 'waiting' | 'stopped' | 'draft';

/** Where a step's data comes from: the file, app or workflow (source), and what it reads there. */
export type StepInput = {source: string; reads: string; status: SourceStatus};

export type WorkflowStep = {
  id: string;
  name: string;
  /** One plain sentence: what the step does. */
  does: string;
  inputs: StepInput[];
  output: string;
  status: StepRunStatus;
  /**
   * The Python the AI wrote on this step's last run. A step with a ticket keeps its code on the ticket instead,
   * and a step that has never run has none.
   */
  python?: string;
  /** What a trial run on last month shows for this step. */
  trialResult: string;
  ticketId?: number;
};

export type Workflow = {
  id: number;
  name: string;
  description: string;
  schedule: string;
  nextRun: string;
  /** The next run as an ISO date and time, for Home's board. */
  nextRunAt: string;
  /** A draft hasn't been turned on: it has a schedule but doesn't run yet. */
  isDraft?: boolean;
  approver: string;
  destinations: string[];
  /** File type of what the last step passes on, such as Excel sheet. */
  outputFormat: string;
  steps: WorkflowStep[];
  /** Handoff ids this workflow uses from other workflows. */
  uses: string[];
  /** Handoff ids this workflow shares with other workflows. */
  shares: string[];
  /** started and finished are the run's date and time, such as "Nov 2, 08:00". */
  runs: {period: string; started: string; result: 'review' | 'approved' | 'rerun' | 'stopped'; detail: string; finished: string}[];
};

export const SCHEDULES = [
  'First business day of each month, 8:00',
  'Every Monday, 8:00',
  'Every day, 7:00',
  'When I run it',
];
export const PEOPLE = ['Daniel (you)', 'Priya Shah, Finance lead', 'Marco Ruiz, Sales ops'];

export const MONTHLY_SALES_CLOSE: Workflow = {
  id: 1,
  name: 'Monthly sales close',
  description: 'Totals last month’s sales by region, compares them with targets, and sends the summary to Finance once approved.',
  schedule: SCHEDULES[0],
  nextRun: 'Tuesday, December 1, 8:00',
  nextRunAt: '2026-12-01T08:00',
  approver: PEOPLE[0],
  destinations: ['Slack: #finance-close', 'Google Drive: Finance close pack'],
  outputFormat: 'Excel sheet',
  steps: [
    {
      id: 's1',
      name: 'Collect last month’s orders',
      does: 'Pull every order placed last month, with its region and currency.',
      inputs: [{source: 'Shopify', reads: 'Orders, last month', status: 'connected'}],
      output: 'Orders this month',
      status: 'done',
      trialResult: '4,988 orders from September',
      python: `orders = read_app("Shopify", "Orders, last month")\norders = orders[["Order ID", "Date", "Region", "Currency", "Amount"]]\nwrite_sheet("Orders this month", orders)`,
    },
    {
      id: 's2',
      name: 'Convert to USD',
      does: 'Convert each order to US dollars using the exchange rate on its order date.',
      inputs: [{source: 'ECB exchange rates', reads: 'Daily rates', status: 'connected'}],
      output: 'Orders in USD',
      status: 'done',
      trialResult: '4,988 orders converted, 112 used Friday’s rate',
      python: `orders = read_sheet("Orders this month").sort_values("Date")\nrates = read_app("ECB exchange rates", "Daily rates").sort_values("Date")\n\nout = pd.merge_asof(orders, rates, on="Date", by="Currency", direction="backward")\nout["Amount (USD)"] = (out["Amount"] * out["Rate to USD"]).round(2)\nwrite_sheet("Orders in USD", out.drop(columns="Rate to USD"))`,
    },
    {
      id: 's3',
      name: 'Sales summary for Finance',
      does: 'Total sales by region, compare with each region’s target, biggest miss first.',
      inputs: [
        {source: 'Google Drive', reads: 'FY26 targets.xlsx', status: 'connected'},
        {source: 'Weekly revenue report', reads: 'Total revenue (USD)', status: 'handoff'},
      ],
      output: 'October summary',
      status: 'review',
      trialResult: '5 regions, 3.1% below target overall',
      ticketId: 3,
    },
  ],
  uses: ['h-total-usd'],
  shares: ['h-gap'],
  runs: [
    {period: 'October 2026', started: 'Nov 2, 08:00', result: 'review', detail: 'Waiting for approval', finished: 'Nov 2, 08:30'},
    {period: 'September 2026', started: 'Oct 1, 08:00', result: 'approved', detail: 'Approved by Daniel', finished: 'Oct 1, 09:12'},
    {period: 'August 2026', started: 'Sep 1, 08:00', result: 'rerun', detail: 'Rerun after targets were fixed, then approved', finished: 'Sep 2, 14:40'},
  ],
};

export const WEEKLY_REVENUE_REPORT: Workflow = {
  id: 2,
  name: 'Weekly revenue report',
  description: 'Combines the week’s orders and refunds, converts them to USD, totals revenue by region, and shares total revenue with Monthly sales close.',
  schedule: SCHEDULES[1],
  nextRun: 'Monday, November 23, 8:00',
  nextRunAt: '2026-11-23T08:00',
  approver: PEOPLE[0],
  destinations: ['Slack: #finance-close'],
  outputFormat: 'A single number',
  steps: [
    {
      id: 'w1',
      name: 'Combine orders and refunds',
      does: 'Combine this week’s orders with this week’s refunds into net orders, keeping each order’s currency.',
      inputs: [
        {source: 'SharePoint', reads: 'Orders this week.xlsx', status: 'connected'},
        {source: 'Shopify', reads: 'Refunds this week', status: 'connected'},
      ],
      output: 'Net orders',
      status: 'stopped',
      trialResult: '1,284 orders, 63 refunds',
      ticketId: 1,
    },
    {
      id: 'w2',
      name: 'Convert to USD',
      does: 'Convert each net order to US dollars using the exchange rate on its order date.',
      inputs: [{source: 'ECB exchange rates', reads: 'Daily rates', status: 'connected'}],
      output: 'Orders in USD',
      status: 'waiting',
      trialResult: '1,221 orders converted',
      ticketId: 2,
    },
    {
      id: 'w3',
      name: 'Revenue by region',
      does: 'Total the week’s USD revenue for each region.',
      inputs: [],
      output: 'Revenue by region',
      status: 'waiting',
      trialResult: '5 regions',
      python: `orders = read_sheet("Orders in USD")\nby_region = orders.groupby("Region")["Amount (USD)"].sum().round(2)\nwrite_sheet("Revenue by region", by_region.reset_index())`,
    },
    {
      id: 'w4',
      name: 'Total revenue',
      does: 'Add up all regions into one total revenue figure in USD.',
      inputs: [],
      output: 'Total revenue (USD)',
      status: 'waiting',
      trialResult: '1,482,906.17 USD',
      python: `by_region = read_sheet("Revenue by region")\ntotal = round(by_region["Amount (USD)"].sum(), 2)\nwrite_value("Total revenue (USD)", total)`,
    },
  ],
  uses: [],
  shares: ['h-total-usd'],
  runs: [
    {period: 'Week of Nov 9', started: 'Nov 16, 08:00', result: 'stopped', detail: 'Stopped at step 1: the orders file has no Currency column', finished: 'Nov 16, 09:12'},
    {period: 'Week of Nov 2', started: 'Nov 9, 08:00', result: 'approved', detail: 'Approved by Daniel', finished: 'Nov 9, 10:05'},
    {period: 'Week of Oct 26', started: 'Nov 2, 08:00', result: 'approved', detail: 'Approved by Daniel', finished: 'Nov 2, 09:48'},
  ],
};

export const CUSTOMER_CHURN_LIST: Workflow = {
  id: 3,
  name: 'Customer churn list',
  description: 'Flags customers who may leave, groups them by account owner, and sends each owner their list. A draft: it runs once you try it and turn it on.',
  schedule: SCHEDULES[1],
  nextRun: 'Not turned on yet',
  nextRunAt: '',
  isDraft: true,
  approver: PEOPLE[2],
  destinations: ['Email: Marco Ruiz'],
  outputFormat: 'Excel sheet',
  steps: [
    {
      id: 'c1',
      name: 'Collect customer activity',
      does: 'Pull every active customer with their account owner, last order date and plan.',
      inputs: [{source: 'Salesforce', reads: 'Active customers', status: 'connected'}],
      output: 'Active customers',
      status: 'draft',
      trialResult: '2,310 customers',
    },
    {
      id: 'c2',
      name: 'Flag customers at risk',
      does: 'Flag customers with no order in 60 days, or 3 or more support tickets in 90 days, and say which rule they hit.',
      inputs: [{source: 'Zendesk', reads: 'Support tickets, 90 days', status: 'connected'}],
      output: 'Customers at risk',
      status: 'draft',
      trialResult: '148 customers flagged',
      ticketId: 4,
    },
    {
      id: 'c3',
      name: 'Group by account owner',
      does: 'Split the flagged customers into one list per account owner.',
      inputs: [],
      output: 'Lists by owner',
      status: 'draft',
      trialResult: '6 owners',
    },
    {
      id: 'c4',
      name: 'Send to account owners',
      does: 'Write each owner a short summary of their at-risk customers with the list attached.',
      inputs: [],
      output: 'Owner emails',
      status: 'draft',
      trialResult: '6 emails drafted',
    },
  ],
  uses: [],
  shares: [],
  runs: [],
};

/** Workflows that come with the prototype, in sidebar order. Built workflows are numbered after these. */
export const PREFILLED_WORKFLOWS: Workflow[] = [MONTHLY_SALES_CLOSE, WEEKLY_REVENUE_REPORT, CUSTOMER_CHURN_LIST];

/**
 * Apps the workspace admin has connected through MCP. Workflow inputs, tickets and the board's Input tiles
 * all read from this list, so an app is named and shown connected the same way everywhere.
 */
export const MCP_APPS: {name: string; isConnected: boolean; reads: string[]}[] = [
  {name: 'Google Drive', isConnected: true, reads: ['FY26 targets.xlsx', 'Finance close pack (folder)']},
  {name: 'SharePoint', isConnected: true, reads: ['Orders this week.xlsx', 'stock_levels.xlsx', 'Close archive (folder)']},
  {name: 'Shopify', isConnected: true, reads: ['Orders, last month', 'Refunds this week']},
  {name: 'ECB exchange rates', isConnected: true, reads: ['Daily rates']},
  {name: 'Salesforce', isConnected: true, reads: ['Active customers', 'Open opportunities']},
  {name: 'Zendesk', isConnected: true, reads: ['Support tickets, 90 days']},
  {name: 'Snowflake', isConnected: true, reads: ['sales_history', 'inventory_daily']},
  {name: 'HubSpot', isConnected: false, reads: ['Contacts', 'Deals']},
];

/**
 * The steps of every workflow, in order. A task's "Step X of Y" is counted from here, so no ticket
 * carries a typed position. Only real workflows are listed; a ticket for any other workflow is a data problem.
 */
export const STEP_LISTS: Record<string, string[]> = {
  ...Object.fromEntries(PREFILLED_WORKFLOWS.map(w => [w.name, w.steps.map(s => s.name)])),
};

/** Where a step sits in its workflow, or null when the workflow or step isn't on record. */
export function stepPosition(workflow: string, step: string): {number: number; count: number} | null {
  const steps = STEP_LISTS[workflow] ?? [];
  const i = steps.indexOf(step);
  return i < 0 ? null : {number: i + 1, count: steps.length};
}

/* ---------- Workflows built on the board ---------- */

/** One tile of a workflow built on the board, saved with the same content its tile shows. */
export type BuiltStage = {id: string; content: WorkflowTileContent};

export type BuiltWorkflow = {
  id: number;
  name: string;
  schedule: string;
  nextRun: string;
  nextRunAt: string;
  createdOn: string;
  /** Stages in run order. Each column runs after the one before it; stages in a column run side by side. */
  columns: BuiltStage[][];
  /** The board it was built on, kept so Edit can reopen it. Opaque outside the builder. */
  saved: unknown;
};
