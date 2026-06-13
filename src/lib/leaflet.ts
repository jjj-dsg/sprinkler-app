/**
 * Minimal type surface for the Leaflet runtime loaded from CDN.
 * We don't bundle Leaflet, so we type only the subset of its API we call.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface LeafletMouseEvent {
  containerPoint: Point;
  latlng: LatLng;
}

export interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
  invalidateSize(): void;
  getContainer(): HTMLElement;
  getCenter(): LatLng;
  latLngToContainerPoint(latlng: [number, number] | LatLng): Point;
  containerPointToLatLng(point: [number, number] | Point): LatLng;
  on(event: string, handler: (e: LeafletMouseEvent) => void): void;
}

export interface LeafletStatic {
  map(el: HTMLElement, opts?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, opts?: Record<string, unknown>): { addTo(map: LeafletMap): void };
  control: { scale(opts?: Record<string, unknown>): { addTo(map: LeafletMap): void } };
}

declare global {
  interface Window {
    L?: LeafletStatic;
  }
}
