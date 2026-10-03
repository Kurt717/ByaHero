import { Injectable, inject } from '@angular/core';
import {
  NetworkService,
  seatIdsForLayout,
  vehicleById,
  tripById,
  corridorById,
  type SeatLayout,
} from './network.service';
import type {
  BookingService,
  SeatPreference,
} from '../pages/booking/booking.service';

/** @deprecated Default 2+2 geometry (kept for legacy callers). New code
 *  renders from the vehicle's SeatLayout instead. */
export const SEAT_ROWS = 10;
/** @deprecated See SEAT_ROWS. */
export const SEAT_COLS = ['A', 'B', 'C', 'D'] as const;

/** @deprecated Zone boundaries for the default 10-row map. */
export const SEAT_ZONE_ROWS = {
  front: [1, 3],
  middle: [4, 7],
  back: [8, 10],
} as const;

/** Half-open occupancy interval [boardSeq, alightSeq): a rider alighting at
 *  stop S frees the seat for another rider boarding at S. */
export interface SeatInterval {
  boardSeq: number;
  alightSeq: number;
  bookingRef: string;
}

export interface SeatAvailability {
  total: number;
  preBooked: number;
  purchased: number;
  available: number;
  bookedSet: Set<string>;
}

type OccupancyStore = Record<string, Record<string, SeatInterval[]>>;

const V1_KEY = 'byahero.seats.v1';
const V2_KEY = 'byahero.seats.v2';
const V2_MIGRATED_KEY = 'byahero.seats.v2.migrated';
const BOOKINGS_V1_KEY = 'byahero.bookings.v1';

@Injectable({ providedIn: 'root' })
export class SeatService {
  private network = inject(NetworkService);

  /** Default 40-seat map ids (legacy callers + unresolved trips). */
  private defaultSeatIds(): string[] {
    const out: string[] = [];
    for (let r = 1; r <= SEAT_ROWS; r++) {
      for (const c of SEAT_COLS) out.push(`${r}${c}`);
    }
    return out;
  }

  get totalSeats(): number {
    return SEAT_ROWS * SEAT_COLS.length;
  }

  // ------------------------------------------------------------ trip keys

  /** Stable legacy id for a departure (operator|from|to|date). Kept so
   *  compare/rebook boards and old callers keep working. */
  keyFor(booking: BookingService): string {
    const operator = booking.trip?.operator ?? 'Unknown';
    const from = booking.trip?.from ?? 'Unknown';
    const to = booking.trip?.to ?? 'Unknown';
    return [operator, from, to, booking.travelDate].join('|');
  }

  /** Scheduled-departure key: tripId|date. Unresolved trips fall back to a
   *  namespaced legacy hash with full-route semantics. */
  departureKeyFor(booking: BookingService): string {
    const seg = this.segmentForBooking(booking);
    if (seg) return `${seg.tripId}|${booking.travelDate}`;
    return `legacy:${this.seedNumber(this.keyFor(booking)).toString(36)}`;
  }

  /** Segment context for a booking session: resolved network trip + stop
   *  sequences, or null when the trip is not on a demo corridor. */
  segmentForBooking(booking: BookingService): {
    tripId: string;
    corridorId: string;
    boardSeq: number;
    alightSeq: number;
    lastSeq: number;
  } | null {
    // Explicit session segment (trip-details board/alight pickers).
    const tripId = (booking as { tripId?: string }).tripId;
    const corridorId = (booking as { corridorId?: string }).corridorId;
    const board = (booking as { boardSeq?: number }).boardSeq;
    const alight = (booking as { alightSeq?: number }).alightSeq;
    if (tripId && corridorId != null && board != null && alight != null) {
      const corridor = corridorById(corridorId);
      return {
        tripId,
        corridorId,
        boardSeq: board,
        alightSeq: alight,
        lastSeq: corridor ? corridor.stops.length - 1 : Math.max(board, alight),
      };
    }
    // Legacy booking summary → resolve onto a corridor trip.
    if (!booking.trip) return null;
    const resolved = this.network.resolveTrip(
      booking.trip.operator,
      booking.trip.from,
      booking.trip.to,
    );
    if (!resolved) return null;
    return {
      tripId: resolved.trip.tripId,
      corridorId: resolved.corridor.id,
      boardSeq: resolved.boardSeq,
      alightSeq: resolved.alightSeq,
      lastSeq: resolved.corridor.stops.length - 1,
    };
  }

