// Data other people's workflows hand to you. Their workflows aren't yours, so they aren't in your sidebar:
// you only see what they produce. Home's "New data ready for use" lane, each data's own page (#data-<id>),
// the board's Library ("Data ready for use") and the Input tile ("Shared with you") all read this list, so
// a shared output looks the same everywhere.

import {upstreamFailedLine} from '@workspace/astryx-workflows/components/WorkflowBoard';
import {PEOPLE} from './workflow';

export type SharedData = {
  id: string;
  /** What the other workflow produces, such as "Regional targets". */
  name: string;
  /** The other person's workflow that produces it. */
  workflow: string;
  /** Who owns that workflow. One of PEOPLE, never you. */
  owner: string;
  /** File type of what it hands over. */
  format: string;
  /** Runs of the workflow that makes it, newest first: ready, or failed before it made the output. */
  runs: {started: string; finished: string; result: 'ready' | 'failed'}[];
  /** The newest run, from `runs`: how it went and when it finished. */
  lastRun: {result: 'ready' | 'failed'; at: string};
  /** One or two sentences on what it holds, as its owner describes it. */
  description: string;
  /** When the other workflow runs, so you know how fresh it is. */
  updates: string;
  /**
   * The rows it holds. After a failed run this is the last version that worked (`asOf` says when), so you can
   * still see what to expect.
   */
  preview: {asOf: string; columns: string[]; rows: string[][]};
};

const ENTRIES: Omit<SharedData, 'lastRun'>[] = [
  {
    id: 'd-targets',
    name: 'Regional targets, Q4',
    workflow: 'Quarterly targets update',
    owner: PEOPLE[1],
    format: 'Excel sheet',
    runs: [
      {started: '2026-11-17T09:00', finished: '2026-11-17T09:30', result: 'ready'},
      {started: '2026-08-18T09:00', finished: '2026-08-18T09:24', result: 'ready'},
    ],
    description: 'This quarter’s sales target for each region, set by Finance after the Q3 close, next to what each region sold in Q3.',
    updates: 'Every quarter, after the close',
    preview: {
      asOf: '2026-11-17T09:30',
      columns: ['Region', 'Q4 target (USD)', 'Q3 actual (USD)', 'Change'],
      rows: [
        ['North America', '4,200,000', '3,850,000', '+9.1%'],
        ['Europe', '3,100,000', '2,960,000', '+4.7%'],
        ['APAC', '2,400,000', '2,050,000', '+17.1%'],
        ['LATAM', '900,000', '870,000', '+3.4%'],
      ],
    },
  },
  {
    id: 'd-pipeline',
    name: 'Open pipeline by region',
    workflow: 'Weekly pipeline export',
    owner: PEOPLE[2],
    format: 'Excel sheet',
    runs: [
      {started: '2026-11-16T07:00', finished: '2026-11-16T07:15', result: 'ready'},
      {started: '2026-11-09T07:00', finished: '2026-11-09T07:12', result: 'ready'},
      {started: '2026-11-02T07:00', finished: '2026-11-02T07:14', result: 'ready'},
    ],
    description: 'Every open sales deal in the CRM, totalled by region, with the value expected to close this quarter.',
    updates: 'Every Monday at 07:00',
    preview: {
      asOf: '2026-11-16T07:15',
      columns: ['Region', 'Open deals', 'Pipeline (USD)', 'Closing this quarter (USD)'],
      rows: [
        ['North America', '142', '6,850,000', '2,310,000'],
        ['Europe', '118', '4,920,000', '1,480,000'],
        ['APAC', '97', '3,760,000', '1,290,000'],
        ['LATAM', '41', '1,180,000', '390,000'],
      ],
    },
  },
  {
    id: 'd-accounts',
    name: 'At-risk accounts',
    workflow: 'Pipeline health check',
    owner: PEOPLE[2],
    format: 'Excel sheet',
    runs: [
      {started: '2026-11-16T07:30', finished: '2026-11-16T07:40', result: 'failed'},
      {started: '2026-11-09T07:30', finished: '2026-11-09T07:40', result: 'ready'},
      {started: '2026-11-02T07:30', finished: '2026-11-02T07:38', result: 'ready'},
    ],
    description: 'Customer accounts likely to cancel or not renew, with the reason they were flagged and who owns each account.',
    updates: 'Every Monday at 07:30',
    preview: {
      asOf: '2026-11-09T07:40',
      columns: ['Account', 'Account owner', 'Risk', 'Reason'],
      rows: [
        ['Northwind Traders', 'Ana Lopez', 'High', 'Usage down 60% in 30 days'],
        ['Bluefin Logistics', 'Sam Okafor', 'High', 'Renewal in 14 days, no reply'],
        ['Cedar & Pine Co.', 'Ana Lopez', 'Medium', 'Two support escalations'],
        ['Harbor Health', 'Lee Tanaka', 'Medium', 'Invoice 45 days overdue'],
        ['Kite Studio', 'Sam Okafor', 'Low', 'Seats cut from 40 to 25'],
      ],
    },
  },
];

export const SHARED_DATA: SharedData[] = ENTRIES.map(d => ({...d, lastRun: {result: d.runs[0].result, at: d.runs[0].finished}}));

/** "Marco Ruiz" from "Marco Ruiz, Sales ops". */
export const personName = (person: string) => person.split(',')[0];

/** What the receiver sees when the other workflow didn't produce its output. */
export const failedMessage = (d: SharedData) => upstreamFailedLine(personName(d.owner));

/** "From Marco Ruiz’s Pipeline health check". */
export const sharedFrom = (d: SharedData) => `From ${personName(d.owner)}’s ${d.workflow}`;

export const sharedByName = (name: string) => SHARED_DATA.find(d => d.name === name);

export const sharedById = (id: string) => SHARED_DATA.find(d => d.id === id);

/** Each shared data's page. */
export const sharedHref = (d: SharedData) => `#data-${d.id}`;
