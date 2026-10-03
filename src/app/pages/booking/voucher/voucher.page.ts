import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonFooter, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  pricetagOutline,
  checkmarkCircle,
  closeCircle,
  chevronForwardOutline,
} from 'ionicons/icons';
import { BookingService } from '../booking.service';
import { VoucherService, Voucher } from '../../../services/voucher.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'pricetag-outline': pricetagOutline,
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'chevron-forward-outline': chevronForwardOutline,
});

@Component({
  selector: 'app-voucher',
  standalone: true,
  imports: [FormsModule, IonContent, IonIcon, IonFooter],
  templateUrl: './voucher.page.html',
  styleUrls: ['./voucher.page.scss'],
})
export class VoucherPage implements OnInit {
  booking = inject(BookingService);
  voucherService = inject(VoucherService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  code = '';

  ngOnInit() {
    // Promo Wallet handoff: the rider picked a promo before a trip
    // existed. Try it once against this trip, then clear the intent.
    // A trip that isn't started yet keeps the intent for later; an
    // already-applied voucher drops it so nothing gets auto-replaced.
    if (this.booking.voucher) {
      this.voucherService.consumePending();
      return;
    }
    if (!this.booking.trip) return;
    const pending = this.voucherService.consumePending();
    if (pending) {
      const match = this.vouchers.find((v) => v.code === pending);
      if (match && !match.used) {
        this.apply(match);
      } else if (match) {
        void this.showToast(`${pending} has already been used.`, 'danger');
      }
    }
  }

  get spend(): number {
    return this.booking.subtotal;
  }

  get operator(): string {
    return this.booking.trip?.operator ?? '';
  }

  get vouchers(): Voucher[] {
    return this.voucherService.getVouchers();
  }

  discountFor(v: Voucher): number {
    return this.voucherService.eligibleAmount(v, this.spend, this.operator);
  }

  isApplied(v: Voucher): boolean {
    return this.booking.voucher?.code === v.code;
  }

  reason(v: Voucher): string {
    if (v.used && !this.isApplied(v)) return 'Already used';
    if (v.operators?.length && !v.operators.includes(this.operator)) {
      return `Only for ${v.operators.join(' / ')} trips`;
    }
    if (this.spend < v.minSpend) {
      return `Spend ${this.booking.formatCurrency(v.minSpend)} to use`;
    }
    return '';
  }

  apply(v: Voucher) {
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
    this.router.navigateByUrl('/booking/payment', { replaceUrl: true });
  }

  remove(v: Voucher) {
    this.voucherService.release(v);
    this.booking.voucher = null;
  }

  async applyCode() {
    const spend = this.spend;
    const operator = this.operator;
    const result = this.voucherService.apply(this.code, spend, operator);
    if (!result.ok) {
      const toast = await this.toastController.create({
        message: result.error,
        duration: 2600,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
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
    await this.showToast(`${result.voucher.code} applied — you save ${this.booking.formatCurrency(this.booking.voucherDiscount)} here.`);
    // Voucher is a detour off Payment, not a wizard step: replace so
    // Payment ⇄ Voucher can't pile up duplicate entries.
    this.router.navigateByUrl('/booking/payment', { replaceUrl: true });
  }

  openPromoWallet() {
    this.router.navigateByUrl('/promo-wallet?from=voucher');
  }

  goBack() {
    // Detour return: replace, so Back from Payment skips Voucher and
    // lands on Seats instead of bouncing Payment ⇄ Voucher.
    this.router.navigateByUrl('/booking/payment', { replaceUrl: true });
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