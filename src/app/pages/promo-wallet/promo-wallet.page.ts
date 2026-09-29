import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  bookmark,
  bookmarkOutline,
  bus,
  checkmarkCircle,
  chevronForwardOutline,
  copyOutline,
  informationCircleOutline,
  pricetagOutline,
  ticketOutline,
} from 'ionicons/icons';
import { BookingService } from '../booking/booking.service';
import { TicketService } from '../bookings/ticket.service';
import { VoucherService, type Voucher } from '../../services/voucher.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'arrow-forward-outline': arrowForwardOutline,
  bookmark: bookmark,
  'bookmark-outline': bookmarkOutline,
  bus: bus,
  'checkmark-circle': checkmarkCircle,
  'chevron-forward-outline': chevronForwardOutline,
  'copy-outline': copyOutline,
  'information-circle-outline': informationCircleOutline,
  'pricetag-outline': pricetagOutline,
  'ticket-outline': ticketOutline,
});

type WalletTab = 'all' | 'available' | 'saved' | 'used';

@Component({
  selector: 'app-promo-wallet',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './promo-wallet.page.html',
  styleUrls: ['./promo-wallet.page.scss'],
})
export class PromoWalletPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private toastController = inject(ToastController);
  private voucherService = inject(VoucherService);
  booking = inject(BookingService);
  private ticketService = inject(TicketService);

  tab: WalletTab = 'all';
  openCode: string | null = null;
  private fallbackUrl = '/rewards';
  /** Bumped on every visit so counts refresh after the booking flow. */
  private nonce = 0;

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      bookmark,
      bookmarkOutline,
      bus,
      checkmarkCircle,
      chevronForwardOutline,
      copyOutline,
      informationCircleOutline,
      pricetagOutline,
      ticketOutline,
    });
  }

  ionViewWillEnter() {
    const from = this.route.snapshot.queryParamMap.get('from');
    this.fallbackUrl =
      from === 'voucher'
        ? '/booking/voucher'
        : from === 'profile'
          ? '/profile'
          : '/rewards';
    this.nonce++;
  }

  // --- Derived data (VoucherService stays authoritative) ---

  get vouchers(): Voucher[] {
    void this.nonce;
    return this.voucherService.getVouchers();
  }

  get availableCount(): number {
    return this.vouchers.filter((v) => !v.used).length;
  }

  get savedCount(): number {
    return this.vouchers.filter((v) => v.saved && !v.used).length;
  }

  get usedCount(): number {
    return this.vouchers.filter((v) => v.used).length;
  }

  get visible(): Voucher[] {
    switch (this.tab) {
      case 'available':
        return this.vouchers.filter((v) => !v.used);
      case 'saved':
        return this.vouchers.filter((v) => v.saved && !v.used);
      case 'used':
        return this.vouchers.filter((v) => v.used);
      default:
        return this.vouchers;
    }
  }

  get hasTrip(): boolean {
    return !!this.booking.trip;
  }

  get spend(): number {
    return this.booking.subtotal;
  }

  get operator(): string {
    return this.booking.trip?.operator ?? '';
  }

  setTab(tab: WalletTab) {
    this.tab = tab;
  }

  toggleDetails(code: string) {
    this.openCode = this.openCode === code ? null : code;
  }

  formatCurrency(n: number): string {
    return this.booking.formatCurrency(n);
  }

  discountLine(v: Voucher): string {
    return v.kind === 'percent' ? `${v.value}% OFF` : `${this.formatCurrency(v.value)} OFF`;
  }

  /** Preview saving for the trip in progress (0 when not applicable).
   *  Same eligibleAmount the payment step relies on — never a second
   *  calculation. */
  discountFor(v: Voucher): number {
    if (!this.hasTrip) return 0;
    return this.voucherService.eligibleAmount(v, this.spend, this.operator);
  }

  isApplied(v: Voucher): boolean {
    return this.booking.voucher?.code === v.code;
  }

  /** Booking that redeemed this code, if any — real history, never dates
   *  we don't have. */
  usedOnRef(v: Voucher): string | null {
    return (
      this.ticketService.bookings.find((b) => b.voucherCode === v.code)
        ?.bookingRef ?? null
    );
  }

  /** Plain-language reason a promo can't be used right now. Empty when
   *  usable (or when no trip is in progress to judge against). */
  reason(v: Voucher): string {
    if (v.used && !this.isApplied(v)) {
      const ref = this.usedOnRef(v);
      return ref ? `Used · ${ref}` : 'Already used';
    }
    if (!this.hasTrip) return '';
    if (v.operators?.length && !v.operators.includes(this.operator)) {
      return `Only for ${v.operators.join(' / ')} trips`;
    }
    if (this.spend < v.minSpend) {
      const short = v.minSpend - this.spend;
      return `Add ${this.formatCurrency(short)} more to use this promo`;
    }
    return '';
  }

  operatorLine(v: Voucher): string {
    return v.operators?.length ? v.operators.join(' / ') : 'Any operator';
  }

  // --- Actions ---

  usePromo(v: Voucher) {
    if (v.used && !this.isApplied(v)) {
      void this.showToast(`${v.code} has already been used.`, 'danger');
      return;
    }
    if (!this.hasTrip) {
      // No booking yet: park the intent, let the rider pick a trip, and
      // the voucher step consumes it. Nothing is marked used here.
      this.voucherService.pendingCode = v.code;
      void this.showToast(`Pick a trip — ${v.code} will be ready on the voucher step.`);
      this.router.navigateByUrl('/search');
      return;
    }
    const result = this.voucherService.apply(v.code, this.spend, this.operator);
    if (!result.ok) {
      void this.showToast(result.error, 'danger');
      return;
    }
    this.booking.voucher = {
      code: result.voucher.code,
      title: result.voucher.title,
      kind: result.voucher.kind,
      value: result.voucher.value,
      minSpend: result.voucher.minSpend,
      cap: result.voucher.cap,
    };
    void this.showToast(
      `${result.voucher.code} applied — you save ${this.formatCurrency(this.booking.voucherDiscount)}.`,
    );
    this.router.navigateByUrl('/booking/payment');
  }

  toggleSave(v: Voucher, event: Event) {
    event.stopPropagation();
    if (v.saved) {
      this.voucherService.unsave(v.code);
      void this.showToast(`${v.code} removed from your wallet.`);
    } else {
      this.voucherService.save(v.code);
      void this.showToast(`${v.code} saved — it'll live here until you're ready to ride.`);
    }
    this.nonce++;
  }

  async copyCode(v: Voucher, event: Event) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(v.code);
      await this.showToast(`${v.code} copied.`);
    } catch {
      await this.showToast(v.code);
    }
  }

  bookRide() {
    this.router.navigateByUrl('/search');
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

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2400,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
