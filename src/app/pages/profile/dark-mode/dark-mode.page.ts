import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  moonOutline,
  sunnyOutline,
  eyeOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'moon-outline': moonOutline,
  'sunny-outline': sunnyOutline,
  'eye-outline': eyeOutline,
});

@Component({
  selector: 'app-dark-mode',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './dark-mode.page.html',
  styleUrls: ['./dark-mode.page.scss'],
})
export class DarkModePage {
  private location = inject(Location);
  private toastController = inject(ToastController);

  private readonly prefsKey = 'byahero.profile-preferences.v1';
  private readonly label = 'Dark Mode';

  on = false;

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
    this.applyScheme();
  }

  goBack() {
    this.location.back();
  }

  toggle(value: boolean) {
    this.on = value;
    this.applyScheme();
    try {
      const prefs = JSON.parse(
        localStorage.getItem(this.prefsKey) ?? '{}',
      ) as Record<string, unknown>;
      prefs[this.label] = value;
      localStorage.setItem(this.prefsKey, JSON.stringify(prefs));
    } catch {
      return;
    }
    this.showToast(`Dark mode ${value ? 'on' : 'off'}.`);
  }

  private applyScheme() {
    document.documentElement.style.colorScheme = this.on ? 'dark' : 'light';
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