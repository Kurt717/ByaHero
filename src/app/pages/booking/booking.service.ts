import { Injectable, inject } from '@angular/core';
import { SeatService } from '../../services/seat.service';
import {
  NetworkService,
  serviceClassById,
  corridorById,
  stopById,
  tripById,
  vehicleById,
  type Direction,
  type ServiceClassId,
} from '../../services/network.service';
import type { LocatedPoint } from '../../services/pickup.service';

export interface TripSummary {
  operator: string;
  from: string;
  to: string;
  eta: string;
  fare: string; // base one-way fare per seat, e.g. '₱ 620'
  seatsLeft: string; // e.g. '18 seats left'
  status: string; // 'on-time' | 'delayed'
  /** Exact scheduled departure (e.g. "8:30 AM") when chosen from a terminal
   *  board. Absent for catalog/route-card trips, which derive time from eta. */
  departureTime?: string;
}

export type PaymentMethod = 'wallet' | 'gcash' | 'card' | 'cash' | 'maya';
export type PassengerType = 'regular' | 'student' | 'senior' | 'pwd';

/** Seat position across the aisle: window at the outer edge, aisle directly
 *  beside the gap, middle for neither (e.g. D in a 2+3 bus, B in a van).
 *  Layouts without an aisle offer window + middle only. */
export type SeatPositionPref = 'window' | 'aisle' | 'middle' | 'any';
/** Seat zone along the bus: front rows 1–3, middle 4–7, back 8–10. */
export type SeatZonePref = 'front' | 'middle' | 'back' | 'any';

/** A wish, not a reservation: the seat map stays the source of truth and the
 *  commuter still picks an actual seat. Lives only in this session. */
export interface SeatPreference {
  position: SeatPositionPref;
  zone: SeatZonePref;
}

export const NO_SEAT_PREFERENCE: SeatPreference = {
  position: 'any',
  zone: 'any',
};

export interface StartBookingOptions {
  /** Rider's chosen boarding/alighting stops (Home/Search pair). When absent
   *  or invalid, the booking keeps the full-route behavior. */
  boardStopId?: string;
  alightStopId?: string;
  travelDate?: string;
  /** The exact per-seat fare shown on the card/board the commuter tapped
   *  (the yellow sticker price). Checkout honors it verbatim for the quoted
   *  segment, so the home price and the paid price can never drift apart.
   *  Ignored when the pair is rejected (full-route fallback) or the stops
   *  change afterwards — the fare then recomputes for the new segment and
   *  both Trip Details and Payment show that number. */
  quotedSeatFare?: number;
}

export interface AppliedVoucher {
  code: string;
  title: string;
  kind: 'percent' | 'fixed';
  value: number; // percent value or peso amount
  minSpend: number;
  cap?: number; // max peso discount, when set
}

export interface PassengerEntry {
  id: string;
  type: PassengerType;
  idNumber?: string;
  /** Discounted-fare verification (required before payment). */
  idType?: string;
  /** Front ID preview: data-URL for images, file name for PDFs. */
  idImage?: string;
  idImageKind?: 'image' | 'pdf';
  idConfirmed?: boolean;
}

export interface PassengerTypeMeta {
  label: string;
  short: string;
  discount: number; // 0.2 = 20% off, per RA 9994 / RA 10754
  requiresId: boolean;
}

/** Single source of truth for discount rules — imported by every screen that touches fares. */
export const PASSENGER_TYPE_META: Record<PassengerType, PassengerTypeMeta> = {
  regular: { label: 'Regular', short: 'REG', discount: 0, requiresId: false },
  student: { label: 'Student', short: 'STU', discount: 0.2, requiresId: true },
  senior: {
    label: 'Senior Citizen',
    short: 'SC',
    discount: 0.2,
    requiresId: true,
  },
  pwd: { label: 'PWD', short: 'PWD', discount: 0.2, requiresId: true },
};

/** ID document options per discounted fare type. */
export const ID_TYPE_OPTIONS: Record<Exclude<PassengerType, 'regular'>, string[]> = {
  student: ['School ID', 'Certificate of Registration', 'Student Driver License'],
  senior: ['OSCA ID', 'Senior Citizen ID'],
  pwd: ['PWD ID'],
};

