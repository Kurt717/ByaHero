import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  giftOutline,
  shareSocialOutline,
  copyOutline,
  peopleOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'gift-outline': giftOutline,
  'share-social-outline': shareSocialOutline,
  'copy-outline': copyOutline,
  'people-outline': peopleOutline,
});

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './invite.page.html',
  styleUrls: ['./invite.page.scss'],
})
export class InvitePage {
  private location = inject(Location);
  private toastController = inject(ToastController);

  code = 'BYA-2024-HERO';

  goBack() {
    this.location.back();
  }

  async invite() {
    const text = `Ride with me on ByaHero! Use my code ${this.code} to get a discount on your first trip.`;
    const nav = navigator as Navigator & {
      share?: (data: { title: string; text: string }) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({ title: 'ByaHero Invite', text });
        return;
      } catch {
        return;
      }
    }
    this.copyCode();
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code);
    } catch {
      return;
    }
    this.showToast('Invite code copied');
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