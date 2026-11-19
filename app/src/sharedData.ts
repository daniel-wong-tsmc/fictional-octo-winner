// Data other people's workflows hand to you. Their workflows aren't yours, so they aren't in your sidebar or
// Library: you only see what they produce. Home's "Data ready for use" lane and the board's Input tile
// ("Shared with you") both read this list, so a shared output looks the same in both places.

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
  /** How its last run went: ready to use, or failed before it made the output. */
  lastRun: {result: 'ready' | 'failed'; at: string};
};

export const SHARED_DATA: SharedData[] = [
  {
    id: 'd-targets',
    name: 'Regional targets, Q4',
    workflow: 'Quarterly targets update',
    owner: PEOPLE[1],
    format: 'Excel sheet',
    lastRun: {result: 'ready', at: '2026-11-17T09:30'},
  },
  {
    id: 'd-pipeline',
    name: 'Open pipeline by region',
    workflow: 'Weekly pipeline export',
    owner: PEOPLE[2],
    format: 'Excel sheet',
    lastRun: {result: 'ready', at: '2026-11-16T07:15'},
  },
  {
    id: 'd-accounts',
    name: 'At-risk accounts',
    workflow: 'Pipeline health check',
    owner: PEOPLE[2],
    format: 'Excel sheet',
    lastRun: {result: 'failed', at: '2026-11-18T07:40'},
  },
];

/** "Marco Ruiz" from "Marco Ruiz, Sales ops". */
export const personName = (person: string) => person.split(',')[0];

/** What the receiver sees when the other workflow didn't produce its output. */
export const failedMessage = (d: SharedData) => upstreamFailedLine(personName(d.owner));

/** "From Marco Ruiz’s Pipeline health check". */
export const sharedFrom = (d: SharedData) => `From ${personName(d.owner)}’s ${d.workflow}`;

export const sharedByName = (name: string) => SHARED_DATA.find(d => d.name === name);
