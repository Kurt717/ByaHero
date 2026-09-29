import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, languageOutline } from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'language-outline': languageOutline,
});

interface Lang {
  code: string;
  native: string;
  flag: string;
}

@Component({
  selector: 'app-language',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './language.page.html',
  styleUrls: ['./language.page.scss'],
})
export class LanguagePage {
  private location = inject(Location);
  private toastController = inject(ToastController);

  private readonly prefsKey = 'byahero.profile-preferences.v1';
  private readonly label = 'Language';

  languages: Lang[] = [
    { code: 'English', native: 'English', flag: 'EN' },
    { code: 'Filipino', native: 'Filipino', flag: 'PH' },
    { code: 'Ilocano', native: 'Ilocano', flag: 'IL' },
  ];

  selected = 'English';

  constructor() {
    try {
      const prefs = JSON.parse(
        localStorage.getItem(this.prefsKey) ?? '{}',
      ) as Record<string, unknown>;
      if (typeof prefs[this.label] === 'string') {
        this.selected = prefs[this.label] as string;
      }
    } catch {
      return;
    }
  }

  goBack() {
    this.location.back();
  }

  flagOf(code: string) {
    return this.languages.find((l) => l.code === code)?.flag ?? 'EN';
  }

  choose(lang: Lang) {
    this.selected = lang.code;
    try {
      const prefs = JSON.parse(
        localStorage.getItem(this.prefsKey) ?? '{}',
      ) as Record<string, unknown>;
      prefs[this.label] = lang.code;
      localStorage.setItem(this.prefsKey, JSON.stringify(prefs));
    } catch {
      return;
    }
    this.showToast(`Language set to ${lang.native}.`);
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