import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  AlertController,
  IonContent,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  shieldCheckmarkOutline,
  keyOutline,
  fingerPrintOutline,
  notificationsOutline,
  informationCircleOutline,
  linkOutline,
  cardOutline,
  helpCircleOutline,
  chatbubbleEllipsesOutline,
  headsetOutline,
  chevronForwardOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'key-outline': keyOutline,
  'fingerprint-outline': fingerPrintOutline,
  'notifications-outline': notificationsOutline,
  'information-circle-outline': informationCircleOutline,
  'link-outline': linkOutline,
  'card-outline': cardOutline,
  'help-circle-outline': helpCircleOutline,
  'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
  'headset-outline': headsetOutline,
  'chevron-forward-outline': chevronForwardOutline,
});

interface SettingItem {
  icon: string;
  label: string;
  sub?: string;
  go?: () => void;
}

@Component({
  selector: 'app-wallet-settings',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class WalletSettingsPage {
  private router = inject(Router);
  private location = inject(Location);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  biometric = true;
  securityNotif = true;

  constructor() {
    addIcons({
      arrowBackOutline,
      shieldCheckmarkOutline,
      keyOutline,
      fingerPrintOutline,
      notificationsOutline,
      informationCircleOutline,
      linkOutline,
      cardOutline,
      helpCircleOutline,
      chatbubbleEllipsesOutline,
      headsetOutline,
      chevronForwardOutline,
    });
  }

  security: SettingItem[] = [
    {
      icon: 'key-outline',
      label: 'Change Wallet PIN',
      sub: 'Last changed 2 months ago',
      go: () => void this.changePin(),
    },
  ];

  account: SettingItem[] = [
    {
      icon: 'information-circle-outline',
      label: 'Wallet Info',
      sub: 'Fare ID · Limit · Terms',
      go: () => this.goTo('/wallet'),
    },
    {
      icon: 'link-outline',
      label: 'Linked Accounts',
      sub: 'GCash, Maya & bank cards',
      go: () => this.goTo('/payment-methods'),
    },
    {
      icon: 'card-outline',
      label: 'Payment Methods',
      go: () => this.goTo('/payment-methods'),
    },
  ];

  support: SettingItem[] = [
    {
      icon: 'help-circle-outline',
      label: 'Help Center',
      go: () => void this.helpCenter(),
    },
    {
      icon: 'chatbubble-ellipses-outline',
      label: 'Report a Transaction',
      sub: 'Dispute a wallet activity',
      go: () => void this.report(),
    },
    {
      icon: 'headset-outline',
      label: 'Contact Support',
      sub: 'Mon–Sat · 6:00 AM – 10:00 PM',
      go: () => void this.contact(),
    },
  ];

  goBack() {
    this.location.back();
  }

  goTo(url: string) {
    void this.router.navigateByUrl(url);
  }

  async changePin() {
    const alert = await this.alertController.create({
      header: 'Change Wallet PIN',
      message: 'For demo purposes, PIN changes are disabled in this build.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  async helpCenter() {
    await this.presentInfo(
      'Help Center',
      'Browse answers about riding, bookings, cancellations and your ByaHero Wallet.',
    );
  }

  async report() {
    await this.presentInfo(
      'Report a Transaction',
      'Pick any transaction under Transactions and tap Report a Problem — our team responds within 24 hours.',
    );
  }

  async contact() {
    await this.presentInfo(
      'Contact Support',
      'Email support@byahero.ph or call 8-700 BYAHERO. Mon–Sat, 6:00 AM – 10:00 PM.',
    );
  }

  private async presentInfo(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  onToggle(kind: 'bio' | 'notif', value: boolean) {
    if (kind === 'bio') this.biometric = value;
    else this.securityNotif = value;
    void this.toastController
      .create({
        message:
          kind === 'bio'
            ? 'Biometric auth ' + (value ? 'enabled' : 'disabled')
            : 'Security notifications ' + (value ? 'on' : 'off'),
        duration: 1600,
        position: 'bottom',
        color: 'dark',
      })
      .then((t) => t.present());
  }
}