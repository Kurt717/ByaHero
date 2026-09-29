import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  AlertController,
  IonContent,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircle,
  busOutline,
  addCircleOutline,
  paperPlaneOutline,
  refreshOutline,
  documentTextOutline,
  chatbubbleEllipsesOutline,
  shareOutline,
} from 'ionicons/icons';
import { WalletTxService } from '../wallet-tx.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'checkmark-circle': checkmarkCircle,
  'bus-outline': busOutline,
  'add-circle-outline': addCircleOutline,
  'paper-plane-outline': paperPlaneOutline,
  'refresh-outline': refreshOutline,
  'document-text-outline': documentTextOutline,
  'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
  'share-outline': shareOutline,
});

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './transaction-detail.page.html',
  styleUrls: ['./transaction-detail.page.scss'],
})
export class TransactionDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private walletTx = inject(WalletTxService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  ref = '';
  notFound = false;

  constructor() {
    addIcons({
      arrowBackOutline,
      checkmarkCircle,
      busOutline,
      addCircleOutline,
      paperPlaneOutline,
      refreshOutline,
      documentTextOutline,
      chatbubbleEllipsesOutline,
      shareOutline,
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.ref = params.get('ref') ?? '';
      this.notFound = !this.tx;
      if (this.notFound) {
        void this.showToast('Transaction not found.');
      }
    });
  }

  get tx() {
    return this.ref ? this.walletTx.find(this.ref) : undefined;
  }

  get statusLabel(): string {
    return this.tx?.status === 'success' ? 'Payment Successful' : 'Payment Failed';
  }

  get kindLabel(): string {
    switch (this.tx?.kind) {
      case 'topup':
        return 'Money Added';
      case 'ride':
        return 'Payment';
      case 'sent':
        return 'Send Money';
      case 'refund':
        return 'Refund';
      default:
        return 'Transaction';
    }
  }

  iconFor(): string {
    switch (this.tx?.kind) {
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

  formatAmount(amount: number): string {
    return `₱${Math.abs(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  async downloadReceipt() {
    await this.showToast('Receipt downloaded.');
  }

  shareReceipt() {
    void this.shareAlert();
  }

  async reportProblem() {
    await this.alertController.dismiss();
    const alert = await this.alertController.create({
      header: 'Report a Problem',
      message: `We received your report for transaction ${this.ref}. Our support team will reach out within 24 hours.`,
      buttons: ['OK'],
    });
    await alert.present();
    const head = alert.querySelector('.alert-head') as HTMLElement | null;
    if (head && !head.querySelector('.alert-close-x')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'alert-close-x';
      closeBtn.setAttribute('aria-label', 'Close dialog');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => void alert.dismiss());
      head.appendChild(closeBtn);
    }
  }

  goHome() {
    void this.router.navigateByUrl('/wallet');
  }

  private async shareAlert() {
    const alert = await this.alertController.create({
      header: 'Share Receipt',
      message: 'Coming soon — you will be able to share this receipt with a link.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}