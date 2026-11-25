/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'WorkflowTile',
  displayName: 'Workflow Tile',
  import: '@workspace/astryx-workflows/components/WorkflowTile',
  keywords: ['workflow node', 'workflow step', 'node card', 'flow tile', 'input tile', 'llm step', 'handoff', 'pass on to', 'output'],
  usage: {
    description:
      'One tile of a workflow: an Input, an LLM step or a Handoff. The header shows the kind and an optional status. Emphasis marks the tile where a run failed (red) or one that didn’t run (greyed). The body is a title plus labeled details, and each kind always shows the same details in the same order, each read from one setting of the tile: Input shows no title line, only Data type then Name: Data type is the format another workflow passes it on in (Excel sheet, CSV file or Single value, from WORKFLOW_DATA_FORMATS), the type of an uploaded or app file, or "Table from <app>"; Name is the file or what it reads. LLM shows "Step N" (plus its name) as the title, then Instructions. Where a tile leads is shown by the lines or arrows around it, not in its text. Handoff shows the output name as the title, then Format, Approver and Sends to. Use it everywhere a workflow tile appears, such as the workflow board. Kind names and icons come from WORKFLOW_TILE_KINDS, which the board toolbar uses too.',
    bestPractices: [
      {guidance: true, description: 'Build content from the tile’s own settings and lines, with one function shared by every screen that shows the tile.'},
      {guidance: true, description: 'Put actions such as See output in the footer.'},
      {guidance: false, description: 'Write free text into a detail. Add a field to WorkflowTileContent instead, so every tile of that kind gets it.'},
      {guidance: false, description: 'Pass onClick when the tile sits on a board that already handles clicks; it would make the tile a second button.'},
    ],
  },
  props: [
    {name: 'action', type: 'ReactNode', description: 'A small icon button at the top right, after the status, such as the board’s button that runs only this LLM step. Use a ghost, small, icon-only button.'},
    {name: 'content', type: 'WorkflowTileContent', description: 'What the tile says. Its kind (input, step or output) sets the title and which labeled details show.', required: true},
    {name: 'status', type: '{tone: WorkflowTileTone; label: string}', description: 'Status dot and label in the header, such as Ready or Needs approval.'},
    {name: 'footer', type: 'ReactNode', description: 'Actions or results at the bottom, such as a See output button.'},
    {name: 'detailMaxLines', type: 'number', description: 'Cuts each detail to this many lines, for small tiles such as those on a board.'},
    {name: 'detailLayout', type: "'inline' | 'stacked'", description: 'inline puts each label beside its value, for wide tiles such as those on a board; stacked puts it above, for narrow ones. Labels and order stay the same.', default: "'stacked'"},
    {name: 'width', type: 'number | string', description: 'Tile width.', default: "'100%'"},
    {name: 'elevation', type: "'none' | 'low' | 'high'", description: 'Raised for a tile that is selected or needs attention.', default: "'none'"},
    {name: 'emphasis', type: "'failed' | 'muted'", description: 'How much the tile stands out. failed turns it red and raises it, for the tile where a run stopped; muted greys it, for tiles that didn’t run. Leave it out for a normal tile.'},
    {name: 'onClick', type: '() => void', description: 'Makes the whole tile a button.'},
  ],
  examples: [
    {
      label: 'One tile of each kind',
      code: `<WorkflowTile content={{kind: 'input', source: 'Shopify', via: 'mcp', reads: 'Orders, last month'}} />
<WorkflowTile content={{kind: 'step', number: 2, name: 'Convert to USD', instructions: 'Convert each order to US dollars.'}} />
<WorkflowTile content={{kind: 'output', name: 'October summary', format: 'Excel sheet', approver: 'Daniel (you)', sendTo: ['Slack: #finance-close']}} />`,
    },
  ],
};
