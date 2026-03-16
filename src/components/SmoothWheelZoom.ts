/**
 * Smooth wheel zoom handler for Leaflet.
 * Adapted from mutsuyuki/Leaflet.SmoothWheelZoom (MIT License).
 *
 * Uses requestAnimationFrame interpolation for continuous, smooth zoom
 * instead of Leaflet's built-in debounce-then-jump approach.
 */

import * as L from 'leaflet';

export interface SmoothWheelZoomOptions {
  /** Zoom sensitivity multiplier (default 1) */
  smoothSensitivity?: number;
  /** If 'center', zoom toward view center; otherwise zoom toward cursor */
  smoothWheelZoom?: boolean | 'center';
}

export class SmoothWheelZoom {
  private map: L.Map;
  private sensitivity: number;
  private zoomToCenter: boolean;
  private isWheeling = false;
  private wheelMousePosition: L.Point = L.point(0, 0);
  private centerPoint: L.Point = L.point(0, 0);
  private startLatLng: L.LatLng = L.latLng(0, 0);
  private wheelStartLatLng: L.LatLng = L.latLng(0, 0);
  private goalZoom = 0;
  private currentZoom = 0;
  private prevCenter: L.LatLng = L.latLng(0, 0);
  private prevZoom = 0;
  private moved = false;
  private zoomAnimationId = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private boundOnWheel: (e: WheelEvent) => void;

  constructor(map: L.Map, options?: SmoothWheelZoomOptions) {
    this.map = map;
    this.sensitivity = options?.smoothSensitivity ?? 1;
    this.zoomToCenter = options?.smoothWheelZoom === 'center';
    this.boundOnWheel = this.onWheelScroll.bind(this);
  }

  enable(): void {
    this.map.getContainer().addEventListener('wheel', this.boundOnWheel, { passive: false });
  }

  disable(): void {
    this.map.getContainer().removeEventListener('wheel', this.boundOnWheel);
    this.cleanup();
  }

  private cleanup(): void {
    this.isWheeling = false;
    cancelAnimationFrame(this.zoomAnimationId);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private onWheelScroll(e: WheelEvent): void {
    if (!this.isWheeling) {
      this.onWheelStart(e);
    }
    this.onWheeling(e);
  }

  private onWheelStart(e: WheelEvent): void {
    const map = this.map;
    this.isWheeling = true;
    this.wheelMousePosition = map.mouseEventToContainerPoint(e as any);
    this.centerPoint = map.getSize().divideBy(2);
    this.startLatLng = map.containerPointToLatLng(this.centerPoint);
    this.wheelStartLatLng = map.containerPointToLatLng(this.wheelMousePosition);
    this.moved = false;

    (map as any)._stop();
    if ((map as any)._panAnim) (map as any)._panAnim.stop();

    this.goalZoom = map.getZoom();
    this.prevCenter = map.getCenter();
    this.prevZoom = map.getZoom();

    this.zoomAnimationId = requestAnimationFrame(this.updateWheelZoom.bind(this));
  }

  private onWheeling(e: WheelEvent): void {
    const map = this.map;
    const delta = L.DomEvent.getWheelDelta(e as any);

    this.goalZoom = this.goalZoom + delta * 0.003 * this.sensitivity;
    if (this.goalZoom < map.getMinZoom() || this.goalZoom > map.getMaxZoom()) {
      this.goalZoom = (map as any)._limitZoom(this.goalZoom);
    }
    this.wheelMousePosition = map.mouseEventToContainerPoint(e as any);

    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.onWheelEnd(), 200);

    e.preventDefault();
    e.stopPropagation();
  }

  private onWheelEnd(): void {
    this.isWheeling = false;
    cancelAnimationFrame(this.zoomAnimationId);
    (this.map as any)._moveEnd(true);
  }

  private updateWheelZoom(): void {
    const map = this.map;

    if (!map.getCenter().equals(this.prevCenter) || map.getZoom() !== this.prevZoom) {
      return;
    }

    this.currentZoom = map.getZoom() + (this.goalZoom - map.getZoom()) * 0.3;
    this.currentZoom = Math.floor(this.currentZoom * 100) / 100;

    const delta = this.wheelMousePosition.subtract(this.centerPoint);
    if (delta.x === 0 && delta.y === 0) {
      return;
    }

    let center: L.LatLng;
    if (this.zoomToCenter) {
      center = this.startLatLng;
    } else {
      center = map.unproject(
        map.project(this.wheelStartLatLng, this.currentZoom).subtract(delta),
        this.currentZoom
      );
    }

    if (!this.moved) {
      (map as any)._moveStart(true, false);
      this.moved = true;
    }

    (map as any)._move(center, this.currentZoom);
    this.prevCenter = map.getCenter();
    this.prevZoom = map.getZoom();

    this.zoomAnimationId = requestAnimationFrame(this.updateWheelZoom.bind(this));
  }
}
