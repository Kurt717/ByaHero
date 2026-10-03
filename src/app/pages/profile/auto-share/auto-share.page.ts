import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  shareSocialOutline,
  peopleOutline,
  locationOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'share-social-outline': shareSocialOutline,
  'people-outline': peopleOutline,
  'location-outline': locationOutline,
});

@Component({
  selector: 'app-auto-share',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './auto-share.page.html',
  styleUrls: ['./auto-share.page.scss'],
})
export class AutoSharePage {
  private location = inject(Location);
  private toastController = inject(ToastController);

  private readonly prefsKey = 'byahero.profile-preferences.v1';
  private readonly label = 'Auto Share Live Trip';

  on = true;

  constructor() {
    try {
      const prefs = JSON.parse(
        localStorage.getItem(this.prefsKey) ?? '{}',
      ) as Record<string, unknown>;
      if (typeof prefs[this.label] === 'boolean') {
        this.on = prefs[this.label] as boolean;
      }
    } catch {
      return;
    }
  }

  goBack() {
    this.location.back();
  }

  toggle(value: boolean) {
    this.on = value;
    try {
      const prefs = JSON.parse(
        localStorage.getItem(this.prefsKey) ?? '{}',
      ) as Record<string, unknown>;
      prefs[this.label] = value;
      localStorage.setItem(this.prefsKey, JSON.stringify(prefs));
    } catch {
      return;
    }
    this.showToast(`Auto Share ${value ? 'enabled' : 'disabled'}.`);
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