  /** Seat ids for a booking: vehicle layout when resolved, else default 40. */
  seatIdsForBooking(booking: BookingService): string[] {
    const seg = this.segmentForBooking(booking);
    const trip = seg ? tripById(seg.tripId) : null;
    const vehicle = trip ? vehicleById(trip.vehicleId) : null;
    return vehicle ? seatIdsForLayout(vehicle.layout) : this.defaultSeatIds();
  }

  /** Layout for a booking's vehicle (null = default 2+2 map). */
  layoutForBooking(booking: BookingService): SeatLayout | null {
    const seg = this.segmentForBooking(booking);
    const trip = seg ? tripById(seg.tripId) : null;
    return trip ? (vehicleById(trip.vehicleId)?.layout ?? null) : null;
  }

  // ---------------------------------------------------------------- store

  private readStore(): OccupancyStore {
    this.migrateV1Once();
    try {
      const raw = localStorage.getItem(V2_KEY);
      return raw ? (JSON.parse(raw) as OccupancyStore) : {};
    } catch {
      return {};
    }
  }

  private writeStore(store: OccupancyStore) {
    try {
      localStorage.setItem(V2_KEY, JSON.stringify(store));
    } catch {
      return;
    }
  }

  /** One-time migration: v1 whole-trip seat lists + v1 bookings become
   *  full-route [0, lastSeq] intervals (or legacy full-trip when the route
   *  is not on a corridor). Old tickets keep opening — they never read
   *  this store for rendering. */
  private migrateV1Once() {
    try {
      if (localStorage.getItem(V2_MIGRATED_KEY)) return;
      const rawSeats = localStorage.getItem(V1_KEY);
      const v1seats = rawSeats
        ? (JSON.parse(rawSeats) as Record<string, string[]>)
        : {};
      let bookings: {
        bookingRef?: string;
        operator?: string;
        from?: string;
        to?: string;
        date?: string;
        seatIds?: string[];
      }[] = [];
      try {
        const rawBookings = localStorage.getItem(BOOKINGS_V1_KEY);
        bookings = rawBookings ? JSON.parse(rawBookings) : [];
      } catch {
        bookings = [];
      }
      const store: OccupancyStore = {};
      const byKey = new Map<string, string>();
      for (const b of bookings) {
        if (b.bookingRef && b.operator && b.from && b.to && b.date) {
          byKey.set(
            [b.operator, b.from, b.to, b.date].join('|'),
            b.bookingRef,
          );
        }
      }
      for (const [key, seats] of Object.entries(v1seats)) {
        const parts = key.split('|');
        const date = parts.length === 4 ? parts[3] : '';
        const resolved =
          parts.length === 4
            ? this.network.resolveTrip(parts[0], parts[1], parts[2])
            : null;
        const depKey = resolved
          ? `${resolved.trip.tripId}|${date}`
          : `legacy:${this.seedNumber(key).toString(36)}`;
        const lastSeq = resolved ? resolved.corridor.stops.length - 1 : 1;
        const ref = byKey.get(key) ?? 'V1';
        store[depKey] = store[depKey] ?? {};
        for (const seat of seats) {
          const list = (store[depKey][seat] = store[depKey][seat] ?? []);
          list.push({ boardSeq: 0, alightSeq: lastSeq, bookingRef: ref });
        }
      }
      // v1 bookings that never wrote seat lists still block their seats.
      for (const b of bookings) {
        if (!b.bookingRef || !b.seatIds?.length) continue;
        const key = [b.operator, b.from, b.to, b.date].join('|');
        if (v1seats[key]) continue;
        const resolved = this.network.resolveTrip(
          b.operator ?? '',
          b.from ?? '',
          b.to ?? '',
        );
        const depKey = resolved
          ? `${resolved.trip.tripId}|${b.date}`
          : `legacy:${this.seedNumber(key).toString(36)}`;
        const lastSeq = resolved ? resolved.corridor.stops.length - 1 : 1;
        store[depKey] = store[depKey] ?? {};
        for (const seat of b.seatIds) {
          const list = (store[depKey][seat] = store[depKey][seat] ?? []);
          if (!list.some((s) => s.bookingRef === b.bookingRef)) {
            list.push({ boardSeq: 0, alightSeq: lastSeq, bookingRef: b.bookingRef! });
          }
        }
      }
      localStorage.setItem(V2_KEY, JSON.stringify(store));
      localStorage.setItem(V2_MIGRATED_KEY, '1');
    } catch {
      return;
    }
  }

