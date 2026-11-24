// Checks that the example data only points at things that exist, so every workflow, step, app and shared
// value shows up the same way everywhere. The app runs this in development and logs each problem as an
// error, which the browser tests treat as a failure.

import {TASKS, TICKETS} from './data';
import {SEED_HANDOFFS} from './handoffs';
import {MCP_APPS, PEOPLE, PREFILLED_WORKFLOWS, stepPosition} from './workflow';
import {SHARED_DATA} from './sharedData';

export function dataProblems(): string[] {
  const problems: string[] = [];
  const workflows = new Map(PREFILLED_WORKFLOWS.map(w => [w.name, w]));
  const apps = new Map(MCP_APPS.map(a => [a.name, a]));
  const destinations = new Set(PREFILLED_WORKFLOWS.flatMap(w => w.destinations));
  const handoffIds = new Set(SEED_HANDOFFS.map(h => h.id));
  const isStep = (name: string) => PREFILLED_WORKFLOWS.some(w => w.steps.some(s => s.name === name));

  // Workflows: each step's ticket, each input's app or workflow, and each shared value they use or share.
  for (const w of PREFILLED_WORKFLOWS) {
    for (const s of w.steps) {
      if (s.ticketId !== undefined) {
        const t = TICKETS[s.ticketId];
        if (!t) problems.push(`${w.name}, ${s.name}: ticket ${s.ticketId} doesn't exist.`);
        else if (t.workflow !== w.name || t.step !== s.name) problems.push(`${w.name}, ${s.name}: ticket ${s.ticketId} is for ${t.workflow}, ${t.step}.`);
      }
      // Code: every step of a workflow that has run shows the AI's code; a draft's steps have none yet.
      const code = s.ticketId !== undefined ? TICKETS[s.ticketId]?.python : s.python;
      if (w.isDraft && s.python) problems.push(`${w.name}, ${s.name}: a draft step has code, but it has never run.`);
      if (!w.isDraft && !code?.trim()) problems.push(`${w.name}, ${s.name}: has run, but has no code to show.`);
      if (s.ticketId !== undefined && s.python) problems.push(`${w.name}, ${s.name}: code is on both the step and its ticket; keep it on the ticket.`);
      for (const input of s.inputs) {
        if (input.status === 'handoff') {
          if (!workflows.has(input.source)) problems.push(`${w.name}, ${s.name}: input from workflow "${input.source}", which doesn't exist.`);
        } else if (input.status === 'shared') {
          if (!SHARED_DATA.some(d => d.workflow === input.source && d.name === input.reads)) problems.push(`${w.name}, ${s.name}: reads "${input.reads}" from ${input.source}, which nobody shares with you.`);
        } else if (input.status !== 'upload') {
          const app = apps.get(input.source);
          if (!app) problems.push(`${w.name}, ${s.name}: input from app "${input.source}", which isn't a connected app.`);
          else if (!app.reads.includes(input.reads)) problems.push(`${w.name}, ${s.name}: ${input.source} has nothing called "${input.reads}".`);
        }
      }
    }
    for (const id of [...w.uses, ...w.shares]) {
      if (!handoffIds.has(id)) problems.push(`${w.name}: shared value ${id} doesn't exist.`);
    }
  }

  // Tickets: their workflow and step, where their inputs come from, and where their outputs go.
  for (const [id, t] of Object.entries(TICKETS)) {
    if (!workflows.has(t.workflow)) problems.push(`Ticket ${id}: workflow "${t.workflow}" doesn't exist.`);
    else if (!stepPosition(t.workflow, t.step)) problems.push(`Ticket ${id}: ${t.workflow} has no step "${t.step}".`);
    for (const input of t.inputs) {
      const [kind, text] = input.source ?? ['', ''];
      const named = text.replace(/^From \w+: /, '');
      if (kind === 'workflow' && !workflows.has(named)) problems.push(`Ticket ${id}: input from workflow "${named}", which doesn't exist.`);
      if (kind === 'connection' && !apps.has(named.split(',')[0])) problems.push(`Ticket ${id}: input from app "${named.split(',')[0]}", which isn't a connected app.`);
      if (kind === 'step' && !isStep(named.replace(/ \(.*\)$/, ''))) problems.push(`Ticket ${id}: input from step "${named}", which doesn't exist.`);
      if (input.handoffId && !handoffIds.has(input.handoffId)) problems.push(`Ticket ${id}: shared value ${input.handoffId} doesn't exist.`);
    }
    for (const out of t.outputs) {
      for (const [kind, label, href] of out.feedsInto ?? []) {
        if (kind === 'step' && !isStep(label)) problems.push(`Ticket ${id}: feeds step "${label}", which doesn't exist.`);
        if (kind === 'workflow' && !workflows.has(label)) problems.push(`Ticket ${id}: feeds workflow "${label}", which doesn't exist.`);
        if ((kind === 'connection' || kind === 'file') && !destinations.has(label)) problems.push(`Ticket ${id}: sends to "${label}", which no workflow sends to.`);
        const ticketLink = href.match(/^#ticket-(\d+)$/);
        const workflowLink = href.match(/^#workflow-(\d+)$/);
        if (ticketLink && !TICKETS[Number(ticketLink[1])]) problems.push(`Ticket ${id}: links to ticket ${ticketLink[1]}, which doesn't exist.`);
        if (workflowLink && !PREFILLED_WORKFLOWS.some(w => w.id === Number(workflowLink[1]))) problems.push(`Ticket ${id}: links to workflow ${workflowLink[1]}, which doesn't exist.`);
      }
    }
  }

  // Shared values: who makes them and who uses them.
  for (const h of SEED_HANDOFFS) {
    if (!workflows.has(h.workflow)) problems.push(`Shared value "${h.name}": workflow "${h.workflow}" doesn't exist.`);
    if (!TICKETS[h.ticketId]) problems.push(`Shared value "${h.name}": ticket ${h.ticketId} doesn't exist.`);
    else if (TICKETS[h.ticketId].workflow !== h.workflow) problems.push(`Shared value "${h.name}": ticket ${h.ticketId} belongs to ${TICKETS[h.ticketId].workflow}.`);
    for (const user of h.usedBy) {
      if (!workflows.has(user) && !destinations.has(user)) problems.push(`Shared value "${h.name}": used by "${user}", which is neither a workflow nor a destination.`);
    }
  }

  // Data shared with you: owned by someone else, from a workflow that isn't yours, each name used once.
  const sharedNames = new Set<string>();
  for (const d of SHARED_DATA) {
    if (!PEOPLE.includes(d.owner)) problems.push(`Shared data "${d.name}": owner "${d.owner}" isn't one of the people.`);
    if (d.owner === PEOPLE[0]) problems.push(`Shared data "${d.name}": it's yours, so it belongs in your workflows, not in data shared with you.`);
    if (workflows.has(d.workflow)) problems.push(`Shared data "${d.name}": "${d.workflow}" is one of your workflows, not someone else's.`);
    if (sharedNames.has(d.name)) problems.push(`Shared data "${d.name}" is listed twice.`);
    // Runs, newest first, each finishing after it starts.
    d.runs.forEach((run, i) => {
      const start = new Date(run.started).getTime(), end = new Date(run.finished).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) problems.push(`Shared data "${d.name}": run ${i + 1} has bad times.`);
      if (i > 0 && start >= new Date(d.runs[i - 1].started).getTime()) problems.push(`Shared data "${d.name}": runs aren't newest first.`);
    });
    // Its page shows the rows from the last run that worked.
    const lastGood = d.runs.find(run => run.result === 'ready');
    if (!lastGood) problems.push(`Shared data "${d.name}": no run ever worked, so there are no rows to show.`);
    else if (d.preview.asOf !== lastGood.finished) problems.push(`Shared data "${d.name}": its rows should come from the last run that worked (${lastGood.finished}).`);
    d.preview.rows.forEach((row, i) => {
      if (row.length !== d.preview.columns.length) problems.push(`Shared data "${d.name}": row ${i + 1} has ${row.length} values for ${d.preview.columns.length} columns.`);
    });
    sharedNames.add(d.name);
  }

  // Home's tasks.
  for (const task of TASKS) {
    if (!TICKETS[task.ticketId]) problems.push(`Task ${task.id}: ticket ${task.ticketId} doesn't exist.`);
  }
  return problems;
}
