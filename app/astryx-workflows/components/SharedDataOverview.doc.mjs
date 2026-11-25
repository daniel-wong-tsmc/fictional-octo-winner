/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'SharedDataOverview',
  displayName: 'Shared Data Overview',
  import: '@workspace/astryx-workflows/components/SharedDataOverview',
  keywords: ['shared data page', 'data detail', 'dataset page', 'handed off data', 'upstream output'],
  usage: {
    description:
      'The full page for data someone else’s workflow shares with you: ready or failed and when, what it holds, who shares it and from which workflow, how often it updates and its format, the recent runs of the workflow that makes it, then its rows. Ready data offers Use in a new workflow; failed data shows why and a button to ask the owner. It is built from the same parts as WorkflowOverview, so the two pages read alike.',
    bestPractices: [
      {guidance: true, description: 'After a failed run, pass the rows from the last run that worked and say so in sheetNote.'},
      {guidance: true, description: 'Pass the runs in the same shape as a workflow’s runs, newest first.'},
      {guidance: false, description: 'Build a shared data page by hand. Map the data into these props instead.'},
    ],
  },
  props: [
    {name: 'name', type: 'string', description: 'What the data is called, shown as the heading and in the breadcrumb.', required: true},
    {name: 'summary', type: 'string', description: 'One sentence on what it holds.', required: true},
    {name: 'updated', type: 'string', description: 'When it was last updated, or when its last run failed.', required: true},
    {name: 'sharedBy', type: 'string', description: 'Who shares it.', required: true},
    {name: 'workflow', type: 'string', description: 'Their workflow that makes it.', required: true},
    {name: 'updates', type: 'string', description: 'How often it updates, such as "Every Monday at 07:00".', required: true},
    {name: 'format', type: 'string', description: 'File type, such as "Excel sheet".', required: true},
    {name: 'sheet', type: 'WorkflowSheet', description: 'Its rows, drawn with WorkflowSheetTable.', required: true},
    {name: 'sheetNote', type: 'string', description: 'Above the rows: how many, and which run they come from.', required: true},
    {name: 'runs', type: 'OverviewRun[]', description: 'Runs of the workflow that makes it, newest first, shown like a workflow’s Recent runs.', required: true},
    {name: 'useHref', type: 'string', description: 'Where Use in a new workflow goes.', required: true},
    {name: 'failure', type: '{message: string; askLabel: string; onAsk: () => void}', description: 'Set when the last run failed. Shows the message and a button to ask the owner instead of Use in a new workflow.'},
    {name: 'isInPanel', type: 'boolean', description: 'Shown in a side panel, which has its own header: leaves out the breadcrumbs.', default: 'false'},
    {name: 'fullPageHref', type: 'string', description: 'With isInPanel: the full page’s address. The title becomes a link to it, in place of an Open full page button.'},
    {name: 'homeHref', type: 'string', description: 'Where the Home breadcrumb goes.', default: "'#home'"},
  ],
  examples: [
    {
      label: 'Ready data',
      code: `<SharedDataOverview
  name="Open pipeline by region"
  summary="Every open sales deal in the CRM, totalled by region."
  updated="Nov 16, 07:15"
  sharedBy="Marco Ruiz, Sales ops"
  workflow="Weekly pipeline export"
  updates="Every Monday at 07:00"
  format="Excel sheet"
  sheet={{columns: ['Region', 'Open deals'], rows: [['Europe', '118'], ['APAC', '97']]}}
  sheetNote="2 rows, 2 columns. As of Nov 16, 07:15."
  runs={[{period: 'r1', started: 'Nov 16, 07:00', tone: 'success', result: 'Ready', finished: 'Nov 16, 07:15'}]}
  useHref="#workflow-new?data=d-pipeline"
/>`,
    },
  ],
};
