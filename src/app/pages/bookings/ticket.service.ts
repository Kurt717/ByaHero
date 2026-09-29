<<<<<<< HEAD
import { Injectable, inject } from '@angular/core';
import { BookingService } from '../booking/booking.service';
import { ProfileService } from '../profile/profile.service';
=======
import { Injectable } from '@angular/core';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

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
<<<<<<< HEAD
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
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
}

@Injectable({ providedIn: 'root' })
export class TicketService {
<<<<<<< HEAD
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
      this.bookingsState = this.bookingsState.map((item) =>
        item.bookingRef === booking.bookingRef ? { ...existing, ...booking } : item,
      );
    } else {
      this.bookingsState = [booking, ...this.bookingsState];
    }
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
      // Terminal-board departures carry their exact slot time; everything
      // else keeps the existing eta-derived behavior.
      time: checkout.trip.departureTime ?? this.departureTimeFromEta(checkout.trip.eta),
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
    };

    return this.add(booking);
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
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return this.seedBookings();
    }

    return this.seedBookings();
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
        status: 'confirmed',
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
        status: 'boarding',
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
=======
  selected: Booking | null = null;

  open(booking: Booking) {
    this.selected = booking;
  }
  clear() {
    this.selected = null;
  }
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
}
