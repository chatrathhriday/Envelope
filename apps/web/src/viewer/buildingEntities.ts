import type { BuildingState, LonLat } from '@envelope/models';
import * as Cesium from 'cesium';
import type { SiteGeometry } from './site';

/** Construction-site palette: neutral, material-like colours (CLAUDE.md §6). */
const COLOURS = {
  soil: Cesium.Color.fromCssColorString('#9E8D74'),
  pit: Cesium.Color.fromCssColorString('#7C6A52'),
  hoarding: Cesium.Color.fromCssColorString('#D4D4CF'),
  concrete: Cesium.Color.fromCssColorString('#C2BEB5'),
  slabEdge: Cesium.Color.fromCssColorString('#77736B'),
  glass: Cesium.Color.fromCssColorString('#6F8B9C'),
};

/** Site hoarding height (m). Visual only. */
const HOARDING_M = 2.4;

const ll = (ring: LonLat[]) => ring.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat));
const llAt = (ring: LonLat[], h: number) => ring.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, h));
const closed = <T>(ring: T[]) => [...ring, ring[0]!];

/**
 * Rebuilds the plot, excavation and building entities for a construction month.
 * Heights are absolute (ellipsoidal), measured from the sampled ground height.
 */
export function renderSite(
  ds: Cesium.CustomDataSource,
  geo: SiteGeometry,
  groundM: number,
  state: BuildingState,
) {
  ds.entities.suspendEvents();
  ds.entities.removeAll();
  const { spec } = geo;
  const f = spec.floorToFloorM;
  const excavating = state.phase === 'excavation';
  // One basement storey; visual placeholder until the basement field arrives with CP2 quantities.
  const pitDepth = f * state.excavationProgress;

  // Bare-soil plot (with a hole over the pit while excavating).
  ds.entities.add({
    id: 'plot',
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(
        ll(geo.plotLL),
        excavating ? [new Cesium.PolygonHierarchy(ll(geo.footprintLL))] : [],
      ),
      height: groundM + 0.05,
      material: COLOURS.soil,
      shadows: Cesium.ShadowMode.RECEIVE_ONLY,
    },
  });

  ds.entities.add({
    id: 'hoarding',
    wall: {
      positions: llAt(closed(geo.plotLL), groundM),
      minimumHeights: closed(geo.plotLL).map(() => groundM),
      maximumHeights: closed(geo.plotLL).map(() => groundM + HOARDING_M),
      material: COLOURS.hoarding,
      shadows: Cesium.ShadowMode.CAST_ONLY,
    },
  });

  if (excavating && pitDepth > 0) {
    ds.entities.add({
      id: 'pit-floor',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(ll(geo.footprintLL)),
        height: groundM - pitDepth,
        material: COLOURS.pit,
      },
    });
    ds.entities.add({
      id: 'pit-walls',
      wall: {
        positions: llAt(closed(geo.footprintLL), groundM),
        minimumHeights: closed(geo.footprintLL).map(() => groundM - pitDepth),
        maximumHeights: closed(geo.footprintLL).map(() => groundM + 0.05),
        material: COLOURS.pit,
      },
    });
  }

  const frameTop = groundM + state.floorsBuilt * f;
  const cladFloors = Math.round(state.envelopeProgress * spec.floors);
  const cladTop = groundM + cladFloors * f;

  if (cladFloors > 0) {
    ds.entities.add({
      id: 'cladding',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(ll(geo.footprintLL)),
        height: groundM,
        extrudedHeight: cladTop,
        material: COLOURS.glass,
        shadows: Cesium.ShadowMode.CAST_ONLY,
      },
    });
  }
  if (state.floorsBuilt > cladFloors) {
    ds.entities.add({
      id: 'frame',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(ll(geo.footprintLL)),
        height: cladTop,
        extrudedHeight: frameTop,
        material: COLOURS.concrete,
        shadows: Cesium.ShadowMode.CAST_ONLY,
      },
    });
  }
  // Slab edges make each storey readable.
  for (let i = 1; i <= state.floorsBuilt; i++) {
    ds.entities.add({
      id: `slab-${i}`,
      polyline: {
        positions: llAt(closed(geo.footprintLL), groundM + i * f + 0.02),
        width: 1.5,
        arcType: Cesium.ArcType.NONE,
        material: COLOURS.slabEdge,
      },
    });
  }
  ds.entities.resumeEvents();
}

export function plotClipping(geo: SiteGeometry): Cesium.ClippingPolygonCollection {
  return new Cesium.ClippingPolygonCollection({
    polygons: [new Cesium.ClippingPolygon({ positions: ll(geo.plotLL) })],
  });
}
