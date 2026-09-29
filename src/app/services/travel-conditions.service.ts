import { Injectable, inject } from '@angular/core';
import { TicketService } from '../pages/bookings/ticket.service';
import {
  RouteCatalogService,
  type TerminalInfo,
} from './route-catalog.service';

/** Small reusable condition vocabulary. Presentation components read these —
 *  condition logic never lives in pages. */
export type ConditionKind =
  | 'clear'
  | 'cloudy'
  | 'rain'
  | 'heavy-rain'
  | 'storm'
  | 'hot'
  | 'windy'
  | 'unknown';

/** Commuter-facing travel impact. Derived from the condition kind only —
 *  never claims closures, accidents or delays. */
export type TravelImpact = 'normal' | 'caution' | 'advisory';

export interface ConditionMeta {
  label: string;
  /** Comic sticker tag, e.g. "RAIN WATCH" / "CLEAR ROUTE". */
  badge: string;
  icon: string;
}

export interface TravelConditions {
  kind: ConditionKind;
  label: string;
  badge: string;
  icon: string;
  tempC: number | null;
  rainChance: number | null;
  visibilityKm: number | null;
  visibilityLabel: string;
  impact: TravelImpact;
  /** Always true until a real provider replaces this service. */
  demo: boolean;
  /** Day this sample applies to — a label, never a fake live timestamp. */
  sampleDay: string;
  /** Place these conditions describe (city / terminal / route endpoint). */
  place: string;
}

export interface TripConditionSummary {
  headline: string;
  detail: string;
}

/**
 * Frontend-prototype provider for travel conditions. There is no weather
 * backend, so every value is deterministic sample data: the same place on
 * the same day always yields the same conditions (seed = place + day of
 * year), and everything is labelled as sample data in the UI.
 *
 * Replace `resolveFor` with a real API call later — the model, the
 * classification and every consumer stay unchanged.
 *
 * Privacy: never requests geolocation. Context comes from the user's
 * bookings / selected trip / terminal, or a North Luzon default.
 */
@Injectable({ providedIn: 'root' })
export class TravelConditionsService {
  private ticketService = inject(TicketService);
  private catalog = inject(RouteCatalogService);

  /** Fallback context when the user has no trip or terminal selected. */
  readonly defaultPlace = 'Tuguegarao City';

  readonly meta: Record<Exclude<ConditionKind, 'unknown'>, ConditionMeta> = {
    clear: { label: 'Clear skies', badge: 'CLEAR ROUTE', icon: 'sunny-outline' },
    cloudy: { label: 'Cloudy', badge: 'OVERCAST', icon: 'cloudy-outline' },
    rain: { label: 'Light rain', badge: 'RAIN WATCH', icon: 'rainy-outline' },
    'heavy-rain': { label: 'Heavy rain', badge: 'HEAVY RAIN', icon: 'rainy-outline' },
    storm: { label: 'Storm', badge: 'STORM ALERT', icon: 'thunderstorm-outline' },
    hot: { label: 'Hot & humid', badge: 'HEAT NOTE', icon: 'sunny-outline' },
    windy: { label: 'Breezy', badge: 'BREEZY', icon: 'flag-outline' },
  };

  /** General conditions for a place (city / terminal / "current area"). */
  forPlace(place: string): TravelConditions {
    const trimmed = (place ?? '').trim();
    if (!trimmed) return this.unknown('');
    return this.resolveFor(trimmed);
  }

  /** Trip-aware conditions: blends origin + destination seeds so the
   *  summary reflects the corridor, not just one endpoint. */
  forTrip(from: string, to: string): TravelConditions {
    if (!from?.trim() && !to?.trim()) return this.unknown('');
    return this.resolveFor(`${from.trim()} ${to.trim()}`.trim());
  }

  /** Next upcoming booking (confirmed/boarding), if any. */
  nextTrip() {
    return this.ticketService.activeBooking;
  }

  /** Terminal serving a place, when the catalog knows one. */
  terminalFor(place: string): TerminalInfo | undefined {
    if (!place?.trim()) return undefined;
    return this.catalog.terminalForCity(place);
  }

  /** Catalog transit status for a corridor — actual prototype data
   *  (on-time / delayed), kept strictly separate from weather. */
  transitStatusFor(from: string, to: string): 'on-time' | 'delayed' | null {
    const norm = (s: string) => s.toLowerCase();
    const hit = this.catalog.routes.find(
      (r) => norm(from).includes(norm(r.from)) || norm(r.from).includes(norm(from)),
    );
    if (hit && (norm(to).includes(norm(hit.to)) || norm(hit.to).includes(norm(to)))) {
      return hit.status;
    }
    return hit?.status ?? null;
  }

