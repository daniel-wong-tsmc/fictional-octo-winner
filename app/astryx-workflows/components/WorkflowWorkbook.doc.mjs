/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'WorkflowWorkbook',
  displayName: 'Workflow Workbook',
  import: '@workspace/astryx-workflows/components/WorkflowWorkbook',
  keywords: ['workbook', 'excel file', 'sheet tabs', 'multiple sheets', 'spreadsheet preview', 'sheet preview'],
  usage: {
    description:
      'A file’s sheets shown like a spreadsheet app: the selected sheet’s rows in a WorkflowSheetTable, with one tab per sheet under them. A file with one sheet shows its rows and no tabs. Each sheet can carry a note shown above its rows, such as what the preview covers or that the step doesn’t read it. Use it wherever a file is previewed, such as the step page’s Input data and Output data, so a workbook with several sheets looks the same everywhere.',
    bestPractices: [
      {guidance: true, description: 'Pass every sheet of the file, in the file’s order, and open on the sheet the step reads with defaultSheet.'},
      {guidance: true, description: 'Give it a key per file, so switching files opens the new file on its own sheet.'},
      {guidance: false, description: 'Turn each sheet of one file into its own file tab above the preview. Files go above; a file’s sheets go below, under its rows.'},
    ],
  },
  props: [
    {name: 'sheets', type: 'WorkflowWorkbookSheet[]', description: 'The file’s sheets in order: name, sheet (a WorkflowSheet) and an optional note shown above its rows.', required: true},
    {name: 'fileName', type: 'string', description: 'The file’s name. Labels the sheet tabs for screen readers.', required: true},
    {name: 'defaultSheet', type: 'string', description: 'The sheet to open on. Defaults to the first.'},
  ],
  examples: [
    {
      label: 'A workbook with three sheets',
      code: `<WorkflowWorkbook
  key="FY26 targets.xlsx"
  fileName="FY26 targets.xlsx"
  defaultSheet="Targets"
  sheets={[
    {name: 'Targets', sheet: targets},
    {name: 'Region owners', sheet: owners, note: <Text type="supporting">The step doesn’t read this sheet.</Text>},
    {name: 'FY25 actuals', sheet: actuals},
  ]}
/>`,
    },
  ],
};
