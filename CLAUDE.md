# Project notes for coding agents

## Review before publishing
Pushing to GitHub redeploys the live site (GitHub Pages) for any change under `app/`.
For every change:
1. Build and check it locally (`cd app && npx tsc -b && npx vite build --base=./`, plus `npm run astryx -- doctor --built .`).
2. Show it to the owner first: keep the dev server running (`npx vite --host 0.0.0.0 --port 5173`) for the in-app preview, and update the review link (claude.ai artifact) with the new build.
3. Commit locally, but only push after the owner says the change looks good.

The app's Astryx rules are in `app/.claude/CLAUDE.md`. Workflow pages all use the shared `WorkflowOverview` component in `app/astryx-workflows`.
