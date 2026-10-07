import { buildingStateForMonth, calendarMonthFor, toSchedule } from '@envelope/models';
import { makeStyles } from '@fluentui/react-components';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import type { BasemapResult } from './basemap';
import { basemapRequestFromUrl, fetchIonToken, setupBasemap, setupIonFallback } from './basemap';
import { plotClipping, renderSite } from './buildingEntities';
import { viewerCommands } from './controller';
import { activeLayer, renderImpact, sampleField } from './impactLayer';
import type { SiteGeometry } from './site';
import { siteGeometry } from './site';

const useStyles = makeStyles({
  root: { position: 'absolute', inset: 0 },
  probe: {
    position: 'absolute',
    pointerEvents: 'none',
    backgroundColor: '#FFFFFF',
    border: `1px solid ${shell.border}`,
    borderRadius: '2px',
    padding: '4px 6px',
    fontSize: '11px',
    lineHeight: '15px',
    color: '#242424',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
  },
  probeLabel: { color: shell.textMuted, marginRight: '6px' },
});

const DEG = Cesium.Math.toRadians(1);
/** Default oblique view used for the fly-in and Fit to site. */
const FIT_HEADING_DEG = 30;
const FIT_PITCH_DEG = -28;
const FIT_RANGE_FACTOR = 3.2;
const GROUND_SAMPLE_TIMEOUT_MS = 20_000;

/** Ground height (ellipsoidal m) just outside the plot, where the basemap is not clipped. */
async function sampleGround(
  viewer: Cesium.Viewer,
  basemap: BasemapResult,
  geo: SiteGeometry,
): Promise<number | null> {
  const cartos = geo.groundProbeLL.map((p) => Cesium.Cartographic.fromDegrees(p.lon, p.lat));
  const sample = async (): Promise<number | null> => {
    if (basemap.kind === 'google') {
      const out = await viewer.scene.sampleHeightMostDetailed(cartos);
      const hs = out.map((c) => c?.height).filter((h): h is number => Number.isFinite(h));
      return hs.length ? Math.min(...hs) : null;
    }
    if (basemap.kind === 'ion-fallback') {
      const out = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartos);
      const hs = out.map((c) => c.height).filter((h) => Number.isFinite(h));
      return hs.length ? Math.min(...hs) : 0;
    }
    return 0;
  };
  const timeout = new Promise<null>((resolve) =>
    window.setTimeout(() => resolve(null), GROUND_SAMPLE_TIMEOUT_MS),
  );
  try {
    return await Promise.race([sample(), timeout]);
  } catch {
    return null;
  }
}

function sunTime(year: number, constructionMonth: number, hour: number): Cesium.JulianDate {
  const mm = String(calendarMonthFor(constructionMonth)).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  // Site local time is IST (UTC+05:30, no DST); mid-month day stands in for the month.
  return Cesium.JulianDate.fromIso8601(`${year}-${mm}-15T${hh}:00:00+05:30`);
}

