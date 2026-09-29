import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  AlertController,
  AlertOptions,
  IonContent,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  eyeOutline,
  eyeOffOutline,
  ellipsisHorizontalOutline,
  addOutline,
  paperPlaneOutline,
  scanOutline,
  timeOutline,
  chevronForwardOutline,
  busOutline,
  addCircleOutline,
  refreshOutline,
  cardOutline,
  settingsOutline,
  helpCircleOutline,
  lockClosedOutline,
  fingerPrintOutline,
  shieldCheckmarkOutline,
  chevronBackOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { ProfileService, WalletTx } from '../profile.service';
import { WalletTxService } from '../../wallet/wallet-tx.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'ellipsis-horizontal-outline': ellipsisHorizontalOutline,
  'add-outline': addOutline,
  'paper-plane-outline': paperPlaneOutline,
  'scan-outline': scanOutline,
  'time-outline': timeOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'bus-outline': busOutline,
  'add-circle-outline': addCircleOutline,
  'refresh-outline': refreshOutline,
  'card-outline': cardOutline,
  'settings-outline': settingsOutline,
  'help-circle-outline': helpCircleOutline,
  'lock-closed-outline': lockClosedOutline,
  'finger-print-outline': fingerPrintOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'chevron-back-outline': chevronBackOutline,
  'checkmark-outline': checkmarkOutline,
});

interface QuickAction {
  icon: string;
  label: string;
  go: () => void;
}

interface WalletLink {
  icon: string;
  label: string;
  go: () => void;
}

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
})
export class WalletPage implements OnDestroy {
  private router = inject(Router);
  private location = inject(Location);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private profileService = inject(ProfileService);
  private walletTx = inject(WalletTxService);
  private profileSub = this.profileService.user$.subscribe((profile) => {
    this.holder = profile.name.toUpperCase();
  });

  wallet = { balance: '850.00', last4: '4821' };
  holder = 'NONIE';
  balanceShown = true;
  recent: WalletTx[] = [];

  locked = true;
  verifying = false;
  unlockOk = false;
  bioScanning = false;
  pinSlots: (string | null)[] = [null, null, null, null];
  keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  quickActions: QuickAction[] = [
    { icon: 'add-outline', label: 'Add Money', go: () => this.goTo('/wallet/add-money') },
    { icon: 'paper-plane-outline', label: 'Send Money', go: () => this.goTo('/wallet/send') },
    { icon: 'scan-outline', label: 'Scan / Pay', go: () => this.goTo('/wallet/scan') },
    { icon: 'time-outline', label: 'Transactions', go: () => this.goTo('/wallet/transactions') },
  ];

  walletLinks: WalletLink[] = [
    { icon: 'card-outline', label: 'Payment Methods', go: () => this.goTo('/payment-methods') },
    { icon: 'settings-outline', label: 'Wallet Settings', go: () => this.goTo('/wallet/settings') },
    { icon: 'help-circle-outline', label: 'Help & Support', go: () => this.help() },
  ];

  constructor() {
    addIcons({
      arrowBackOutline,
      eyeOutline,
      eyeOffOutline,
      ellipsisHorizontalOutline,
    });
    this.refresh();
  }

  ionViewWillEnter() {
    this.refresh();
  }

  ngOnDestroy() {
    this.profileSub.unsubscribe();
  }

  get balanceLabel(): string {
    return `₱${this.wallet.balance}`;
  }

  get displayBalance(): string {
    return this.balanceShown ? this.balanceLabel : '₱ ••••••';
  }

  get cardNumberLabel(): string {
    return `••••  ••••  ••••  ${this.wallet.last4}`;
  }

  iconFor(t: WalletTx): string {
    switch (t.kind) {
      case 'topup':
        return 'add-circle-outline';
      case 'ride':
        return 'bus-outline';
      case 'sent':
        return 'paper-plane-outline';
      default:
        return 'refresh-outline';
    }
  }

  goBack() {
    this.location.back();
  }

  toggleBalance() {
    this.balanceShown = !this.balanceShown;
  }

  openMenu() {
    this.goTo('/wallet/settings');
  }

  goTo(url: string) {
    this.router.navigateByUrl(url);
  }

  tapKey(d: string) {
    if (this.verifying || this.bioScanning || this.unlockOk) return;
    const slot = this.pinSlots.findIndex((s) => s === null);
    if (slot === -1) return;
    this.pinSlots[slot] = d;
    if (this.verifying) return;
    if (this.pinSlots.every((s) => s !== null)) this.verifyPin();
  }

  tapBackspace() {
    if (this.verifying || this.bioScanning || this.unlockOk) return;
    const filled = this.pinSlots.map((s, i) => (s !== null ? i : -1)).filter((i) => i !== -1);
    if (!filled.length) return;
    this.pinSlots[filled[filled.length - 1]] = null;
  }

  tapFingerprint() {
    if (this.verifying || this.bioScanning || this.unlockOk) return;
    this.bioScanning = true;
    setTimeout(() => this.finishUnlock(), 1150);
  }

  cancelBio() {
    if (this.bioScanning) this.bioScanning = false;
  }

  verifyPin() {
    if (this.verifying) return;
    this.verifying = true;
    setTimeout(() => this.finishUnlock(), 650);
  }

  finishUnlock() {
    if (!this.locked || this.unlockOk) return;
    this.unlockOk = true;
    this.verifying = false;
    this.bioScanning = false;
    setTimeout(() => {
      if (this.unlockOk) {
        this.locked = false;
        this.pinSlots = [null, null, null, null];
        void this.showToast('Wallet unlocked');
      }
    }, 520);
  }

  async forgotPin() {
    await this.presentAlert({
      header: 'Forgot your PIN?',
      message:
        'This is a demo wallet, so any 4-digit PIN opens it. The full app would let you verify your identity to set a new PIN.',
      buttons: ['OK'],
    });
  }

  async help() {
    await this.presentAlert({
      header: 'Help & Support',
      message:
        'For ride concerns, open your ticket and use Cancel Booking. For wallet issues, try Wallet Settings or contact support through the app.',
      buttons: ['OK'],
    });
  }

  formatAmount(amount: number): string {
    return `₱${Math.abs(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private refresh() {
    const wallet = this.profileService.readWallet();
    this.wallet = {
      balance: wallet.balance ?? this.wallet.balance,
      last4: wallet.last4 ?? this.wallet.last4,
    };
    this.holder = this.profileService.read().name.toUpperCase();
    this.recent = this.walletTx.all().slice(0, 4);
  }

  /** Present an alert with a top-right ✕ close (matched by global overlay styles). */
  private async presentAlert(options: AlertOptions) {
    const alert = await this.alertController.create(options);
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
    return alert;
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1700,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}