import { Injectable } from '@angular/core';

/** Where a located point came from. `gps` is a real device fix; everything
 *  else is user-chosen or prototype data (see `simulated`). */
export type PickupSource =
  | 'gps'
  | 'current'
  | 'suggested'
  | 'search'
  | 'map'
  | 'origin-fallback';

export interface LocatedPoint {
  label: string;
  lat: number;
  lng: number;
  source: PickupSource;
  /** True when the coordinates stand in for a real fix (GPS denied /
   *  unsupported). The UI must say so instead of implying live GPS. */
  simulated: boolean;
}

export interface PickupSpot {
  id: string;
  label: string;
  sub: string;
  lat: number;
  lng: number;
}

export type PickupZone = 'arrived' | 'near' | 'approaching' | 'far' | 'unknown';

export interface PickupState {
  /** Where the commuter's device was last seen. */
  current: LocatedPoint | null;
  /** The explicitly chosen boarding point (never overwritten by GPS). */
  pickup: LocatedPoint | null;
  /** Zones already surfaced for this session — one alert per zone. */
  notified: Partial<Record<Exclude<PickupZone, 'unknown'>, true>>;
  updatedAt: number;
}

/** Centralized distance thresholds (meters) — tune here, not in the UI. */
export const PICKUP_THRESHOLDS = {
  /** At (or inside) the pickup point. */
  arrivedM: 50,
  /** A short walk away. */
  nearM: 300,
  /** Time to start moving. Anything beyond this is FAR. */
  approachingM: 1000,
} as const;

interface PickupStore {
  /** Pre-booking staging area (hail + booking flow). */
  active: PickupState;
  /** Frozen per-booking copies, keyed by bookingRef. */
  byBooking: Record<string, PickupState>;
}

/**
 * Single source of truth for "where am I vs where do I board".
 * Frontend-only: GPS via `navigator.geolocation` when granted, otherwise
 * deterministic prototype data with `simulated: true` so the UI never
 * pretends a precise live fix exists.
 */
@Injectable({ providedIn: 'root' })
export class PickupService {
  private readonly storageKey = 'byahero.pickup.v1';

  /** Real city centers, copied from the app's existing map data (home/search). */
  readonly CITY_COORDS: Record<string, [number, number]> = {
    baguio: [16.4023, 120.596],
    tuguegarao: [17.6132, 121.727],
    pitx: [14.493, 120.986],
    manila: [14.5995, 120.9842],
    cubao: [14.622, 121.0533],
    cauayan: [16.9333, 121.7667],
    ilagan: [17.1487, 121.8895],
    solano: [16.5167, 121.1833],
    cabanatuan: [15.4864, 120.9679],
    santiago: [16.6864, 121.549],
    vigan: [17.5747, 120.3869],
    laoag: [18.196, 120.5936],
    sagada: [17.0928, 120.9008],
    banaue: [16.9107, 121.0594],
    pagudpud: [18.561, 120.786],
    bontoc: [17.091, 120.977],
    tabuk: [17.418, 121.444],
    aparri: [18.354, 121.638],
    'san fernando': [16.615, 120.317],
    dagupan: [16.043, 120.333],
    alaminos: [16.156, 119.981],
    baler: [15.759, 121.562],
    bayombong: [16.487, 121.15],
  };

  /** Terminals with real coordinates, from the existing search data. */
  private readonly TERMINALS: PickupSpot[] = [
    {
      id: 'terminal-baguio',
      label: 'Baguio Terminal',
      sub: 'Bus terminal · Baguio City',
      lat: 16.412,
      lng: 120.596,
    },
    {
      id: 'terminal-cubao',
      label: 'Victory Liner Cubao',
      sub: 'Bus terminal · Quezon City',
      lat: 14.622,
      lng: 121.0533,
    },
  ];

  // ---------------------------------------------------------- coordinates

  /** Display names for the city-center keys above. */
  private readonly CITY_NAMES: Record<string, string> = {
    baguio: 'Baguio City',
    tuguegarao: 'Tuguegarao',
    pitx: 'Manila (PITX)',
    manila: 'Manila',
    cubao: 'Cubao, QC',
    cauayan: 'Cauayan',
    ilagan: 'Ilagan',
    solano: 'Solano',
    cabanatuan: 'Cabanatuan',
    santiago: 'Santiago City',
    vigan: 'Vigan City',
    laoag: 'Laoag City',
    sagada: 'Sagada',
    banaue: 'Banaue',
    pagudpud: 'Pagudpud',
    bontoc: 'Bontoc',
    tabuk: 'Tabuk City',
    aparri: 'Aparri',
    'san fernando': 'San Fernando City',
    dagupan: 'Dagupan City',
    alaminos: 'Alaminos',
    baler: 'Baler',
    bayombong: 'Bayombong',
  };

  /** Best-effort city-center lookup for a free-text place (home parity). */
  coordsFor(place: string): [number, number] {
    const p = (place ?? '').toLowerCase();
    const key = Object.keys(this.CITY_COORDS).find((k) => p.includes(k));
    return key ? this.CITY_COORDS[key] : this.CITY_COORDS['baguio'];
  }

