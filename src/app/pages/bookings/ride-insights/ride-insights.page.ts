import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  bus,
  calendarOutline,
  cashOutline,
  chevronForwardOutline,
  locationOutline,
  navigateOutline,
  peopleOutline,
  star,
  sunnyOutline,
  ticketOutline,
  timeOutline,
  trendingUpOutline,
  trophyOutline,
} from 'ionicons/icons';
import { TicketService, type Booking } from '../ticket.service';
import { TripReviewService, type TripReview } from '../trip-review.service';
import { RideIdentityService } from '../../../services/ride-identity.service';
import {
  RideInsightsService,
  type InsightsRange,
} from '../ride-insights.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'arrow-forward-outline': arrowForwardOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'cash-outline': cashOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'location-outline': locationOutline,
  'navigate-outline': navigateOutline,
  'people-outline': peopleOutline,
  star: star,
  'sunny-outline': sunnyOutline,
  'ticket-outline': ticketOutline,
  'time-outline': timeOutline,
  'trending-up-outline': trendingUpOutline,
  'trophy-outline': trophyOutline,
});

@Component({
  selector: 'app-ride-insights',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './ride-insights.page.html',
  styleUrls: ['./ride-insights.page.scss'],
})
export class RideInsightsPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private ticketService = inject(TicketService);
  private reviewService = inject(TripReviewService);
  private rideIdentity = inject(RideIdentityService);
  private insights = inject(RideInsightsService);

  range: InsightsRange = 'all';

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      bus,
      calendarOutline,
      cashOutline,
      chevronForwardOutline,
      locationOutline,
      navigateOutline,
      peopleOutline,
      star,
      sunnyOutline,
      ticketOutline,
      timeOutline,
      trendingUpOutline,
      trophyOutline,
    });
  }

  /** Ionic keeps pages alive — refresh the range default every visit. */
  ionViewWillEnter() {
    const from = this.route.snapshot.queryParamMap.get('from');
    this.fallbackUrl = from === 'profile' ? '/profile' : '/bookings';
  }

  private fallbackUrl = '/bookings';

  // --- Derived data (completed rides only; the service owns the rules) ---

  get rides(): Booking[] {
    return this.insights.filtered(this.range);
  }

  get hasRides(): boolean {
    return this.insights.completed().length > 0;
  }

  get overview() {
    return this.insights.overview(this.rides);
  }

  get patterns() {
    return this.insights.patterns(this.rides);
  }

  get monthly() {
    return this.insights.monthly(this.rides, this.range);
  }

  get maxMonthCount(): number {
    return Math.max(1, ...this.monthly.map((m) => m.count));
  }

  get recent(): Booking[] {
    return this.insights.recent(this.rides);
  }

  get rangeLabel(): string {
    return { all: 'All time', year: 'This year', recent: 'Last 6 months' }[this.range];
  }

  setRange(range: InsightsRange) {
    this.range = range;
  }

  formatPeso(n: number): string {
    return this.insights.formatPeso(n);
  }

  paxCount(b: Booking): number {
    return this.insights.paxCount(b);
  }

  /** Compact assigned-ride line. Completed rides always have a departure
   *  in the past, so identity is assigned; the guard stays for safety. */
  busLine(b: Booking): string {
    const id = this.rideIdentity.identityForBooking(b);
    if (!id.assigned) return b.operator;
    return `BUS ${id.busNo} · ${id.plate}`;
  }

  reviewFor(b: Booking): TripReview | null {
    return this.reviewService.getFor(b.bookingRef);
  }

  // --- Navigation (reuses the existing ticket / review flows) ---

  openRide(b: Booking) {
    this.ticketService.open(b);
    this.router.navigateByUrl(`/e-ticket/${b.bookingRef}`);
  }

  openReview(b: Booking, event: Event) {
    event.stopPropagation();
    this.ticketService.open(b);
    this.router.navigateByUrl(`/review-ride/${b.bookingRef}`);
  }

  bookRide() {
    this.router.navigateByUrl('/search');
  }

  openBookings() {
    this.router.navigateByUrl('/bookings');
  }

  goBack() {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        this.location.back();
        return;
      }
    } catch {
      // Fall through to the explicit fallback below.
    }
    this.router.navigateByUrl(this.fallbackUrl);
  }
}
