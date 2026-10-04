import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonContent, IonIcon, ToastController } from '@ionic/angular';
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
  trashOutline,
  star,
  locationOutline,
  navigateOutline,
  handLeftOutline,
  ticketOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import {
  TicketService,
  Booking,
  BookingStatus,
  isExpiredBooking,
  displayStatusForBooking,
} from './ticket.service';
import { TripReviewService, TripReview } from './trip-review.service';
import { BookingService, TripSummary } from '../booking/booking.service';
import { TripPreparationService } from './trip-preparation.service';
import { ProfileService } from '../profile/profile.service';
import { HailService, HailRequest } from '../../services/hail.service';

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
  'trash-outline': trashOutline,
  star: star,
  'location-outline': locationOutline,
  'navigate-outline': navigateOutline,
  'hand-left-outline': handLeftOutline,
  'ticket-outline': ticketOutline,
  'trending-up-outline': trendingUpOutline,
});

type TabKey = 'upcoming' | 'active' | 'past';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
})
export class BookingsPage {
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
    addIcons({
      bus,
      timeOutline,
      fileTrayOutline,
      calendarOutline,
      qrCodeOutline,
      refreshOutline,
      arrowForwardOutline,
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

  get upcomingBookings(): Booking[] {
    const now = new Date();
    return this.bookings.filter(
      (b) => b.status === 'confirmed' && !isExpiredBooking(b, now),
    );
  }

  /** Boarding trips live only in Active, never in Upcoming. */
  get boardingBookings(): Booking[] {
    return this.bookings.filter((b) => b.status === 'boarding');
  }

  get pastBookings(): Booking[] {
    const now = new Date();
    return this.bookings.filter(
      (b) =>
        b.status === 'completed' ||
        b.status === 'cancelled' ||
        (b.status === 'confirmed' && isExpiredBooking(b, now)),
    );
  }

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

  /** In-progress reservation (boarding only — confirmed lives in Upcoming). */
  get activeTripBooking(): Booking | null {
    return this.bookings.find((b) => b.status === 'boarding') ?? null;
  }

  /** Rider's own stretch (boarding → alighting) for every card. */
  stretchFor(booking: Booking): string {
    try {
      return this.ticketService.segmentPair(booking);
    } catch {
      return `${booking.from} → ${booking.to}`;
    }
  }

  statusLabel(status: BookingStatus): string {
    return {
      confirmed: 'Confirmed',
      boarding: 'Boarding Soon',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }[status];
  }

  /** Card chip: expired confirmed renders as Missed. */
  displayStatus(booking: Booking): string {
    const s = displayStatusForBooking(booking, new Date());
    if (s === 'Missed') return 'Missed';
    if (s === 'confirmed') return 'Confirmed';
    return this.statusLabel(booking.status);
  }

  hailStatusLabel(_hail: HailRequest): string {
    return 'Confirming hail';
  }

  setTab(tab: TabKey) {
    this.activeTab = tab;
  }

  viewTicket(booking: Booking) {
    this.ticketService.open(booking);
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
  }

  goToSearch() {
    this.router.navigateByUrl('/search');
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
