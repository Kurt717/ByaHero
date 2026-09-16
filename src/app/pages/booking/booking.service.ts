import { Injectable } from '@angular/core';

export interface TripSummary {
  operator: string;
  from: string;
  to: string;
  eta: string;
  fare: string; // base one-way fare per seat, e.g. '₱ 620'
  seatsLeft: string; // e.g. '18 seats left'
  status: string; // 'on-time' | 'delayed'
}

export type FareClass = 'saver' | 'plus' | 'premium';
export type PaymentMethod = 'gcash' | 'card' | 'cash';
export type PassengerType = 'regular' | 'student' | 'senior' | 'pwd';

export interface FareClassOption {
  id: FareClass;
  label: string;
  tagline: string;
  icon: string;
  multiplier: number;
}

export interface PassengerEntry {
  id: string;
  type: PassengerType;
  idNumber?: string;
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

@Injectable({ providedIn: 'root' })
export class BookingService {
  trip: TripSummary | null = null;
  travelDate = '';
  passengers: PassengerEntry[] = [{ id: 'p1', type: 'regular' }];
  fareClass: FareClass = 'saver';
  selectedSeats: string[] = [];
  paymentMethod: PaymentMethod = 'gcash';
  bookingRef = '';

  private counter = 1;

  readonly fareClasses: FareClassOption[] = [
    {
      id: 'saver',
      label: 'Saver',
      tagline: 'Standard reclining seat',
      icon: 'bus-outline',
      multiplier: 1,
    },
    {
      id: 'plus',
      label: 'Plus',
      tagline: 'Extra legroom, window priority',
      icon: 'flash-outline',
      multiplier: 1.35,
    },
    {
      id: 'premium',
      label: 'Premium',
      tagline: 'Wide seat + onboard snack',
      icon: 'sparkles-outline',
      multiplier: 1.75,
    },
  ];

  get selectedFareClass(): FareClassOption {
    return (
      this.fareClasses.find((f) => f.id === this.fareClass) ??
      this.fareClasses[0]
    );
  }

  get baseFare(): number {
    if (!this.trip) return 0;
    const n = Number(this.trip.fare.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  /** Full, undiscounted fare for one seat at the chosen fare class. */
  get seatFare(): number {
    return Math.round(this.baseFare * this.selectedFareClass.multiplier);
  }

  get passengerCount(): number {
    return this.passengers.length;
  }

  get maxPassengers(): number {
    const n = Number((this.trip?.seatsLeft || '').replace(/[^0-9]/g, ''));
    return Math.max(1, Math.min(isNaN(n) ? 6 : n, 6));
  }

  fareForPassenger(p: PassengerEntry): number {
    const discount = PASSENGER_TYPE_META[p.type].discount;
    return Math.round(this.seatFare * (1 - discount));
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

  get serviceFee(): number {
    return this.subtotal ? 15 : 0;
  }

  get total(): number {
    return this.subtotal + this.serviceFee;
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
    if (p) p.type = type;
  }

  startBooking(trip: TripSummary) {
    this.trip = trip;
    this.counter = 1;
    this.passengers = [{ id: 'p1', type: 'regular' }];
    this.fareClass = 'saver';
    this.selectedSeats = [];
    this.paymentMethod = 'gcash';
    this.bookingRef = '';
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
  }
}
