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
export const DESTINATION_OPTIONS = ['Slack: #finance-close', 'Finance close pack', 'Email: finance@company.com', 'Google Drive: Close archive'];

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
      trialResult: '5 regions, 2.1% below target overall',
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

/** What the agent drafts from the description and the uploaded workbook. */
export const DRAFT_DESCRIPTION =
  'Every month after the books close, I pull last month’s orders from Shopify, convert them to USD, total them by region, ' +
  'and compare each region with its target from our FY26 targets sheet. I send the summary to Finance in #finance-close once I’ve checked it.';

export const DRAFT_FILE_NAME = 'Sales close – Oct 2026.xlsx';

export const DRAFT_STEPS: WorkflowStep[] = MONTHLY_SALES_CLOSE.steps.map(s => ({
  ...s,
  status: 'draft',
  // In the draft, Shopify is not connected yet: setup goes on, the step just waits.
  inputs: s.id === 's1' ? [{label: 'Shopify', detail: 'Not connected yet', status: 'needsConnection'}] : s.inputs,
  trialResult: s.id === 's1' ? '4,988 orders, read from your workbook (Shopify not connected yet)' : s.trialResult,
  ticketId: undefined,
}));

export type DraftQuestion = {
  id: string;
  question: string;
  why: string;
  options: string[];
  answer: string;
};

export const DRAFT_QUESTIONS: DraftQuestion[] = [
  {
    id: 'q-targets',
    question: 'Which file holds the sales targets?',
    why: 'Your workbook copies targets into the “Targets” tab by hand.',
    options: ['Google Drive: FY26 targets.xlsx', 'The “Targets” tab in my uploaded workbook', 'I’ll upload it each month'],
    answer: 'Google Drive: FY26 targets.xlsx',
  },
  {
    id: 'q-rate',
    question: 'Your workbook uses one fixed rate per currency (cell B2 on “Rates”). Use daily exchange rates instead?',
    why: 'Daily rates match how Finance reports revenue.',
    options: ['Use daily rates (recommended)', 'Keep one fixed rate per month'],
    answer: 'Use daily rates (recommended)',
  },
  {
    id: 'q-approver',
    question: 'Who checks the summary before Finance sees it?',
    why: 'You said you send it “once I’ve checked it”.',
    options: PEOPLE,
    answer: PEOPLE[0],
  },
];

export const EXAMPLE_DESCRIPTIONS = [
  DRAFT_DESCRIPTION,
  'Every Monday, list invoices more than 30 days overdue from NetSuite and send the list to the collections team.',
  'When the stock file lands in SharePoint, flag items below their reorder point and email purchasing.',
];

export const TEMPLATES = [
  {name: 'Monthly sales close', about: 'Orders → USD → totals vs targets → approval'},
  {name: 'Weekly revenue report', about: 'Orders and refunds → net revenue by region'},
  {name: 'Overdue invoices', about: 'Invoices → overdue list → collections'},
];
