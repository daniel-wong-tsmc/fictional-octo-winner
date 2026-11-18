/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'WorkflowSheetTable',
  displayName: 'Workflow Sheet Table',
  import: '@workspace/astryx-workflows/components/WorkflowSheetTable',
  keywords: ['sheet', 'spreadsheet', 'data table', 'rows and columns', 'preview rows', 'pick cell', 'handoff'],
  usage: {
    description:
      'A sheet of data shown like a spreadsheet: lettered columns, numbered rows and compact grid lines. Columns the agent added get a dot, missing columns say Missing, and an empty sheet shows an empty state with its note. With onPick, the row numbers, column names and cells become buttons that report what was clicked. Use it everywhere a sheet is shown, on the ticket page and in the trial dialog of the builder, so a sheet looks the same on every screen.',
    bestPractices: [
      {guidance: true, description: 'Pass the sheet as it comes from the data; the table reads its added and missing columns itself.'},
      {guidance: true, description: 'Use shownColumns to narrow a wide sheet to the columns that matter.'},
      {guidance: false, description: 'Pass onPick on screens where nothing can be picked; it turns every cell into a button.'},
    ],
  },
  props: [
    {name: 'sheet', type: 'WorkflowSheet', description: 'The sheet: columns, rows of text, addedColumns, missingColumns, isEmpty, fromFile and emptyNote.', required: true},
    {name: 'shownColumns', type: 'string[]', description: 'Column names to show. Other columns are left out. Shows all when empty or not set.'},
    {name: 'onPick', type: '(pick: WorkflowSheetPick) => void', description: 'Makes row numbers, column names and cells clickable. Gets a column, a row (counted from 2) or a cell.'},
  ],
  examples: [
    {
      label: 'Read-only and pickable',
      code: `<WorkflowSheetTable sheet={{columns: ['Vendor', 'Amount'], rows: [['Acme', '1,200'], ['Birch', '340']]}} />
<WorkflowSheetTable sheet={sheet} shownColumns={['Amount']} onPick={pick => addHandoff(pick)} />`,
    },
  ],
};
