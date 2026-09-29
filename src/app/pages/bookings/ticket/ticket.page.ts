<<<<<<< HEAD
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonContent, IonIcon, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { toPng } from 'html-to-image';
=======
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  shareSocialOutline,
  bus,
  calendarOutline,
  timeOutline,
  personOutline,
  callOutline,
  locationOutline,
  downloadOutline,
  closeCircleOutline,
<<<<<<< HEAD
  checkmarkCircleOutline,
  qrCodeOutline,
  informationCircleOutline,
  shieldCheckmarkOutline,
  cloudOfflineOutline,
  wifiOutline,
  briefcaseOutline,
  refreshOutline,
} from 'ionicons/icons';
import { TicketService, Booking } from '../ticket.service';
import { TripReminderCardComponent } from '../../../components/trip-reminder-card/trip-reminder-card.component';
import { TripReminderService } from '../../../services/trip-reminder.service';
import { ProfileService } from '../../profile/profile.service';
import { SeatService } from '../../../services/seat.service';
import { LuggageService } from '../luggage.service';
import { RideIdentityService } from '../../../services/ride-identity.service';
import {
  canonicalTicketCode,
  qrGridForValue,
  qrValueForBooking,
  code128BarsForValue,
} from '../ticket-code';
=======
  informationCircleOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { TicketService, Booking } from '../ticket.service';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'share-social-outline': shareSocialOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'time-outline': timeOutline,
  'person-outline': personOutline,
  'call-outline': callOutline,
  'location-outline': locationOutline,
  'download-outline': downloadOutline,
  'close-circle-outline': closeCircleOutline,
<<<<<<< HEAD
  'checkmark-circle-outline': checkmarkCircleOutline,
  'qr-code-outline': qrCodeOutline,
  'information-circle-outline': informationCircleOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'cloud-offline-outline': cloudOfflineOutline,
  'wifi-outline': wifiOutline,
  'briefcase-outline': briefcaseOutline,
  'refresh-outline': refreshOutline,
=======
  'information-circle-outline': informationCircleOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
});

@Component({
  selector: 'app-ticket',
  standalone: true,
<<<<<<< HEAD
  imports: [CommonModule, IonContent, IonIcon, TripReminderCardComponent],
  templateUrl: './ticket.page.html',
  styleUrls: ['./ticket.page.scss'],
})
export class TicketPage implements OnInit, OnDestroy {
private ticketService = inject(TicketService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private profileService = inject(ProfileService);
  private seatService = inject(SeatService);
  private luggageService = inject(LuggageService);
  private reminderService = inject(TripReminderService);
  private rideIdentity = inject(RideIdentityService);

  @ViewChild('ticketPass', { read: ElementRef }) passRef?: ElementRef<HTMLElement>;

  booking: Booking | null = null;
  qrMatrix: boolean[][] = [];
  qrSize = 0;
  saving = false;
  /** Browser connection mirror — ticket stays viewable either way because
   *  all data comes from localStorage + local QR/barcode generation. */
  online = true;
  private onOnline = () => (this.online = true);
  private onOffline = () => (this.online = false);

passenger = { name: 'Juan Dela Cruz', phone: '+63 917 000 1234' };

  eanBars: { x: number; w: number }[] = [];
  eanTotal = 0;

  constructor() {
=======
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './ticket.page.html',
  styleUrls: ['./ticket.page.scss'],
})
export class TicketPage implements OnInit {
  booking: Booking | null = null;
  qrGrid: boolean[][] = [];

  passenger = { name: 'Juan Dela Cruz', phone: '+63 917 000 1234' };

  constructor(
    private ticketService: TicketService,
    private router: Router,
  ) {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    addIcons({
      arrowBackOutline,
      shareSocialOutline,
      bus,
      calendarOutline,
      timeOutline,
      personOutline,
      callOutline,
      shieldCheckmarkOutline,
      informationCircleOutline,
      downloadOutline,
      closeCircleOutline,
<<<<<<< HEAD
      checkmarkCircleOutline,
      qrCodeOutline,
      cloudOfflineOutline,
      wifiOutline,
      briefcaseOutline,
      refreshOutline,
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    });
  }

