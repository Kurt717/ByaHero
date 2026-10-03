import { Component, inject, OnInit } from '@angular/core';
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
  walletOutline,
  checkmarkCircle,
  alertCircleOutline,
} from 'ionicons/icons';
import { ProfileService } from '../../profile/profile.service';
import { WalletTxService, SendDraft } from '../wallet-tx.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'wallet-outline': walletOutline,
  'checkmark-circle': checkmarkCircle,
  'alert-circle-outline': alertCircleOutline,
});

@Component({
  selector: 'app-send-review',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './send-review.page.html',
  styleUrls: ['./send-review.page.scss'],
})
export class SendReviewPage implements OnInit {
  private router = inject(Router);
  private location = inject(Location);
  private profileService = inject(ProfileService);
  private walletTx = inject(WalletTxService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  draft: SendDraft | null = null;
  sending = false;

  constructor() {
    addIcons({
      arrowBackOutline,
      walletOutline,
      checkmarkCircle,
      alertCircleOutline,
    });
  }

  ngOnInit() {
    this.draft = this.walletTx.draft;
  }

  get balance(): number {
    return this.profileService.walletBalance();
  }

  get balanceLabel(): string {
    return `₱ ${this.balance.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  get amountLabel(): string {
    return `₱ ${this.draft?.amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  get insufficient(): boolean {
    return !!this.draft && this.balance < this.draft.amount;
  }

  get canConfirm(): boolean {
    return !!this.draft && !this.insufficient && !this.sending;
  }

  goBack() {
    this.location.back();
  }

  cancel() {
    this.walletTx.draft = null;
    void this.router.navigateByUrl('/wallet/send');
  }

  async confirm() {
    if (!this.canConfirm || !this.draft) return;
    this.sending = true;
    // mock gateway round-trip
    await new Promise((r) => setTimeout(r, 900));

    const ok = this.profileService.sendMoney(
      this.draft.amount,
      this.draft.recipient,
      this.draft.note,
    );
    this.walletTx.draft = null;
    this.sending = false;

    if (!ok) {
      await this.insufficientAlert();
      return;
    }

    await this.toastController
      .create({
        message: `${this.amountLabel} sent to ${this.draft.recipient}.`,
        duration: 2400,
        position: 'bottom',
        color: 'success',
      })
      .then((t) => t.present());
    void this.router.navigateByUrl('/wallet');
  }

  private async insufficientAlert() {
    const alert = await this.alertController.create({
      header: 'Insufficient Balance',
      message: 'Top up your wallet before sending.',
      buttons: [{ text: 'OK' }],
    });
    await alert.present();
  }
}