import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  ellipseOutline,
  flagOutline,
  locationOutline,
  navigateOutline,
  timeOutline,
} from 'ionicons/icons';
import type {
  RouteStopMode,
  TimedRouteStop,
} from '../../services/route-stops.service';

addIcons({
  'checkmark-circle': checkmarkCircle,
  'ellipse-outline': ellipseOutline,
  'flag-outline': flagOutline,
  'location-outline': locationOutline,
  'navigate-outline': navigateOutline,
  'time-outline': timeOutline,
});

export type TimelineVariant = 'full' | 'compact';

/**
 * Reusable route-stop timeline. Dumb by design: the parent builds a
 * RouteStopTimelineView via RouteStopsService and passes data in —
 * this component never reads bookings, clocks, or GPS itself.
 */
@Component({
  selector: 'app-route-stop-timeline',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './route-stop-timeline.component.html',
  styleUrls: ['./route-stop-timeline.component.scss'],
})
export class RouteStopTimelineComponent {
  /** Ordered stops with ETA + derived status. */
  @Input() stops: TimedRouteStop[] = [];
  /** Timeline mode from the view (preview/active/completed/...). */
  @Input() mode: RouteStopMode = 'preview';
  /** 'full' for Active Trip, 'compact' for boards and preparation. */
  @Input() variant: TimelineVariant = 'full';
  /** 0..1 progress between current stop and the next one. */
  @Input() segmentProgress = 0;
  /** Compact header line, e.g. "Tuguegarao → Santiago · 5 stops". */
  @Input() headline = '';
  /** Max stops rendered in compact mode (rest collapse into "+N more"). */
  @Input() compactLimit = 5;

  constructor() {
    addIcons({
      checkmarkCircle,
      ellipseOutline,
      flagOutline,
      locationOutline,
      navigateOutline,
      timeOutline,
    });
  }

  get isCompact(): boolean {
    return this.variant === 'compact';
  }

  get visibleStops(): TimedRouteStop[] {
    if (!this.isCompact || this.stops.length <= this.compactLimit) return this.stops;
    const head = this.stops.slice(0, this.compactLimit - 1);
    const tail = this.stops[this.stops.length - 1];
    return tail ? [...head, tail] : head;
  }

  get hiddenCount(): number {
    if (!this.isCompact || this.stops.length <= this.compactLimit) return 0;
    return this.stops.length - this.compactLimit;
  }

  get currentStop(): TimedRouteStop | null {
    return this.stops.find((s) => s.status === 'current') ?? null;
  }

  /** Between-stop caption, e.g. "Between Alcala and Amulung · 40%". */
  get betweenLabel(): string {
    if (this.mode !== 'active' || !this.currentStop) return '';
    const idx = this.stops.indexOf(this.currentStop);
    const next = this.stops[idx + 1];
    if (!next) return `At ${this.currentStop.name} — final stop`;
    const pct = Math.round(Math.min(1, Math.max(0, this.segmentProgress)) * 100);
    return `Between ${this.currentStop.name} and ${next.name} · ${pct}%`;
  }

  markerIcon(stop: TimedRouteStop): string {
    if (stop.status === 'completed') return 'checkmark-circle';
    if (stop.type === 'destination') return 'flag-outline';
    if (stop.type === 'origin') return 'location-outline';
    return 'ellipse-outline';
  }

  markerAria(stop: TimedRouteStop, index: number): string {
    const pos = `Stop ${index + 1} of ${this.stops.length}`;
    const eta = stop.etaLabel ? `, estimated arrival ${stop.etaLabel}` : '';
    return `${pos}: ${stop.name}, ${stop.statusLabel}${eta}`;
  }

  etaText(stop: TimedRouteStop): string {
    if (!stop.etaLabel) return stop.statusLabel;
    if (stop.status === 'completed') return `Departed ${stop.etaLabel}`;
    if (stop.status === 'current') return `Estimated arrival ${stop.etaLabel}`;
    return `Estimated ${stop.etaLabel}`;
  }

  typeTag(stop: TimedRouteStop): string {
    switch (stop.type) {
      case 'origin':
        return 'ORIGIN';
      case 'destination':
        return 'DEST';
      case 'terminal':
        return 'TERMINAL';
      case 'pickup':
        return 'PICKUP';
      default:
        return 'STOP';
    }
  }
}
