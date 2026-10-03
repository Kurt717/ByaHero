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
} from '../../../services/seat.service';
import {
  corridorById,
  stopById,
} from '../../../services/network.service';

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

interface SeatRow {
  num: number;
  left: Seat[];
  right: Seat[];
}

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
  seatRows: SeatRow[] = [];
  availability: SeatAvailability | null = null;
  /** Available seats matching the session preference (empty when none set). */
  matchingSet: Set<string> = new Set();
  /** Informational notes for seats that free up later on this trip. */
  freeLaterNotes: string[] = [];

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
    const availability = this.seatService.availabilityForBooking(this.booking);
    this.availability = availability;
    const bookedSet = availability.bookedSet;
    const alreadySelected = new Set(this.booking.selectedSeats);

    // Render from the vehicle layout (deluxe 2+1, ordinary 2+3, vans…).
    const layout = this.seatService.layoutForBooking(this.booking);
    const columns = layout
      ? layout.columns
      : ['A', 'B', '|', 'C', 'D'];
    const rows = layout ? layout.rows : 10;
    const splitAt = columns.indexOf('|');
    const leftCols = (splitAt < 0 ? columns : columns.slice(0, splitAt)).filter(
      (c) => c !== '|',
    );
    const rightCols = (splitAt < 0 ? [] : columns.slice(splitAt + 1)).filter(
      (c) => c !== '|',
    );

    const list: Seat[] = [];
    for (let r = 1; r <= rows; r++) {
      for (const c of [...leftCols, ...rightCols]) {
        const id = `${r}${c}`;
        let status: SeatStatus = bookedSet.has(id) ? 'booked' : 'available';
        if (status === 'available' && alreadySelected.has(id))
          status = 'selected';
        list.push({ id, row: r, status });
      }
    }
    this.seats = list;
    this.seatRows = [];
    for (let r = 1; r <= rows; r++) {
      const inRow = list.filter((s) => s.row === r);
      this.seatRows.push({
        num: r,
        left: inRow.filter((s) =>
          leftCols.includes(s.id.slice(-1)),
        ),
        right: inRow.filter((s) =>
          rightCols.includes(s.id.slice(-1)),
        ),
      });
    }
    // Highlight help: available seats satisfying the session preference.
    // Never auto-selects — the commuter still taps an actual seat.
    this.matchingSet = new Set(
      this.booking.hasSeatPreference
        ? this.seatService.matchingForBooking(
            this.booking,
            this.booking.seatPreference,
          )
        : [],
    );
    this.freeLaterNotes = this.buildFreeLaterNotes(bookedSet);
  }

  /** 'Seat 12 is taken until Santiago' — seats blocked on the rider's
   *  segment that free up later are informational only. */
  private buildFreeLaterNotes(bookedSet: Set<string>): string[] {
    const seg = this.seatService.segmentForBooking(this.booking);
    if (!seg) return [];
    const corridor = corridorById(seg.corridorId);
    if (!corridor) return [];
    const depKey = `${seg.tripId}|${this.booking.travelDate}`;
    const board = Math.min(seg.boardSeq, seg.alightSeq);
    const alight = Math.max(seg.boardSeq, seg.alightSeq);
    const notes: string[] = [];
    for (const seatId of bookedSet) {
      if (notes.length >= 3) break;
      const freeAt = this.seatService.freeAtSeq(
        depKey,
        seatId,
        board,
        alight,
        seg.lastSeq,
      );
      if (freeAt == null) continue;
      const stop = stopById(corridor, corridor.stops[freeAt]?.id ?? '');
      if (stop) notes.push(`Seat ${seatId} is taken until ${stop.name}`);
    }
    return notes;
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
