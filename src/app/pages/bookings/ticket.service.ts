import { Injectable, inject } from '@angular/core';
import { BookingService } from '../booking/booking.service';
import { ProfileService } from '../profile/profile.service';
import {
  corridorById,
  normalizeOperatorId,
  operatorById,
  stopById,
  tripById,
  vehicleById,
} from '../../services/network.service';

export type BookingStatus =
  | 'confirmed'
  | 'boarding'
  | 'completed'
  | 'cancelled';

export interface Booking {
  operator: string;
  from: string;
  to: string;
  date: string;
  time: string;
  seat: string;
  fare: string;
  status: BookingStatus;
  bookingRef: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  passengerTypes?: string[];
  idNumbers?: string[];
  seatIds?: string[];
  baseFare?: string;
  savings?: number;
  paymentMethod?: string;
  voucherCode?: string;
  voucherSavings?: number;
  cancellationReason?: string;
  refunded?: boolean;
  /** Explicitly chosen boarding point (label + coords for distance math).
   *  Absent on bookings made before pickup selection existed. */
  pickup?: string;
  pickupLat?: number;
  pickupLng?: number;
  /** Original booking this reservation replaces (Rebook Alternatives).
   *  History/audit context only — the new booking keeps its own ref.
   *  Absent on ordinary bookings and older stored records. */
  rebookedFrom?: string;
  // ------------------------------------------------ network segment fields
  // Present on bookings made after the corridor model; absent on v1
  // records, which render as full-route trips (from → to).
  corridorId?: string;
  tripId?: string;
  operatorId?: string;
  serviceClassId?: string;
  boardStopId?: string;
  boardStopName?: string;
  alightStopId?: string;
  alightStopName?: string;
  boardSeq?: number;
  alightSeq?: number;
  segmentKm?: number;
  plate?: string;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly storageKey = 'byahero.bookings.v1';
  private profileService = inject(ProfileService);
  private bookingsState: Booking[] = this.loadBookings();

  private readonly driverNames: Record<string, string> = {
    'Victory Liner': 'Ramon Cruz',
    'GV Florida': 'Joel Fernandez',
    Partas: 'Carlo Reyes',
    'Florida Bus Line': 'Nestor Aquino',
  };

  selected: Booking | null = null;

  /** The next trip worth showing on the home header and SOS flows. */
  get activeBooking(): Booking | null {
    return (
      this.bookingsState.find(
        (b) => b.status === 'boarding' || b.status === 'confirmed',
      ) ?? null
    );
  }

  driverNameFor(operator: string): string {
    return this.driverNames[operator] ?? 'Conductor';
  }

  get bookings(): Booking[] {
    return this.bookingsState;
  }

  open(booking: Booking) {
    this.selected = booking;
  }

  findByRef(bookingRef: string): Booking | null {
    return (
      this.bookingsState.find((booking) => booking.bookingRef === bookingRef) ??
      null
    );
  }