export function SiteViewer() {
  const s = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const dsRef = useRef<Cesium.CustomDataSource | null>(null);
  const impactRef = useRef<Cesium.CustomDataSource | null>(null);
  const basemapRef = useRef<BasemapResult | null>(null);
  const sphereRef = useRef<Cesium.BoundingSphere | null>(null);
  const geo = useMemo(() => siteGeometry(), []);
  const [ground, setGround] = useState<number | null>(null);
  const [probe, setProbe] = useState<{ x: number; y: number; lat: number; lon: number } | null>(null);
  const probeRef = useRef<{ lat: number; lon: number } | null>(null);

  const scenario = useAppStore((st) => st.scenario);
  const layers = useAppStore((st) => st.layers);
  const results = useAppStore((st) => st.results);
  const impactLayer = useAppStore((st) => st.impactLayer);
  const dustMetric = useAppStore((st) => st.dustMetric);
  const opacity = useAppStore((st) => st.layerOpacity);
  const showScenario = useAppStore((st) => st.showScenario);
  const shown = results ? results[showScenario] : null;
  const layer = useMemo(() => activeLayer(shown, impactLayer, dustMetric), [shown, impactLayer, dustMetric]);

  // Create the viewer once.
  useEffect(() => {
    const store = useAppStore.getState();
    const viewer = new Cesium.Viewer(containerRef.current!, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      baseLayer: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shadows: true,
      contextOptions: { webgl: { preserveDrawingBuffer: true } },
    });
    viewerRef.current = viewer;
    viewer.clock.shouldAnimate = false;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#DADDE0');
    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.shadowMap.softShadows = true;
    viewer.shadowMap.darkness = 0.4;
    viewer.shadowMap.maximumDistance = 2000;

    const ds = new Cesium.CustomDataSource('site');
    void viewer.dataSources.add(ds);
    dsRef.current = ds;
    const impact = new Cesium.CustomDataSource('impact');
    void viewer.dataSources.add(impact);
    impactRef.current = impact;

    // Start over the city; the fly-in to the plot follows once the ground height is known.
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(geo.origin.lon - 0.035, geo.origin.lat - 0.06, 9000),
      orientation: { heading: FIT_HEADING_DEG * DEG, pitch: -45 * DEG, roll: 0 },
    });

    let disposed = false;

    const flyToSite = (
      duration: number,
      headingDeg = FIT_HEADING_DEG,
      pitchDeg = FIT_PITCH_DEG,
      range?: number,
    ) => {
      const sphere = sphereRef.current;
      if (!sphere) return;
      viewer.camera.flyToBoundingSphere(sphere, {
        offset: new Cesium.HeadingPitchRange(
          headingDeg * DEG,
          pitchDeg * DEG,
          range ?? sphere.radius * FIT_RANGE_FACTOR,
        ),
        duration,
      });
    };

    const placeAt = (groundM: number, source: 'snapshot' | 'sampled' | 'ellipsoid', fly: boolean) => {
      const h = geo.takeoff.heightM;
      sphereRef.current = new Cesium.BoundingSphere(
        Cesium.Cartesian3.fromDegrees(geo.origin.lon, geo.origin.lat, groundM + h / 2),
        Math.hypot(geo.plotRadiusM, h / 2),
      );
      setGround(groundM);
      const st = useAppStore.getState();
      st.setGround({ heightM: groundM, source });
      st.setBuildingPlaced(true);
      if (fly) flyToSite(2);
    };

    const placeBuilding = async (basemap: BasemapResult) => {
      for (const t of basemap.tilesets) {
        t.clippingPolygons = plotClipping(geo);
        // Photogrammetry has no usable normals, so self-shadowing shows heavy acne (BUGS B-003).
        // Tiles receive the building's shadow but do not cast.
        t.shadows = Cesium.ShadowMode.RECEIVE_ONLY;
      }
      if (basemap.kind === 'osm' || basemap.kind === 'none') {
        placeAt(0, 'ellipsoid', true);
        return;
      }
      // Google surface heights are committed with the demo snapshot: place and fly at once, refine below.
      const snapshot = basemap.kind === 'google' ? geo.spec.site.groundEllipsoidalM : undefined;
      if (snapshot !== undefined) placeAt(snapshot, 'snapshot', true);
      const g = await sampleGround(viewer, basemap, geo);
      if (disposed) return;
      if (g === null) {
        if (snapshot !== undefined) return;
        placeAt(0, 'ellipsoid', true);
        store.setBasemap({
          state: 'ready',
          kind: basemap.kind,
          notice:
            'Ground height could not be measured from the basemap, so the building may not sit on the ground.',
        });
        return;
      }
      // Re-place only when the live sample differs noticeably from the snapshot.
      if (snapshot === undefined || Math.abs(snapshot - g) > 0.3)
        placeAt(g, 'sampled', snapshot === undefined);
      else useAppStore.getState().setGround({ heightM: snapshot, source: 'sampled' });
    };

    void (async () => {
      const request = basemapRequestFromUrl();
      const token = request === 'auto' ? await fetchIonToken() : null;
      if (disposed) return;
      let basemap = await setupBasemap(viewer, request, token);
      if (disposed) return;
      basemapRef.current = basemap;
      store.setBasemap({ state: 'ready', kind: basemap.kind, notice: basemap.notice });

      // If Google tiles start failing (quota, key), switch to the ion fallback once.
      if (basemap.kind === 'google') {
        let failures = 0;
        const google = basemap.tilesets[0]!;
        google.tileFailed.addEventListener(() => {
          failures += 1;
          if (failures !== 5 || disposed) return;
          viewer.scene.primitives.remove(google);
          void setupIonFallback(
            viewer,
            'Google 3D tiles stopped loading, so the map shows Cesium World Terrain with OSM Buildings.',
          ).then((fallback) => {
            if (disposed) return;
            basemap = fallback;
            basemapRef.current = fallback;
            store.setBasemap({ state: 'ready', kind: fallback.kind, notice: fallback.notice });
            void placeBuilding(fallback);
          });
        });
      }
      await placeBuilding(basemap);
    })();

    // Camera state → store (heading, pitch, range, scale) for the compass, scale bar and status bar.
    viewer.camera.percentageChanged = 0.005;
    const publishView = () => {
      const sphere = sphereRef.current;
      if (!sphere) return;
      const cam = viewer.camera;
      const range = Cesium.Cartesian3.distance(cam.positionWC, sphere.center);
      const fovy = (cam.frustum as Cesium.PerspectiveFrustum).fovy ?? 60 * DEG;
      const px = viewer.canvas.clientHeight || 1;
      useAppStore.getState().setView({
        headingDeg: Math.round(Cesium.Math.toDegrees(cam.heading)) % 360,
        pitchDeg: Math.round(Cesium.Math.toDegrees(cam.pitch)),
        rangeM: Math.round(range),
        metresPerPixel: (2 * range * Math.tan(fovy / 2)) / px,
      });
    };
    const removeChanged = viewer.camera.changed.addEventListener(publishView);
    const removeMoveEnd = viewer.camera.moveEnd.addEventListener(publishView);

    // Hover probe.
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let pending: Cesium.Cartesian2 | null = null;
    let raf = 0;
    handler.setInputAction((m: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      pending = Cesium.Cartesian2.clone(m.endPosition);
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        if (!pending || !viewer.scene.pickPositionSupported) return;
        const pos = viewer.scene.pickPosition(pending);
        if (!pos) {
          setProbe(null);
          useAppStore.getState().setCursor(null);
          return;
        }
        const c = Cesium.Cartographic.fromCartesian(pos);
        const lat = Cesium.Math.toDegrees(c.latitude);
        const lon = Cesium.Math.toDegrees(c.longitude);
        setProbe({ x: pending.x, y: pending.y, lat, lon });
        probeRef.current = { lat, lon };
        useAppStore.getState().setCursor({ lat, lon });
      });
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    viewerCommands.attach({
      capture: () => {
        viewer.render();
        return viewer.scene.canvas.toDataURL('image/jpeg', 0.85);
      },
      fitToSite: () => flyToSite(1.2),
      resetNorth: () => {
        const sphere = sphereRef.current;
        if (!sphere) return;
        const range = Cesium.Cartesian3.distance(viewer.camera.positionWC, sphere.center);
        const pitch = Math.min(-10, Cesium.Math.toDegrees(viewer.camera.pitch));
        flyToSite(0.8, 0, pitch, range);
      },
      zoom: (direction) => {
        const sphere = sphereRef.current;
        const range = sphere ? Cesium.Cartesian3.distance(viewer.camera.positionWC, sphere.center) : 500;
        if (direction > 0) viewer.camera.zoomIn(range > 60 ? range * 0.3 : 0);
        else viewer.camera.zoomOut(range * 0.4);
      },
    });

    return () => {
      disposed = true;
      viewerCommands.attach(null);
      if (raf) window.cancelAnimationFrame(raf);
      removeChanged();
      removeMoveEnd();
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [geo]);

  // Building and plot follow the construction month.
  useEffect(() => {
    const ds = dsRef.current;
    if (!ds || ground === null) return;
    const schedule = shown ? toSchedule(shown.programme.effective) : undefined;
    renderSite(
      ds,
      geo,
      ground,
      buildingStateForMonth(scenario.constructionMonth, geo.spec.floors, schedule),
      layer?.ghg,
    );
  }, [geo, ground, scenario.constructionMonth, shown, layer]);

  // Impact layer draped over the tiles and the plot.
  useEffect(() => {
    const ds = impactRef.current;
    if (!ds || ground === null || !shown) return;
    renderImpact(ds, shown, layer, geo, ground, opacity);
  }, [geo, ground, shown, layer, opacity]);

  // Sun position (and so shadows) follows the hour and month.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.clock.currentTime = sunTime(scenario.weatherYear, scenario.constructionMonth, scenario.hour);
    viewer.scene.requestRender();
  }, [scenario.weatherYear, scenario.constructionMonth, scenario.hour]);

  // Layer visibility.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.shadows = layers.shadows;
    if (dsRef.current) dsRef.current.show = layers.building;
    const basemap = basemapRef.current;
    if (basemap) {
      for (const t of basemap.tilesets) t.show = layers.basemap;
      if (basemap.imagery) basemap.imagery.show = layers.basemap;
    }
  }, [layers, ground]);

  return (
    <>
      <div
        ref={containerRef}
        className={s.root}
        data-testid="cesium-container"
        onMouseLeave={() => {
          setProbe(null);
          useAppStore.getState().setCursor(null);
        }}
      />
      {probe && (
        <div className={s.probe} style={{ left: probe.x + 14, top: probe.y + 14 }} data-testid="probe">
          <span className={s.probeLabel}>Lat</span>
          {probe.lat.toFixed(5)}°
          <span className={s.probeLabel} style={{ marginLeft: 8 }}>
            Lon
          </span>
          {probe.lon.toFixed(5)}°
          {shown &&
            layer?.field &&
            (() => {
              const v = sampleField(shown, layer.field, probe.lon, probe.lat, geo.origin);
              return v === null ? null : (
                <div data-testid="probe-value">
                  <span className={s.probeLabel}>{layer.scale.title}</span>
                  {v.toFixed(1)} {layer.scale.unit}
                </div>
              );
            })()}
        </div>
      )}
    </>
  );
}
