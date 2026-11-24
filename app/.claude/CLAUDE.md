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
- Every workflow page renders `WorkflowOverview` (`npx astryx component WorkflowOverview`): status and next run, schedule, approvers, destinations, Recent runs. It shows no tiles; Edit workflow opens them on the board. Each run in Recent runs opens on the board (`#workflow-N-run-K`, K = 0 for the newest): the board is read only, each tile shows how it did (every tile shows its status at the top and its first number below; the tile where it failed is also red, via WorkflowTile's `emphasis`, and the side panel says why; tiles that didn't run are greyed; a failed run opens selected and zoomed on the red tile where it first broke (`firstFailedTile`: an Input before an LLM step before the Handoff), which is also what Why it failed names; the banner shows only Ran and, for a stopped run, Why it failed as a category from `failureKind`: Data input error, LLM processing error or Handoff error), and its side panel shows the numbers, what the agent did, why it failed or didn't run, a few rows it made, and its code. Those results live in `RUN_DETAILS` (src/runs.ts) by workflow id, run period and tile id; every run of a prefilled workflow needs one for every tile, and `dataProblems()` checks they agree with how the run ended. Map the workflow's data into its props; never build a workflow page by hand. Change the page for all workflows there, then update its .doc.mjs.
- After changing it, run `cd astryx-workflows && ../node_modules/.bin/astryx integration check --strict` and `npx astryx doctor integration components @workspace/astryx-workflows`.
- Home's board renders `WorkflowBoard` (`npx astryx component WorkflowBoard`): lanes To-run (Scheduled, Unscheduled), New data ready for use, Needs attention, Done. Build its items only through `boardItems` in src/tasks.ts, which reads each workflow's schedule and runs and each task's ticket, and counts the step from `STEP_LISTS` in src/workflow.ts. The board picks the lane and wording from the item's state; never type a lane, position or status sentence. Needs attention holds everything that needs the person. Clicking a card doesn't leave Home: App turns each card's href into `#home?panel=<page>`, which opens that page in `HomePanel` (src/pages/HomePanel.tsx), a Drawer that slides in from the right, with a handle on its left edge to drag it wider or narrower (width remembered) and Open full page. The panel and the full page both come from `detailPage` in App.tsx (tickets, workflows, shared data), rendered with `isInPanel`, which only drops the page's breadcrumbs; never build a separate panel version of a page.
- Data shared with you lives in `SHARED_DATA` (src/sharedData.ts): outputs of other people's workflows, each with its owner and last run. Home's New data ready for use lane (only data none of your workflows reads yet, from `sharedInputsOf`) and the board's third Input choice ("Data shared with you", via 'shared'; a workflow input with status 'shared') both read it. A workflow of yours that reads shared data whose run failed shows in Needs attention (state upstreamFailed) because it can't process; At-risk account follow-ups is the example. Every shared data has its own page, `#data-<id>`: src/pages/SharedDataPage.tsx maps it into `SharedDataOverview` (`npx astryx component SharedDataOverview`): status, description, who shares it and from which workflow, how often it updates, the Recent runs of their workflow (`runs`), and its rows (`preview`; after a failed run, the last version that worked). WorkflowOverview and SharedDataOverview are both built from app/astryx-workflows/parts/OverviewParts.tsx (frame, heading, section, Recent runs), so change a shared piece there and both pages follow; never copy those pieces into a page. Home's cards (ready and failed) and the Library's Open button go there; its Use in a new workflow button opens `#workflow-new?data=<id>` with that data as the first Input. A failed card says "Previous workflow failed to produce an output. Please ask [owner] to check workflow." (`upstreamFailedLine`). Their workflows are never in `PREFILLED_WORKFLOWS`.
- Workflow context: what a workflow is for and the rules every LLM step follows, like a system prompt. It is set from the context button in the board's header, beside Try and Save (`ContextButton` in WorkflowBuilder.tsx), never as a tile. It is optional; a ready board without it shows a tip. It saves with the board (`SavedBoard.context`), prefilled workflows carry it in `Workflow.context` (checked by `dataProblems()`), and a past run shows it read only.
- Every workflow tile on the board renders `WorkflowTile`; kind names and icons come from `WORKFLOW_TILE_KINDS`. Tile text is `WorkflowTileContent`, never free text: Input = source, From, Reads; LLM = Step N, Instructions (where a tile leads is shown by lines, not text); Handoff = name, Format, Approver, Sends to. The board builds it in `tileContents`; a saved workflow keeps it in its columns (`toColumns`), and its page reads approvers and destinations from those. The board only adds React Flow's connection dots around it. Board-only pieces (connection line, setup panel, trial dialog, toolbar) stay in WorkflowBuilder.tsx until a second screen needs them. The board's tile panel lists no connections (no Comes from or Goes to); the lines on the board show them. It has a ResizeHandle on its left edge, like Home's side panel; its width is remembered and capped so the board keeps room for its toolbar.
- Words: "Handoff" is only the last tile kind (who gets the result). A value one workflow gives another is a "shared value" (code still calls these handoffs internally). Approval is "approval"/"Approver", never "OK". "Not connected" is only a tile with no lines; an app is "App not connected".
- Prefilled workflows live in `PREFILLED_WORKFLOWS` (src/workflow.ts). Each gets the same routes as a built one (#workflow-N, #workflow-edit-N), its board from `boardFromWorkflow`, and its steps in `STEP_LISTS` automatically. Add a new example workflow there, not as a special case in App.tsx.
- Board sections: dropping a saved workflow from the Library copies its tiles and lines into a `Section` (a React Flow parent node; tiles get `sectionId` and positions relative to it). Only a section's Handoff may draw a line out, and only into an LLM step of another workflow. In a saved workflow's columns (`toColumns`), a section isn't copied; each of its Handoffs that feeds this workflow counts as one input "From another workflow".
- Consistency: every workflow, step, app, shared value, ticket and destination the data mentions must exist. `dataProblems()` in src/integrity.ts checks this and the app logs each problem as a console error in development; browser tests fail on console errors. Connected apps live in `MCP_APPS` (src/workflow.ts), shared by workflow inputs, tickets and the board. To add an example workflow, add it to `PREFILLED_WORKFLOWS` and it appears in the sidebar, Home board, Library, page and canvas; never leave a ticket, step list or chat pointing at a workflow that isn't there.
