import { Injectable, inject } from '@angular/core';
import {
  RouteCatalogService,
  type CatalogRoute,
} from './route-catalog.service';
import type { Booking } from '../pages/bookings/ticket.service';

/** Canonical stop kind. Kept small on purpose for the prototype. */
export type RouteStopType =
  | 'origin'
  | 'terminal'
  | 'pickup'
  | 'stop'
  | 'destination';

/** Canonical stop state — derived, never stored or randomized. */
export type RouteStopStatus = 'completed' | 'current' | 'upcoming';

/** Timeline mode — controls how statuses are derived. */
export type RouteStopMode =
  | 'preview'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'unavailable';

/** One ordered stop on a route. Prototype demo data is labelled via
 *  `demo: true` — the sequence is fixed per route, never random. */
export interface RouteStop {
  id: string;
  name: string;
  type: RouteStopType;
  /** 0-based order in the route. */
  sequence: number;
  /** Fraction of the journey where the stop sits (0 origin → 1 destination). */
  fraction: number;
  /** True for simulated prototype stops (all intermediates today). */
  demo: boolean;
}

/** A stop with a calculated ETA + derived status for display. */
export interface TimedRouteStop extends RouteStop {
  /** Estimated arrival clock time, e.g. "9:10 AM". Empty when unknown. */
  etaLabel: string;
  /** Exact ETA instant, null when departure/duration is missing. */
  etaDate: Date | null;
  status: RouteStopStatus;
  /** Human status cue (non-color): "Departed", "Current stop", ... */
  statusLabel: string;
}

export interface RouteStopTimelineView {
  mode: RouteStopMode;
  stops: TimedRouteStop[];
  currentIndex: number;
  /** 0..1 progress between current stop and the next one. */
  segmentProgress: number;
  /** Overall 0..100 journey progress (same basis as Active Trip map). */
  progressPercent: number;
  currentStop: TimedRouteStop | null;
  nextStop: TimedRouteStop | null;
  departedLabel: string;
}

interface StopSeed {
  name: string;
  type: RouteStopType;
}

/**
 * Canonical route-stop data + deterministic ETA/status math.
 *
 * Single source of truth for every timeline in the app (Active Trip,
 * terminal boards, trip preparation). Intermediate stops are small
 * hand-written prototype catalogs keyed by route id — the same route
 * always yields the same ordered list. Unknown routes fall back to
 * origin → destination only (never invented mid-stops).
 *
 * Progress always comes from the caller (Active Trip's
 * departure-time ÷ duration fraction). This service never invents a
 * second progress algorithm and never claims live GPS.
 */
@Injectable({ providedIn: 'root' })
export class RouteStopsService {
  private catalog = inject(RouteCatalogService);

  // ------------------------------------------------------------ catalog

  /** Deterministic intermediate stops per catalog route id.
   *  Names follow the corridor's own place vocabulary (endpoints already
   *  present in the catalog); all are prototype demo data. */
  private readonly intermediates: Record<string, StopSeed[]> = {
    r1: [
      { name: 'Ilagan', type: 'stop' },
      { name: 'Cauayan', type: 'terminal' },
      { name: 'Santiago City', type: 'terminal' },
      { name: 'Solano', type: 'stop' },
    ],
    r2: [
      { name: 'Cauayan', type: 'stop' },
      { name: 'Solano', type: 'stop' },
      { name: 'San Jose City', type: 'stop' },
    ],
    r3: [{ name: 'Reina Mercedes', type: 'stop' }],
    r4: [
      { name: 'Bagabag', type: 'stop' },
      { name: 'Bayombong', type: 'terminal' },
    ],
    r5: [
      { name: 'Rosario', type: 'stop' },
      { name: 'Urdaneta', type: 'stop' },
      { name: 'Tarlac City', type: 'terminal' },
    ],
    r6: [
      { name: 'Tarlac City', type: 'stop' },
      { name: 'Rosario', type: 'stop' },
      { name: 'Vigan City', type: 'terminal' },
    ],
    r7: [
      { name: 'Tarlac City', type: 'stop' },
      { name: 'Candon', type: 'stop' },
      { name: 'Vigan approach', type: 'stop' },
    ],
    r8: [
      { name: 'Reina Mercedes', type: 'stop' },
      { name: 'Ilagan approach', type: 'stop' },
    ],
    r9: [
      { name: 'Bontoc junction', type: 'stop' },
      { name: 'Banaue junction', type: 'stop' },
    ],
    r10: [
      { name: 'Rosario', type: 'stop' },
      { name: 'Tagudin', type: 'stop' },
      { name: 'Candon', type: 'stop' },
    ],
    r11: [
      { name: 'Aritao', type: 'stop' },
      { name: 'Bayombong', type: 'terminal' },
      { name: 'Santiago City', type: 'terminal' },
      { name: 'Cauayan', type: 'stop' },
    ],
  };

