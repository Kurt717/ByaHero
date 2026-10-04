import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  chevronForwardOutline,
  navigateOutline,
} from 'ionicons/icons';
import { BookingService } from '../booking.service';
import {
  SeatService,
} from '../../../services/seat.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'navigate-outline': navigateOutline,
});

type SeatStatus = 'available' | 'selected' | 'booked' | 'blocked';
interface Seat {
  id: string;
  row: number;
  status: SeatStatus;
}

interface SeatRow {
  num: number;
  /** Seat groups split by aisle gaps (one group per side of each '|'). */
  groups: Seat[][];
}

/** Split seat-letter columns on every aisle gap ('|'), so 2+2 renders two
 *  groups, vans a single group, and the 1+1+1 sleeper three. Pure and
 *  unit-tested: every seat letter must land in exactly one group, so no
 *  seat can go missing on the right side of the map. */
export function splitColumnGroups(columns: string[]): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const c of columns) {
    if (c === '|') {
      if (current.length) groups.push(current);
      current = [];
    } else {
      current.push(c);
    }
  }
  if (current.length) groups.push(current);
  if (!groups.length) groups.push(columns.filter((c) => c !== '|'));
  return groups;
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
  private toastController = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  seats: Seat[] = [];
  seatRows: SeatRow[] = [];
  /** Available seats matching the session preference (empty when none set). */
  matchingSet: Set<string> = new Set();
  /** Ids picked this session — the single source of truth for the
   *  highlight. The template reads this (not the mutable seat.status),
   *  so a tap can never update the data without updating the color. */
  selectedSet: Set<string> = new Set();

  constructor() {
    addIcons({ arrowBackOutline, navigateOutline, chevronForwardOutline });
  }

  ngOnInit() {
    if (!this.booking.trip) {
      this.router.navigateByUrl('/home');
      return;
    }
    this.buildSeatMap();
  }

  /** Re-read inventory every time the map is shown: a seat sold in another
   *  session (or on another device) while this page was in the stack shows
   *  as booked instead of staying tappable. Payment re-checks anyway. */
  ionViewWillEnter() {
    if (this.booking.trip) this.buildSeatMap();
  }

  buildSeatMap() {
    const availability = this.seatService.availabilityForBooking(this.booking);
    const bookedSet = availability.bookedSet;
    const alreadySelected = new Set(this.booking.selectedSeats);

    // Render from the vehicle layout (deluxe 2+1, ordinary 2+3, vans,
    // 1+1+1 sleeper with two aisles…). Column groups split on every '|'.
    const layout = this.seatService.layoutForBooking(this.booking);
    const columns = layout
      ? layout.columns
      : ['A', 'B', '|', 'C', 'D'];
    const rows = layout ? layout.rows : 10;
    const blocked = new Set(layout?.blockedSeats ?? []);
    const groups = splitColumnGroups(columns);
    const allCols = groups.flat();

    const list: Seat[] = [];
    for (let r = 1; r <= rows; r++) {
      for (const c of allCols) {
        const id = `${r}${c}`;
        let status: SeatStatus = bookedSet.has(id) ? 'booked' : 'available';
        if (blocked.has(id)) status = 'blocked';
        if (status === 'available' && alreadySelected.has(id))
          status = 'selected';
        list.push({ id, row: r, status });
      }
    }
    this.seats = list;
    // Highlight source of truth, kept in lockstep with the booking.
    this.selectedSet = new Set(this.booking.selectedSeats);
    this.seatRows = [];
    for (let r = 1; r <= rows; r++) {
      const inRow = list.filter((s) => s.row === r);
      this.seatRows.push({
        num: r,
        groups: groups.map((cols) =>
          inRow.filter((s) => cols.includes(s.id.slice(-1))),
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
  }

  async toggleSeat(seat: Seat) {
    if (seat.status === 'booked' || seat.status === 'blocked') return;

    if (this.selectedSet.has(seat.id)) {
      this.selectedSet.delete(seat.id);
      this.booking.selectedSeats = this.booking.selectedSeats.filter(
        (id) => id !== seat.id,
      );
    } else {
      if (this.booking.selectedSeats.length >= this.booking.passengerCount) {
        const toast = await this.toastController.create({
          message: `Only ${this.booking.passengerCount} seat${this.booking.passengerCount === 1 ? '' : 's'} for ${this.booking.passengerCount} passenger${this.booking.passengerCount === 1 ? '' : 's'} — tap a selected seat to change it.`,
          duration: 2000,
          color: 'warning',
          position: 'bottom',
        });
        await toast.present();
        return;
      }
      this.selectedSet.add(seat.id);
      this.booking.selectedSeats = [...this.booking.selectedSeats, seat.id];
    }
    // Sync every rendered copy by id (seatRows groups share references
    // with `seats`, but syncing by id survives even if a stale reference
    // ever arrives): booked/blocked stay untouched, everything else
    // follows the selection set.
    for (const s of this.seats) {
      if (s.status === 'booked' || s.status === 'blocked') continue;
      s.status = this.selectedSet.has(s.id) ? 'selected' : 'available';
    }
    // Render the highlight synchronously, even if this tap arrived from a
    // gesture/animation callback that skipped change detection.
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  get canContinue(): boolean {
    return this.booking.selectedSeats.length === this.booking.passengerCount;
  }

  /** First validation error, if any (stops/departure). */
  get validationError(): string | null {
    try {
      const errors = this.booking.validateStops();
      return errors.length ? errors[0] : null;
    } catch {
      return null;
    }
  }

  /** Highlight check — reads the selection set, never a stale copy. */
  isSelected(seat: Seat): boolean {
    return this.selectedSet.has(seat.id);
  }

  /** Available + matches the session preference → highlighted, not reserved. */
  isPreferred(seat: Seat): boolean {
    return (
      !this.selectedSet.has(seat.id) &&
      seat.status === 'available' &&
      this.matchingSet.has(seat.id)
    );
  }

  /** True when the vehicle has unsellable seats (restroom bay…) so the
   *  legend explains the hatched style. */
  get hasBlockedSeats(): boolean {
    return this.seats.some((s) => s.status === 'blocked');
  }

  /** True when not a single seat can be picked on this departure. */
  get soldOut(): boolean {
    return (
      this.seats.length > 0 &&
      !this.seats.some((s) => s.status === 'available' || s.status === 'selected')
    );
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

  async continue() {
    if (this.validationError) {
      const toast = await this.toastController.create({
        message: this.validationError,
        duration: 2200,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
      return;
    }
    if (!this.canContinue) return;
    this.router.navigateByUrl('/booking/payment');
  }
}
