import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  bus,
  calendarOutline,
  checkmarkCircle,
  chevronForwardOutline,
  cloudOfflineOutline,
  cloudyOutline,
  flagOutline,
  eyeOutline,
  locationOutline,
  navigateOutline,
  partlySunnyOutline,
  rainyOutline,
  refreshOutline,
  sunnyOutline,
  thermometerOutline,
  thunderstormOutline,
  ticketOutline,
  timeOutline,
  warningOutline,
  waterOutline,
} from 'ionicons/icons';
import { TicketService, type Booking } from '../bookings/ticket.service';
import {
  TravelConditionsService,
  type TravelConditions,
} from '../../services/travel-conditions.service';
import type { TerminalInfo } from '../../services/route-catalog.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'checkmark-circle': checkmarkCircle,
  'chevron-forward-outline': chevronForwardOutline,
  'cloud-offline-outline': cloudOfflineOutline,
  'cloudy-outline': cloudyOutline,
  'flag-outline': flagOutline,
  'eye-outline': eyeOutline,
  'location-outline': locationOutline,
  'navigate-outline': navigateOutline,
  'partly-sunny-outline': partlySunnyOutline,
  'rainy-outline': rainyOutline,
  'refresh-outline': refreshOutline,
  'sunny-outline': sunnyOutline,
  'thermometer-outline': thermometerOutline,
  'thunderstorm-outline': thunderstormOutline,
  'ticket-outline': ticketOutline,
  'time-outline': timeOutline,
  'warning-outline': warningOutline,
  'water-outline': waterOutline,
});

@Component({
  selector: 'app-travel-conditions',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './travel-conditions.page.html',
  styleUrls: ['./travel-conditions.page.scss'],
})
export class TravelConditionsPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private ticketService = inject(TicketService);
  private conditions = inject(TravelConditionsService);

  /** Bump to re-read conditions on every visit. */
  private nonce = 0;
  private fallbackUrl = '/home';

  constructor() {
    addIcons({
      arrowBackOutline,
      bus,
      calendarOutline,
      checkmarkCircle,
      chevronForwardOutline,
      cloudOfflineOutline,
      cloudyOutline,
      flagOutline,
      eyeOutline,
      locationOutline,
      navigateOutline,
      partlySunnyOutline,
      rainyOutline,
      refreshOutline,
      sunnyOutline,
      thermometerOutline,
      thunderstormOutline,
      ticketOutline,
      timeOutline,
      warningOutline,
      waterOutline,
    });
  }

  ionViewWillEnter() {
    const from = this.route.snapshot.queryParamMap.get('from');
    this.fallbackUrl =
      from === 'bookings'
        ? '/bookings'
        : from === 'active'
          ? '/active-trip'
          : '/home';
    // Re-read on every visit so a new booking is reflected immediately.
    this.nonce++;
  }

  // --- Context (booking / terminal data owned elsewhere) ---

  get trip(): Booking | null {
    return this.conditions.nextTrip();
  }

  get place(): string {
    // Reading `nonce` keeps every getter below refreshable.
    void this.nonce;
    return this.trip?.from?.trim() || this.conditions.defaultPlace;
  }

  get current(): TravelConditions {
    return this.conditions.forPlace(this.place);
  }

  get tripConditions(): TravelConditions | null {
    if (!this.trip) return null;
    return this.conditions.forTrip(this.trip.from, this.trip.to);
  }

  get tripSummary() {
    if (!this.trip) return null;
    return this.conditions.tripSummary(this.trip.from, this.trip.to);
  }

  get transitStatus(): 'on-time' | 'delayed' | null {
    if (!this.trip) return null;
    return this.conditions.transitStatusFor(this.trip.from, this.trip.to);
  }

  get impactTitle(): string {
    return this.conditions.impactCopy(this.current.impact).title;
  }

  get impactDetail(): string {
    return this.conditions.impactCopy(this.current.impact).detail;
  }

  originTerminal(): TerminalInfo | undefined {
    return this.conditions.terminalFor(this.trip?.from ?? this.place);
  }

  destTerminal(): TerminalInfo | undefined {
    if (!this.trip) return undefined;
    const dest = this.conditions.terminalFor(this.trip.to);
    const origin = this.originTerminal();
    return dest && dest.id !== origin?.id ? dest : undefined;
  }

  terminalConditions(t: TerminalInfo): TravelConditions {
    return this.conditions.forPlace(t.city);
  }

  impactIcon(impact: string): string {
    return impact === 'advisory'
      ? 'warning-outline'
      : impact === 'caution'
        ? 'flag-outline'
        : 'checkmark-circle';
  }

  // --- Navigation (reuses existing flows) ---

  openTrip() {
    if (!this.trip) return;
    this.ticketService.open(this.trip);
    this.router.navigateByUrl(`/e-ticket/${this.trip.bookingRef}`);
  }

  openTerminal(t: TerminalInfo) {
    this.router.navigateByUrl(`/terminal/${t.id}`);
  }

  bookRide() {
    this.router.navigateByUrl('/search');
  }

  retry() {
    this.nonce++;
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