  /** Nearest known city to a coordinate pair ("Current area: …").
   *  Straight-line nearest of the app's real city centers — an area hint,
   *  not a precise address. */
  nearestCity(lat: number, lng: number): string {
    let bestKey = 'baguio';
    let bestM = Number.POSITIVE_INFINITY;
    for (const key of Object.keys(this.CITY_COORDS)) {
      const [cLat, cLng] = this.CITY_COORDS[key];
      const m = this.haversineM(lat, lng, cLat, cLng);
      if (m < bestM) {
        bestM = m;
        bestKey = key;
      }
    }
    return this.CITY_NAMES[bestKey] ?? bestKey;
  }
  /** Suggested boarding points: origin city center + known terminals.
   *  All coordinates come from existing app data — no invented locations. */
  suggestedSpots(originLabel: string): PickupSpot[] {
    const [lat, lng] = this.coordsFor(originLabel);
    return [
      {
        id: 'origin-center',
        label: `${originLabel} — City center`,
        sub: 'Boarding area',
        lat,
        lng,
      },
      ...this.TERMINALS,
    ];
  }

  /**
   * Deterministic prototype fix near the origin city — same coordinates on
   * every run, honestly labeled `simulated`. The hail flow uses this
   * instantly so it never waits on GPS; a real fix may refine it later.
   * Offset ≈1.1 km from the city center so distances/zones actually vary.
   */
  simulatedCurrent(originLabel: string): LocatedPoint {
    const [lat, lng] = this.coordsFor(originLabel);
    return {
      label: `${originLabel} (simulated location)`,
      lat: lat + 0.008,
      lng: lng + 0.006,
      source: 'origin-fallback',
      simulated: true,
    };
  }

  // ---------------------------------------------------------------- state

  getActive(): PickupState {
    return this.readStore().active;
  }

  setCurrent(point: LocatedPoint) {
    const store = this.readStore();
    store.active = { ...store.active, current: point, updatedAt: Date.now() };
    this.writeStore(store);
  }

  /** The commuter explicitly chooses the pickup — GPS never overwrites it.
   *  Changing it restarts the notification lifecycle (§13). */
  setPickup(point: LocatedPoint) {
    const store = this.readStore();
    store.active = {
      ...store.active,
      pickup: point,
      notified: {},
      updatedAt: Date.now(),
    };
    this.writeStore(store);
  }

  resetActive() {
    const store = this.readStore();
    store.active = this.freshState();
    this.writeStore(store);
  }

  /** Freeze the staging area onto a booking when the ticket is created. */
  snapshotToBooking(bookingRef: string, pickup?: LocatedPoint | null) {
    if (!bookingRef) return;
    const store = this.readStore();
    store.byBooking[bookingRef] = {
      current: store.active.current,
      pickup: pickup ?? store.active.pickup,
      notified: {},
      updatedAt: Date.now(),
    };
    this.writeStore(store);
  }

  /**
   * State for a booked trip: the frozen copy, or — for bookings made before
   * pickup existed — a view derived from the booking's pickup fields plus
   * the last-known current location. Null when there is no pickup at all.
   */
  stateForBooking(
    bookingRef: string,
    bookingPickup?: { label: string; lat?: number; lng?: number } | null,
  ): PickupState | null {
    const store = this.readStore();
    const frozen = store.byBooking[bookingRef];
    if (frozen?.pickup) return frozen;
    if (bookingPickup?.label && bookingPickup.lat != null && bookingPickup.lng != null) {
      return {
        current: store.active.current,
        pickup: {
          label: bookingPickup.label,
          lat: bookingPickup.lat,
          lng: bookingPickup.lng,
          source: 'suggested',
          simulated: false,
        },
        notified: {},
        updatedAt: Date.now(),
      };
    }
    return null;
  }

  /** Best-effort refresh of the stored current location for a booking
   *  (used when the traveler opens Active Trip). Never throws; keeps the
   *  old fix when GPS is unavailable. */
  async refreshCurrentForBooking(bookingRef: string): Promise<void> {
    const store = this.readStore();
    const state = store.byBooking[bookingRef];
    if (!state?.pickup) return;
    try {
      const point = await this.locateCurrent('Nearby', state.pickup.lat, state.pickup.lng);
      state.current = point;
      state.updatedAt = Date.now();
      this.writeStore(store);
    } catch {
      return;
    }
  }

