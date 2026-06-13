/** Core domain types shared across the planner. */

/** A screen-space point that may also carry a geo anchor (lat/lng) for reprojection. */
export type Pt = { x: number; y: number; lat?: number; lng?: number };

/** A drawn lawn zone. `pts` are screen-space; `geo` is the persisted lat/lng anchor. */
export type Zone = {
  id?: number;
  type: ZoneTypeKey;
  pts: Pt[];
  geo?: { lat: number; lng: number }[];
};

/** A placed sprinkler head with its spray geometry. */
export type Head = {
  id: number;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  type: HeadKey;
  radius: number;
  zoneType: string;
  /** Spray arc in degrees: 90 (corner), 180 (edge), 270, or 360 (full). */
  arc: number;
  /** Spray direction in degrees for partial arcs. */
  dir: number;
};

export type HeadKey = 'mp_rotator' | 'popup_spray' | 'rotor' | 'drip';
export type ZoneTypeKey = 'premium_lawn' | 'standard_lawn' | 'kurapia' | 'shade_bed';

export type HeadSpec = {
  name: string;
  brand: string;
  radius: number;
  saving: boolean;
  color: string;
  price: number;
  affiliate: string;
};

export type Muni = {
  rate: number;
  et: number;
  style: 'premium' | 'standard';
  note: string;
  center: [number, number];
};

/** A resolved water-rate profile used by the savings calculator. */
export type RateProfile = {
  name: string;
  rate: number;
  et: number;
  style: 'premium' | 'standard';
  note?: string;
  center?: [number, number];
};

export type ZoneType = {
  label: string;
  color: string;
  rec: HeadKey[];
  avoid: HeadKey[];
};

export type Recommendation = { type: 'warn' | 'tip'; text: string };
