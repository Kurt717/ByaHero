import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  alertOutline,
  callOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  locateOutline,
  navigateOutline,
  radioButtonOnOutline,
  shareSocialOutline,
  shieldCheckmarkOutline,
  ticketOutline,
} from 'ionicons/icons';
import { TicketService, Booking } from '../../bookings/ticket.service';
import { ProfileService, TrustedContact } from '../../profile/profile.service';
import { PickupService } from '../../../services/pickup.service';
import { HailService, HailRequest } from '../../../services/hail.service';
import { AlertsService } from '../../alerts/alerts.service';
import {
  RideIdentityService,
  RideIdentity,
} from '../../../services/ride-identity.service';
import { EmergencyService, EmergencyRecord } from '../emergency.service';
import { RideCardsComponent } from '../../../components/ride-cards/ride-cards.component';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'alert-outline': alertOutline,
  'call-outline': callOutline,
  'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'locate-outline': locateOutline,
  'navigate-outline': navigateOutline,
  'radio-button-on-outline': radioButtonOnOutline,
  'share-social-outline': shareSocialOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'ticket-outline': ticketOutline,
});

/** Dedicated Emergency Mode for the live trip: SOS, current location, the
 *  shared ride-identity cards, trusted contacts, share/message/call actions.
 *  Active bookings (confirmed/boarding) and live hails only — completed or
 *  cancelled trips are redirected away and their emergency state is dropped. */
