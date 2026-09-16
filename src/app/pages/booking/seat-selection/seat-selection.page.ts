import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  chevronForwardOutline,
  navigateOutline,
} from 'ionicons/icons';
import { BookingService } from '../booking.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'navigate-outline': navigateOutline,
});

type SeatStatus = 'available' | 'selected' | 'booked';
interface Seat {
  id: string;
  row: number;
  status: SeatStatus;
}

const ROWS = 10;
const COLS = ['A', 'B', 'C', 'D'];

// Deterministic shuffle used to decide which seats show as pre-booked
const SHUFFLE_ORDER = [
  '3B',
  '7A',
  '2D',
  '9C',
  '1A',
  '5C',
  '8B',
  '4D',
  '6A',
  '10B',
  '2A',
  '7D',
  '3C',
  '9A',
  '5B',
  '1D',
  '8C',
  '4A',
  '6D',
  '10C',
  '2C',
  '7B',
  '3A',
  '9D',
  '5A',
  '1C',
  '8D',
  '4B',
  '6C',
  '10A',
  '2B',
  '7C',
  '3D',
  '9B',
  '5D',
  '1B',
  '8A',
  '4C',
  '6B',
  '10D',
];

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './seat-selection.page.html',
  styleUrls: ['./seat-selection.page.scss'],
})
export class SeatSelectionPage implements OnInit {
  seats: Seat[] = [];
  rowNumbers: number[] = Array.from({ length: ROWS }, (_, i) => i + 1);

  constructor(
    public booking: BookingService,
    private router: Router,
  ) {
    addIcons({ arrowBackOutline, navigateOutline, chevronForwardOutline });
  }

  ngOnInit() {
    if (!this.booking.trip) {
      this.router.navigateByUrl('/home');
      return;
    }
    this.buildSeatMap();
  }

  buildSeatMap() {
    const seatsLeftNum =
      Number((this.booking.trip!.seatsLeft || '').replace(/[^0-9]/g, '')) || 20;
    const total = ROWS * COLS.length;
    const bookedCount = Math.max(0, Math.min(total, total - seatsLeftNum));
    const bookedSet = new Set(SHUFFLE_ORDER.slice(0, bookedCount));
    const alreadySelected = new Set(this.booking.selectedSeats);

    const list: Seat[] = [];
    for (let r = 1; r <= ROWS; r++) {
      for (const c of COLS) {
        const id = `${r}${c}`;
        let status: SeatStatus = bookedSet.has(id) ? 'booked' : 'available';
        if (status === 'available' && alreadySelected.has(id))
          status = 'selected';
        list.push({ id, row: r, status });
      }
    }
    this.seats = list;
  }

  seatsInRow(row: number): Seat[] {
    return this.seats.filter((s) => s.row === row);
  }

  leftPair(row: number): Seat[] {
    return this.seatsInRow(row).slice(0, 2);
  }
  rightPair(row: number): Seat[] {
    return this.seatsInRow(row).slice(2, 4);
  }

  toggleSeat(seat: Seat) {
    if (seat.status === 'booked') return;

    if (seat.status === 'selected') {
      seat.status = 'available';
      this.booking.selectedSeats = this.booking.selectedSeats.filter(
        (id) => id !== seat.id,
      );
    } else {
      if (this.booking.selectedSeats.length >= this.booking.passengerCount)
        return;
      seat.status = 'selected';
      this.booking.selectedSeats.push(seat.id);
    }
  }

  get canContinue(): boolean {
    return this.booking.selectedSeats.length === this.booking.passengerCount;
  }

  goBack() {
    this.router.navigateByUrl('/booking/trip');
  }

  continue() {
    if (!this.canContinue) return;
    this.router.navigateByUrl('/booking/payment');
  }
}