  /**
   * Device GPS with an honest simulated fallback. Guaranteed to settle:
   * the browser's own `timeout` does NOT fire while a location permission
   * prompt sits unanswered (neither callback runs), which used to leave
   * hailing stuck on "locating" forever — so we race GPS against our own
   * timer and fall back to the saved origin instead of hanging.
   *
   * NOTE: the hail flow itself no longer waits on this — hailing runs on
   * simulatedCurrent() instantly, with GPS only refining in the background.
   * This stays for explicit "use my location" taps and Active Trip refresh.
   */
  locateCurrent(
    fallbackLabel: string,
    fallbackLat: number,
    fallbackLng: number,
    timeoutMs = 9000,
  ): Promise<LocatedPoint> {
    const fallback = (): LocatedPoint => ({
      label: `${fallbackLabel} (GPS unavailable)`,
      lat: fallbackLat,
      lng: fallbackLng,
      source: 'origin-fallback',
      simulated: true,
    });
    if (!navigator.geolocation) return Promise.resolve(fallback());
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(fallback());
        }
      }, timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({
            label: 'Your current location',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            source: 'gps',
            simulated: false,
          });
        },
        () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(fallback());
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
      );
    });
  }

  // ----------------------------------------------------------------- math

  /** Great-circle distance in meters (Haversine). */
  haversineM(
    aLat: number,
    aLng: number,
    bLat: number,
    bLng: number,
  ): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const earthM = 6371000;
    const dLat = rad(bLat - aLat);
    const dLng = rad(bLng - aLng);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * earthM * Math.asin(Math.sqrt(s));
  }

  distanceM(state: PickupState | null): number | null {
    if (!state?.current || !state.pickup) return null;
    return this.haversineM(
      state.current.lat,
      state.current.lng,
      state.pickup.lat,
      state.pickup.lng,
    );
  }

  zoneFor(distanceM: number | null): PickupZone {
    if (distanceM == null || !Number.isFinite(distanceM) || distanceM < 0) {
      return 'unknown';
    }
    if (distanceM <= PICKUP_THRESHOLDS.arrivedM) return 'arrived';
    if (distanceM <= PICKUP_THRESHOLDS.nearM) return 'near';
    if (distanceM <= PICKUP_THRESHOLDS.approachingM) return 'approaching';
    return 'far';
  }

  /** Readable distance: "350 m away" / "1.4 km away". Null when unknown. */
  formatDistance(distanceM: number | null): string | null {
    if (distanceM == null || !Number.isFinite(distanceM) || distanceM < 0) {
      return null;
    }
    if (distanceM < 1000) return `${Math.max(0, Math.round(distanceM / 10) * 10)} m away`;
    return `${(distanceM / 1000).toFixed(1)} km away`;
  }

  /** Short zone line for sheets and cards. */
  zoneMessage(zone: PickupZone, distanceLabel: string | null): string | null {
    switch (zone) {
      case 'arrived':
        return 'You have arrived at your pickup point.';
      case 'near':
        return distanceLabel
          ? `You are ${distanceLabel} — almost there.`
          : 'You are near your pickup point.';
      case 'approaching':
        return distanceLabel
          ? `Pickup point is ${distanceLabel}. Make your way there.`
          : 'Make your way to your pickup point.';
      case 'far':
        return distanceLabel
          ? `Pickup point is ${distanceLabel}. Leave early so you don't miss your trip.`
          : 'Your pickup point is far away.';
      default:
        return null;
    }
  }

  /**
   * Evaluate a state and record newly reached zones (persisted per session).
   * Returns the zone plus whether it is newly reached — callers use `isNew`
   * to decide if a fresh notification is warranted (no repeat spam).
   */
  evaluate(state: PickupState | null): {
    zone: PickupZone;
    distanceM: number | null;
    isNew: boolean;
  } {
    const distance = this.distanceM(state);
    const zone = this.zoneFor(distance);
    if (!state || zone === 'unknown') return { zone, distanceM: distance, isNew: false };
    if (state.notified[zone]) return { zone, distanceM: distance, isNew: false };
    return { zone, distanceM: distance, isNew: true };
  }

  /** Record that a zone was surfaced for the active session. */
  markNotified(zone: Exclude<PickupZone, 'unknown'>) {
    const store = this.readStore();
    store.active.notified[zone] = true;
    store.active.updatedAt = Date.now();
    this.writeStore(store);
  }

  /** Record that a zone was surfaced for a booked trip. */
  markNotifiedForBooking(bookingRef: string, zone: Exclude<PickupZone, 'unknown'>) {
    const store = this.readStore();
    const state = store.byBooking[bookingRef];
    if (!state) return;
    state.notified[zone] = true;
    state.updatedAt = Date.now();
    this.writeStore(store);
  }

  // --------------------------------------------------------------- storage

  private freshState(): PickupState {
    return { current: null, pickup: null, notified: {}, updatedAt: Date.now() };
  }

  private readStore(): PickupStore {
    const fallback: PickupStore = { active: this.freshState(), byBooking: {} };
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<PickupStore>;
      return {
        active: { ...this.freshState(), ...(parsed.active ?? {}) },
        byBooking:
          parsed.byBooking && typeof parsed.byBooking === 'object'
            ? parsed.byBooking
            : {},
      };
    } catch {
      return fallback;
    }
  }

  private writeStore(store: PickupStore) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(store));
    } catch {
      // Memory-only if storage is unavailable.
    }
  }
}
