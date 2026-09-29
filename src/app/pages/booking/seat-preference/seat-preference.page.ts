import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  chevronForwardOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import {
  BookingService,
  SeatPositionPref,
  SeatZonePref,
} from '../booking.service';
import { SeatService } from '../../../services/seat.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'information-circle-outline': informationCircleOutline,
});

/**
 * Seat preference: a lightweight wish (position + zone) captured before the
 * real seat map. It never reserves anything — the commuter still picks an
 * actual seat, and the map highlights available seats that match.
 * Reservation-only: hailing sessions skip this step entirely.
 */
@Component({
  selector: 'app-seat-preference',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './seat-preference.page.html',
  styleUrls: ['./seat-preference.page.scss'],
})
export class SeatPreferencePage implements OnInit {
  booking = inject(BookingService);
  private router = inject(Router);
  private location = inject(Location);
  private seatService = inject(SeatService);

  readonly positions: { id: SeatPositionPref; label: string; hint: string }[] = [
    { id: 'window', label: 'Window', hint: 'Seats A · D' },
    { id: 'aisle', label: 'Aisle', hint: 'Seats B · C' },
    { id: 'any', label: 'No preference', hint: 'Any seat' },
  ];

  readonly zones: { id: SeatZonePref; label: string; hint: string }[] = [
    { id: 'front', label: 'Front', hint: 'Rows 1–3' },
    { id: 'middle', label: 'Middle', hint: 'Rows 4–7' },
    { id: 'back', label: 'Back', hint: 'Rows 8–10' },
    { id: 'any', label: 'No preference', hint: 'Any row' },
  ];

  constructor() {
    addIcons({
      arrowBackOutline,
      chevronForwardOutline,
      informationCircleOutline,
    });
  }

  ngOnInit() {
    if (!this.booking.trip) {
      this.router.navigateByUrl('/home');
      return;
    }
    // Hailing has no seat-preference step: jump straight to the seat map.
    // Replace (not push) so this redirect leaves no hop in history —
    // otherwise Seats' location.back() would land here and bounce back.
    if (this.booking.hailMode) {
      this.router.navigateByUrl('/booking/seats', { replaceUrl: true });
      return;
    }
  }

  setPosition(position: SeatPositionPref) {
    this.booking.seatPreference = { ...this.booking.seatPreference, position };
  }

  setZone(zone: SeatZonePref) {
    this.booking.seatPreference = { ...this.booking.seatPreference, zone };
  }

  clear() {
    this.booking.seatPreference = { position: 'any', zone: 'any' };
  }

  /** Available seats on this departure matching the current wish. */
  get matchingSeats(): string[] {
    if (!this.booking.trip) return [];
    return this.seatService.matchingAvailableSeats(
      this.booking.trip.seatsLeft,
      this.seatService.keyFor(this.booking),
      this.booking.seatPreference,
    );
  }

  get soldOut(): boolean {
    if (!this.booking.trip) return false;
    return (
      this.seatService.availabilityFor(
        this.booking.trip.seatsLeft,
        this.seatService.keyFor(this.booking),
      ).available <= 0
    );
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl('/booking/trip');
  }

  continue() {
    if (this.soldOut) return;
    this.router.navigateByUrl('/booking/seats');
  }
}
