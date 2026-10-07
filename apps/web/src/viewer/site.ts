import type { BuildingSpec, BuildingTakeoff, LonLat } from '@envelope/models';
import { bufferConvex, fromLocalEN, takeoff } from '@envelope/models';
import buildingJson from '../../../../fixtures/demo/building.json';

export const demoBuilding = buildingJson as BuildingSpec;

export interface SiteGeometry {
  spec: BuildingSpec;
  takeoff: BuildingTakeoff;
  origin: LonLat;
  footprintLL: LonLat[];
  /** Plot boundary: footprint buffered by spec.site.plotBufferM. Clipped out of the 3D tiles. */
  plotLL: LonLat[];
  /** Ring 5 m outside the plot, where ground height is sampled from the unclipped basemap. */
  groundProbeLL: LonLat[];
  /** Half-diagonal of the plot (m), for camera framing. */
  plotRadiusM: number;
}

export function siteGeometry(spec: BuildingSpec = demoBuilding): SiteGeometry {
  const t = takeoff(spec);
  const plotEN = bufferConvex(t.footprintEN, spec.site.plotBufferM);
  const toLL = (p: { e: number; n: number }) => fromLocalEN(p, t.origin);
  return {
    spec,
    takeoff: t,
    origin: t.origin,
    footprintLL: t.footprintEN.map(toLL),
    plotLL: plotEN.map(toLL),
    groundProbeLL: bufferConvex(plotEN, 5).map(toLL),
    plotRadiusM: Math.max(
      ...plotEN.map((p) => Math.hypot(p.e - t.footprintCentroidEN.e, p.n - t.footprintCentroidEN.n)),
    ),
  };
}
