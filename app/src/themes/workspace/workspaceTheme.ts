/**
 * Workspace theme.
 *
 * Source values: design/inspiration/smry (dembrandt 0.39.2 + Playwright measurements).
 * Rule: the shell is grayscale. Colour only carries run status
 * (error = stopped, warning = out of date, info = needs approval, success = done).
 */
import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

export const workspaceTheme = defineTheme({
  name: 'workspace',
  extends: neutralTheme,
  // Fonts: Google Fonts, linked in index.html (with preconnect) and in workspace.fonts.css.
  typography: {
    scale: {base: 14, ratio: 1.2},
    body: {
      family: 'Inter',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    heading: {
      family: 'Geist',
      fallbacks: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  },
  // smry: every transition is 150ms ease, colour only.
  motion: {fast: 150, medium: 200, ratio: 0.75, character: 'crisp'},
  tokens: {
    // Grounds: grey wash around a white workbench (smry --sidebar / --workbench).
    '--color-background-body': ['#f1f1f1', '#050505'],
    '--color-background-surface': ['#ffffff', '#0c0c0c'],
    '--color-background-card': ['#ffffff', '#0c0c0c'],
    '--color-background-popover': ['#ffffff', '#121212'],
    '--color-background-muted': ['#f3f3f3', '#181818'],
    '--color-border': ['#dedede', '#232323'],
    // Ink (smry --foreground / --muted-foreground).
    '--color-text-primary': ['#1b1b1b', '#e3e3e3'],
    '--color-text-secondary': ['#6a6a6a', '#8e8e8e'],
    // Accent is ink, as on smry: primary buttons are near-black, not blue.
    '--color-accent': ['#1b1b1b', '#e3e3e3'],
    '--color-on-accent': ['#ffffff', '#0c0c0c'],
    // Status, the only colour in the product.
    '--color-error': ['#d1342b', '#f0645b'],
    '--color-warning': ['#b46a00', '#e2a24a'],
    '--color-info': ['#0077d6', '#4aa8f5'],
    '--color-success': ['#1f8a4c', '#4cc27e'],
    // Status dots and status icons paint the text-* roles, so set those to the same status colours.
    '--color-text-error': ['#d1342b', '#f0645b'],
    '--color-text-warning': ['#b46a00', '#e2a24a'],
    '--color-text-info': ['#0077d6', '#4aa8f5'],
    '--color-text-success': ['#1f8a4c', '#4cc27e'],
    // Radii: rows 8px, buttons 10px, panels 12px, small chips 6px.
    '--radius-inner': '6px',
    '--radius-element': '10px',
    '--radius-container': '12px',
    '--radius-page': '12px',
  },
  components: {
    // "Needs approval" gets its own blue dot, since accent is ink in this theme.
    'status-dot': {
      'variant:info': {
        backgroundColor: 'var(--color-icon-info)',
        color: 'var(--color-background-surface)',
      },
    },
  },
});
