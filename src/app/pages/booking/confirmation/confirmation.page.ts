<<<<<<< HEAD
import { Component, OnInit, inject } from '@angular/core';

=======
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
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
<<<<<<< HEAD
  locationOutline,
} from 'ionicons/icons';
import { BookingService } from '../booking.service';
import { PickupService } from '../../../services/pickup.service';
=======
} from 'ionicons/icons';
import { BookingService } from '../booking.service';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

addIcons({
  'checkmark-outline': checkmarkOutline,
  'qr-code-outline': qrCodeOutline,
  'calendar-outline': calendarOutline,
  'time-outline': timeOutline,
  bus: bus,
  'list-outline': listOutline,
  'home-outline': homeOutline,
<<<<<<< HEAD
  'location-outline': locationOutline,
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
});

@Component({
  selector: 'app-confirmation',
  standalone: true,
<<<<<<< HEAD
  imports: [IonContent, IonIcon],
=======
  imports: [CommonModule, IonContent, IonIcon],
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  templateUrl: './confirmation.page.html',
  styleUrls: ['./confirmation.page.scss'],
})
export class ConfirmationPage implements OnInit {
<<<<<<< HEAD
  booking = inject(BookingService);
  private router = inject(Router);
  private pickupService = inject(PickupService);

  constructor() {
=======
  constructor(
    public booking: BookingService,
    private router: Router,
  ) {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    addIcons({
      checkmarkOutline,
      bus,
      calendarOutline,
      qrCodeOutline,
      listOutline,
      homeOutline,
<<<<<<< HEAD
      locationOutline,
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    });
  }

  ngOnInit() {
    if (!this.booking.trip || !this.booking.bookingRef) {
      this.router.navigateByUrl('/home');
    }
  }

<<<<<<< HEAD
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

=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  viewBookings() {
    this.booking.reset();
    this.router.navigateByUrl('/bookings');
  }

  goHome() {
    this.booking.reset();
    this.router.navigateByUrl('/home');
  }
}
