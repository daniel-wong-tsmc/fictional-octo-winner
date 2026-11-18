/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'WorkflowTaskList',
  displayName: 'Workflow Task List',
  import: '@workspace/astryx-workflows/components/WorkflowTaskList',
  keywords: ['to do list', 'to do', 'todo', 'todo list', 'task list', 'inbox', 'approvals', 'workflow tasks', 'notifications'],
  usage: {
    description:
      'The to-do list of workflow tasks. Each row shows a status dot, the workflow name, "Step X of Y" with the step’s condition (needs approval, ran completely, is missing data, hasn’t run yet), and when the person was notified. Rows are newest first; completed ones move into a closed Done section. Use it for every list of workflow tasks so tasks from any workflow look the same. Map each task’s ticket into a WorkflowTask; never pass typed wording.',
    bestPractices: [
      {guidance: true, description: 'Work out stepNumber, stepCount and condition from the ticket and its workflow, not from text typed on the task.'},
      {guidance: true, description: 'Link each task to its ticket with href, so the row opens the place to act on it.'},
      {guidance: false, description: 'Add extra wording or numbers to a row. The format is fixed so every workflow reads the same.'},
    ],
  },
  props: [
    {name: 'tasks', type: 'WorkflowTask[]', description: 'Tasks from any workflow, each with its workflow name, step position, condition, notified time and link.', required: true},
    {name: 'title', type: 'string', description: 'Heading above the list.', default: "'To do'"},
  ],
  examples: [
    {
      label: 'Tasks from two workflows',
      code: `<WorkflowTaskList
  tasks={[
    {id: '3', workflow: 'Monthly sales close', stepNumber: 3, stepCount: 3, condition: 'needsApproval', notifiedAt: '2026-11-02T08:30', href: '#ticket-3'},
    {id: '1', workflow: 'Weekly revenue report', stepNumber: 1, stepCount: 4, condition: 'missingData', notifiedAt: '2026-11-16T09:12', href: '#ticket-1'},
  ]}
/>`,
    },
  ],
};