  // ------------------------------------------------------------- lookup

  /** Catalog route matching a booking's endpoints (exact, then origin). */
  routeFor(from: string, to: string): CatalogRoute | undefined {
    const f = (from ?? '').trim().toLowerCase();
    const t = (to ?? '').trim().toLowerCase();
    if (!f || !t) return undefined;
    return (
      this.catalog.routes.find(
        (r) =>
          r.from.trim().toLowerCase() === f && r.to.trim().toLowerCase() === t,
      ) ?? this.catalog.routes.find((r) => f.includes(r.from.trim().toLowerCase()))
    );
  }

  /** Ordered canonical stops for a route. Never random, never empty when
   *  endpoints exist. Origin === destination collapses to a single stop. */
  stopsForRoute(routeId: string): RouteStop[];
  stopsForRoute(from: string, to: string): RouteStop[];
  stopsForRoute(routeOrFrom: string, to?: string): RouteStop[] {
    let route: CatalogRoute | undefined;
    if (to === undefined) route = this.catalog.find(routeOrFrom);
    else route = this.routeFor(routeOrFrom, to);
    if (!route) {
      // No catalog route: build an origin → destination pair when both
      // endpoints are known, otherwise signal "unavailable" with [].
      if (to !== undefined && routeOrFrom.trim() && to.trim()) {
        if (routeOrFrom.trim().toLowerCase() === to.trim().toLowerCase()) {
          return [this.makeStop('single', routeOrFrom.trim(), 'origin', 0, 0)];
        }
        return [
          this.makeStop('origin', routeOrFrom.trim(), 'origin', 0, 0),
          this.makeStop('destination', to.trim(), 'destination', 1, 1),
        ];
      }
      return [];
    }
    return this.stopsForCatalogRoute(route);
  }

  stopsForCatalogRoute(route: CatalogRoute): RouteStop[] {
    const from = route.from.trim();
    const to = route.to.trim();
    if (from.toLowerCase() === to.toLowerCase()) {
      return [this.makeStop(`${route.id}-s0`, from, 'origin', 0, 0)];
    }
    const mids = this.intermediates[route.id] ?? [];
    const names = [from, ...mids.map((m) => m.name), to];
    const total = names.length;
    return names.map((name, i) => {
      const type: RouteStopType =
        i === 0
          ? 'origin'
          : i === total - 1
            ? 'destination'
            : (mids[i - 1]?.type ?? 'stop');
      return this.makeStop(
        `${route.id}-s${i}`,
        i === 0 ? `${from} Terminal` : i === total - 1 ? `${to} Terminal` : name,
        type,
        i,
        total === 1 ? 0 : i / (total - 1),
        i > 0 && i < total - 1,
      );
    });
  }

  private makeStop(
    id: string,
    name: string,
    type: RouteStopType,
    sequence: number,
    fraction: number,
    demo = false,
  ): RouteStop {
    return { id, name, type, sequence, fraction, demo };
  }

  // ----------------------------------------------------- duration/time

  /** Catalog duration ('7h 30m') → minutes. Shared basis for map + ETAs. */
  durationToMinutes(duration: string): number {
    const hours = /(\d+(?:\.\d+)?)\s*h/i.exec(duration ?? '')?.[1];
    const minutes = /(\d+(?:\.\d+)?)\s*m(?!s)/i.exec(duration ?? '')?.[1];
    return (hours ? Number(hours) * 60 : 0) + (minutes ? Number(minutes) : 0);
  }

  tripMinutesFor(from: string, to: string): number {
    const hit = this.routeFor(from, to);
    const mins = hit ? this.durationToMinutes(hit.duration) : NaN;
    return Number.isFinite(mins) && mins > 0 ? mins : 0;
  }

  /** Parses booking date + time ("Sep 18, 2026" + "6:30 AM") → Date. */
  departureDate(dateStr: string, timeStr: string): Date | null {
    if (!dateStr?.trim() || !timeStr?.trim()) return null;
    const d = new Date(`${dateStr.trim()} ${timeStr.trim()}`);
    return isNaN(d.getTime()) ? null : d;
  }

  formatTime(d: Date): string {
    return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  }

  // ---------------------------------------------------------- timeline