/** '₱ 1,200' → 1200. Parses the fare sticker text the commuter saw so the
 *  booking can lock exactly that number. */
export function parseFareText(fare: string): number {
  const n = Number((fare ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Max ID upload size: 5MB. */
export const MAX_ID_UPLOAD_BYTES = 5 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class BookingService {
  private seatService = inject(SeatService);
  private network = inject(NetworkService);
  trip: TripSummary | null = null;
  travelDate = '';
  passengers: PassengerEntry[] = [{ id: 'p1', type: 'regular' }];
  selectedSeats: string[] = [];
  paymentMethod: PaymentMethod = 'gcash';
  bookingRef = '';
  voucher: AppliedVoucher | null = null;
  /** Explicitly chosen boarding point for this session. Set from the hail
   *  staging area on bookTrip, or on the Trip Details pickup step. */
  pickup: LocatedPoint | null = null;
  /** Hailing checkout: ride is today, so Trip Details hides the Travel Date
   *  picker. Reservation sessions leave this false. */
  hailMode = false;
  /** Seat wish for this reservation session (position + zone). Never
   *  auto-assigns a seat; the seat map remains the source of truth. */
  seatPreference: SeatPreference = { ...NO_SEAT_PREFERENCE };
  /** Original booking this session replaces, set only by Rebook
   *  Alternatives after startBooking. The original stays untouched —
   *  this is history/audit context for the new booking. */
  rebookedFrom: string | null = null;

  // ------------------------------------------------ network segment state
  // A booking is for a boarding stop + alighting stop on a corridor trip.
  // tripId/corridorId resolve from the trip summary in startBooking and can
  // be refined by the board/alight pickers (Trip Details) or hail.

  tripId: string | null = null;
  corridorId: string | null = null;
  operatorId: string | null = null;
  serviceClassId: ServiceClassId | null = null;
  boardStopId: string | null = null;
  alightStopId: string | null = null;
  boardSeq: number | null = null;
  alightSeq: number | null = null;
  /** Bus position anchor (sequence) for hail: stops at/before it are passed. */
  busSeq: number | null = null;
  /** Locked per-seat fare from the tapped card (see StartBookingOptions).
   *  Honored only while the session rides the quoted stops; any stop change
   *  (re-anchor, new pair) drops the lock and recomputes for the segment. */
  quotedSeatFare: number | null = null;
  quotedBoardStopId: string | null = null;
  quotedAlightStopId: string | null = null;

  private counter = 1;

  /** Seeded randomness for booking refs (tests override for determinism). */
  randomFn: () => number = () => Math.random();

  /** True when the session rides a resolved corridor trip. */
  get hasNetworkSegment(): boolean {
    return (
      this.tripId != null &&
      this.corridorId != null &&
      this.boardSeq != null &&
      this.alightSeq != null
    );
  }

  /** Segment fare for one seat — the locked card quote when the session
   *  rides the quoted stops, otherwise fareFor(board → alight). Legacy trips
   *  without a corridor fall back to the catalog string (deprecated), or to
   *  the locked quote when the card supplied one. */
  get seatFare(): number {
    if (
      this.quotedSeatFare != null &&
      (!this.hasNetworkSegment ||
        (this.boardStopId === this.quotedBoardStopId &&
          this.alightStopId === this.quotedAlightStopId))
    ) {
      return this.quotedSeatFare;
    }
    if (this.hasNetworkSegment) {
      return this.network.fareFor({
        corridorId: this.corridorId!,
        operatorId: this.operatorId ?? 'victory-liner',
        serviceClassId: this.serviceClassId ?? 'aircon',
        boardStopId: this.boardStopId!,
        alightStopId: this.alightStopId!,
      });
    }
    return Math.round(this.baseFare);
  }

  /** Boarding → alighting label, e.g. 'Ilagan → Santiago City'. */
  get segmentLabel(): string {
    const corridor = corridorById(this.corridorId);
    const board = corridor && this.boardStopId ? stopById(corridor, this.boardStopId) : null;
    const alight = corridor && this.alightStopId ? stopById(corridor, this.alightStopId) : null;
    if (board && alight) return `${board.name} → ${alight.name}`;
    return this.trip ? `${this.trip.from} → ${this.trip.to}` : '';
  }

  get segmentKm(): number {
    if (!this.hasNetworkSegment) return 0;
    return this.network.segmentKm(this.corridorId!, this.boardSeq!, this.alightSeq!);
  }

  get serviceClassLabel(): string {
    if (this.serviceClassId) return serviceClassById(this.serviceClassId).label;
    return '';
  }

  /** @deprecated Catalog-string fallback for trips off any corridor. */
  get baseFare(): number {
    if (!this.trip) return 0;
    const n = Number(this.trip.fare.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  get direction(): Direction | null {
    if (!this.hasNetworkSegment) return null;
    return this.alightSeq! >= this.boardSeq! ? 'forward' : 'reverse';
  }

  /** Resolve the trip summary onto a corridor trip. When the rider chose a
   *  pair (Home/Search), apply it with the same validation as
   *  setBoardAlight(); otherwise keep the full origin→destination segment. */
  attachNetwork(opts?: StartBookingOptions) {
    if (!this.trip) return;
    const resolved = this.network.resolveTrip(
      this.trip.operator,
      this.trip.from,
      this.trip.to,
    );
    if (!resolved) {
      this.clearNetworkSegment();
      return;
    }
    const trip = resolved.trip;
    const vehicle = vehicleById(trip.vehicleId);
    this.tripId = trip.tripId;
    this.corridorId = resolved.corridor.id;
    this.operatorId = resolved.operatorId ?? trip.operatorId;
    this.serviceClassId = vehicle?.serviceClassId ?? 'aircon';
    // Default: full route span.
    const board = resolved.corridor.stops[resolved.boardSeq];
    const alight = resolved.corridor.stops[resolved.alightSeq];
    this.boardStopId = board.id;
    this.alightStopId = alight.id;
    this.boardSeq = resolved.boardSeq;
    this.alightSeq = resolved.alightSeq;
    // Rider pair wins only when it validates on this corridor + direction
    // and sits inside this trip's own span (a short run never inherits a
    // stretch it does not serve — full-route fallback instead).
    if (opts?.boardStopId && opts?.alightStopId) {
      const err = this.validatePairOnCorridor(
        resolved.corridor.id,
        trip.direction,
        opts.boardStopId,
        opts.alightStopId,
      );
      const pairBoard = stopById(resolved.corridor, opts.boardStopId);
      const pairAlight = stopById(resolved.corridor, opts.alightStopId);
      const routeLo = Math.min(resolved.boardSeq, resolved.alightSeq);
      const routeHi = Math.max(resolved.boardSeq, resolved.alightSeq);
      const pairFits =
        pairBoard != null &&
        pairAlight != null &&
        Math.min(pairBoard.sequence, pairAlight.sequence) >= routeLo &&
        Math.max(pairBoard.sequence, pairAlight.sequence) <= routeHi;
      if (!err && pairFits) {
        const b = stopById(resolved.corridor, opts.boardStopId)!;
        const a = stopById(resolved.corridor, opts.alightStopId)!;
        this.boardStopId = b.id;
        this.alightStopId = a.id;
        this.boardSeq = b.sequence;
        this.alightSeq = a.sequence;
      }
    }
  }

  /** Shared pair validation used by attachNetwork + setBoardAlight. Pure
   *  except for reading busSeq/trip direction; never mutates. */
  private validatePairOnCorridor(
    corridorId: string,
    tripDirection: Direction,
    boardStopId: string,
    alightStopId: string,
  ): string | null {
    const corridor = corridorById(corridorId);
    if (!corridor) return 'This trip is not on a corridor yet.';
    const board = stopById(corridor, boardStopId);
    const alight = stopById(corridor, alightStopId);
    if (!board || !alight) return 'Pick both a boarding and an alighting stop.';
    if (board.id === alight.id) {
      return 'Get off after you get on — pick a different stop.';
    }
    const dir = this.directionFromSeqs(board.sequence, alight.sequence);
    if (!dir) return 'Get off after you get on — pick a later stop in the direction of travel.';
    if (dir !== tripDirection) {
      const label = tripDirection === 'forward' ? 'southbound' : 'northbound';
      return `That order runs against this ${label} trip — pick stops in travel order.`;
    }
    if (this.busSeq != null) {
      const passed =
        dir === 'forward' ? board.sequence < this.busSeq : board.sequence > this.busSeq;
      if (passed) return 'The bus already passed that stop. Pick a stop ahead.';
    }
    return null;
  }

  private clearNetworkSegment() {
    this.tripId = null;
    this.corridorId = null;
    this.operatorId = null;
    this.serviceClassId = null;
    this.boardStopId = null;
    this.alightStopId = null;
    this.boardSeq = null;
    this.alightSeq = null;
    this.busSeq = null;
  }

  /** Change the boarding/alighting stops. Only downstream stops are valid;
   *  changing stops clears selected seats and re-checks availability. */
  setBoardAlight(boardStopId: string, alightStopId: string): string | null {
    const corridor = corridorById(this.corridorId);
    if (!corridor) return 'This trip is not on a corridor yet.';
    const trip = this.tripId ? tripById(this.tripId) : null;
    const err = this.validatePairOnCorridor(
      corridor.id,
      trip?.direction ?? this.directionFromSeqs(
        stopById(corridor, boardStopId)?.sequence ?? 0,
        stopById(corridor, alightStopId)?.sequence ?? 0,
      ) ?? 'forward',
      boardStopId,
      alightStopId,
    );
    if (err) {
      // Preserve the legacy direction-against-trip message shape when the
      // trip direction is known; validatePairOnCorridor already does this.
      return err;
    }
    const board = stopById(corridor, boardStopId)!;
    const alight = stopById(corridor, alightStopId)!;
    this.boardStopId = board.id;
    this.alightStopId = alight.id;
    this.boardSeq = board.sequence;
    this.alightSeq = alight.sequence;
    this.selectedSeats = [];
    return null;
  }

  private directionFromSeqs(boardSeq: number, alightSeq: number): Direction | null {
    if (alightSeq === boardSeq) return null;
    return alightSeq > boardSeq ? 'forward' : 'reverse';
  }

  /** Inline validation messages for the current session state. */
  validateStops(): string[] {
    const errors: string[] = [];
    if (!this.trip) {
      errors.push('Pick a trip first.');
      return errors;
    }
    if (!this.hasNetworkSegment) return errors;
    const dir = this.direction;
    if (!dir) {
      errors.push('Get off after you get on — pick a different stop.');
      return errors;
    }
    const trip = this.tripId ? tripById(this.tripId) : null;
    if (trip && dir !== trip.direction) {
      const label = trip.direction === 'forward' ? 'southbound' : 'northbound';
      errors.push(
        `That order runs against this ${label} trip — pick stops in travel order.`,
      );
    }
    if (this.busSeq != null && dir) {
      const passed =
        dir === 'forward' ? this.boardSeq! < this.busSeq : this.boardSeq! > this.busSeq;
      if (passed) errors.push('The bus already passed that stop. Pick a stop ahead.');
    }
    if (this.travelDate) {
      const dep = this.departureDate();
      if (dep && dep.getTime() < Date.now() - 24 * 3600 * 1000) {
        errors.push('That departure already left. Pick another date.');
      }
    }
    return errors;
  }

  /** Scheduled departure instant for the session (null when unknown).
   *  Uses the network trip's scheduled slot, never an ETA-derived time. */
  departureDate(): Date | null {
    if (!this.tripId || !this.travelDate) return null;
    const time = this.scheduledDepartureTime;
    if (!time) return null;
    try {
      const d = new Date(`${this.travelDate} ${time}`);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  /** Scheduled slot from the network model (e.g. "6:00 AM"); falls back to
   *  the catalog trip's exact slot when off-corridor. */
  get scheduledDepartureTime(): string | null {
    if (this.tripId) {
      const trip = tripById(this.tripId);
      if (trip?.departureTime) return trip.departureTime;
    }
    return this.trip?.departureTime ?? null;
  }

  /** Rider-facing pickup line: "boards at {ETA at pickup}". */
  get boardsAtPickup(): string {
    if (!this.hasNetworkSegment || !this.tripId) return '';
    try {
      const eta = this.network.stopEta(
        this.tripId,
        Math.min(this.boardSeq!, this.alightSeq!),
        this.travelDate,
      );
      return eta ? `boards at ${eta}` : '';
    } catch {
      return '';
    }
  }

  /** Hail anchor: map a GPS pickup to the nearest downstream stop and pin
   *  the bus position so passed stops stay unbookable. */
  anchorHailBoarding(lat: number, lng: number, busSeq: number) {
    if (!this.corridorId || !this.tripId) return;
    const trip = tripById(this.tripId);
    if (!trip) return;
    const stop = this.network.nearestDownstreamStop(
      this.corridorId,
      trip.direction,
      lat,
      lng,
      busSeq,
    );
    if (!stop) return;
    this.busSeq = busSeq;
    this.boardStopId = stop.id;
    this.boardSeq = stop.sequence;
    this.selectedSeats = [];
  }

  get passengerCount(): number {
    return this.passengers.length;
  }

  /** How many passengers a booking may hold — exactly how many seats are
   *  still genuinely free on the rider's own segment, never more. */
  get maxPassengers(): number {
    if (!this.trip) return 1;
    const availability = this.seatService.availabilityForBooking(this);
    return Math.max(1, availability.available);
  }

  /** True when the commuter expressed any preference at all. */
  get hasSeatPreference(): boolean {
    return (
      this.seatPreference.position !== 'any' ||
      this.seatPreference.zone !== 'any'
    );
  }

  /** Short label, e.g. "WINDOW · FRONT" or "NO PREFERENCE". */
  preferenceLabel(): string {
    if (!this.hasSeatPreference) return 'NO PREFERENCE';
    const parts: string[] = [];
    if (this.seatPreference.position !== 'any')
      parts.push(this.seatPreference.position.toUpperCase());
    if (this.seatPreference.zone !== 'any')
      parts.push(this.seatPreference.zone.toUpperCase());
    return parts.join(' · ');
  }

  fareForPassenger(p: PassengerEntry): number {
    const discount = PASSENGER_TYPE_META[p.type].discount;
    return Math.round(this.seatFare * (1 - discount));
  }

  passengerLabel(p: PassengerEntry): string {
    return PASSENGER_TYPE_META[p.type].label;
  }

  get subtotal(): number {
    return this.passengers.reduce(
      (sum, p) => sum + this.fareForPassenger(p),
      0,
    );
  }

  get totalDiscount(): number {
    return this.passengers.reduce(
      (sum, p) => sum + (this.seatFare - this.fareForPassenger(p)),
      0,
    );
  }

  get discountedCount(): number {
    return this.passengers.filter((p) => p.type !== 'regular').length;
  }

  /** Discount applied by the selected voucher, if eligible. */
  get voucherDiscount(): number {
    const v = this.voucher;
    if (!v) return 0;
    const eligible = this.subtotal;
    if (eligible < v.minSpend) return 0;
    const base = v.kind === 'percent' ? Math.round((eligible * v.value) / 100) : v.value;
    const capped = typeof v.cap === 'number' ? Math.min(base, v.cap) : base;
    return Math.min(capped, eligible);
  }

  get total(): number {
    return Math.max(0, this.subtotal - this.voucherDiscount);
  }

  formatCurrency(n: number): string {
    return '₱ ' + n.toLocaleString('en-PH');
  }

  addPassenger() {
    if (this.passengers.length >= this.maxPassengers) return;
    this.counter++;
    this.passengers.push({ id: 'p' + this.counter, type: 'regular' });
    this.selectedSeats = []; // seat count changed — force reselection
  }

  removePassenger(id: string) {
    if (this.passengers.length <= 1) return;
    this.passengers = this.passengers.filter((p) => p.id !== id);
    this.selectedSeats = [];
  }

  setPassengerType(id: string, type: PassengerType) {
    const p = this.passengers.find((p) => p.id === id);
    if (!p || p.type === type) return;
    p.type = type;
    // Switching fare type resets ID verification — a new category needs
    // its own document, number and confirmation.
    p.idType = undefined;
    p.idImage = undefined;
    p.idImageKind = undefined;
    p.idConfirmed = false;
    if (type === 'regular') p.idNumber = undefined;
  }

  setPassengerIdDoc(id: string, patch: Partial<Pick<PassengerEntry, 'idType' | 'idNumber' | 'idImage' | 'idImageKind' | 'idConfirmed'>>) {
    const p = this.passengers.find((p) => p.id === id);
    if (p) Object.assign(p, patch);
  }

  idOptionsFor(type: PassengerType): string[] {
    return type === 'regular' ? [] : (ID_TYPE_OPTIONS[type] ?? []);
  }

  /** One discounted passenger is verified when number + front ID preview + checkbox are all done. */
  isPassengerVerified(p: PassengerEntry): boolean {
    if (!PASSENGER_TYPE_META[p.type].requiresId) return true;
    return (
      !!p.idType &&
      !!(p.idNumber ?? '').trim() &&
      !!p.idImage &&
      p.idConfirmed === true
    );
  }

  /** Every discounted passenger verified — gates Proceed to Payment. */
  get allIdsVerified(): boolean {
    return this.passengers.every((p) => this.isPassengerVerified(p));
  }

  get unverifiedCount(): number {
    return this.passengers.filter((p) => !this.isPassengerVerified(p)).length;
  }

  startBooking(trip: TripSummary, opts?: StartBookingOptions) {
    this.trip = trip;
    this.counter = 1;
    this.passengers = [{ id: 'p1', type: 'regular' }];
    this.selectedSeats = [];
    this.paymentMethod = 'gcash';
    this.bookingRef = '';
    this.voucher = null;
    this.pickup = null;
    this.hailMode = false;
    this.rebookedFrom = null;
    this.seatPreference = { ...NO_SEAT_PREFERENCE };
    this.quotedSeatFare = null;
    this.quotedBoardStopId = null;
    this.quotedAlightStopId = null;
    this.clearNetworkSegment();
    this.attachNetwork(opts);
    // Lock the tapped card's price — but only when the session actually
    // rides the quoted stretch. A rejected pair falls back to the full
    // route, and the lock is skipped so Trip Details/Payment price the
    // route the commuter really boards.
    if (
      opts?.quotedSeatFare != null &&
      Number.isFinite(opts.quotedSeatFare) &&
      opts.quotedSeatFare > 0
    ) {
      const pairRequested = !!(opts.boardStopId && opts.alightStopId);
      const pairKept =
        !pairRequested ||
        (this.boardStopId === opts.boardStopId &&
          this.alightStopId === opts.alightStopId);
      if (pairKept) {
        this.quotedSeatFare = Math.round(opts.quotedSeatFare);
        this.quotedBoardStopId = this.boardStopId;
        this.quotedAlightStopId = this.alightStopId;
      }
    }
    if (opts?.travelDate) {
      this.travelDate = opts.travelDate;
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      this.travelDate = d.toDateString();
    }
  }

  /** Unique booking ref: regenerates on collision. Randomness flows through
   *  `randomFn` so tests can seed it. */
  generateBookingRef(existingRefs?: Set<string>): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      const ref = 'BYH-' + Math.floor(10000 + this.randomFn() * 89999);
      if (!existingRefs || !existingRefs.has(ref)) {
        this.bookingRef = ref;
        return ref;
      }
    }
    // Extremely unlikely fallback: timestamp suffix guarantees uniqueness.
    const ref = `BYH-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    this.bookingRef = ref;
    return ref;
  }

  reset() {
    this.trip = null;
    this.selectedSeats = [];
    this.bookingRef = '';
    this.voucher = null;
    this.pickup = null;
    this.hailMode = false;
    this.rebookedFrom = null;
    this.seatPreference = { ...NO_SEAT_PREFERENCE };
    this.quotedSeatFare = null;
    this.quotedBoardStopId = null;
    this.quotedAlightStopId = null;
    this.clearNetworkSegment();
  }
}
