import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import {themes, defaultThemeSlug} from './astryx-themes';
import App from './App';
import {dataProblems} from './integrity';

// In development, every example-data reference that doesn't point at something real is logged as an error.
if (import.meta.env.DEV) for (const problem of dataProblems()) console.error(`Data problem: ${problem}`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={themes[defaultThemeSlug]}>
      <App />
    </Theme>
  </StrictMode>,
);
