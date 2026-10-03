import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  bus,
  calendarOutline,
  timeOutline,
  qrCodeOutline,
  shieldCheckmarkOutline,
  cardOutline,
  idCardOutline,
  flashOutline,
  cashOutline,
  briefcaseOutline,
  checkmarkOutline,
  chevronForwardOutline,
  informationCircleOutline,
  ticketOutline,
  locationOutline,
} from 'ionicons/icons';
import { TicketService, Booking } from '../ticket.service';
import { ProfileService } from '../../profile/profile.service';
import { LuggageService } from '../luggage.service';
import { RouteStopsService, type TimedRouteStop } from '../../../services/route-stops.service';
import { RouteStopTimelineComponent } from '../../../components/route-stop-timeline/route-stop-timeline.component';
import {
  TripPreparationService,
  ChecklistItem,
  ManualCheckKey,
} from '../trip-preparation.service';
import { TripReminderCardComponent } from '../../../components/trip-reminder-card/trip-reminder-card.component';
import { TripReminderService } from '../../../services/trip-reminder.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'time-outline': timeOutline,
  'qr-code-outline': qrCodeOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'card-outline': cardOutline,
  'id-card-outline': idCardOutline,
  'flash-outline': flashOutline,
  'cash-outline': cashOutline,
  'briefcase-outline': briefcaseOutline,
  'checkmark-outline': checkmarkOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'information-circle-outline': informationCircleOutline,
  'ticket-outline': ticketOutline,
  'location-outline': locationOutline,
});

@Component({
  selector: 'app-trip-preparation',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, TripReminderCardComponent, RouteStopTimelineComponent],
  templateUrl: './trip-preparation.page.html',
  styleUrls: ['./trip-preparation.page.scss'],
})
export class TripPreparationPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private toastController = inject(ToastController);
  private ticketService = inject(TicketService);
  private profileService = inject(ProfileService);
  private routeStops = inject(RouteStopsService);
  private prepService = inject(TripPreparationService);
  private luggageService = inject(LuggageService);
  private reminderService = inject(TripReminderService);

  booking: Booking | null = null;
  private manualVersion = 0;

  constructor() {
    addIcons({
      arrowBackOutline,
      bus,
      calendarOutline,
      timeOutline,
      qrCodeOutline,
      shieldCheckmarkOutline,
      cardOutline,
      idCardOutline,
      flashOutline,
      cashOutline,
      briefcaseOutline,
      checkmarkOutline,
      chevronForwardOutline,
      informationCircleOutline,
      ticketOutline,
      locationOutline,
    });
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    const ref = this.route.snapshot.paramMap.get('bookingRef');
    this.booking = ref ? this.ticketService.findByRef(ref) : this.ticketService.selected;
    if (this.booking) this.ticketService.open(this.booking);
  }

  get fareVerified(): boolean {
    try {
      return this.profileService.read()?.verified ?? false;
    } catch {
      return false;
    }
  }

  get isActive(): boolean {
    return this.booking?.status === 'confirmed' || this.booking?.status === 'boarding';
  }

  /** Canonical stop preview for this booking's route — upcoming ETAs
   *  anchored on the booking's own date/time (never another route). */
  get routePreview(): TimedRouteStop[] {
    if (!this.booking) return [];
    const route = this.routeStops.routeFor(this.booking.from, this.booking.to);
    if (!route) {
      // No catalog route: still show origin → destination deterministically.
      const view = this.routeStops.timelineForBooking(this.booking, 0);
      return view.mode === 'unavailable' ? [] : view.stops;
    }
    return this.routeStops.previewForRoute(
      route.id,
      this.booking.date,
      this.booking.time,
    ).stops;
  }

  /** Reminder card view-model for this trip — null renders nothing. */
  get prepReminderView() {
    return this.booking ? this.reminderService.resolve(this.booking.bookingRef) : null;
  }

  get items(): ChecklistItem[] {
    if (!this.booking) return [];
    // Touch manualVersion so Angular re-evaluates after each toggle.
    void this.manualVersion;
    const items = this.prepService.summarize(this.booking, this.fareVerified).items;
    // Connect the existing "Luggage" checklist row to the per-booking
    // luggage record: show the real count and deep-link to the editor.
    return items.map((item) => {
      if (item.key !== 'luggage' || !this.booking) return item;
      const has = this.luggageService.has(this.booking.bookingRef);
      const total = this.luggageService.total(this.booking.bookingRef);
      return {
        ...item,
        hint: has
          ? `${total} piece${total === 1 ? '' : 's'} recorded — tap Manage`
          : 'Packed and labeled — tap to add',
        link: `/luggage/${this.booking.bookingRef}`,
        linkLabel: has ? `${total} pc${total === 1 ? '' : 's'} · Manage` : 'Add',
      };
    });
  }

  get doneCount(): number {
    return this.items.filter((i) => i.done).length;
  }

  get totalCount(): number {
    return this.items.length;
  }

  get progressPercent(): number {
    if (!this.totalCount) return 0;
    return Math.round((this.doneCount / this.totalCount) * 100);
  }

  get allReady(): boolean {
    return this.totalCount > 0 && this.doneCount === this.totalCount;
  }

  toggleManual(item: ChecklistItem) {
    if (!this.booking || item.kind !== 'manual' || !this.isActive) return;
    this.prepService.toggleManual(this.booking.bookingRef, item.key as ManualCheckKey);
    this.manualVersion++;
  }

  openLink(item: ChecklistItem, event: Event) {
    event.stopPropagation();
    if (item.link) this.router.navigateByUrl(item.link);
  }

  openLuggage() {
    if (!this.booking) return;
    this.ticketService.open(this.booking);
    this.router.navigateByUrl(`/luggage/${this.booking.bookingRef}`);
  }

  luggageSummary(): string {
    if (!this.booking) return '';
    return this.luggageService.summaryLabel(this.booking.bookingRef);
  }

  viewTicket() {
    if (!this.booking) return;
    this.ticketService.open(this.booking);
    this.router.navigateByUrl(`/e-ticket/${this.booking.bookingRef}`);
  }

  goBack() {
    this.location.back();
  }

  async markReady() {
    const toast = await this.toastController.create({
      message: this.allReady
        ? 'You are all set. Have a safe trip!'
        : 'Checklist saved. Finish the remaining items before boarding.',
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
