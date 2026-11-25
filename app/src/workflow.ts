import {timing, type Schedule} from './schedule';
import type {WorkflowDataFormat, WorkflowTileContent} from '@workspace/astryx-workflows/components/WorkflowTile';
// Example workflow for the UI prototype. Nothing here runs.

/** 'shared' reads data someone else's workflow shares with you (SHARED_DATA): source is their workflow, reads the data. */
export type SourceStatus = 'connected' | 'needsConnection' | 'handoff' | 'shared' | 'upload';
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
  /** When it runs. schedule, nextRun and nextRunAt are read from it with timing() in src/schedule.ts. */
  when: Schedule;
  schedule: string;
  nextRun: string;
  /** The next run as an ISO date and time, for Home's board. */
  nextRunAt: string;
  /** A draft hasn't been turned on: it has a schedule but doesn't run yet. */
  isDraft?: boolean;
  /**
   * The workflow context, set from the board's header: what the workflow is for and the rules every LLM step
   * follows, like a system prompt.
   */
  context: string;
  approver: string;
  destinations: string[];
  /** File type of what the last step passes on, such as Excel sheet. */
  outputFormat: WorkflowDataFormat;
  steps: WorkflowStep[];
  /** Handoff ids this workflow uses from other workflows. */
  uses: string[];
  /** Handoff ids this workflow shares with other workflows. */
  shares: string[];
  /** started and finished are the run's date and time, such as "Nov 2, 08:00". */
  runs: {period: string; started: string; result: 'review' | 'approved' | 'rerun' | 'stopped'; detail: string; finished: string}[];
};

/** Example schedules: monthly close, weekly report and a daily one. */
export const SCHEDULE_PRESETS: Schedule[] = [
  {repeat: 'monthly', day: 'firstBusinessDay', time: '08:00'},
  {repeat: 'weekly', days: ['Monday'], time: '08:00'},
  {repeat: 'daily', time: '07:00'},
];
export const PEOPLE = ['Daniel (you)', 'Priya Shah, Finance lead', 'Marco Ruiz, Sales ops'];
/** First name of a PEOPLE entry ("Daniel (you)" gives "Daniel"). Defined here because sharedData.ts, which has personName, imports this file. */
export const firstName = (person: string) => person.split(/[ ,(]/)[0];
/** Your first name, as run details say it ("Approved by Daniel"). */
export const YOU = firstName(PEOPLE[0]);

export const MONTHLY_SALES_CLOSE: Workflow = {
  id: 1,
  name: 'Monthly sales close',
  description: 'Totals last month’s sales by region, compares them with targets, and sends the summary to Finance once approved.',
  context: 'This workflow prepares the monthly sales close for the Finance team. Report every amount in US dollars, rounded to whole dollars. Use the five sales regions as Sales names them: US, Canada, Europe, UK and Japan. Never drop an order without saying why.',
  ...timing(SCHEDULE_PRESETS[0]),
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
      ticketId: 5,
    },
    {
      id: 's2',
      name: 'Convert to USD',
      does: 'Convert each order to US dollars using the exchange rate on its order date.',
      inputs: [{source: 'ECB exchange rates', reads: 'Daily rates', status: 'connected'}],
      output: 'Orders in USD',
      status: 'done',
      trialResult: '4,988 orders converted, 112 used Friday’s rate',
      ticketId: 6,
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
    {period: 'October 2026', started: 'Nov 2, 08:00', result: 'review', detail: 'Needs approval', finished: 'Nov 2, 08:30'},
    {period: 'September 2026', started: 'Oct 1, 08:00', result: 'approved', detail: 'Approved by Daniel', finished: 'Oct 1, 09:12'},
    {period: 'August 2026', started: 'Sep 1, 08:00', result: 'rerun', detail: 'Rerun after targets were fixed, then approved', finished: 'Sep 2, 14:40'},
  ],
};

