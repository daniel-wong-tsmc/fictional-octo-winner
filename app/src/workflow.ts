// Example workflow for the UI prototype. Nothing here runs.

export type SourceStatus = 'connected' | 'needsConnection' | 'handoff' | 'upload';
export type StepRunStatus = 'done' | 'review' | 'waiting' | 'draft';

export type StepInput = {label: string; detail: string; status: SourceStatus};

export type WorkflowStep = {
  id: string;
  name: string;
  /** One plain sentence: what the step does. */
  does: string;
  inputs: StepInput[];
  output: string;
  status: StepRunStatus;
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
  approver: string;
  destinations: string[];
  steps: WorkflowStep[];
  /** Handoff ids this workflow uses from other workflows. */
  uses: string[];
  /** Handoff ids this workflow shares with other workflows. */
  shares: string[];
  runs: {period: string; result: 'review' | 'approved' | 'rerun'; detail: string; finished: string}[];
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
  approver: PEOPLE[0],
  destinations: ['Slack: #finance-close', 'Finance close pack'],
  steps: [
    {
      id: 's1',
      name: 'Collect last month’s orders',
      does: 'Pull every order placed last month, with its region and currency.',
      inputs: [{label: 'Shopify', detail: 'Orders, last month', status: 'connected'}],
      output: 'Orders this month',
      status: 'done',
      trialResult: '4,988 orders from September',
    },
    {
      id: 's2',
      name: 'Convert to USD',
      does: 'Convert each order to US dollars using the exchange rate on its order date.',
      inputs: [{label: 'ECB exchange rates', detail: 'Daily rates', status: 'connected'}],
      output: 'Orders in USD',
      status: 'done',
      trialResult: '4,988 orders converted, 112 used Friday’s rate',
    },
    {
      id: 's3',
      name: 'Sales summary for Finance',
      does: 'Total sales by region, compare with each region’s target, biggest miss first.',
      inputs: [
        {label: 'Sales targets', detail: 'Google Drive, FY26 targets.xlsx', status: 'connected'},
        {label: 'Total revenue (USD)', detail: 'Handoff from Weekly revenue report', status: 'handoff'},
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
    {period: 'October 2026', result: 'review', detail: 'Waiting for your OK', finished: 'Nov 2, 08:30'},
    {period: 'September 2026', result: 'approved', detail: 'Approved by Daniel', finished: 'Oct 1, 09:12'},
    {period: 'August 2026', result: 'rerun', detail: 'Rerun after targets were fixed, then approved', finished: 'Sep 2, 14:40'},
  ],
};

/**
 * The steps of every workflow, in order. A task's "Step X of Y" is counted from here, so no ticket
 * carries a typed position. Monthly sales close reads its own steps; the others are example workflows.
 */
export const STEP_LISTS: Record<string, string[]> = {
  [MONTHLY_SALES_CLOSE.name]: MONTHLY_SALES_CLOSE.steps.map(s => s.name),
  'Weekly revenue report': ['Combine orders and refunds', 'Convert to USD', 'Revenue by region', 'Total revenue'],
  'Customer churn list': ['Collect customer activity', 'Flag customers at risk', 'Group by account owner', 'Send to account owners'],
  'Inventory snapshot': ['Find low-stock items', 'Share low-stock list'],
  'Q1 forecast': ['Collect sales history', 'Forecast assumptions', 'Build the Q1 forecast'],
};

/** Where a step sits in its workflow, or null when the workflow or step isn't on record. */
export function stepPosition(workflow: string, step: string): {number: number; count: number} | null {
  const steps = STEP_LISTS[workflow] ?? [];
  const i = steps.indexOf(step);
  return i < 0 ? null : {number: i + 1, count: steps.length};
}

/* ---------- Workflows built on the board ---------- */

export type BuiltStage = {
  id: string;
  kind: 'input' | 'instructions' | 'output';
  /** "Input 1", "Step 2", "Pass on to". */
  label: string;
  title: string;
  /** Where the data comes from, the AI instructions, or who gets the result. */
  detail: string;
  approver?: string;
  sendTo?: string[];
  /** For inputs: the steps this input feeds. */
  feeds?: string[];
};

export type BuiltWorkflow = {
  id: number;
  name: string;
  schedule: string;
  nextRun: string;
  createdOn: string;
  /** Stages in run order. Each column runs after the one before it; stages in a column run side by side. */
  columns: BuiltStage[][];
  /** The board it was built on, kept so Edit can reopen it. Opaque outside the builder. */
  saved: unknown;
};
