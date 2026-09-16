import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  timeOutline, calendarOutline, chevronForwardOutline, checkmarkCircle, closeCircle,
  qrCodeOutline, bus, fileTrayOutline, arrowForwardOutline, refreshOutline, radioButtonOn
} from 'ionicons/icons';
import { TicketService, Booking, BookingStatus } from '../bookings/ticket.service';

addIcons({
  'time-outline': timeOutline, 'calendar-outline': calendarOutline,
  'chevron-forward-outline': chevronForwardOutline, 'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle, 'qr-code-outline': qrCodeOutline, 'bus': bus,
  'file-tray-outline': fileTrayOutline, 'arrow-forward-outline': arrowForwardOutline,
  'refresh-outline': refreshOutline, 'radio-button-on': radioButtonOn
});

type TabKey = 'upcoming' | 'past';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss']
})
export class BookingsPage {
  activeTab: TabKey = 'upcoming';

  bookings: Booking[] = [
    {
      operator: 'Victory Liner', from: 'Baguio City', to: 'Tuguegarao City',
      date: 'Sep 18, 2026', time: '6:30 AM', seat: 'Seat 14A', fare: '₱ 480',
      status: 'confirmed', bookingRef: 'BYH-48291'
    },
    {
      operator: 'GV Florida', from: 'Cauayan', to: 'Ilagan',
      date: 'Sep 14, 2026', time: '2:00 PM', seat: 'Seat 07C', fare: '₱ 95',
      status: 'boarding', bookingRef: 'BYH-48304'
    },
    {
      operator: 'Partas', from: 'Manila (Cubao)', to: 'Laoag City',
      date: 'Aug 29, 2026', time: '9:00 PM', seat: 'Seat 22B', fare: '₱ 850',
      status: 'completed', bookingRef: 'BYH-47118'
    },
    {
      operator: 'Florida Bus Line', from: 'Manila (PITX)', to: 'Vigan City',
      date: 'Aug 12, 2026', time: '10:15 PM', seat: 'Seat 03A', fare: '₱ 750',
      status: 'cancelled', bookingRef: 'BYH-46590'
    },
  ];

  constructor(private router: Router, private ticketService: TicketService) {}

  get upcomingBookings(): Booking[] {
    return this.bookings.filter(b => b.status === 'confirmed' || b.status === 'boarding');
  }

  get pastBookings(): Booking[] {
    return this.bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
  }

  get visibleBookings(): Booking[] {
    return this.activeTab === 'upcoming' ? this.upcomingBookings : this.pastBookings;
  }

  setTab(tab: TabKey) { this.activeTab = tab; }

  statusLabel(status: BookingStatus): string {
    return { confirmed: 'Confirmed', boarding: 'Boarding Soon', completed: 'Completed', cancelled: 'Cancelled' }[status];
  }

  viewTicket(booking: Booking) {
    this.ticketService.open(booking);
    this.router.navigateByUrl('/e-ticket');
  }

  bookAgain(booking: Booking) {
    this.router.navigateByUrl('/search');
  }

  goToSearch() { this.router.navigateByUrl('/search'); }
}