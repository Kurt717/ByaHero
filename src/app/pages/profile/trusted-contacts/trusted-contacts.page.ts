import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  AlertController,
  IonContent,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  peopleOutline,
  addOutline,
  callOutline,
  trashOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { ProfileService, TrustedContact } from '../profile.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'people-outline': peopleOutline,
  'add-outline': addOutline,
  'call-outline': callOutline,
  'trash-outline': trashOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
});

@Component({
  selector: 'app-trusted-contacts',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './trusted-contacts.page.html',
  styleUrls: ['./trusted-contacts.page.scss'],
})
export class TrustedContactsPage {
  private location = inject(Location);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private profileService = inject(ProfileService);

  contacts: TrustedContact[] = [];

  constructor() {
    this.contacts = this.profileService.readTrustedContacts();
  }

  goBack() {
    this.location.back();
  }

  async add() {
    const alert = await this.alertController.create({
      header: 'Add Trusted Contact',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Full name' },
        { name: 'phone', type: 'tel', placeholder: '+63 917 000 0000' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (values) => {
            const name = String(values?.name ?? '').trim();
            const phone = String(values?.phone ?? '').trim();
            if (!name || !phone) {
              this.showToast('Enter both a name and a phone number.');
              return false;
            }
            this.contacts = [...this.contacts, { name, phone }];
            this.profileService.saveTrustedContacts(this.contacts);
            this.showToast(`${name} added as a trusted contact.`);
            return true;
          },
        },
      ],
    });
    await alert.present();
    this.injectCloseX(alert);
  }

  async remove(contact: TrustedContact) {
    const alert = await this.alertController.create({
      header: 'Remove contact?',
      message: `${contact.name} will stop receiving your live trip link.`,
      buttons: [
        { text: 'Keep', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.contacts = this.contacts.filter((c) => c !== contact);
            this.profileService.saveTrustedContacts(this.contacts);
            this.showToast(`${contact.name} removed.`);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private injectCloseX(alert: HTMLIonAlertElement) {
    const head = alert.querySelector('.alert-head') as HTMLElement | null;
    if (!head || head.querySelector('.alert-close-x')) return;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'alert-close-x';
    close.setAttribute('aria-label', 'Close dialog');
    close.textContent = '✕';
    close.addEventListener('click', () => void alert.dismiss());
    head.appendChild(close);
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