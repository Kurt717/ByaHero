<<<<<<< HEAD
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
=======
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  chevronForwardOutline,
  navigateOutline,
<<<<<<< HEAD
  peopleOutline,
} from 'ionicons/icons';
import { BookingService } from '../booking.service';
import {
  SeatService,
  SeatAvailability,
  SEAT_COLS,
  SEAT_ROWS,
} from '../../../services/seat.service';
=======
} from 'ionicons/icons';
import { BookingService } from '../booking.service';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'navigate-outline': navigateOutline,
<<<<<<< HEAD
  'people-outline': peopleOutline,
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
});

type SeatStatus = 'available' | 'selected' | 'booked';
interface Seat {
  id: string;
  row: number;
  status: SeatStatus;
}

<<<<<<< HEAD
const ROWS = SEAT_ROWS;
const COLS: readonly string[] = SEAT_COLS;
=======
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
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './seat-selection.page.html',
  styleUrls: ['./seat-selection.page.scss'],
})
export class SeatSelectionPage implements OnInit {
<<<<<<< HEAD
  booking = inject(BookingService);
  private router = inject(Router);
  private location = inject(Location);
  private seatService = inject(SeatService);

  seats: Seat[] = [];
  rowNumbers: number[] = Array.from({ length: ROWS }, (_, i) => i + 1);
  availability: SeatAvailability | null = null;
  /** Available seats matching the session preference (empty when none set). */
  matchingSet: Set<string> = new Set();

  constructor() {
    addIcons({ arrowBackOutline, navigateOutline, chevronForwardOutline, peopleOutline });
=======
  seats: Seat[] = [];
  rowNumbers: number[] = Array.from({ length: ROWS }, (_, i) => i + 1);

  constructor(
    public booking: BookingService,
    private router: Router,
  ) {
    addIcons({ arrowBackOutline, navigateOutline, chevronForwardOutline });
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }

  ngOnInit() {
    if (!this.booking.trip) {
      this.router.navigateByUrl('/home');
      return;
    }
    this.buildSeatMap();
  }

  buildSeatMap() {
<<<<<<< HEAD
    const key = this.seatService.keyFor(this.booking);
    const availability = this.seatService.availabilityFor(
      this.booking.trip!.seatsLeft,
      key,
    );
    this.availability = availability;
    const bookedSet = availability.bookedSet;
=======
    const seatsLeftNum =
      Number((this.booking.trip!.seatsLeft || '').replace(/[^0-9]/g, '')) || 20;
    const total = ROWS * COLS.length;
    const bookedCount = Math.max(0, Math.min(total, total - seatsLeftNum));
    const bookedSet = new Set(SHUFFLE_ORDER.slice(0, bookedCount));
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
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
<<<<<<< HEAD
    // Highlight help: available seats satisfying the session preference.
    // Never auto-selects — the commuter still taps an actual seat.
    this.matchingSet = new Set(
      this.booking.hasSeatPreference
        ? this.seatService.matchingAvailableSeats(
            this.booking.trip!.seatsLeft,
            key,
            this.booking.seatPreference,
          )
        : [],
    );
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
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

<<<<<<< HEAD
  /** Available + matches the session preference → highlighted, not reserved. */
  isPreferred(seat: Seat): boolean {
    return seat.status === 'available' && this.matchingSet.has(seat.id);
  }

  goBack() {
    // Pop the history entry pushed by Continue — never push a duplicate.
    // Pushing here (navigateByUrl) stacked a second Preference/Trip entry,
    // and that step's own location.back() returned straight here: a loop.
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    // Deep-link fallback: hailing never visits the preference step.
    if (this.booking.hailMode) {
      this.router.navigateByUrl('/booking/trip');
      return;
    }
    this.router.navigateByUrl('/booking/seat-preference');
=======
  goBack() {
    this.router.navigateByUrl('/booking/trip');
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }

  continue() {
    if (!this.canContinue) return;
    this.router.navigateByUrl('/booking/payment');
  }
}