  add(booking: Booking): Booking {
    const existing = this.findByRef(booking.bookingRef);
    if (existing) {
      // A reference collision must never silently overwrite a different
      // booking. Identical re-adds (idempotent retry) return the stored
      // record; anything else is an error so the caller mints a new ref.
      if (isSameBooking(existing, booking)) {
        this.selected = existing;
        return existing;
      }
      throw new Error(`Booking reference ${booking.bookingRef} already exists.`);
    }
    this.bookingsState = [booking, ...this.bookingsState];
    this.persist();
    this.selected = this.findByRef(booking.bookingRef);
    return this.selected ?? booking;
  }

createFromCheckout(checkout: BookingService): Booking | null {
    if (!checkout.trip || !checkout.bookingRef) return null;

    const profile = this.profileService.read();
    const booking: Booking = {
      operator: checkout.trip.operator,
      from: checkout.trip.from,
      to: checkout.trip.to,
      date: checkout.travelDate,
      // Scheduled slot from the network model; never ETA-derived.
      time: checkout.scheduledDepartureTime ?? this.departureTimeFromEta(checkout.trip.eta),
      seat:
        checkout.selectedSeats.length === 1
          ? `Seat ${checkout.selectedSeats[0]}`
          : `Seats ${checkout.selectedSeats.join(', ')}`,
      fare: checkout.formatCurrency(checkout.total),
      status: 'confirmed',
      bookingRef: checkout.bookingRef,
      passengerName: profile.name,
      passengerPhone: profile.phone,
      passengerEmail: profile.email,
      passengerTypes: checkout.passengers.map(
        (p) =>
          checkout.passengerLabel(p) ?? (p.type === 'regular' ? 'Regular' : p.type),
      ),
      idNumbers: checkout.passengers.map((p) => p.idNumber?.trim() || ''),
      seatIds: [...checkout.selectedSeats],
      baseFare: checkout.formatCurrency(checkout.seatFare),
      savings: checkout.totalDiscount,
      voucherCode: checkout.voucher?.code,
      voucherSavings: checkout.voucherDiscount,
      paymentMethod: checkout.paymentMethod,
      pickup: checkout.pickup?.label,
      pickupLat: checkout.pickup?.lat,
      pickupLng: checkout.pickup?.lng,
      ...(checkout.rebookedFrom ? { rebookedFrom: checkout.rebookedFrom } : {}),
      // Network segment snapshot (absent on legacy sessions).
      ...(checkout.hasNetworkSegment
        ? {
            corridorId: checkout.corridorId!,
            tripId: checkout.tripId!,
            operatorId: checkout.operatorId ?? undefined,
            serviceClassId: checkout.serviceClassId ?? undefined,
            boardStopId: checkout.boardStopId!,
            alightStopId: checkout.alightStopId!,
            boardStopName: this.stopName(checkout.corridorId!, checkout.boardStopId!),
            alightStopName: this.stopName(checkout.corridorId!, checkout.alightStopId!),
            boardSeq: checkout.boardSeq!,
            alightSeq: checkout.alightSeq!,
            segmentKm: checkout.segmentKm,
            plate: this.plateFor(checkout.tripId!),
          }
        : {}),
    };

    return this.add(booking);
  }

  /** Boarding → alighting display pair; v1 records fall back to from → to. */
  segmentPair(b: Booking): string {
    if (b.boardStopName && b.alightStopName) {
      return `${b.boardStopName} → ${b.alightStopName}`;
    }
    return `${b.from} → ${b.to}`;
  }

  /** Canonical operator id for a booking (normalized legacy name or stored). */
  operatorIdFor(b: Booking): string | null {
    return b.operatorId ?? normalizeOperatorId(b.operator);
  }

  /** Network segment for a booking, or null for v1 full-route records. */
  segmentFor(b: Booking): {
    corridorId: string;
    tripId: string;
    boardSeq: number;
    alightSeq: number;
    lastSeq: number;
  } | null {
    if (
      b.corridorId == null ||
      b.tripId == null ||
      b.boardSeq == null ||
      b.alightSeq == null
    ) {
      return null;
    }
    const corridor = corridorById(b.corridorId);
    if (!corridor) return null;
    return {
      corridorId: b.corridorId,
      tripId: b.tripId,
      boardSeq: b.boardSeq,
      alightSeq: b.alightSeq,
      lastSeq: corridor.stops.length - 1,
    };
  }

  private stopName(corridorId: string, stopId: string): string | undefined {
    const corridor = corridorById(corridorId);
    return corridor ? (stopById(corridor, stopId)?.name ?? undefined) : undefined;
  }

  private plateFor(tripId: string): string | undefined {
    const trip = tripById(tripId);
    const vehicle = trip ? vehicleById(trip.vehicleId) : null;
    return vehicle?.plate;
  }

  /** Display operator name (normalized; falls back to the stored string). */
  operatorNameFor(b: Booking): string {
    const id = this.operatorIdFor(b);
    return (id && operatorById(id)?.name) || b.operator;
  }

