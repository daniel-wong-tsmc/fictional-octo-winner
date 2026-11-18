/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'WorkflowOverview',
  displayName: 'Workflow Overview',
  import: '@workspace/astryx-workflows/components/WorkflowOverview',
  keywords: ['workflow page', 'workflow detail', 'automation overview', 'pipeline page', 'workflow summary'],
  usage: {
    description:
      'The full page for one workflow: on/off state and next run, schedule, approvers and destinations, then its recent runs, what it uses from and shares with other workflows, and last its tiles in run order (inputs, LLM steps, pass on to), each drawn with WorkflowTile. It includes Run now, Edit workflow and Delete workflow (with a confirm step). Use it for every workflow page, prefilled or user-built, so they all look the same. Use the workflow builder board to create or change a workflow.',
    bestPractices: [
      {guidance: true, description: 'Pass the stages in run order: inputs in the first column, then each LLM step, then the pass on to tiles.'},
      {guidance: true, description: 'Give every stage a status once the workflow has run, so people can see where it stopped.'},
      {guidance: false, description: 'Build a workflow page by hand. Map the workflow into these props instead.'},
    ],
  },
  props: [
    {name: 'name', type: 'string', description: 'Workflow name, shown as the heading and in the breadcrumb.', required: true},
    {name: 'summary', type: 'string', description: 'One sentence on what the workflow does.', required: true},
    {name: 'schedule', type: 'string', description: 'When it starts, such as "First business day of each month, 8:00".', required: true},
    {name: 'nextRun', type: 'string', description: 'Date and time of the next run.', required: true},
    {name: 'approvers', type: 'string[]', description: 'People who must approve results before they go out. Empty shows "Nobody".', required: true},
    {name: 'sendTo', type: 'string[]', description: 'Where results go. Empty shows "Nobody yet".', required: true},
    {
      name: 'columns',
      type: 'WorkflowStage[][]',
      description: 'Stages in run order. Each column runs after the one before it; stages in one column run side by side.',
      required: true,
    },
    {name: 'onOpenStage', type: '(stage: WorkflowStage) => void', description: 'Called when a stage is clicked. Without it, stages are not clickable.'},
    {name: 'uses', type: 'WorkflowHandoff[]', description: 'Values this workflow takes from other workflows.', required: true},
    {name: 'shares', type: 'WorkflowHandoff[]', description: 'Values this workflow gives to other workflows.', required: true},
    {name: 'runs', type: 'WorkflowRun[]', description: 'Recent runs, newest first, each shown with when it started, its result and when it finished. Empty shows when the first run is.', required: true},
    {name: 'editHref', type: 'string', description: 'Where Edit workflow goes.', required: true},
    {name: 'onRunNow', type: '() => void', description: 'Called when Run now is clicked.', required: true},
    {name: 'onDelete', type: '() => void', description: 'Called after the person confirms the delete.', required: true},
    {name: 'homeHref', type: 'string', description: 'Where the Home breadcrumb goes.', default: "'#home'"},
  ],
  examples: [
    {
      label: 'A workflow built on the board',
      code: `<WorkflowOverview
  name="Regional sales check"
  summary="2 inputs, 1 LLM step, 1 pass on to."
  schedule="First business day of each month, 8:00"
  nextRun="Tuesday, December 1, 8:00"
  approvers={['Daniel (you)']}
  sendTo={['Slack: #finance-close']}
  columns={[
    [{id: 'a', content: {kind: 'input', source: 'Snowflake', via: 'mcp', reads: 'sales_history', goesTo: ['Step 1']}}],
    [{id: 'b', content: {kind: 'step', number: 1, instructions: 'Total sales by region.', makes: 'October summary'}}],
    [{id: 'c', content: {kind: 'output', name: 'October summary', format: 'Excel sheet', approver: 'Daniel (you)', sendTo: ['Slack: #finance-close']}}],
  ]}
  uses={[]}
  shares={[]}
  runs={[]}
  editHref="#workflow-edit-2"
  onRunNow={() => {}}
  onDelete={() => {}}
/>`,
    },
  ],
};