  ngOnInit() {
<<<<<<< HEAD
    try {
      this.online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    } catch {
      this.online = true;
    }
    try {
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
    } catch {
      // Non-browser shell — connection badge simply stays "Online".
    }
    const bookingRef = this.route.snapshot.paramMap.get('bookingRef');
    this.booking = bookingRef
      ? this.ticketService.findByRef(bookingRef)
      : this.ticketService.selected;

if (!this.booking) {
      this.router.navigateByUrl('/bookings');
      return;
    }
    this.ticketService.open(this.booking);
    this.passenger = {
      name: this.booking.passengerName || this.profileService.read().name,
      phone: this.booking.passengerPhone || this.profileService.read().phone,
    };
    this.generateQr(this.booking);
    const barcode = code128BarsForValue(canonicalTicketCode(this.booking));
    this.eanBars = barcode.bars;
    this.eanTotal = barcode.total;
  }

  get stampText(): string {
    if (this.booking?.status === 'cancelled') return 'VOID';
    if (this.booking?.status === 'completed') return 'USED';
    return 'VERIFIED';
  }

  get paxCount(): number {
    return this.booking?.passengerTypes?.length ?? 1;
  }

  /** Booking is rendered purely from localStorage, so any loaded booking
   *  is inherently available offline (details, QR, barcode, luggage). */
  get offlineReady(): boolean {
    return !!this.booking;
  }

  get luggageTotal(): number {
    if (!this.booking) return 0;
    return this.luggageService.total(this.booking.bookingRef);
  }

  get hasLuggage(): boolean {
    return this.luggageTotal > 0;
  }

  /** Reminder card view-model for this ticket — null renders nothing. */
  get ticketReminderView() {
    return this.booking ? this.reminderService.resolve(this.booking.bookingRef) : null;
  }

  /** Compact assigned-ride line (inside the stub → captured by PNG export).
   *  Unassigned future reservations show the pending state, never invented
   *  vehicle data. */
  get rideAssigned(): boolean {
    if (!this.booking) return false;
    return this.rideIdentity.identityForBooking(this.booking).assigned;
  }

  rideLine(): string {
    if (!this.booking) return '';
    const id = this.rideIdentity.identityForBooking(this.booking);
    if (!id.assigned) return 'Vehicle assignment pending';
    return `BUS ${id.busNo} · ${id.plate}`;
  }

  rideSub(): string {
    if (!this.booking) return '';
    const id = this.rideIdentity.identityForBooking(this.booking);
    if (!id.assigned) return 'Appears here when assigned';
    return `Driver ${id.driver}`;
  }

  luggageLabel(): string {
    if (!this.booking) return '';
    return this.luggageService.summaryLabel(this.booking.bookingRef);
  }

  ngOnDestroy() {
    try {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    } catch {
      return;
    }
  }

  /** Shared canonical ticket identifier (E-Ticket and Boarding Pass agree). */
  get ticketCode(): string {
    return this.booking ? canonicalTicketCode(this.booking) : '';
  }

  /** Real scannable QR of the canonical identifier (inline SVG in the
   *  template, so it renders identically on screen and in the download). */
  private generateQr(booking: Booking) {
    try {
      const grid = qrGridForValue(qrValueForBooking(booking));
      this.qrSize = grid.size;
      this.qrMatrix = grid.matrix;
    } catch {
      this.qrSize = 0;
      this.qrMatrix = [];
    }
=======
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
    const grid: boolean[][] = Array.from({ length: size }, () =>
      Array(size).fill(false),
    );

    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const rand = () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
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
            const rr = r0 + r,
              cc = c0 + c;
            if (rr >= 0 && rr < size && cc >= 0 && cc < size)
              grid[rr][cc] = false;
          }
        }
      }
    };

    finder(0, 0);
    finder(0, size - 7);
    finder(size - 7, 0);

    return grid;
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
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

  goBack() {
    this.ticketService.clear();
    this.router.navigateByUrl('/bookings');
  }

