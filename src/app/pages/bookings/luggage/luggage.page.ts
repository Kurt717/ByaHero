import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  briefcaseOutline,
  businessOutline,
  bagOutline,
  checkmarkOutline,
  chevronForwardOutline,
  informationCircleOutline,
  trashOutline,
  ticketOutline,
} from 'ionicons/icons';
import { TicketService, Booking } from '../ticket.service';
import {
  LuggageService,
  LuggageCounts,
  LUGGAGE_META,
  LUGGAGE_MAX_PER_TYPE,
} from '../luggage.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'briefcase-outline': briefcaseOutline,
  'business-outline': businessOutline,
  'bag-outline': bagOutline,
  'checkmark-outline': checkmarkOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'information-circle-outline': informationCircleOutline,
  'trash-outline': trashOutline,
  'ticket-outline': ticketOutline,
});

/** Booking-scoped luggage editor: Bookings → E-ticket → Trip Preparation → Luggage.
 *  Read-only once the trip is completed/cancelled. */
@Component({
  selector: 'app-luggage',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './luggage.page.html',
  styleUrls: ['./luggage.page.scss'],
})
export class LuggagePage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private toastController = inject(ToastController);
  private ticketService = inject(TicketService);
  private luggageService = inject(LuggageService);

  booking: Booking | null = null;
  counts: LuggageCounts = { carryOn: 0, checked: 0, other: 0 };
  private savedSnapshot = '0|0|0';
  saving = false;

  readonly meta = LUGGAGE_META;
  readonly maxPerType = LUGGAGE_MAX_PER_TYPE;

  constructor() {
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    const ref = this.route.snapshot.paramMap.get('bookingRef');
    this.booking = ref
      ? this.ticketService.findByRef(ref)
      : this.ticketService.selected;
    if (!this.booking) {
      this.router.navigateByUrl('/bookings');
      return;
    }
    this.ticketService.open(this.booking);
    this.counts = this.luggageService.read(this.booking.bookingRef);
    this.savedSnapshot = this.snapshot(this.counts);
  }

  get isActive(): boolean {
    return (
      this.booking?.status === 'confirmed' ||
      this.booking?.status === 'boarding'
    );
  }

  get total(): number {
    return this.counts.carryOn + this.counts.checked + this.counts.other;
  }

  get dirty(): boolean {
    return this.snapshot(this.counts) !== this.savedSnapshot;
  }

  get canSave(): boolean {
    return !!this.booking && this.isActive && !this.saving && this.dirty;
  }

  get isEmpty(): boolean {
    return this.total === 0;
  }

  private snapshot(c: LuggageCounts): string {
    return `${c.carryOn}|${c.checked}|${c.other}`;
  }

  private clamp(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.min(this.maxPerType, Math.max(0, Math.floor(n)));
  }

  step(key: keyof LuggageCounts, delta: number) {
    if (!this.isActive) return;
    this.counts = { ...this.counts, [key]: this.clamp(this.counts[key] + delta) };
  }

  setCount(key: keyof LuggageCounts, raw: string) {
    if (!this.isActive) return;
    const n = Number(raw);
    this.counts = {
      ...this.counts,
      [key]: this.clamp(Number.isFinite(n) ? n : 0),
    };
  }

  countFor(key: keyof LuggageCounts): number {
    return this.counts[key];
  }

  async save() {
    if (!this.booking || !this.canSave) return;
    this.saving = true;
    try {
      this.counts = this.luggageService.save(this.booking.bookingRef, this.counts);
      this.savedSnapshot = this.snapshot(this.counts);
      const toast = await this.toastController.create({
        message:
          this.total > 0
            ? `Luggage saved — ${this.total} piece${this.total === 1 ? '' : 's'} for ${this.booking.bookingRef}.`
            : 'Luggage cleared for this trip.',
        duration: 1800,
        position: 'bottom',
        color: 'dark',
      });
      await toast.present();
      this.router.navigateByUrl(`/trip-preparation/${this.booking.bookingRef}`);
    } finally {
      this.saving = false;
    }
  }

  async clearAll() {
    if (!this.booking || !this.isActive) return;
    this.counts = { carryOn: 0, checked: 0, other: 0 };
  }

  openPrep() {
    if (!this.booking) return;
    this.router.navigateByUrl(`/trip-preparation/${this.booking.bookingRef}`);
  }

  goBack() {
    this.location.back();
  }
}
