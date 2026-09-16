import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, shareSocialOutline, bus, calendarOutline, timeOutline,
  personOutline, callOutline, locationOutline, downloadOutline,
  closeCircleOutline, informationCircleOutline, shieldCheckmarkOutline
} from 'ionicons/icons';
import { TicketService, Booking } from '../ticket.service';

addIcons({
  'arrow-back-outline': arrowBackOutline, 'share-social-outline': shareSocialOutline,
  'bus': bus, 'calendar-outline': calendarOutline, 'time-outline': timeOutline,
  'person-outline': personOutline, 'call-outline': callOutline,
  'location-outline': locationOutline, 'download-outline': downloadOutline,
  'close-circle-outline': closeCircleOutline,
  'information-circle-outline': informationCircleOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline
});

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './ticket.page.html',
  styleUrls: ['./ticket.page.scss']
})
export class TicketPage implements OnInit {

  booking: Booking | null = null;
  qrGrid: boolean[][] = [];

  passenger = { name: 'Juan Dela Cruz', phone: '+63 917 000 1234' };

  constructor(private ticketService: TicketService, private router: Router) {
      addIcons({arrowBackOutline,shareSocialOutline,bus,calendarOutline,timeOutline,personOutline,callOutline,shieldCheckmarkOutline,informationCircleOutline,downloadOutline,closeCircleOutline});}

  ngOnInit() {
    this.booking = this.ticketService.selected;
    if (!this.booking) {
      this.router.navigateByUrl('/bookings');
      return;
    }
    this.qrGrid = this.buildQr(this.booking.bookingRef);
  }

  /** Deterministic 21x21 QR-style matrix with real finder patterns. */
  buildQr(seed: string): boolean[][] {
    const size = 21;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const rand = () => {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      return (h >>> 0) / 4294967296;
    };

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        grid[r][c] = rand() > 0.5;
      }
    }

    const finder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const edge = r === 0 || r === 6 || c === 0 || c === 6;
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[r0 + r][c0 + c] = edge || core;
        }
      }
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            const rr = r0 + r, cc = c0 + c;
            if (rr >= 0 && rr < size && cc >= 0 && cc < size) grid[rr][cc] = false;
          }
        }
      }
    };

    finder(0, 0);
    finder(0, size - 7);
    finder(size - 7, 0);

    return grid;
  }

  get isActive(): boolean {
    return this.booking?.status === 'confirmed' || this.booking?.status === 'boarding';
  }

  statusLabel(): string {
    if (!this.booking) return '';
    return {
      confirmed: 'Confirmed',
      boarding: 'Boarding Soon',
      completed: 'Completed',
      cancelled: 'Cancelled'
    }[this.booking.status];
  }

  goBack() {
    this.ticketService.clear();
    this.router.navigateByUrl('/bookings');
  }

  shareTicket() { console.log('Share', this.booking?.bookingRef); }
  saveTicket() { console.log('Save', this.booking?.bookingRef); }
  cancelBooking() { console.log('Cancel', this.booking?.bookingRef); }
}