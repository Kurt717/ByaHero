import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  documentTextOutline,
  shieldCheckmarkOutline,
  chevronDownOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'document-text-outline': documentTextOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'chevron-down-outline': chevronDownOutline,
});

interface Section {
  title: string;
  body: string;
  open: boolean;
}

@Component({
  selector: 'app-terms-privacy',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './terms-privacy.page.html',
  styleUrls: ['./terms-privacy.page.scss'],
})
export class TermsPrivacyPage {
  private location = inject(Location);
  private toastController = inject(ToastController);

  sections: Section[] = [
    {
      title: '1 · Booking & Cancellation',
      body: 'Tickets confirm a seat on a scheduled departure of the partner operator. ByaHero is a booking platform and does not run buses. Cancellation and refund rules are set by each operator and shown before you pay.',
      open: true,
    },
    {
      title: '2 · Fares & Discounts',
      body: 'Fare rules for students, seniors, and PWDs follow LTFRB guidelines. Your verified Discount Fare ID must be presented along with a valid ID at boarding.',
      open: false,
    },
    {
      title: '3 · Privacy Promise',
      body: 'We collect only what is needed to book your ride. Your live trip link goes only to your Trusted Contacts, and never to third parties. You can delete your data anytime by writing to sakay@byahero.ph.',
      open: false,
    },
    {
      title: '4 · Safe & Secure',
      body: 'Payments run through PCI-DSS compliant partners. We never store your full card number, and one-tap refunds go straight back to your ByaHero Wallet.',
      open: false,
    },
  ];

  agreed = false;

  goBack() {
    this.location.back();
  }

  toggle(section: Section) {
    section.open = !section.open;
  }

  accept() {
    this.agreed = true;
    this.showToast('Thank you for riding with ByaHero');
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