  updateStatus(
    bookingRef: string,
    status: BookingStatus,
  ): Booking | null {
    let updated: Booking | null = null;
    this.bookingsState = this.bookingsState.map((booking) => {
      if (booking.bookingRef !== bookingRef) return booking;
      updated = { ...booking, status };
      return updated;
    });

    if (updated) {
      this.persist();
      this.selected = updated;
    }

return updated;
  }

  /** Voids a booking and records why, ready for the wallet refund. */
  markCancelled(bookingRef: string, reason: string): Booking | null {
    let updated: Booking | null = null;
    this.bookingsState = this.bookingsState.map((booking) => {
      if (booking.bookingRef !== bookingRef) return booking;
      updated = {
        ...booking,
        status: 'cancelled',
        cancellationReason: reason,
        refunded: true,
      };
      return updated;
    });

    if (updated) {
      this.persist();
      this.selected = updated;
    }

    return updated;
  }

  remove(bookingRef: string): boolean {
    const next = this.bookingsState.filter(
      (booking) => booking.bookingRef !== bookingRef,
    );
    if (next.length === this.bookingsState.length) return false;
    this.bookingsState = next;
    if (this.selected?.bookingRef === bookingRef) this.selected = null;
    this.persist();
    return true;
  }

  clear() {
    this.selected = null;
  }

  private departureTimeFromEta(eta: string): string {
    const minutes = Number(/\d+/.exec(eta)?.[0] ?? 30);
    const departure = new Date();
    departure.setMinutes(departure.getMinutes() + (isNaN(minutes) ? 30 : minutes));
    return departure.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private loadBookings(): Booking[] {
    const saved = this.readStorage();
    if (!saved) return this.seedBookings();

    try {
      const parsed = JSON.parse(saved) as Booking[];
      if (Array.isArray(parsed)) return this.settleLegacySeeds(parsed);
    } catch {
      return this.seedBookings();
    }

    return this.seedBookings();
  }

  /** Demo seeds issued before the history-only fix (BYH-48291/BYH-48304 as
   *  confirmed/boarding). Real checkouts never reuse those refs
   *  (collision-safe generation), so anything still carrying them is the
   *  old demo data — settle it into history once. */
  private settleLegacySeeds(list: Booking[]): Booking[] {
    let changed = false;
    const next = list.map((b) => {
      if (
        (b.bookingRef === 'BYH-48291' || b.bookingRef === 'BYH-48304') &&
        (b.status === 'confirmed' || b.status === 'boarding')
      ) {
        changed = true;
        return { ...b, status: 'completed' as const };
      }
      return b;
    });
    if (changed) {
      this.bookingsState = next;
      this.persist();
    }
    return next;
  }

  private readStorage(): string | null {
    try {
      return localStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }

  private persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.bookingsState));
    } catch {
      // The UI still updates in memory if browser storage is unavailable.
    }
  }

  /** First-launch demo history ONLY — never an active trip. A fresh install
   *  must show "no active trip yet" everywhere (Home hero, Bookings
   *  Upcoming, Active Trip live tracking) until the commuter really books:
   *  activeBooking only ever comes from a real checkout. */
  private seedBookings(): Booking[] {
    return [
      {
        operator: 'Victory Liner',
        from: 'Baguio City',
        to: 'Tuguegarao City',
        date: 'Sep 18, 2026',
        time: '6:30 AM',
        seat: 'Seat 14A',
        fare: '₱ 480',
        status: 'completed',
        bookingRef: 'BYH-48291',
      },
      {
        operator: 'GV Florida',
        from: 'Cauayan',
        to: 'Ilagan',
        date: 'Sep 14, 2026',
        time: '2:00 PM',
        seat: 'Seat 07C',
        fare: '₱ 95',
        status: 'completed',
        bookingRef: 'BYH-48304',
      },
      {
        operator: 'Partas',
        from: 'Manila (Cubao)',
        to: 'Laoag City',
        date: 'Aug 29, 2026',
        time: '9:00 PM',
        seat: 'Seat 22B',
        fare: '₱ 850',
        status: 'completed',
        bookingRef: 'BYH-47118',
      },
      {
        operator: 'Florida Bus Line',
        from: 'Manila (PITX)',
        to: 'Vigan City',
        date: 'Aug 12, 2026',
        time: '10:15 PM',
        seat: 'Seat 03A',
        fare: '₱ 750',
        status: 'cancelled',
        bookingRef: 'BYH-46590',
      },
    ];
  }
}

