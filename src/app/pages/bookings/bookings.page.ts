<<<<<<< HEAD
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonContent, IonIcon, ToastController } from '@ionic/angular';
=======
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  calendarOutline,
  chevronForwardOutline,
  checkmarkCircle,
  closeCircle,
  qrCodeOutline,
  bus,
  fileTrayOutline,
  arrowForwardOutline,
  refreshOutline,
  radioButtonOn,
<<<<<<< HEAD
  trashOutline,
  star,
  locationOutline,
  navigateOutline,
  handLeftOutline,
  ticketOutline,
  trendingUpOutline,
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
} from 'ionicons/icons';
import {
  TicketService,
  Booking,
  BookingStatus,
<<<<<<< HEAD
} from './ticket.service';
import { TripReviewService, TripReview } from './trip-review.service';
import { BookingService, TripSummary } from '../booking/booking.service';
import { TripPreparationService } from './trip-preparation.service';
import { ProfileService } from '../profile/profile.service';
import { HailService, HailRequest } from '../../services/hail.service';
=======
} from '../bookings/ticket.service';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

addIcons({
  'time-outline': timeOutline,
  'calendar-outline': calendarOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'qr-code-outline': qrCodeOutline,
  bus: bus,
  'file-tray-outline': fileTrayOutline,
  'arrow-forward-outline': arrowForwardOutline,
  'refresh-outline': refreshOutline,
  'radio-button-on': radioButtonOn,
<<<<<<< HEAD
  'trash-outline': trashOutline,
  star: star,
  'location-outline': locationOutline,
  'navigate-outline': navigateOutline,
  'hand-left-outline': handLeftOutline,
  'ticket-outline': ticketOutline,
  'trending-up-outline': trendingUpOutline,
});

type TabKey = 'upcoming' | 'active' | 'past';
=======
});

type TabKey = 'upcoming' | 'past';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
})
export class BookingsPage {
<<<<<<< HEAD
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private hailService = inject(HailService);
  private reviewService = inject(TripReviewService);
  private bookingService = inject(BookingService);
  private prepService = inject(TripPreparationService);
  private profileService = inject(ProfileService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  activeTab: TabKey = 'upcoming';

  constructor() {
=======
  activeTab: TabKey = 'upcoming';

  bookings: Booking[] = [
    {
      operator: 'Victory Liner',
      from: 'Baguio City',
      to: 'Tuguegarao City',
      date: 'Sep 18, 2026',
      time: '6:30 AM',
      seat: 'Seat 14A',
      fare: '₱ 480',
      status: 'confirmed',
      bookingRef: 'BYH-48291',
    },
    {
      operator: 'GV Florida',
      from: 'Cauayan',
      to: 'Ilagan',
      date: 'Sep 14, 2026',
      time: '2:00 PM',
      seat: 'Seat 07C',
      fare: '₱ 95',
      status: 'boarding',
      bookingRef: 'BYH-48304',
    },
    {
      operator: 'Partas',
      from: 'Manila (Cubao)',
      to: 'Laoag City',
      date: 'Aug 29, 2026',
      time: '9:00 PM',
      seat: 'Seat 22B',
      fare: '₱ 850',
      status: 'completed',
      bookingRef: 'BYH-47118',
    },
    {
      operator: 'Florida Bus Line',
      from: 'Manila (PITX)',
      to: 'Vigan City',
      date: 'Aug 12, 2026',
      time: '10:15 PM',
      seat: 'Seat 03A',
      fare: '₱ 750',
      status: 'cancelled',
      bookingRef: 'BYH-46590',
    },
  ];

  constructor(
    private router: Router,
    private ticketService: TicketService,
  ) {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    addIcons({
      bus,
      timeOutline,
      fileTrayOutline,
      calendarOutline,
      qrCodeOutline,
      refreshOutline,
      arrowForwardOutline,
<<<<<<< HEAD
      trashOutline,
      star,
      locationOutline,
      navigateOutline,
      handLeftOutline,
      ticketOutline,
      trendingUpOutline,
    });
  }

  get bookings(): Booking[] {
    return this.ticketService.bookings;
  }

=======
    });
  }

