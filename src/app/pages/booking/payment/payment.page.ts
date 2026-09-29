<<<<<<< HEAD
import { Component, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
=======
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  walletOutline,
  cardOutline,
  cashOutline,
  checkmarkCircle,
  lockClosedOutline,
  informationCircleOutline,
<<<<<<< HEAD
  pricetagOutline,
  chevronForwardOutline,
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
} from 'ionicons/icons';
import {
  BookingService,
  PaymentMethod,
  PassengerType,
  PASSENGER_TYPE_META,
} from '../booking.service';
<<<<<<< HEAD
import { TicketService } from '../../bookings/ticket.service';
import { ProfileService } from '../../profile/profile.service';
import { SeatService } from '../../../services/seat.service';
import { VoucherService } from '../../../services/voucher.service';
import { PickupService } from '../../../services/pickup.service';
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'wallet-outline': walletOutline,
  'card-outline': cardOutline,
  'cash-outline': cashOutline,
  'checkmark-circle': checkmarkCircle,
  'lock-closed-outline': lockClosedOutline,
  'information-circle-outline': informationCircleOutline,
<<<<<<< HEAD
  'pricetag-outline': pricetagOutline,
  'chevron-forward-outline': chevronForwardOutline,
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
});

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  sub: string;
  icon: string;
}

@Component({
  selector: 'app-payment',
  standalone: true,
<<<<<<< HEAD
  imports: [FormsModule, IonContent, IonIcon],
=======
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit {
<<<<<<< HEAD
  booking = inject(BookingService);
  private router = inject(Router);
  private location = inject(Location);
  private ticketService = inject(TicketService);
  private toastController = inject(ToastController);
  private profileService = inject(ProfileService);
  private seatService = inject(SeatService);
  private voucherService = inject(VoucherService);
  private pickupService = inject(PickupService);

=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  agreed = false;
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
<<<<<<< HEAD
  processing = false;

  readonly methods: PaymentOption[] = [
    {
      id: 'wallet',
      label: 'Byahero Wallet',
      sub: `Balance ₱ ${this.profileService.readWallet().balance}`,
      icon: 'wallet-outline',
    },
    {
=======

  readonly methods: PaymentOption[] = [
    {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
      id: 'gcash',
      label: 'GCash',
      sub: 'Pay via GCash e-wallet',
      icon: 'wallet-outline',
    },
    {
<<<<<<< HEAD
      id: 'maya',
      label: 'Maya',
      sub: 'Pay via Maya e-wallet',
      icon: 'wallet-outline',
    },
    {
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
      id: 'card',
      label: 'Credit / Debit Card',
      sub: 'Visa, Mastercard, JCB',
      icon: 'card-outline',
    },
    {
      id: 'cash',
      label: 'Cash on Boarding',
      sub: 'Pay the conductor directly',
      icon: 'cash-outline',
    },
  ];

<<<<<<< HEAD
  constructor() {
=======
  constructor(
    public booking: BookingService,
    private router: Router,
  ) {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    addIcons({
      arrowBackOutline,
      informationCircleOutline,
      lockClosedOutline,
      checkmarkCircle,
    });
  }

  ngOnInit() {
    if (!this.booking.trip || !this.booking.selectedSeats.length) {
      this.router.navigateByUrl('/home');
    }
  }

<<<<<<< HEAD
  get recommendedDiscount(): number {
    return this.voucherService.bestDiscountFor(
      this.booking.subtotal,
      this.booking.trip?.operator || '',
    );
  }

  get voucherHint(): string {
    const n = this.recommendedDiscount;
    return this.booking.formatCurrency(n ? n : 50);
  }

  openVouchers() {
    this.router.navigateByUrl('/booking/voucher');
  }

=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  typeLabel(type: PassengerType): string {
    return PASSENGER_TYPE_META[type].label;
  }

  selectMethod(id: PaymentMethod) {
    this.booking.paymentMethod = id;
  }

<<<<<<< HEAD
  get walletBalance(): number {
    return this.profileService.walletBalance();
  }

  get cardDigits(): string {
    return this.cardNumber.replace(/\D/g, '');
  }

  /** Standard Luhn checksum so card numbers are actually validated. */
  luhnValid(): boolean {
    const digits = this.cardDigits;
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = Number(digits[i]);
      if (double) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      double = !double;
    }
    return sum % 10 === 0;
  }

  get cardIsValid(): boolean {
    if (this.booking.paymentMethod !== 'card') return true;
    const expiryValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(this.cardExpiry);
    const cvvValid = /^\d{3,4}$/.test(this.cardCvv);
    return this.cardDigits.length >= 13 && this.luhnValid() && expiryValid && cvvValid;
  }

  get paymentHint(): string {
    if (this.booking.paymentMethod === 'card' && !this.cardIsValid) {
      return 'Enter a valid card number (Luhn-checked), MM/YY expiry, and CVV to continue.';
    }
    if (
      this.booking.paymentMethod === 'wallet' &&
      this.walletBalance < this.booking.total
    ) {
      return `Your wallet balance (₱ ${this.profileService.readWallet().balance}) is lower than the total. Top up on the Profile tab first.`;
    }
    if (!this.agreed) {
      return 'Accept the fare and cancellation policy to finish booking.';
    }
    return '';
  }

  get canPay(): boolean {
    if (this.processing) return false;
    if (this.booking.paymentMethod === 'wallet') {
      return this.agreed && this.walletBalance >= this.booking.total;
    }
    return this.agreed && this.cardIsValid;
  }

  goBack() {
    // Same no-push rule as the seat map: pop back to Seats. Pushing a
    // duplicate Seats entry here bounced against Seats' own Back.
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl('/booking/seats');
  }

  async pay() {
    if (!this.canPay) return;
    this.processing = true;

    if (this.booking.paymentMethod === 'wallet') {
      if (!this.profileService.deductWallet(this.booking.total)) {
        this.processing = false;
        await this.showToast('Insufficient wallet balance. Top up first.');
        return;
      }
    }

    // Mock payment gateway round-trip so the UI behaves like a real checkout.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (!this.booking.bookingRef) this.booking.generateBookingRef();
    this.seatService.bookSeats(
      this.seatService.keyFor(this.booking),
      this.booking.selectedSeats,
    );
    const ticket = this.ticketService.createFromCheckout(this.booking);
    if (!ticket) {      this.processing = false;
      const toast = await this.toastController.create({
        message: 'Unable to create your ticket. Please review the trip details.',
        duration: 2200,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
      return;
    }
    // Freeze the session's pickup (point + last-known location + alert
    // lifecycle) onto the new booking, then clear the staging area.
    this.pickupService.snapshotToBooking(ticket.bookingRef, this.booking.pickup);
    this.pickupService.resetActive();
    this.router.navigateByUrl('/booking/confirmation');
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      color: 'danger',
      position: 'bottom',
    });
    await toast.present();
  }
=======
  get canPay(): boolean {
    return this.agreed;
  }

  goBack() {
    this.router.navigateByUrl('/booking/seats');
  }

  pay() {
    if (!this.canPay) return;
    this.booking.generateBookingRef();
    this.router.navigateByUrl('/booking/confirmation');
  }
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
}
