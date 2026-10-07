import { FluentProvider } from '@fluentui/react-components';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useAppStore } from './store/appStore';
import { envelopeTheme } from './theme/theme';
import './theme/global.css';

declare global {
  interface Window {
    __envelope?: typeof useAppStore;
  }
}

// Exposed in dev only, for the e2e click-everything test to observe store changes.
if (import.meta.env.DEV) window.__envelope = useAppStore;

// No <StrictMode>: its dev double-mount makes Fluent's focus manager (keyborg) log a
// console error on every load, which breaks the "no console errors" gate. See DECISIONS.md D-013.
createRoot(document.getElementById('root')!).render(
  <FluentProvider theme={envelopeTheme} style={{ height: '100%' }}>
    <App />
  </FluentProvider>,
);
