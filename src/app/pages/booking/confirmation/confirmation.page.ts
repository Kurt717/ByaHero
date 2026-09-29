import { Component, OnInit, inject } from '@angular/core';

import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline,
  qrCodeOutline,
  calendarOutline,
  timeOutline,
  bus,
  listOutline,
  homeOutline,
  locationOutline,
} from 'ionicons/icons';
import { BookingService } from '../booking.service';
import { PickupService } from '../../../services/pickup.service';

addIcons({
  'checkmark-outline': checkmarkOutline,
  'qr-code-outline': qrCodeOutline,
  'calendar-outline': calendarOutline,
  'time-outline': timeOutline,
  bus: bus,
  'list-outline': listOutline,
  'home-outline': homeOutline,
  'location-outline': locationOutline,
});

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [IonContent, IonIcon],
  templateUrl: './confirmation.page.html',
  styleUrls: ['./confirmation.page.scss'],
})
export class ConfirmationPage implements OnInit {
  booking = inject(BookingService);
  private router = inject(Router);
  private pickupService = inject(PickupService);

  constructor() {
    addIcons({
      checkmarkOutline,
      bus,
      calendarOutline,
      qrCodeOutline,
      listOutline,
      homeOutline,
      locationOutline,
    });
  }

  ngOnInit() {
    if (!this.booking.trip || !this.booking.bookingRef) {
      this.router.navigateByUrl('/home');
    }
  }

  /** Frozen pickup for the confirmed booking (label + distance). */
  get confirmedPickup(): string | null {
    return this.booking.pickup?.label ?? null;
  }

  get confirmedPickupDistance(): string | null {
    if (!this.booking.bookingRef) return null;
    const state = this.pickupService.stateForBooking(this.booking.bookingRef, {
      label: this.booking.pickup?.label ?? '',
      lat: this.booking.pickup?.lat,
      lng: this.booking.pickup?.lng,
    });
    return this.pickupService.formatDistance(
      this.pickupService.distanceM(state),
    );
  }

  viewTicket() {
    const ref = this.booking.bookingRef;
    this.booking.reset();
    this.router.navigateByUrl(`/e-ticket/${ref}`);
  }

  viewBookings() {
    this.booking.reset();
    this.router.navigateByUrl('/bookings');
  }

  goHome() {
    this.booking.reset();
    this.router.navigateByUrl('/home');
  }
}
