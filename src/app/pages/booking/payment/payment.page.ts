import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
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
} from 'ionicons/icons';
import {
  BookingService,
  PaymentMethod,
  PassengerType,
  PASSENGER_TYPE_META,
} from '../booking.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'wallet-outline': walletOutline,
  'card-outline': cardOutline,
  'cash-outline': cashOutline,
  'checkmark-circle': checkmarkCircle,
  'lock-closed-outline': lockClosedOutline,
  'information-circle-outline': informationCircleOutline,
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
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit {
  agreed = false;
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';

  readonly methods: PaymentOption[] = [
    {
      id: 'gcash',
      label: 'GCash',
      sub: 'Pay via GCash e-wallet',
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

  constructor(
    public booking: BookingService,
    private router: Router,
  ) {
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

  typeLabel(type: PassengerType): string {
    return PASSENGER_TYPE_META[type].label;
  }

  selectMethod(id: PaymentMethod) {
    this.booking.paymentMethod = id;
  }

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
}