  /** Commuter-friendly one-liner for a booking corridor. */
  tripSummary(from: string, to: string): TripConditionSummary {
    const c = this.forTrip(from, to);
    if (c.kind === 'unknown') {
      return {
        headline: 'Conditions unavailable',
        detail: "We couldn't determine travel conditions right now.",
      };
    }
    return {
      headline: this.headlineFor(c),
      detail: this.impactCopy(c.impact).detail,
    };
  }

  impactCopy(impact: TravelImpact): { title: string; detail: string } {
    switch (impact) {
      case 'caution':
        return {
          title: 'Allow extra time',
          detail: 'Rain may slow travel. Allow extra time getting to the terminal.',
        };
      case 'advisory':
        return {
          title: 'Expect slower travel',
          detail:
            'Heavy rain may affect travel conditions. Expect slower travel and check your trip before leaving.',
        };
      default:
        return {
          title: 'Roads look normal',
          detail: 'Travel conditions look normal for North Luzon trips today.',
        };
    }
  }

  impactFor(kind: ConditionKind): TravelImpact {
    if (kind === 'heavy-rain' || kind === 'storm') return 'advisory';
    if (kind === 'rain') return 'caution';
    return 'normal';
  }

  // ---------------------------------------------------------- internals

  private unknown(place: string): TravelConditions {
    return {
      kind: 'unknown',
      label: 'Unavailable',
      badge: 'NO DATA',
      icon: 'cloud-offline-outline',
      tempC: null,
      rainChance: null,
      visibilityKm: null,
      visibilityLabel: 'Unknown',
      impact: 'normal',
      demo: true,
      sampleDay: this.todayLabel(),
      place,
    };
  }

  private resolveFor(place: string): TravelConditions {
    const kind = this.kindFor(place);
    const m = this.meta[kind];
    const seed = this.hash(`${place.toLowerCase()}|${this.dayKey()}`);
    const tempC = this.tempFor(kind, seed);
    const rainChance = this.rainFor(kind, seed);
    const { km, label } = this.visibilityFor(kind);
    return {
      kind,
      label: m.label,
      badge: m.badge,
      icon: m.icon,
      tempC,
      rainChance,
      visibilityKm: km,
      visibilityLabel: label,
      impact: this.impactFor(kind),
      demo: true,
      sampleDay: this.todayLabel(),
      place,
    };
  }

  /** Weighted deterministic pick — stable for a place across a whole day. */
  private kindFor(place: string): Exclude<ConditionKind, 'unknown'> {
    const roll = this.hash(`${place.toLowerCase()}|${this.dayKey()}|kind`) % 100;
    if (roll < 24) return 'clear';
    if (roll < 48) return 'cloudy';
    if (roll < 68) return 'rain';
    if (roll < 78) return 'hot';
    if (roll < 88) return 'windy';
    if (roll < 94) return 'heavy-rain';
    return 'storm';
  }

  private tempFor(kind: ConditionKind, seed: number): number {
    const base: Record<string, [number, number]> = {
      clear: [28, 33],
      cloudy: [26, 30],
      rain: [24, 28],
      'heavy-rain': [23, 26],
      storm: [23, 26],
      hot: [33, 36],
      windy: [26, 30],
      unknown: [27, 27],
    };
    const [lo, hi] = base[kind] ?? [26, 30];
    return lo + (seed % (hi - lo + 1));
  }

  private rainFor(kind: ConditionKind, seed: number): number {
    const base: Record<string, [number, number]> = {
      clear: [0, 10],
      cloudy: [20, 35],
      rain: [55, 75],
      'heavy-rain': [80, 95],
      storm: [85, 98],
      hot: [5, 15],
      windy: [10, 25],
      unknown: [0, 0],
    };
    const [lo, hi] = base[kind] ?? [0, 0];
    return lo + (seed % (hi - lo + 1));
  }

  private visibilityFor(kind: ConditionKind): { km: number; label: string } {
    switch (kind) {
      case 'clear':
        return { km: 10, label: 'Clear' };
      case 'cloudy':
        return { km: 8, label: 'Good' };
      case 'rain':
        return { km: 5, label: 'Reduced' };
      case 'heavy-rain':
        return { km: 3, label: 'Low' };
      case 'storm':
        return { km: 2, label: 'Very low' };
      case 'hot':
        return { km: 9, label: 'Hazy' };
      case 'windy':
        return { km: 7, label: 'Good' };
      default:
        return { km: 0, label: 'Unknown' };
    }
  }

  private headlineFor(c: TravelConditions): string {
    switch (c.kind) {
      case 'rain':
        return 'Light rain possible around departure.';
      case 'heavy-rain':
      case 'storm':
        return 'Heavy rain may affect travel.';
      case 'hot':
        return 'Hot day — bring water for the terminal wait.';
      case 'windy':
        return 'Breezy along the route.';
      case 'cloudy':
        return 'Cloudy but travel looks normal.';
      default:
        return 'Conditions look normal for this trip.';
    }
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  private dayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  }

  private todayLabel(): string {
    return new Date().toLocaleDateString('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
}
