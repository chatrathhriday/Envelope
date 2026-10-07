/** Imperative camera commands from ribbon buttons, overlays and shortcuts to the mounted viewer. */
export interface ViewerCommands {
  fitToSite: () => void;
  resetNorth: () => void;
  zoom: (direction: 1 | -1) => void;
}

let active: ViewerCommands | null = null;

export const viewerCommands: ViewerCommands & { attach: (c: ViewerCommands | null) => void } = {
  attach: (c) => {
    active = c;
  },
  fitToSite: () => active?.fitToSite(),
  resetNorth: () => active?.resetNorth(),
  zoom: (direction) => active?.zoom(direction),
};