/** Same booking content (idempotent retry) vs a true collision. */
export function isSameBooking(a: Booking, b: Booking): boolean {
  return (
    a.bookingRef === b.bookingRef &&
    a.operator === b.operator &&
    a.from === b.from &&
    a.to === b.to &&
    a.date === b.date &&
    a.time === b.time &&
    a.seat === b.seat &&
    (a.seatIds ?? []).join(',') === (b.seatIds ?? []).join(',')
  );
}

/** Scheduled departure instant for a stored booking (null when unknown).
 *  Prefers the network trip slot; falls back to parsing stored date+time. */
export function departureDateTimeForBooking(b: Booking): Date | null {
  try {
    if (b.tripId) {
      const trip = tripById(b.tripId);
      if (trip?.departureTime && b.date) {
        const d = new Date(`${b.date} ${trip.departureTime}`);
        if (!isNaN(d.getTime())) return d;
      }
    }
    if (b.date && b.time) {
      const d = new Date(`${b.date} ${b.time}`);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

/** Prototype cancellation policy: full refund >2h before departure, 50%
 *  inside 2h, none after departure. Only confirmed + before departure. */
export interface CancellationQuote {
  canCancel: boolean;
  reason: string;
  refundAmount: number;
  policyText: string;
}

export function fareNumberForBooking(b: Booking): number {
  const n = Number((b.fare ?? '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

export function cancellationQuoteForBooking(
  b: Booking,
  now: Date = new Date(),
): CancellationQuote {
  const policyText =
    'Prototype policy: full refund more than 2 hours before departure, 50% within 2 hours, no refund after departure.';
  if (b.status !== 'confirmed') {
    const reason =
      b.status === 'cancelled'
        ? 'This booking is already cancelled.'
        : b.status === 'boarding'
          ? 'Boarding trips cannot be cancelled.'
          : 'Completed trips cannot be cancelled.';
    return { canCancel: false, reason, refundAmount: 0, policyText };
  }
  const dep = departureDateTimeForBooking(b);
  if (!dep) {
    return { canCancel: true, reason: '', refundAmount: fareNumberForBooking(b), policyText };
  }
  if (dep.getTime() <= now.getTime()) {
    return {
      canCancel: false,
      reason: 'That departure already left.',
      refundAmount: 0,
      policyText,
    };
  }
  const msLeft = dep.getTime() - now.getTime();
  const fare = fareNumberForBooking(b);
  if (msLeft > 2 * 3600 * 1000) {
    return { canCancel: true, reason: '', refundAmount: fare, policyText };
  }
  return { canCancel: true, reason: '', refundAmount: Math.round(fare * 0.5), policyText };
}

/** Display status: confirmed past departure renders as Missed/Expired. */
export function displayStatusForBooking(b: Booking, now: Date = new Date()): string {
  if (b.status === 'confirmed') {
    const dep = departureDateTimeForBooking(b);
    if (dep && dep.getTime() <= now.getTime()) return 'Missed';
  }
  return b.status;
}

/** True when a confirmed booking's departure has passed. */
export function isExpiredBooking(b: Booking, now: Date = new Date()): boolean {
  if (b.status !== 'confirmed') return false;
  const dep = departureDateTimeForBooking(b);
  return !!dep && dep.getTime() <= now.getTime();
}
