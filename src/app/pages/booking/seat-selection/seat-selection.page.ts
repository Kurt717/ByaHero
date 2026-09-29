import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  chevronForwardOutline,
  navigateOutline,
  peopleOutline,
} from 'ionicons/icons';
import { BookingService } from '../booking.service';
import {
  SeatService,
  SeatAvailability,
  SEAT_COLS,
  SEAT_ROWS,
} from '../../../services/seat.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'navigate-outline': navigateOutline,
  'people-outline': peopleOutline,
});

type SeatStatus = 'available' | 'selected' | 'booked';
interface Seat {
  id: string;
  row: number;
  status: SeatStatus;
}

const ROWS = SEAT_ROWS;
const COLS: readonly string[] = SEAT_COLS;

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './seat-selection.page.html',
  styleUrls: ['./seat-selection.page.scss'],
})
export class SeatSelectionPage implements OnInit {
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
  }

  ngOnInit() {
    if (!this.booking.trip) {
      this.router.navigateByUrl('/home');
      return;
    }
    this.buildSeatMap();
  }

  buildSeatMap() {
    const key = this.seatService.keyFor(this.booking);
    const availability = this.seatService.availabilityFor(
      this.booking.trip!.seatsLeft,
      key,
    );
    this.availability = availability;
    const bookedSet = availability.bookedSet;
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
  }

  continue() {
    if (!this.canContinue) return;
    this.router.navigateByUrl('/booking/payment');
  }
}