@Component({
  selector: 'app-emergency',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, RideCardsComponent],
  templateUrl: './emergency.page.html',
  styleUrls: ['./emergency.page.scss'],
})
export class EmergencyPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private ticketService = inject(TicketService);
  private profileService = inject(ProfileService);
  private pickupService = inject(PickupService);
  private hailService = inject(HailService);
  private alertsService = inject(AlertsService);
  private rideIdentity = inject(RideIdentityService);
  private emergencyService = inject(EmergencyService);

  booking: Booking | null = null;
  hail: HailRequest | null = null;
  private guarded = false;

  constructor() {
    this.load();
  }

  ionViewWillEnter() {
    this.guarded = false;
    this.load();
  }

  private load() {
    const ref = this.route.snapshot.paramMap.get('ref') ?? this.route.snapshot.queryParamMap.get('ref');
    this.booking = ref
      ? this.ticketService.findByRef(ref)
      : this.ticketService.activeBooking;
    if (this.booking && (this.booking.status === 'completed' || this.booking.status === 'cancelled')) {
      // Emergency does not outlive the trip: drop state and leave.
      this.emergencyService.clearForBooking(this.booking.bookingRef);
      this.booking = null;
      if (!this.guarded) {
        this.guarded = true;
        void this.showToast('This trip has ended. Emergency Mode is off.');
        this.router.navigateByUrl('/bookings');
      }
      return;
    }
    if (!this.booking) {
      // Hail context (no ticket, no date — the moving bus is the ride).
      this.hail = this.hailService.active;
      if (!this.hail && !this.guarded) {
        this.guarded = true;
        this.router.navigateByUrl('/bookings');
      }
      return;
    }
    this.ticketService.open(this.booking);
    this.hail = null;
    // Best-effort location refresh; silent on failure.
    void this.pickupService.refreshCurrentForBooking(this.booking.bookingRef);
  }

  get ride(): RideIdentity | null {
    if (this.booking) return this.rideIdentity.identityForBooking(this.booking);
    if (this.hail) return this.rideIdentity.identityForHail(this.hail);
    return null;
  }

  get record(): EmergencyRecord | null {
    const ref = this.booking?.bookingRef ?? this.hail?.hailId;
    return ref ? this.emergencyService.getRecord(ref) : null;
  }

  get contacts(): TrustedContact[] {
    try {
      return this.profileService.readTrustedContacts();
    } catch {
      return [];
    }
  }

  get passengerName(): string {
    try {
      return (
        this.booking?.passengerName || this.profileService.read().name || 'Kabyahe'
      );
    } catch {
      return this.booking?.passengerName ?? 'Kabyahe';
    }
  }

  /** Current-location panel from the existing pickup engine. Simulated fixes
   *  are labeled as approximate — never presented as verified live GPS. */
  locationLines(): { label: string; note: string } {
    if (!this.booking) {
      return this.hail
        ? { label: this.hail.pickupLabel, note: 'Hail pickup point' }
        : { label: 'No trip selected', note: '' };
    }
    let state = null;
    try {
      state = this.pickupService.stateForBooking(
        this.booking.bookingRef,
        this.booking.pickup
          ? {
              label: this.booking.pickup,
              lat: this.booking.pickupLat,
              lng: this.booking.pickupLng,
            }
          : null,
      );
    } catch {
      state = null;
    }
    const current = state?.current;
    if (current) {
      return {
        label: current.label,
        note: current.simulated
          ? 'Approximate position · simulated fix, not verified GPS'
          : 'Device GPS fix',
      };
    }
    const pickup = state?.pickup ?? this.booking.pickup;
    if (typeof pickup === 'string' && pickup) {
      return { label: pickup, note: 'Boarding point on record' };
    }
    if (pickup && typeof pickup === 'object') {
      return { label: pickup.label, note: 'Boarding point on record' };
    }
    return { label: `${this.booking.from} → ${this.booking.to}`, note: 'Route on record' };
  }

  backToTrip() {
    if (this.booking) {
      this.router.navigate(['/active-trip'], {
        queryParams: { ref: this.booking.bookingRef },
      });
      return;
    }
    this.router.navigateByUrl('/home');
  }

  viewTicket() {
    if (!this.booking) return;
    this.router.navigateByUrl(`/e-ticket/${this.booking.bookingRef}`);
  }

  messageDriver() {
    const ref = this.booking?.bookingRef;
    this.router.navigate(['/chat', ref ? `cd-${ref}` : 'c3']);
  }

  callHelp() {
    window.open('tel:+639171234567');
  }

  openTrustedContacts() {
    this.router.navigateByUrl('/trusted-contacts');
  }

  /** Local emergency alert for one contact — creates a record, never claims
   *  real SMS/push delivery (frontend-only prototype). */
  alertOne(contact: TrustedContact) {
    const ref = this.booking?.bookingRef ?? this.hail?.hailId;
    if (!ref) return;
    this.emergencyService.alertContact(ref, contact.name, contact.phone);
    void this.showToast(`Emergency alert created for ${contact.name}.`);
  }

  alertAll() {
    const list = this.contacts;
    if (!list.length) {
      this.openTrustedContacts();
      return;
    }
    const ref = this.booking?.bookingRef ?? this.hail?.hailId;
    if (!ref) return;
    for (const c of list) this.emergencyService.alertContact(ref, c.name, c.phone);
    void this.showToast(`Emergency alert created for ${list.length} contacts.`);
  }

  /** Reuses the existing SOS confirm behavior: local alert + driver call. */
  async sendSos() {
    const ride = this.ride;
    const operator = ride?.operator ?? this.booking?.operator ?? 'your operator';
    const names = this.contacts.length
      ? this.contacts.map((c) => c.name).join(', ')
      : 'Trusted Contacts (add them on the Profile tab)';
    const ref = this.booking?.bookingRef ?? this.hail?.hailId;
    const alert = await this.alertController.create({
      header: 'Emergency SOS',
      message: `Create an emergency alert for this ${operator} trip? It will be listed for ${names} on this device, then the driver will be called.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send SOS',
          role: 'destructive',
          handler: () => {
            if (ref) this.emergencyService.start(ref);
            void this.showToast('Emergency alert created.');
            window.open('tel:+639171234567');
          },
        },
      ],
    });
    await alert.present();
  }

  /** Share uses actual trip data (route, driver, vehicle, ref, status). */
  async shareStatus() {
    const ride = this.ride;
    const b = this.booking;
    const parts = [
      `Emergency status from ${this.passengerName} (ByaHero):`,
      b
        ? `${b.operator} trip ${b.from} to ${b.to}`
        : `${ride?.operator ?? ''} hail trip`,
      ride && ride.assigned ? this.rideIdentity.shortLabel(ride) : '',
      b ? `Ref ${b.bookingRef} · Seat ${b.seat} · ${b.date} ${b.time}` : '',
      `Status: ${ride?.statusLabel ?? 'ON THE WAY'}`,
      `Location: ${this.locationLines().label}`,
    ].filter(Boolean);
    const text = parts.join('\n');
    const share = (navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    }).share;
    if (share) {
      try {
        await share({ title: 'Emergency trip status', text });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      await this.showToast('Emergency status copied.');
    } catch {
      await this.showToast('Sharing is not available on this device.');
    }
  }

  deactivate() {
    const ref = this.booking?.bookingRef ?? this.hail?.hailId;
    if (ref) this.emergencyService.clearForBooking(ref);
    void this.showToast('Emergency Mode is off.');
    this.backToTrip();
  }

  sosContactNames(): string {
    try {
      const list = this.alertsService.sosContacts();
      return list.length ? list.map((c) => c.name).join(', ') : '';
    } catch {
      return '';
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
