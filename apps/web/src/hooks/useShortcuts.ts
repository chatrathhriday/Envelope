import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  // Sliders handle their own arrow keys; text inputs need them for the caret.
  return target.tagName === 'INPUT';
}

/** Global keyboard shortcuts (HANDOVER §3.2). Listed in the Help dialog. */
export function useShortcuts() {
  const stepHour = useAppStore((st) => st.stepHour);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      if (e.key === 'ArrowLeft') {
        stepHour(-1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        stepHour(1);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepHour]);
}

/** Advances the hour once per second while playback is on. */
export function usePlayback() {
  const playing = useAppStore((st) => st.ui.playing);
  const stepHour = useAppStore((st) => st.stepHour);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => stepHour(1), 1000);
    return () => window.clearInterval(id);
  }, [playing, stepHour]);
}
