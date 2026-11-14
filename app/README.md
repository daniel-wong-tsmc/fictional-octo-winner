# Workspace app (UI prototype)

React 19 + Vite + TypeScript, built on [Astryx](https://github.com/facebook/astryx) 0.7.15.
UI only: example data in `src/data.ts`, nothing runs or saves.

```bash
npm install
npm run dev
```

## Where things live

- `src/themes/workspace/workspaceTheme.ts`: the design tokens. Extends Astryx's neutral theme with the values measured from smry.ai (`../design/inspiration/smry`). Colour is reserved for run status. After editing, rebuild with `npm run astryx -- theme build src/themes/workspace/workspaceTheme.ts`.
- `src/pages/HomePage.tsx`: the to-do inbox.
- `src/pages/TicketPage.tsx`: a step ticket (inputs, instructions to the agent, output, connections, workbook).
- `.claude/CLAUDE.md`: Astryx rules for coding agents (written by `astryx init`).

Check the build against Astryx's rules with `npm run astryx -- doctor --built .`
