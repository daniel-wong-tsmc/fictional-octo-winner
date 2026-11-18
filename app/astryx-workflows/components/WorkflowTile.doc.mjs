/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'WorkflowTile',
  displayName: 'Workflow Tile',
  import: '@workspace/astryx-workflows/components/WorkflowTile',
  keywords: ['workflow node', 'workflow step', 'node card', 'flow tile', 'input tile', 'llm step', 'pass on to'],
  usage: {
    description:
      'One tile of a workflow: an Input, an LLM step or a Pass on to. Shows the kind’s icon and name, an optional status, the tile’s name, its detail, optional notes and an optional footer. Use it everywhere a workflow tile appears, on the board and on workflow pages, so tiles look the same. Its kind names and icons come from WORKFLOW_TILE_KINDS, which the board toolbar uses too. For a whole workflow page use WorkflowOverview, which is built from these tiles.',
    bestPractices: [
      {guidance: true, description: 'Read kind names and icons from WORKFLOW_TILE_KINDS instead of writing them again.'},
      {guidance: true, description: 'Put actions such as See output in the footer, not in the detail text.'},
      {guidance: false, description: 'Pass onClick when the tile sits on a board that already handles clicks; it would make the tile a second button.'},
    ],
  },
  props: [
    {name: 'kind', type: 'WorkflowTileKind', description: 'input, step (an LLM step) or output (a Pass on to).', required: true},
    {name: 'title', type: 'string', description: 'Name of the source, step or output.', required: true},
    {name: 'detail', type: 'string', description: 'Where the data comes from, the AI’s instructions, or where the result goes.', required: true},
    {name: 'status', type: '{tone: WorkflowTileTone; label: string}', description: 'Status dot and label in the header, such as Ready or Needs your OK.'},
    {name: 'notes', type: 'string[]', description: 'Extra facts under a divider, such as who gives the OK.'},
    {name: 'footer', type: 'ReactNode', description: 'Actions or results at the bottom, such as a See output button.'},
    {name: 'detailMaxLines', type: 'number', description: 'Cuts the detail to this many lines.'},
    {name: 'width', type: 'number | string', description: 'Tile width.', default: "'100%'"},
    {name: 'elevation', type: "'none' | 'low' | 'high'", description: 'Raised for a tile that is selected or needs attention.', default: "'none'"},
    {name: 'onClick', type: '() => void', description: 'Makes the whole tile a button.'},
  ],
  examples: [
    {
      label: 'An LLM step on a workflow page',
      code: `<WorkflowTile
  kind="step"
  title="Convert to USD"
  detail="Convert each order to US dollars using the exchange rate on its order date."
  status={{tone: 'success', label: 'Done'}}
  notes={['Makes: Orders in USD']}
/>`,
    },
  ],
};