  private seedNumber(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Deterministic demo pre-bookings per departure: some full-route, some
   *  partial intervals. Same departure key always renders the same map. */
  private demoIntervals(
    departureKey: string,
    seatIds: string[],
    lastSeq: number,
  ): { seatId: string; interval: SeatInterval }[] {
    const out: { seatId: string; interval: SeatInterval }[] = [];
    if (lastSeq < 1) return out;
    const h = this.seedNumber(departureKey);
    const count = 3 + (h % 6);
    for (let i = 0; i < count; i++) {
      const seatId = seatIds[(h >> 3 + i * 7) % seatIds.length];
      if (i % 3 === 0) {
        out.push({
          seatId,
          interval: { boardSeq: 0, alightSeq: lastSeq, bookingRef: 'DEMO' },
        });
      } else {
        const board = (h >> (i + 2)) % lastSeq;
        const span = 1 + ((h >> (i + 5)) % Math.max(1, lastSeq - board));
        out.push({
          seatId,
          interval: {
            boardSeq: board,
            alightSeq: Math.min(lastSeq, board + span),
            bookingRef: 'DEMO',
          },
        });
      }
    }
    return out;
  }

  private static overlaps(
    boardSeq: number,
    alightSeq: number,
    seg: SeatInterval,
  ): boolean {
    // Half-open [board, alight): alighting at S frees the seat for S boarders.
    return boardSeq < seg.alightSeq && seg.boardSeq < alightSeq;
  }

  // ----------------------------------------------------------- availability

  /** Segment availability for a scheduled departure. */
  availabilityForSegment(
    departureKey: string,
    seatIds: string[],
    boardSeq: number,
    alightSeq: number,
    lastSeq: number,
  ): SeatAvailability {
    const store = this.readStore();
    const tripStore = store[departureKey] ?? {};
    const bookedSet = new Set<string>();
    let purchased = 0;
    for (const [seatId, intervals] of Object.entries(tripStore)) {
      if (
        intervals.some((s) =>
          SeatService.overlaps(boardSeq, alightSeq, s),
        )
      ) {
        bookedSet.add(seatId);
        if (intervals.some((s) => s.bookingRef !== 'DEMO')) purchased++;
      }
    }
    let preBooked = 0;
    for (const { seatId, interval } of this.demoIntervals(
      departureKey,
      seatIds,
      lastSeq,
    )) {
      if (SeatService.overlaps(boardSeq, alightSeq, interval)) {
        if (!bookedSet.has(seatId)) preBooked++;
        bookedSet.add(seatId);
      }
    }
    return {
      total: seatIds.length,
      preBooked,
      purchased,
      available: Math.max(0, seatIds.length - bookedSet.size),
      bookedSet,
    };
  }

  /** Segment availability for a booking session (trip-details → payment). */
  availabilityForBooking(booking: BookingService): SeatAvailability {
    const seg = this.segmentForBooking(booking);
    const seatIds = this.seatIdsForBooking(booking);
    if (!seg) {
      return {
        total: seatIds.length,
        preBooked: 0,
        purchased: 0,
        available: seatIds.length,
        bookedSet: new Set(),
      };
    }
    return this.availabilityForSegment(
      `${seg.tripId}|${booking.travelDate}`,
      seatIds,
      Math.min(seg.boardSeq, seg.alightSeq),
      Math.max(seg.boardSeq, seg.alightSeq),
      seg.lastSeq,
    );
  }

  /** Legacy adapter (compare/rebook boards): full-route availability for a
   *  composite operator|from|to|date key. */
  availabilityFor(seatsLeftText: string, key: string): SeatAvailability {
    const parts = key.split('|');
    if (parts.length === 4) {
      const resolved = this.network.resolveTrip(parts[0], parts[1], parts[2]);
      if (resolved) {
        const trip = resolved.trip;
        const vehicle = vehicleById(trip.vehicleId);
        const seatIds = vehicle
          ? seatIdsForLayout(vehicle.layout)
          : this.defaultSeatIds();
        const lastSeq = resolved.corridor.stops.length - 1;
        return this.availabilityForSegment(
          `${trip.tripId}|${parts[3]}`,
          seatIds,
          Math.min(resolved.boardSeq, resolved.alightSeq),
          Math.max(resolved.boardSeq, resolved.alightSeq),
          lastSeq,
        );
      }
    }
    // Unresolved: legacy whole-trip math on the default 40-seat map.
    const total = this.totalSeats;
    const n = Number((seatsLeftText || '').replace(/[^0-9]/g, ''));
    const advertised = isNaN(n) ? total : n;
    const preBooked = Math.max(0, Math.min(total - advertised, total));
    const depKey = `legacy:${this.seedNumber(key).toString(36)}`;
    const store = this.readStore();
    const tripStore = store[depKey] ?? {};
    const bookedSet = new Set<string>(Object.keys(tripStore));
    const purchased = bookedSet.size;
    const ids = this.defaultSeatIds();
    const offset = this.seedNumber(key) % ids.length;
    const rotated = [...ids.slice(offset), ...ids.slice(0, offset)];
    for (const id of rotated.slice(0, preBooked)) bookedSet.add(id);
    return {
      total,
      preBooked,
      purchased,
      available: Math.max(0, total - bookedSet.size),
      bookedSet,
    };
  }

  // --------------------------------------------------------------- booking

  /** Persist a segment purchase under a booking ref. */
  bookSegment(
    departureKey: string,
    seats: string[],
    boardSeq: number,
    alightSeq: number,
    bookingRef: string,
  ) {
    const store = this.readStore();
    store[departureKey] = store[departureKey] ?? {};
    for (const seat of seats) {
      const list = (store[departureKey][seat] =
        store[departureKey][seat] ?? []);
      list.push({ boardSeq, alightSeq, bookingRef });
    }
    this.writeStore(store);
  }

  /** Legacy whole-trip purchase (compare/rebook-era callers). */
  bookSeats(key: string, seats: string[]) {
    const parts = key.split('|');
    if (parts.length === 4) {
      const resolved = this.network.resolveTrip(parts[0], parts[1], parts[2]);
      if (resolved) {
        this.bookSegment(
          `${resolved.trip.tripId}|${parts[3]}`,
          seats,
          Math.min(resolved.boardSeq, resolved.alightSeq),
          Math.max(resolved.boardSeq, resolved.alightSeq),
          key,
        );
        return;
      }
    }
    this.bookSegment(
      `legacy:${this.seedNumber(key).toString(36)}`,
      seats,
      0,
      Number.MAX_SAFE_INTEGER,
      key,
    );
  }

  /** Release exactly one booking's intervals (cancellation frees only its
   *  own segment — other riders on the same seats are untouched). */
  freeSeatsByRef(departureKey: string, bookingRef: string) {
    const store = this.readStore();
    const tripStore = store[departureKey];
    if (!tripStore) return;
    for (const seat of Object.keys(tripStore)) {
      tripStore[seat] = tripStore[seat].filter(
        (s) => s.bookingRef !== bookingRef,
      );
      if (!tripStore[seat].length) delete tripStore[seat];
    }
    this.writeStore(store);
  }

  /** Legacy release (ticket cancellations without a stored ref context). */
  freeSeats(key: string, seats: string[]) {
    const parts = key.split('|');
    const depKey =
      parts.length === 4
        ? (() => {
            const resolved = this.network.resolveTrip(
              parts[0],
              parts[1],
              parts[2],
            );
            return resolved
              ? `${resolved.trip.tripId}|${parts[3]}`
              : `legacy:${this.seedNumber(key).toString(36)}`;
          })()
        : `legacy:${this.seedNumber(key).toString(36)}`;
    const store = this.readStore();
    const tripStore = store[depKey];
    if (!tripStore) return;
    for (const seat of seats) delete tripStore[seat];
    this.writeStore(store);
  }

  /** Free seats using the operator|from|to|date composite key. Prefers a
   *  ref-scoped release when the booking ref is known. */
  freeSeatsByTrip(
    operator: string,
    from: string,
    to: string,
    date: string,
    seats: string[],
    bookingRef?: string,
  ) {
    const key = [operator, from, to, date].join('|');
    const resolved = this.network.resolveTrip(operator, from, to);
    const depKey = resolved
      ? `${resolved.trip.tripId}|${date}`
      : `legacy:${this.seedNumber(key).toString(36)}`;
    if (bookingRef) {
      this.freeSeatsByRef(depKey, bookingRef);
      return;
    }
    this.freeSeats(key, seats);
  }

  /** When does a seat taken on the rider's segment free up? Returns the
   *  earliest alighting sequence among overlapping intervals (null = free). */
  freeAtSeq(
    departureKey: string,
    seatId: string,
    boardSeq: number,
    alightSeq: number,
    lastSeq: number,
  ): number | null {
    const store = this.readStore();
    const tripStore = store[departureKey] ?? {};
    let best: number | null = null;
    const check = (s: SeatInterval) => {
      if (!SeatService.overlaps(boardSeq, alightSeq, s)) return;
      if (best == null || s.alightSeq < best) best = s.alightSeq;
    };
    for (const s of tripStore[seatId] ?? []) check(s);
    for (const { seatId: id, interval } of this.demoIntervals(
      departureKey,
      [seatId],
      lastSeq,
    )) {
      if (id === seatId) check(interval);
    }
    return best;
  }

  isSeatFree(
    departureKey: string,
    seatId: string,
    boardSeq: number,
    alightSeq: number,
    lastSeq: number,
    seatIds: string[],
  ): boolean {
    return !this.availabilityForSegment(
      departureKey,
      seatIds,
      boardSeq,
      alightSeq,
      lastSeq,
    ).bookedSet.has(seatId);
  }

  // --------------------------------- seat-preference geometry (layout-aware)

  private layoutColumns(layout: SeatLayout | null): string[] {
    if (layout) return layout.columns.filter((c) => c !== '|');
    return [...SEAT_COLS];
  }

  private layoutRows(layout: SeatLayout | null): number {
    return layout ? layout.rows : SEAT_ROWS;
  }

  /** Window (outer letters) or aisle (inner letters) for a layout. */
  seatPosition(seatId: string, layout: SeatLayout | null = null): 'window' | 'aisle' {
    const cols = this.layoutColumns(layout);
    const col = seatId.slice(-1).toUpperCase();
    const idx = cols.indexOf(col);
    if (idx <= 0 || idx >= cols.length - 1) return 'window';
    return 'aisle';
  }

  /** Front / middle / back thirds of a layout's rows. */
  seatZone(
    seatId: string,
    layout: SeatLayout | null = null,
  ): 'front' | 'middle' | 'back' {
    const rows = this.layoutRows(layout);
    const row = Number(seatId.slice(0, -1)) || 0;
    if (row > Math.ceil((rows * 2) / 3)) return 'back';
    if (row > Math.ceil(rows / 3)) return 'middle';
    return 'front';
  }

  /** Whether an available seat satisfies a preference ('any' always matches). */
  matchesPreference(
    seatId: string,
    pref: SeatPreference,
    layout: SeatLayout | null = null,
  ): boolean {
    if (
      pref.position !== 'any' &&
      this.seatPosition(seatId, layout) !== pref.position
    )
      return false;
    if (pref.zone !== 'any' && this.seatZone(seatId, layout) !== pref.zone)
      return false;
    return true;
  }

  /** Available seats on a booking segment matching a preference. */
  matchingForBooking(booking: BookingService, pref: SeatPreference): string[] {
    const seg = this.segmentForBooking(booking);
    const seatIds = this.seatIdsForBooking(booking);
    const layout = this.layoutForBooking(booking);
    const booked = seg
      ? this.availabilityForSegment(
          `${seg.tripId}|${booking.travelDate}`,
          seatIds,
          Math.min(seg.boardSeq, seg.alightSeq),
          Math.max(seg.boardSeq, seg.alightSeq),
          seg.lastSeq,
        ).bookedSet
      : new Set<string>();
    return seatIds.filter(
      (id) => !booked.has(id) && this.matchesPreference(id, pref, layout),
    );
  }

  /** Legacy adapter: full-route matches for a composite key. */
  matchingAvailableSeats(
    seatsLeftText: string,
    key: string,
    pref: SeatPreference,
  ): string[] {
    const { bookedSet } = this.availabilityFor(seatsLeftText, key);
    return this.defaultSeatIds().filter(
      (id) => !bookedSet.has(id) && this.matchesPreference(id, pref),
    );
  }
}
