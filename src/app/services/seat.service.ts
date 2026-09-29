import { Injectable } from '@angular/core';
import type {
  BookingService,
  SeatPreference,
} from '../pages/booking/booking.service';

export const SEAT_ROWS = 10;
export const SEAT_COLS = ['A', 'B', 'C', 'D'] as const;

/** Zone boundaries along the bus, derived from the 10-row map. */
export const SEAT_ZONE_ROWS = {
  front: [1, 3],
  middle: [4, 7],
  back: [8, 10],
} as const;

export interface SeatAvailability {
  total: number;
  preBooked: number;
  purchased: number;
  available: number;
  bookedSet: Set<string>;
}

@Injectable({ providedIn: 'root' })
export class SeatService {
  private readonly storageKey = 'byahero.seats.v1';

  get totalSeats(): number {
    return SEAT_ROWS * SEAT_COLS.length;
  }

  private seatIds(): string[] {
    const out: string[] = [];
    for (let r = 1; r <= SEAT_ROWS; r++) {
      for (const c of SEAT_COLS) out.push(`${r}${c}`);
    }
    return out;
  }

  private seedNumber(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Deterministic set of seats that were already sold on this departure
   *  before the catalog listed it. Different route/date combos seed a
   *  different layout, but the same combo always renders the same map. */
  private preBookedSet(count: number, seed: string): Set<string> {
    const ids = this.seatIds();
    const offset = this.seedNumber(seed) % ids.length;
    const rotated = [...ids.slice(offset), ...ids.slice(0, offset)];
    return new Set(rotated.slice(0, count));
  }

  /** Stable id for a specific departure so the seat map stays consistent
   *  across visits and after booking. */
  keyFor(booking: BookingService): string {
    const operator = booking.trip?.operator ?? 'Unknown';
    const from = booking.trip?.from ?? 'Unknown';
    const to = booking.trip?.to ?? 'Unknown';
    return [operator, from, to, booking.travelDate].join('|');
  }

  /** Existing pre-booked seats (purchased on this device). */
  bookedSeats(key: string): string[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const all = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
      return all[key] ?? [];
    } catch {
      return [];
    }
  }

  /** The canonical availability for a departure. `seatsLeftText` is what the
   *  catalog advertises (e.g. '18 seats left'); the map, the "seats left"
   *  badge and the booking cap all derive from this single model, so the
   *  numbers never disagree with what the user can actually pick. */
  availabilityFor(seatsLeftText: string, key: string): SeatAvailability {
    const total = this.totalSeats;
    const n = Number((seatsLeftText || '').replace(/[^0-9]/g, ''));
    const advertised = isNaN(n) ? total : n;
    const preBooked = Math.max(0, Math.min(total - advertised, total));

    const purchased = this.bookedSeats(key);
    const bookedSet = new Set([
      ...this.preBookedSet(preBooked, key),
      ...purchased,
    ]);

    return {
      total,
      preBooked,
      purchased: purchased.length,
      available: Math.max(0, total - bookedSet.size),
      bookedSet,
    };
  }

  /** Persist new seat purchases on a departure. */
  bookSeats(key: string, seats: string[]) {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const all = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
      const next = new Set([...(all[key] ?? []), ...seats]);
      all[key] = Array.from(next);
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      return;
    }
  }

  /** Release seats back onto the departure (used by cancellations). */
  freeSeats(key: string, seats: string[]) {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const all = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
      const kept = (all[key] ?? []).filter((seat) => !seats.includes(seat));
      all[key] = kept;
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      return;
    }
  }

  /** Free seats using the same operator|from|to|date composite key the
   *  booking flow uses, so a ticket can release them without a BookingService. */
  freeSeatsByTrip(operator: string, from: string, to: string, date: string, seats: string[]) {
    this.freeSeats([operator, from, to, date].join('|'), seats);
  }

  // --------------------------------- seat-preference geometry
  //
  // The seat map renders a 2+2 bus: columns A,B on the left, an aisle gap,
  // then columns C,D on the right. Position and zone below are read straight
  // off that geometry — outer columns touch the windows, inner columns touch
  // the aisle — never invented per-seat metadata.

  /** Window (outer columns A/D) or aisle (inner columns B/C). */
  seatPosition(seatId: string): 'window' | 'aisle' {
    const col = seatId.slice(-1).toUpperCase();
    return col === 'A' || col === 'D' ? 'window' : 'aisle';
  }

  /** Front (rows 1–3), middle (4–7), or back (8–10) of the bus. */
  seatZone(seatId: string): 'front' | 'middle' | 'back' {
    const row = Number(seatId.slice(0, -1)) || 0;
    if (row >= SEAT_ZONE_ROWS.back[0]) return 'back';
    if (row >= SEAT_ZONE_ROWS.middle[0]) return 'middle';
    return 'front';
  }

  /** Whether an available seat satisfies a preference ('any' always matches). */
  matchesPreference(seatId: string, pref: SeatPreference): boolean {
    if (pref.position !== 'any' && this.seatPosition(seatId) !== pref.position)
      return false;
    if (pref.zone !== 'any' && this.seatZone(seatId) !== pref.zone)
      return false;
    return true;
  }

  /** Available (not booked) seat ids on a departure that satisfy a preference,
   *  for match counts and map highlighting. */
  matchingAvailableSeats(
    seatsLeftText: string,
    key: string,
    pref: SeatPreference,
  ): string[] {
    const { bookedSet } = this.availabilityFor(seatsLeftText, key);
    return this.seatIds().filter(
      (id) => !bookedSet.has(id) && this.matchesPreference(id, pref),
    );
  }
}