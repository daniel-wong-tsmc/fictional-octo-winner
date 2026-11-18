# CLAUDE

Project-specific guidance for AI coding agents.

<!-- ASTRYX:START -->
Astryx v0.7.15 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->

APP COMPONENTS (app/astryx-workflows, an Astryx integration installed as @workspace/astryx-workflows):
- Every workflow page renders `WorkflowOverview` (`npx astryx component WorkflowOverview`). Map the workflow's data into its props; never build a workflow page by hand. Change the page for all workflows there, then update its .doc.mjs.
- After changing it, run `cd astryx-workflows && ../node_modules/.bin/astryx integration check --strict` and `npx astryx doctor integration components @workspace/astryx-workflows`.
- Every list of workflow tasks renders `WorkflowTaskList` (`npx astryx component WorkflowTaskList`). Turn tasks into its `WorkflowTask` shape only through `toWorkflowTask` in src/tasks.ts, which reads the ticket and counts the step from `STEP_LISTS` in src/workflow.ts. A new workflow adds its steps to `STEP_LISTS`; never type a position or a status sentence.
- Every workflow tile (board and pages) renders `WorkflowTile`; kind names and icons come from `WORKFLOW_TILE_KINDS`. Tile text is `WorkflowTileContent`, never free text: Input = source, From, Reads, Goes to; LLM = Step N, Instructions, Makes; Handoff = name, Format, Approver, Sends to. The board builds it in `tileContents` and saved pages reuse that. The board only adds React Flow's connection dots around it. Board-only pieces (connection line, setup panel, trial dialog, toolbar) stay in WorkflowBuilder.tsx until a second screen needs them.
- Words: "Handoff" is only the last tile kind (who gets the result). A value one workflow gives another is a "shared value" (code still calls these handoffs internally). Approval is "approval"/"Approver", never "OK". "Not connected" is only a tile with no lines; an app is "App not connected".
- Prefilled workflows live in `PREFILLED_WORKFLOWS` (src/workflow.ts). Each gets the same routes as a built one (#workflow-N, #workflow-edit-N), its board from `boardFromWorkflow`, and its steps in `STEP_LISTS` automatically. Add a new example workflow there, not as a special case in App.tsx.
- Board sections: dropping a saved workflow from the Library copies its tiles and lines into a `Section` (a React Flow parent node; tiles get `sectionId` and positions relative to it). Only a section's Handoff may draw a line out, and only into an LLM step of another workflow. On the workflow page (`toColumns`), a section isn't copied; each of its Handoffs that feeds this workflow shows as one input "From another workflow".
