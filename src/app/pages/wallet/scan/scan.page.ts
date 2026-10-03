import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  scanOutline,
  imageOutline,
  keypadOutline,
  flashOutline,
  checkmarkCircle,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'scan-outline': scanOutline,
  'image-outline': imageOutline,
  'keypad-outline': keypadOutline,
  'flash-outline': flashOutline,
  'checkmark-circle': checkmarkCircle,
});

@Component({
  selector: 'app-scan-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
})
export class ScanPayPage {
  private location = inject(Location);
  private toastController = inject(ToastController);

  scanning = false;
  codeMode = false;
  code = '';

  constructor() {
    addIcons({
      arrowBackOutline,
      scanOutline,
      imageOutline,
      keypadOutline,
      flashOutline,
      checkmarkCircle,
    });
  }

  goBack() {
    this.location.back();
  }

  toggleCode() {
    this.codeMode = !this.codeMode;
  }

  /** Tap on the scanner window simulates detecting a QR code. */
  simulateScan() {
    if (this.scanning) return;
    this.scanning = true;
    setTimeout(() => {
      this.scanning = false;
      void this.showToast('QR code detected. Opening payment…');
    }, 1100);
  }

  uploadQr() {
    void this.showToast('QR image uploaded. Verifying…');
  }

  verifyCode() {
    if (!this.code.trim()) {
      void this.showToast('Enter the payment code shown on the operator kiosk.');
      return;
    }
    this.codeMode = false;
    this.code = '';
    void this.showToast('Payment code verified (demo).');
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