<<<<<<< HEAD
  openPrep() {
    if (!this.booking) return;
    this.ticketService.open(this.booking);
    this.router.navigateByUrl(`/trip-preparation/${this.booking.bookingRef}`);
  }

  openBoardingPass() {
    if (!this.booking) return;
    this.ticketService.open(this.booking);
    this.router.navigateByUrl(`/boarding-pass/${this.booking.bookingRef}`);
  }

  /** Alternatives never touch this booking — the rebook page only reads it. */
  openRebook() {
    if (!this.booking) return;
    this.ticketService.open(this.booking);
    this.router.navigateByUrl(`/booking/rebook/${this.booking.bookingRef}`);
  }

  async shareTicket() {
    if (!this.booking) return;
    const payload = this.ticketText(this.booking);
    const share = (navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    }).share;

    if (share) {
      try {
        await share({
          title: `Byahero ticket ${this.booking.bookingRef}`,
          text: payload,
        });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(payload);
      await this.showToast('Ticket details copied.');
    } catch {
      await this.showToast('Sharing is not available on this device.');
    }
  }

async saveTicket() {
    if (!this.booking || this.saving) return;
    const pass = this.passRef?.nativeElement;
    if (!pass) return;

    this.saving = true;

    try {
      // Fidelity: capture only after the live ticket (QR + barcode + fonts)
      // is fully rendered, and measure it where it is actually on screen.
      pass.scrollIntoView({ block: 'center' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      try {
        await document.fonts.ready;
      } catch {
        // Fonts API unavailable — the ticket still exports with fallbacks.
      }

    // Keep the capture ON-SCREEN: offscreen (negative-rect) clones render white
    // in html-to-image. We mirror the live rect and overlay the clone there.
    const rect = pass.getBoundingClientRect();
    const clone = pass.cloneNode(true) as HTMLElement;
    clone.classList.add('tk-capture');
    clone.style.cssText = [
      'position:fixed',
      `left:${rect.left}px`,
      `top:${rect.top}px`,
      `width:${pass.offsetWidth}px`,
      'z-index:999999',
      'margin:0',
      'transform:none',
      'animation:none',
      'opacity:1',
      'box-sizing:border-box',
    ].join(';');
    Array.from(clone.querySelectorAll<HTMLElement>('*')).forEach((el) => {
      el.style.animation = 'none';
      el.style.transition = 'none';
    });

    // Inline the ion-icon SVGs from each icon's shadow root so they render
    // exactly as they do on screen (html-to-image cannot serialize shadow DOM).
    const liveIcons = Array.from(pass.querySelectorAll('ion-icon'));
    const cloneIcons = Array.from(clone.querySelectorAll('ion-icon'));
    liveIcons.forEach((icon, i) => {
      const svgEl = icon.shadowRoot?.querySelector('svg');
      const target = cloneIcons[i];
      if (!svgEl || !target) return;
      const size = getComputedStyle(icon).fontSize;
      const svg = svgEl.cloneNode(true) as SVGElement;
      svg.removeAttribute('class');
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.setAttribute('fill', 'currentColor');
      svg.style.display = 'block';
      svg.style.color = getComputedStyle(icon).color;
      target.replaceWith(svg);
    });

    document.body.appendChild(clone);

    try {
      const dataUrl = await toPng(clone, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#f8fafc',
      });
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `byahero-ticket-${this.booking.bookingRef}.png`;
      anchor.click();
      await this.showToast('Ticket saved as a PNG image.');
    } catch {
      await this.showToast('Could not generate the ticket image on this device.');
    } finally {
      clone.remove();
      this.saving = false;
    }
  } catch {
    this.saving = false;
  }
}

async cancelBooking() {
    if (!this.booking || this.booking.status === 'cancelled') return;

    const reasonAlert = await this.alertController.create({
      header: 'Why are you cancelling?',
      inputs: [
        { type: 'radio', label: 'Changed my plans', value: 'Changed my plans', checked: true },
        { type: 'radio', label: 'Found a better trip', value: 'Found a better trip' },
        { type: 'radio', label: 'Trip too expensive', value: 'Trip too expensive' },
        { type: 'radio', label: 'Booked by accident', value: 'Booked by accident' },
        { type: 'radio', label: 'Operator schedule changed', value: 'Operator schedule changed' },
      ],
      buttons: [
        { text: 'Back', role: 'cancel' },
        {
          text: 'Next',
          handler: (value: string) => this.confirmCancel(value || 'Changed my plans'),
        },
      ],
    });

    await reasonAlert.present();
  }

  private async confirmCancel(reason: string) {
    const b = this.booking;
    if (!b) return;
    const amount = this.fareNumber(b.fare);

    const alert = await this.alertController.create({
      header: 'Confirm cancellation',
      message: `Voiding ${b.bookingRef}. A refund of ${this.formatCurrency(
        amount,
      )} goes straight back to your ByaHero Wallet and your seats are released.`,
      buttons: [
        { text: 'Keep Ticket', role: 'cancel' },
        {
          text: 'Confirm & Refund',
          role: 'destructive',
          handler: () => this.applyRefund(reason, amount),
        },
      ],
    });

    await alert.present();
  }

  private applyRefund(reason: string, amount: number) {
    const b = this.booking;
    if (!b) return;

    const updated = this.ticketService.markCancelled(b.bookingRef, reason);
    if (!updated) return;
    this.booking = updated;
    this.qrMatrix = [];

    const seats = b.seatIds?.length
      ? b.seatIds
      : this.parseSeats(b.seat);
    if (seats.length) {
      this.seatService.freeSeatsByTrip(
        b.operator,
        b.from,
        b.to,
        b.date,
        seats,
      );
    }

    if (amount > 0) {
      this.profileService.refundWallet(
        amount,
        `Trip Cancelled · ${b.bookingRef}`,
        `${b.operator} · ${b.from} → ${b.to}`,
        `REF-${b.bookingRef.replace('BYH-', '')}`,
        reason,
      );
    }

    this.showToast(
      `Refund of ${this.formatCurrency(amount)} added to your ByaHero Wallet.`,
    );
  }

  private fareNumber(fare: string): number {
    const n = Number(fare.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  private parseSeats(seat: string): string[] {
    return (seat.match(/[A-Z]?\d+[A-Z]?/g) ?? []).filter((s) => /^\d/.test(s));
  }

  formatCurrency(n: number | undefined): string {
    if (!n) return '₱ 0';
    return '₱ ' + n.toLocaleString('en-PH');
  }

  private ticketText(booking: Booking): string {
    const lines = [
      `Byahero E-Ticket ${booking.bookingRef}`,
      `${booking.operator}`,
      `${booking.from} to ${booking.to}`,
      `${booking.date} at ${booking.time}`,
      `${booking.seat}`,
      `Fare: ${booking.fare}`,
      `Status: ${this.statusLabel()}`,
    ];
    if (this.hasLuggage) lines.push(`Luggage: ${this.luggageLabel()}`);
    lines.push('Saved on this device — viewable offline.');
    return lines.join('\n');
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
=======
  shareTicket() {
    console.log('Share', this.booking?.bookingRef);
  }
  saveTicket() {
    console.log('Save', this.booking?.bookingRef);
  }
  cancelBooking() {
    console.log('Cancel', this.booking?.bookingRef);
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }
}
