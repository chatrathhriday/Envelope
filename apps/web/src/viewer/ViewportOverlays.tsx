import { ProgressBar, Tooltip, makeStyles, tokens } from '@fluentui/react-components';
import { Add16Regular, Subtract16Regular } from '@fluentui/react-icons';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import { viewerCommands } from './controller';

const useStyles = makeStyles({
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
  status: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    zIndex: 2,
    maxWidth: '60%',
    backgroundColor: '#FFFFFF',
    border: `1px solid ${shell.border}`,
    borderLeft: '3px solid #B8860B',
    borderRadius: '2px',
    padding: '4px 8px',
    fontSize: '12px',
    color: '#242424',
  },
  loading: { borderLeft: `3px solid ${shell.textSubtle}`, color: shell.textMuted },
  controls: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  button: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    border: `1px solid ${shell.border}`,
    borderRadius: '2px',
    color: '#3B3B3B',
    cursor: 'pointer',
    padding: 0,
    ':hover': { backgroundColor: '#F0F0F0' },
    ':focus-visible': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '1px' },
  },
  zoomGroup: { display: 'flex', flexDirection: 'column' },
  zoomTop: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  zoomBottom: { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' },
  compass: { width: '32px', height: '32px' },
  scale: {
    position: 'absolute',
    right: '8px',
    bottom: '8px',
    zIndex: 2,
    fontSize: '11px',
    color: '#242424',
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: '2px 6px 3px',
    borderRadius: '2px',
    fontVariantNumeric: 'tabular-nums',
  },
  scaleBar: { height: '4px', border: '1px solid #242424', borderTop: 'none', marginTop: '1px' },
});

/** Largest 1-2-5 step that fits in ~100 px. */
function niceScale(metresPerPixel: number): { metres: number; px: number } {
  const target = metresPerPixel * 100;
  const pow = 10 ** Math.floor(Math.log10(target));
  const step = [5, 2, 1].map((k) => k * pow).find((v) => v <= target) ?? pow;
  return { metres: step, px: step / metresPerPixel };
}

function formatMetres(m: number): string {
  return m >= 1000 ? `${m / 1000} km` : `${m} m`;
}

export function ViewportOverlays() {
  const s = useStyles();
  const basemap = useAppStore((st) => st.basemap);
  const placed = useAppStore((st) => st.buildingPlaced);
  const view = useAppStore((st) => st.view);
  const heading = view?.headingDeg ?? 0;
  const scale = view ? niceScale(view.metresPerPixel) : null;
  const loading = basemap.state === 'loading' || !placed;

  return (
    <>
      {loading && (
        <div className={s.topBar}>
          <ProgressBar thickness="medium" aria-label="Loading the 3D site" />
        </div>
      )}
      {loading ? (
        <div className={`${s.status} ${s.loading}`} data-testid="viewport-loading">
          {basemap.state === 'loading' ? 'Loading basemap…' : 'Placing the building on the ground…'}
        </div>
      ) : (
        basemap.notice && (
          <div className={s.status} role="status" data-testid="viewport-notice">
            {basemap.notice}
          </div>
        )
      )}

      <div className={s.controls}>
        <Tooltip content={`Heading ${heading}°. Reset to north`} relationship="label" positioning="before">
          <button
            type="button"
            className={s.button}
            data-testid="ctl-compass"
            onClick={() => viewerCommands.resetNorth()}
          >
            <svg className={s.compass} viewBox="0 0 32 32" aria-hidden>
              <g transform={`rotate(${-heading} 16 16)`}>
                <path d="M16 5 L20 16 L16 14.5 L12 16 Z" fill="#C4314B" />
                <path d="M16 27 L20 16 L16 17.5 L12 16 Z" fill="#8A8A8A" />
                <text x="16" y="4.6" textAnchor="middle" fontSize="5" fontFamily="Segoe UI" fill="#3B3B3B">
                  N
                </text>
              </g>
            </svg>
          </button>
        </Tooltip>
        <div className={s.zoomGroup}>
          <Tooltip content="Zoom in" relationship="label" positioning="before">
            <button
              type="button"
              className={`${s.button} ${s.zoomTop}`}
              data-testid="ctl-zoom-in"
              onClick={() => viewerCommands.zoom(1)}
            >
              <Add16Regular />
            </button>
          </Tooltip>
          <Tooltip content="Zoom out" relationship="label" positioning="before">
            <button
              type="button"
              className={`${s.button} ${s.zoomBottom}`}
              data-testid="ctl-zoom-out"
              onClick={() => viewerCommands.zoom(-1)}
            >
              <Subtract16Regular />
            </button>
          </Tooltip>
        </div>
      </div>

      {scale && (
        <div className={s.scale} data-testid="scale-bar" title="Scale at the site centre">
          {formatMetres(scale.metres)}
          <div className={s.scaleBar} style={{ width: `${Math.round(scale.px)}px` }} />
        </div>
      )}
    </>
  );
}
