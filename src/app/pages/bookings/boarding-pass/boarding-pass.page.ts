import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  bus,
  calendarOutline,
  timeOutline,
  personOutline,
  ticketOutline,
  cloudOfflineOutline,
  wifiOutline,
  briefcaseOutline,
} from 'ionicons/icons';
import { TicketService, Booking } from '../ticket.service';
import { ProfileService } from '../../profile/profile.service';
import { LuggageService } from '../luggage.service';
import { RideIdentityService } from '../../../services/ride-identity.service';
import {
  canonicalTicketCode,
  qrGridForValue,
  qrValueForBooking,
  code128BarsForValue,
} from '../ticket-code';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'time-outline': timeOutline,
  'person-outline': personOutline,
  'ticket-outline': ticketOutline,
  'cloud-offline-outline': cloudOfflineOutline,
  'wifi-outline': wifiOutline,
  'briefcase-outline': briefcaseOutline,
});

/** Simplified boarding screen: QR + barcode + essential trip facts.
 *  Codes come from the shared ticket-code helper, so they always match
 *  the E-Ticket for the same booking. */
@Component({
  selector: 'app-boarding-pass',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './boarding-pass.page.html',
  styleUrls: ['./boarding-pass.page.scss'],
})
export class BoardingPassPage implements OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private ticketService = inject(TicketService);
  private profileService = inject(ProfileService);
  private luggageService = inject(LuggageService);
  private rideIdentity = inject(RideIdentityService);

  booking: Booking | null = null;
  qrMatrix: boolean[][] = [];
  qrSize = 0;
  eanBars: { x: number; w: number }[] = [];
  eanTotal = 0;
  passengerName = '';
  online = true;
  private onOnline = () => (this.online = true);
  private onOffline = () => (this.online = false);

  constructor() {
    addIcons({
      arrowBackOutline,
      bus,
      calendarOutline,
      timeOutline,
      personOutline,
      ticketOutline,
      cloudOfflineOutline,
      wifiOutline,
      briefcaseOutline,
    });
    try {
      this.online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
    } catch {
      this.online = true;
    }
    this.load();
  }

  ionViewWillEnter() {
    try {
      this.online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    } catch {
      this.online = true;
    }
    this.load();
  }

  private load() {
    const ref = this.route.snapshot.paramMap.get('bookingRef');
    this.booking = ref ? this.ticketService.findByRef(ref) : this.ticketService.selected;
    if (!this.booking) return;
    this.ticketService.open(this.booking);
    try {
      this.passengerName =
        this.booking.passengerName || this.profileService.read().name;
    } catch {
      this.passengerName = this.booking.passengerName ?? '';
    }
    try {
      const grid = qrGridForValue(qrValueForBooking(this.booking));
      this.qrSize = grid.size;
      this.qrMatrix = grid.matrix;
    } catch {
      this.qrSize = 0;
      this.qrMatrix = [];
    }
    const barcode = code128BarsForValue(canonicalTicketCode(this.booking));
    this.eanBars = barcode.bars;
    this.eanTotal = barcode.total;
  }

  get ticketCode(): string {
    return this.booking ? canonicalTicketCode(this.booking) : '';
  }

  /** Boarding pass renders from the same localStorage record as the
   *  E-ticket — viewable offline, but live maps are never implied. */
  get offlineReady(): boolean {
    return !!this.booking;
  }

  get luggageTotal(): number {
    if (!this.booking) return 0;
    return this.luggageService.total(this.booking.bookingRef);
  }

  luggageLabel(): string {
    if (!this.booking) return '';
    return this.luggageService.summaryLabel(this.booking.bookingRef);
  }

  /** Compact ride line, shown only when a vehicle is actually assigned. */
  get rideAssigned(): boolean {
    if (!this.booking) return false;
    return this.rideIdentity.identityForBooking(this.booking).assigned;
  }

  rideLine(): string {
    if (!this.booking) return '';
    const id = this.rideIdentity.identityForBooking(this.booking);
    if (!id.assigned) return '';
    return `BUS ${id.busNo} · ${id.plate} · Driver ${id.driver}`;
  }

  get isActive(): boolean {
    return (
      this.booking?.status === 'confirmed' ||
      this.booking?.status === 'boarding'
    );
  }

  statusLabel(): string {
    if (!this.booking) return '';
    return {
      confirmed: 'Confirmed',
      boarding: 'Boarding Soon',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }[this.booking.status];
  }

  viewTicket() {
    if (!this.booking) return;
    this.ticketService.open(this.booking);
    this.router.navigateByUrl(`/e-ticket/${this.booking.bookingRef}`);
  }

  ngOnDestroy() {
    try {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    } catch {
      return;
    }
  }

  goBack() {
    this.location.back();
  }
}