  /**
   * Full timeline view for a booking. `progress` is the caller's
   * deterministic journey fraction (departure + device time ÷ duration) —
   * the same value that drives the Active Trip map marker.
   */
  timelineForBooking(booking: Booking | null, progress: number): RouteStopTimelineView {
    if (!booking) return this.empty('unavailable', progress);
    if (booking.status === 'cancelled') {
      const stops = this.stopsForRoute(booking.from, booking.to);
      return {
        mode: 'cancelled',
        stops: this.assignTimes(stops, null, 0, 'upcoming'),
        currentIndex: -1,
        segmentProgress: 0,
        progressPercent: this.clamp01(progress) * 100,
        currentStop: null,
        nextStop: null,
        departedLabel: '',
      };
    }
    const tripMinutes = this.tripMinutesFor(booking.from, booking.to);
    const departure = this.departureDate(booking.date, booking.time);
    const p = this.clamp01(progress);
    const stops = this.stopsForRoute(booking.from, booking.to);
    if (!stops.length) return this.empty('unavailable', progress);

    if (booking.status === 'completed' || p >= 1) {
      const timed = this.assignTimes(stops, departure, tripMinutes, 'completed');
      return {
        mode: 'completed',
        stops: timed,
        currentIndex: timed.length - 1,
        segmentProgress: 1,
        progressPercent: 100,
        currentStop: timed[timed.length - 1] ?? null,
        nextStop: null,
        departedLabel: departure ? this.formatTime(departure) : '',
      };
    }

    // Future booking (not yet departed): first stop is the boarding
    // point, everything else upcoming — never pretend the bus is moving.
    if (p <= 0) {
      const timed = this.assignTimes(stops, departure, tripMinutes, 'upcoming', 0);
      return {
        mode: booking.status === 'boarding' ? 'active' : 'preview',
        stops: timed,
        currentIndex: 0,
        segmentProgress: 0,
        progressPercent: 0,
        currentStop: timed[0] ?? null,
        nextStop: timed[1] ?? null,
        departedLabel: departure ? this.formatTime(departure) : '',
      };
    }

    const currentIndex = Math.min(
      stops.length - 1,
      Math.floor(p * stops.length),
    );
    const timed = this.assignTimes(stops, departure, tripMinutes, 'active', currentIndex);
    const curFrac = stops[currentIndex]?.fraction ?? 0;
    const nextFrac = stops[currentIndex + 1]?.fraction ?? 1;
    const span = Math.max(0.0001, nextFrac - curFrac);
    return {
      mode: 'active',
      stops: timed,
      currentIndex,
      segmentProgress: this.clamp01((p - curFrac) / span),
      progressPercent: Math.round(p * 100),
      currentStop: timed[currentIndex] ?? null,
      nextStop: timed[currentIndex + 1] ?? null,
      departedLabel: departure ? this.formatTime(departure) : '',
    };
  }

  /** Static preview (terminal boards, trip preparation, e-ticket): ordered
   *  stops with clock ETAs but no live statuses — all upcoming. */
  previewForRoute(routeId: string, dateStr: string, timeStr: string): RouteStopTimelineView {
    const route = this.catalog.find(routeId);
    const stops = route ? this.stopsForCatalogRoute(route) : [];
    if (!stops.length) return this.empty('unavailable', 0);
    const tripMinutes = route ? this.durationToMinutes(route.duration) : 0;
    const departure = this.departureDate(dateStr, timeStr);
    const timed = this.assignTimes(stops, departure, tripMinutes, 'upcoming');
    return {
      mode: 'preview',
      stops: timed,
      currentIndex: -1,
      segmentProgress: 0,
      progressPercent: 0,
      currentStop: timed[0] ?? null,
      nextStop: timed[1] ?? null,
      departedLabel: departure ? this.formatTime(departure) : '',
    };
  }

  // ------------------------------------------------------------ helpers

  private empty(mode: RouteStopMode, progress: number): RouteStopTimelineView {
    return {
      mode,
      stops: [],
      currentIndex: -1,
      segmentProgress: 0,
      progressPercent: Math.round(this.clamp01(progress) * 100),
      currentStop: null,
      nextStop: null,
      departedLabel: '',
    };
  }

  private assignTimes(
    stops: RouteStop[],
    departure: Date | null,
    tripMinutes: number,
    activeKind: 'active' | 'upcoming' | 'completed',
    currentIndex = -1,
  ): TimedRouteStop[] {
    return stops.map((s, i) => {
      let etaDate: Date | null = null;
      let etaLabel = '';
      if (departure && tripMinutes > 0) {
        etaDate = new Date(departure.getTime() + s.fraction * tripMinutes * 60000);
        etaLabel = this.formatTime(etaDate);
      }
      let status: RouteStopStatus = 'upcoming';
      if (activeKind === 'completed') status = 'completed';
      else if (activeKind === 'active') {
        status = i < currentIndex ? 'completed' : i === currentIndex ? 'current' : 'upcoming';
      }
      return { ...s, etaDate, etaLabel, status, statusLabel: this.statusLabelFor(status, s.type) };
    });
  }

  private statusLabelFor(status: RouteStopStatus, type: RouteStopType): string {
    if (status === 'completed') return type === 'origin' ? 'Departed' : 'Reached';
    if (status === 'current') return 'Current stop';
    return type === 'origin' ? 'Departs here' : type === 'destination' ? 'Destination' : 'Upcoming';
  }

  private clamp01(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
  }
}
