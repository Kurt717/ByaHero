import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AlertController, IonContent, IonIcon, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cardOutline,
  walletOutline,
  checkmarkCircle,
} from 'ionicons/icons';
import { ProfileService, StoredPaymentMethod } from '../../profile/profile.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'card-outline': cardOutline,
  'wallet-outline': walletOutline,
  'checkmark-circle': checkmarkCircle,
});

interface SourceOption {
  method: StoredPaymentMethod;
  icon: string;
  label: string;
  sub: string;
  value: string;
}

@Component({
  selector: 'app-add-money',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './add-money.page.html',
  styleUrls: ['./add-money.page.scss'],
})
export class AddMoneyPage implements OnInit {
  private router = inject(Router);
  private location = inject(Location);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private profileService = inject(ProfileService);

  readonly quickAmounts = [100, 200, 500, 1000];
  amount = 500;
  selected: string | null = null;

  readonly sources: SourceOption[] = [
    { method: { type: 'card', label: 'Visa •••• 4821', last4: '4821' }, icon: 'card-outline', label: 'Visa •••• 4821', sub: 'Credit / Debit', value: 'Visa •••• 4821' },
    { method: { type: 'gcash', account: '09174567890' }, icon: 'wallet-outline', label: 'GCash', sub: '09••••••••90 · Connected', value: 'GCash 09••••••••90' },
    { method: { type: 'maya', account: '09281234567' }, icon: 'wallet-outline', label: 'Maya', sub: '09••••••••67 · Connected', value: 'Maya 09••••••••67' },
  ];

  constructor() {
    addIcons({
      arrowBackOutline,
      cardOutline,
      walletOutline,
    });
  }

  ngOnInit() {
    const methods = this.profileService.readPaymentMethods();
    const defaultMethod = methods.find((m) => m.default);
    if (defaultMethod) {
      const last4 = (defaultMethod as { last4?: string }).last4;
      const account = (defaultMethod as { account?: string }).account;
      const src =
        (last4 && this.sources.find((s) => s.value.includes(last4))) ||
        (account && this.sources.find((s) => s.value.toLowerCase().includes((defaultMethod as { type?: string }).type ?? ''))) ||
        this.sources[0];
      this.selected = src.value;
    } else {
      this.selected = this.sources[0].value;
    }
  }

  get amountLabel(): string {
    return `₱ ${this.amount.toLocaleString('en-PH')}.00`;
  }

  setAmount(n: number) {
    this.amount = n;
  }

  onAmountChange(v: string | number) {
    this.amount = Number(v) || 0;
  }

  get selectedSource(): SourceOption | undefined {
    return this.sources.find((s) => s.value === this.selected);
  }

  get canContinue(): boolean {
    return this.amount > 0 && !!this.selectedSource;
  }

  goBack() {
    this.location.back();
  }

  continueToReview() {
    if (!this.canContinue) {
      void this.showToast('Enter an amount and pick a payment method.');
      return;
    }
    void this.confirmAlert();
  }

  /** Payment Method → Amount → Confirmation. */
  private async confirmAlert() {
    const src = this.selectedSource!;
    const alert = await this.alertController.create({
      header: 'Confirm Top Up',
      subHeader: `Add ${this.amountLabel} to your ByaHero Wallet`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm',
          handler: () => this.topUp(src),
        },
      ],
    });
    await alert.present();
    const head = alert.querySelector('.alert-head') as HTMLElement | null;
    if (head && !head.querySelector('.alert-close-x')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'alert-close-x';
      closeBtn.setAttribute('aria-label', 'Close dialog');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => void alert.dismiss());
      head.appendChild(closeBtn);
    }
  }

  private topUp(src: SourceOption) {
    const next = this.profileService.addWallet(this.amount, src.value);
    void this.toastController
      .create({
        message: `${this.amountLabel} added via ${src.label}. New balance ₱ ${next.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        duration: 2600,
        position: 'bottom',
        color: 'success',
        buttons: [
          {
            text: 'View',
            handler: () => void this.router.navigateByUrl('/wallet'),
          },
        ],
      })
      .then((toast) => toast.present());
    void this.location.back();
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