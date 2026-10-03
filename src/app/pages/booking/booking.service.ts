import { Injectable, inject } from '@angular/core';
import { SeatService } from '../../services/seat.service';
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

/** Seat position across the aisle: outer columns (A, D) sit at the windows,
 *  inner columns (B, C) sit on the aisle in the 2+2 layout. */
export type SeatPositionPref = 'window' | 'aisle' | 'any';
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

/** Max ID upload size: 5MB. */
export const MAX_ID_UPLOAD_BYTES = 5 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class BookingService {
  private seatService = inject(SeatService);
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

  private counter = 1;

  get baseFare(): number {
    if (!this.trip) return 0;
    const n = Number(this.trip.fare.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  /** Fare for one seat — set by the bus/operator/route in the catalog, no
   *  artificial "fare classes". */
  get seatFare(): number {
    return Math.round(this.baseFare);
  }

  get passengerCount(): number {
    return this.passengers.length;
  }

  /** How many passengers a booking may hold — exactly how many seats are
   *  still genuinely free on the departure, never more. */
  get maxPassengers(): number {
    if (!this.trip) return 1;
    const availability = this.seatService.availabilityFor(
      this.trip.seatsLeft,
      this.seatService.keyFor(this),
    );
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

  startBooking(trip: TripSummary) {
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
    const d = new Date();
    d.setDate(d.getDate() + 1);
    this.travelDate = d.toDateString();
  }

  generateBookingRef(): string {
    this.bookingRef = 'BYH-' + Math.floor(10000 + Math.random() * 89999);
    return this.bookingRef;
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
  }
}