>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  get upcomingBookings(): Booking[] {
    return this.bookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'boarding',
    );
  }

  get pastBookings(): Booking[] {
    return this.bookings.filter(
      (b) => b.status === 'completed' || b.status === 'cancelled',
    );
  }

<<<<<<< HEAD
  get completedBookings(): Booking[] {
    return this.bookings.filter((b) => b.status === 'completed');
  }

  openInsights() {
    this.router.navigateByUrl('/ride-insights?from=bookings');
  }

  get visibleBookings(): Booking[] {
    if (this.activeTab === 'upcoming') return this.upcomingBookings;
    if (this.activeTab === 'past') return this.pastBookings;
    return [];
  }

  /** Digital-terminal entry: scheduled travel with origin, destination
   *  and travel date — the reservation shelf (Search), not a moving bus. */
  reserveTrip() {
    this.router.navigateByUrl('/search');
  }

  /** Live-hail entry: buses operating right now, no date involved. */
  hailBus() {
    this.router.navigateByUrl('/home');
  }

  /** Live hailing session mirrored from Home (null when not hailing). */
  get liveHail(): HailRequest | null {
    return this.hailService.active;
  }

  /** In-progress reservation (confirmed/boarding), if any. */
  get activeTripBooking(): Booking | null {
    return this.ticketService.activeBooking;
  }

  hailStatusLabel(_hail: HailRequest): string {
    return 'Confirming hail';
=======
  get visibleBookings(): Booking[] {
    return this.activeTab === 'upcoming'
      ? this.upcomingBookings
      : this.pastBookings;
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }

  setTab(tab: TabKey) {
    this.activeTab = tab;
  }

  statusLabel(status: BookingStatus): string {
    return {
      confirmed: 'Confirmed',
      boarding: 'Boarding Soon',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }[status];
  }

  viewTicket(booking: Booking) {
    this.ticketService.open(booking);
<<<<<<< HEAD
    this.router.navigateByUrl(`/e-ticket/${booking.bookingRef}`);
  }

  openPrep(booking: Booking) {
    this.ticketService.open(booking);
    this.router.navigateByUrl(`/trip-preparation/${booking.bookingRef}`);
  }

  /** Upcoming → live tracking for this exact booking. */
  trackTrip(booking: Booking) {
    this.ticketService.open(booking);
    this.router.navigateByUrl(`/active-trip?ref=${booking.bookingRef}`);
  }

  /** Saved post-ride review for a past booking, if any. */
  reviewFor(booking: Booking): TripReview | null {
    return this.reviewService.getFor(booking.bookingRef);
  }

  openReview(booking: Booking) {
    this.ticketService.open(booking);
    this.router.navigateByUrl(`/review-ride/${booking.bookingRef}`);
  }

  openReport(booking: Booking) {
    this.ticketService.open(booking);
    this.router.navigateByUrl(`/report-problem/${booking.bookingRef}?from=bookings`);
  }

  prepCount(booking: Booking): string {
    try {
      const verified = this.profileService.read()?.verified ?? false;
      const s = this.prepService.summarize(booking, verified);
      return `${s.done}/${s.total}`;
    } catch {
      return '';
    }
  }

  bookAgain(booking: Booking) {
    const trip: TripSummary = {
      operator: booking.operator,
      from: booking.from,
      to: booking.to,
      eta: 'Next available',
      fare: booking.fare,
      seatsLeft: '20 seats left',
      status: 'on-time',
    };
    this.bookingService.startBooking(trip);
    this.router.navigateByUrl('/booking/trip');
  }

  async removeBooking(booking: Booking, event: Event) {
    event.stopPropagation();
    const alert = await this.alertController.create({
      header: 'Remove booking?',
      message: `${booking.bookingRef} will be removed from this device.`,
      buttons: [
        { text: 'Keep', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.ticketService.remove(booking.bookingRef);
            this.showToast('Booking removed.');
          },
        },
      ],
    });
    await alert.present();
=======
    this.router.navigateByUrl('/e-ticket');
  }

  bookAgain(booking: Booking) {
    this.router.navigateByUrl('/search');
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }

  goToSearch() {
    this.router.navigateByUrl('/search');
  }
<<<<<<< HEAD

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
}
