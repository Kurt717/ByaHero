import { Component, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
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
  idCardOutline,
  shieldCheckmarkOutline,
  pricetagOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import {
  BookingService,
  PaymentMethod,
  PassengerType,
  PASSENGER_TYPE_META,
} from '../booking.service';
import { TicketService } from '../../bookings/ticket.service';
import { ProfileService } from '../../profile/profile.service';
import { SeatService, departureKeyForTrip } from '../../../services/seat.service';
import { VoucherService } from '../../../services/voucher.service';
import { PickupService } from '../../../services/pickup.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'wallet-outline': walletOutline,
  'card-outline': cardOutline,
  'cash-outline': cashOutline,
  'checkmark-circle': checkmarkCircle,
  'lock-closed-outline': lockClosedOutline,
  'information-circle-outline': informationCircleOutline,
  'id-card-outline': idCardOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'pricetag-outline': pricetagOutline,
  'chevron-forward-outline': chevronForwardOutline,
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
  imports: [FormsModule, IonContent, IonIcon],
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit {
  booking = inject(BookingService);
  private router = inject(Router);
  private location = inject(Location);
  private ticketService = inject(TicketService);
  private toastController = inject(ToastController);
  private profileService = inject(ProfileService);
  private seatService = inject(SeatService);
  private voucherService = inject(VoucherService);
  private pickupService = inject(PickupService);

  agreed = false;
  idConfirm = false;
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  processing = false;

  readonly methods: PaymentOption[] = [
    {
      id: 'wallet',
      label: 'Byahero Wallet',
      sub: `Balance ₱ ${this.profileService.readWallet().balance}`,
      icon: 'wallet-outline',
    },
    {
      id: 'gcash',
      label: 'GCash',
      sub: 'Pay via GCash e-wallet',
      icon: 'wallet-outline',
    },
    {
      id: 'maya',
      label: 'Maya',
      sub: 'Pay via Maya e-wallet',
      icon: 'wallet-outline',
    },
    {
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

  constructor() {
    addIcons({arrowBackOutline,pricetagOutline,chevronForwardOutline,idCardOutline,checkmarkCircle,informationCircleOutline,shieldCheckmarkOutline,lockClosedOutline,});
  }

  ngOnInit() {
    if (!this.booking.trip || !this.booking.selectedSeats.length) {
      this.router.navigateByUrl('/home');
    }
  }

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

  typeLabel(type: PassengerType): string {
    return PASSENGER_TYPE_META[type].label;
  }

  selectMethod(id: PaymentMethod) {
    this.booking.paymentMethod = id;
  }

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
    if (this.alreadyPaid) {
      return 'This booking already has a ticket — going back will not charge again.';
    }
    const stopErrors = this.safeStopErrors();
    if (stopErrors.length) {
      return stopErrors[0];
    }
    const clash = this.firstTakenSeat();
    if (clash) {
      return `Seat ${clash} was just sold. Go back and pick another seat.`;
    }
    if (this.booking.paymentMethod === 'card' && !this.cardIsValid) {
      return 'Enter a valid card number (Luhn-checked), MM/YY expiry, and CVV to continue.';
    }
    if (
      this.booking.paymentMethod === 'wallet' &&
      this.walletBalance < this.booking.total
    ) {
      return `Your wallet balance (₱ ${this.profileService.readWallet().balance}) is lower than the total. Top up on the Profile tab first.`;
    }
    if (this.booking.discountedCount && !this.booking.allIdsVerified) {
      return `${this.booking.unverifiedCount} discounted fare${this.booking.unverifiedCount > 1 ? 's' : ''} still need${this.booking.unverifiedCount > 1 ? '' : 's'} ID type, ID number and front ID upload. Tap “Complete ID verification” below.`;
    }
    if (this.booking.discountedCount && !this.idConfirm) {
      return 'Confirm the discounted ID is valid and belongs to the passenger to continue.';
    }
    if (!this.agreed) {
      return 'Accept the fare and cancellation policy to finish booking.';
    }
    return '';
  }

  get canPay(): boolean {
    if (this.processing) return false;
    // Idempotent: a booking that already produced a ticket cannot pay again.
    if (this.booking.bookingRef && this.ticketService.findByRef(this.booking.bookingRef)) {
      return false;
    }
    if (this.safeStopErrors().length) return false;
    if (this.firstTakenSeat()) return false;
    if (this.booking.discountedCount && (!this.booking.allIdsVerified || !this.idConfirm)) {
      return false;
    }
    if (this.booking.paymentMethod === 'wallet') {
      return this.agreed && this.walletBalance >= this.booking.total;
    }
    return this.agreed && this.cardIsValid;
  }

  /** Already checked out (Back to Payment after success): show ticket. */
  get alreadyPaid(): boolean {
    return !!(
      this.booking.bookingRef && this.ticketService.findByRef(this.booking.bookingRef)
    );
  }

  private safeStopErrors(): string[] {
    try {
      return this.booking.validateStops();
    } catch {
      return [];
    }
  }

  gotoDetails() {
    this.router.navigateByUrl('/booking/trip');
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
    // Idempotent: going Back to Payment after success must not charge again.
    if (this.booking.bookingRef && this.ticketService.findByRef(this.booking.bookingRef)) {
      this.router.navigateByUrl(`/e-ticket/${this.booking.bookingRef}`);
      return;
    }
    if (!this.canPay || this.processing) return;
    this.processing = true;

    try {
      // 1) Re-validate stops before touching money or seats.
      const stopErrors = this.booking.validateStops();
      if (stopErrors.length) {
        await this.showToast(stopErrors[0]);
        return;
      }
      // 2) Re-check every selected seat is still free on the rider's segment.
      const clash = this.firstTakenSeat();
      if (clash) {
        await this.showToast(`Seat ${clash} was just sold. Pick another seat.`);
        return;
      }

      // 3) Unique booking reference (collision-safe).
      if (!this.booking.bookingRef) {
        const existing = new Set(this.ticketService.bookings.map((b) => b.bookingRef));
        this.booking.generateBookingRef(existing);
      } else if (this.ticketService.findByRef(this.booking.bookingRef)) {
        this.router.navigateByUrl(`/e-ticket/${this.booking.bookingRef}`);
        return;
      }

      // 4) All-or-nothing: reserve seats, create ticket, then charge.
      const depKey = this.booking.hasNetworkSegment
        ? departureKeyForTrip(this.booking.tripId!, this.booking.travelDate)
        : null;
      const lo = this.booking.hasNetworkSegment
        ? Math.min(this.booking.boardSeq!, this.booking.alightSeq!)
        : null;
      const hi = this.booking.hasNetworkSegment
        ? Math.max(this.booking.boardSeq!, this.booking.alightSeq!)
        : null;
      if (depKey != null && lo != null && hi != null) {
        this.seatService.bookSegment(
          depKey,
          this.booking.selectedSeats,
          lo,
          hi,
          this.booking.bookingRef,
        );
      } else {
        this.seatService.bookSeats(
          this.seatService.keyFor(this.booking),
          this.booking.selectedSeats,
        );
      }

      let ticket: { bookingRef: string } | null = null;
      try {
        ticket = this.ticketService.createFromCheckout(this.booking);
      } catch (e) {
        ticket = null;
      }
      if (!ticket) {
        // Roll back the seat hold; no money moved yet for wallet (charge is
        // last), non-wallet mock gateway has no side effects.
        this.rollbackSeats(depKey);
        await this.showToast('Unable to create your ticket. No charge was made — please try again.');
        return;
      }

      // 5) Charge last. Wallet deduction failure rolls back seats + ticket.
      if (this.booking.paymentMethod === 'wallet') {
        if (!this.profileService.deductWallet(this.booking.total)) {
          this.rollbackSeats(depKey);
          try {
            this.ticketService.remove(this.booking.bookingRef);
          } catch {
            // Ticket list stays consistent; seat rollback already done.
          }
          await this.showToast('Insufficient wallet balance. Top up first.');
          return;
        }
      } else {
        // Mock gateway round-trip for e-wallets/cards (no side effects).
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      // Freeze the session's pickup onto the new booking, then clear staging.
      // The session stays readable for Confirmation, but pay() is now locked
      // by the ticket-exists guard above (no double charge on Back).
      this.pickupService.snapshotToBooking(ticket.bookingRef, this.booking.pickup);
      this.pickupService.resetActive();
      this.router.navigateByUrl('/booking/confirmation');
    } finally {
      this.processing = false;
    }
  }

  /** First selected seat that is no longer free on the rider's segment. */
  private firstTakenSeat(): string | null {
    if (!this.booking.selectedSeats.length) return null;
    if (!this.booking.hasNetworkSegment) {
      const avail = this.seatService.availabilityForBooking(this.booking);
      for (const s of this.booking.selectedSeats) {
        if (avail.bookedSet.has(s)) return s;
      }
      return null;
    }
    const avail = this.seatService.availabilityForBooking(this.booking);
    for (const s of this.booking.selectedSeats) {
      if (avail.bookedSet.has(s)) return s;
    }
    return null;
  }

  private rollbackSeats(depKey: string | null) {
    try {
      if (depKey) {
        this.seatService.freeSeatsByRef(depKey, this.booking.bookingRef);
      } else {
        this.seatService.freeSeats(
          this.seatService.keyFor(this.booking),
          this.booking.selectedSeats,
        );
      }
    } catch {
      return;
    }
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
}
