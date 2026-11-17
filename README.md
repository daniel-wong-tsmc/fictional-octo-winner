# Workspace: workflow platform prototype

UI prototype of a workflow orchestration platform for business users, built with Meta's Astryx design system and a theme taken from smry.ai. Example data only; nothing runs or saves.

**Live site:** https://daniel-wong-tsmc.github.io/fictional-octo-winner/

- `app/`: the React + Vite + Astryx app. See `app/README.md` to run it locally.
- `design/`: the smry.ai design capture and early sketches.

## Deploying

`.github/workflows/deploy-pages.yml` builds `app/` and publishes it to GitHub Pages on every push that changes `app/`. You can also run it by hand from the Actions tab.

One-time setup: in the repository on GitHub, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
