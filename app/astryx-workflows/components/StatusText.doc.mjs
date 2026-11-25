/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'StatusText',
  displayName: 'Status Text',
  import: '@workspace/astryx-workflows/components/StatusText',
  keywords: ['status', 'status label', 'status dot', 'run status', 'step status', 'state label'],
  usage: {
    description:
      'A status: a coloured dot and its label, with an optional note after it, such as when it happened. Pass one of the shared statuses (STATUSES, exported from the same file) so the same state has the same tone and words on every screen: Done, Sent, Ready, On, Needs approval, Failed, Missing data, Out of date, Didn’t run (skipped in a past run), Not run yet (never run), Draft. Pass your own tone and label only for a status that is not one of those.',
    bestPractices: [
      {guidance: true, description: 'Use a key from STATUSES whenever the state is one of them, so its words and colour stay the same everywhere.'},
      {guidance: true, description: 'Say "Failed" for anything that broke and "Needs approval" for a result waiting on someone; never "Stopped" or "Waiting for approval".'},
      {guidance: false, description: 'Hand-build a StatusDot next to a Text. Use StatusText so the text style matches everywhere.'},
    ],
  },
  props: [
    {name: 'status', type: 'StatusKey | {tone: StatusTone; label: string}', description: 'A status from STATUSES, or a tone and label of its own.', required: true},
    {name: 'note', type: 'ReactNode', description: 'Shown after the label, such as when it happened.'},
  ],
  examples: [
    {
      label: 'Shared statuses',
      code: `<StatusText status="done" note="Finished Nov 9 at 08:18" />
<StatusText status="needsApproval" />
<StatusText status="failed" note="Nov 16, 08:00" />`,
    },
  ],
};