export const WEEKLY_REVENUE_REPORT: Workflow = {
  id: 2,
  name: 'Weekly revenue report',
  description: 'Combines the week’s orders and refunds, converts them to USD, totals revenue by region, and shares total revenue with Monthly sales close.',
  context: 'This workflow reports last week’s revenue, Monday to Sunday. Count an order once, net of its refunds. Convert to US dollars at the rate on the order date. If a file is missing a column you need, stop and say which one rather than guessing.',
  ...timing(SCHEDULE_PRESETS[1]),
  approver: PEOPLE[0],
  destinations: ['Slack: #finance-close'],
  outputFormat: 'Single value',
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
      ticketId: 7,
    },
    {
      id: 'w4',
      name: 'Total revenue',
      does: 'Add up all regions into one total revenue figure in USD.',
      inputs: [],
      output: 'Total revenue (USD)',
      status: 'waiting',
      trialResult: '1,482,906.17 USD',
      ticketId: 8,
    },
  ],
  uses: [],
  shares: ['h-total-usd'],
  runs: [
    {period: 'Week of Nov 9', started: 'Nov 16, 08:00', result: 'stopped', detail: 'Failed at step 1: the orders file has no Currency column', finished: 'Nov 16, 09:12'},
    {period: 'Week of Nov 2', started: 'Nov 9, 08:00', result: 'approved', detail: 'Approved by Daniel', finished: 'Nov 9, 10:05'},
    {period: 'Week of Oct 26', started: 'Nov 2, 08:00', result: 'approved', detail: 'Approved by Daniel', finished: 'Nov 2, 09:48'},
  ],
};

export const CUSTOMER_CHURN_LIST: Workflow = {
  id: 3,
  name: 'Customer churn list',
  description: 'Flags customers who may leave, groups them by account owner, and sends each owner their list. A draft: it runs once you try it and turn it on.',
  context: 'This workflow helps account owners keep customers who may leave. Only flag a customer with a clear reason from their activity or support tickets. Write for a busy account owner: short, plain and specific.',
  ...timing(SCHEDULE_PRESETS[1]),
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

/**
 * Reads data Marco Ruiz's Pipeline health check shares with you. That workflow failed on Nov 16, so this one's
 * scheduled run that morning had nothing to read and didn't process.
 */
export const AT_RISK_FOLLOW_UPS: Workflow = {
  id: 4,
  name: 'At-risk account follow-ups',
  description: 'Takes the at-risk accounts Marco Ruiz’s Pipeline health check shares with you, adds what each account still owes, and sends Finance a ranked follow-up list.',
  context: 'This workflow turns the at-risk accounts Sales shares with us into a follow-up list for Finance. Amounts are in US dollars. Rank by what each account still owes, highest first, and keep each account’s owner so Finance knows who to call.',
  ...timing(SCHEDULE_PRESETS[1]),
  approver: PEOPLE[0],
  destinations: ['Slack: #finance-close'],
  outputFormat: 'Excel sheet',
  steps: [
    {
      id: 'f1',
      name: 'Add amounts owed',
      does: 'Match each at-risk account to its orders from last month and add the amount it still owes.',
      inputs: [
        {source: 'Pipeline health check', reads: 'At-risk accounts', status: 'shared'},
        {source: 'Shopify', reads: 'Orders, last month', status: 'connected'},
      ],
      output: 'At-risk accounts with amounts owed',
      status: 'stopped',
      trialResult: '38 accounts, 112 orders',
      ticketId: 9,
    },
    {
      id: 'f2',
      name: 'Follow-up list for Finance',
      does: 'Rank the accounts by amount owed and write one line on why each is at risk.',
      inputs: [],
      output: 'Follow-up list',
      status: 'waiting',
      trialResult: '38 accounts ranked',
      ticketId: 10,
    },
  ],
  uses: [],
  shares: [],
  runs: [
    {period: 'Week of Nov 9', started: 'Nov 16, 08:00', result: 'stopped', detail: 'Didn’t process: Marco Ruiz’s Pipeline health check failed to produce At-risk accounts', finished: 'Nov 16, 08:00'},
    {period: 'Week of Nov 2', started: 'Nov 9, 08:00', result: 'approved', detail: 'Approved by Daniel', finished: 'Nov 9, 08:41'},
  ],
};

/** Workflows that come with the prototype, in sidebar order. Built workflows are numbered after these. */
export const PREFILLED_WORKFLOWS: Workflow[] = [MONTHLY_SALES_CLOSE, WEEKLY_REVENUE_REPORT, CUSTOMER_CHURN_LIST, AT_RISK_FOLLOW_UPS];

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
  when: Schedule;
  schedule: string;
  nextRun: string;
  nextRunAt: string;
  createdOn: string;
  /** Stages in run order. Each column runs after the one before it; stages in a column run side by side. */
  columns: BuiltStage[][];
  /** The board it was built on, kept so Edit can reopen it. Opaque outside the builder. */
  saved: unknown;
};
