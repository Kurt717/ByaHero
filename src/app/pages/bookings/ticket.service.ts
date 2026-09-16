import { Injectable } from '@angular/core';

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
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  selected: Booking | null = null;

  open(booking: Booking) {
    this.selected = booking;
  }
  clear() {
    this.selected = null;
  }
}
