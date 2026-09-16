import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline, qrCodeOutline, calendarOutline, timeOutline,
  bus, listOutline, homeOutline
} from 'ionicons/icons';
import { BookingService } from '../booking.service';

addIcons({
  'checkmark-outline': checkmarkOutline, 'qr-code-outline': qrCodeOutline,
  'calendar-outline': calendarOutline, 'time-outline': timeOutline,
  'bus': bus, 'list-outline': listOutline, 'home-outline': homeOutline
});

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './confirmation.page.html',
  styleUrls: ['./confirmation.page.scss']
})
export class ConfirmationPage implements OnInit {

  constructor(public booking: BookingService, private router: Router) {
      addIcons({checkmarkOutline,bus,calendarOutline,qrCodeOutline,listOutline,homeOutline});}

  ngOnInit() {
    if (!this.booking.trip || !this.booking.bookingRef) {
      this.router.navigateByUrl('/home');
    }
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