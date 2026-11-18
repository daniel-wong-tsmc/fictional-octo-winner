// Checks that the example data only points at things that exist, so every workflow, step, app and shared
// value shows up the same way everywhere. The app runs this in development and logs each problem as an
// error, which the browser tests treat as a failure.

import {TASKS, TICKETS} from './data';
import {SEED_HANDOFFS} from './handoffs';
import {MCP_APPS, PREFILLED_WORKFLOWS, stepPosition} from './workflow';

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
      for (const input of s.inputs) {
        if (input.status === 'handoff') {
          if (!workflows.has(input.source)) problems.push(`${w.name}, ${s.name}: input from workflow "${input.source}", which doesn't exist.`);
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

  // Home's tasks.
  for (const task of TASKS) {
    if (!TICKETS[task.ticketId]) problems.push(`Task ${task.id}: ticket ${task.ticketId} doesn't exist.`);
  }
  return problems;
}
