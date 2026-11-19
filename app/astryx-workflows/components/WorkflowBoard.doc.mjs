/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'WorkflowBoard',
  displayName: 'Workflow Board',
  import: '@workspace/astryx-workflows/components/WorkflowBoard',
  keywords: ['board', 'kanban', 'swimlanes', 'lanes', 'home board', 'to do', 'todo', 'runs', 'workflow runs', 'needs attention', 'new data ready for use', 'data ready for use', 'shared data'],
  usage: {
    description:
      'Home’s board of workflow runs in four lanes: To-run (with Scheduled and Unscheduled groups; drafts that aren’t turned on sit in Unscheduled), New data ready for use, Needs attention and Done. New data ready for use holds outputs other people’s workflows share with the person that none of their workflows reads yet: a ready card reads "From Priya Shah’s Quarterly targets update", and a failed one reads "Previous workflow failed to produce an output. Please ask Marco Ruiz to check workflow." Each lane shows its name and count; each card shows a status dot, the workflow name, one line ("Step 3 of 3 needs approval", or the schedule) and one time line ("Notified Nov 2, 08:30"). The board picks the lane and the wording from each card’s state, so runs from any workflow look the same. Needs attention holds everything that needs the person: approvals, missing data, and their own workflow that didn’t run because the shared data it reads failed (state upstreamFailed, with owner). Lanes sit side by side and stack on narrow screens; an empty lane says so.',
    bestPractices: [
      {guidance: true, description: 'Work out each item’s state, step and time from its ticket or workflow, not from typed text.'},
      {guidance: true, description: 'Link each card with href: a ticket for runs that need the person, the workflow page otherwise. Link ready shared data to a new workflow that uses it; leave a failed one unlinked.'},
    {guidance: true, description: 'For shared data, set data (what is shared), workflow (the other person’s workflow) and owner (their name). The board writes the line, including the failure message.'},
      {guidance: false, description: 'Add extra lanes or wording per workflow. The lanes and lines are fixed so every workflow reads the same.'},
    ],
  },
  props: [
    {name: 'items', type: 'WorkflowBoardItem[]', description: 'Cards from any workflow, each with its workflow name, state, optional step position, schedule, time and link.', required: true},
  ],
  examples: [
    {
      label: 'Runs from your workflows and data shared with you',
      code: `<WorkflowBoard
  items={[
    {id: 'a', workflow: 'Weekly revenue report', state: 'scheduled', schedule: 'Every Monday, 8:00', at: 'Nov 23, 08:00', href: '#workflow-2'},
    {id: 'b', workflow: 'Monthly sales close', state: 'needsApproval', stepNumber: 3, stepCount: 3, at: 'Nov 2, 08:30', href: '#ticket-3'},
    {id: 'c', workflow: 'Weekly revenue report', state: 'missingData', stepNumber: 1, stepCount: 4, at: 'Nov 16, 09:12', href: '#ticket-1'},
    {id: 'd', workflow: 'Quarterly targets update', data: 'Regional targets, Q4', owner: 'Priya Shah', state: 'dataReady', at: 'Nov 17, 09:30', href: '#workflow-new?data=d-targets'},
    {id: 'e', workflow: 'Pipeline health check', data: 'At-risk accounts', owner: 'Marco Ruiz', state: 'dataFailed', at: 'Nov 16, 07:40'},
    {id: 'f', workflow: 'At-risk account follow-ups', owner: 'Marco Ruiz', state: 'upstreamFailed', at: 'Nov 16, 08:00', href: '#workflow-4'},
  ]}
/>`,
    },
  ],
};
