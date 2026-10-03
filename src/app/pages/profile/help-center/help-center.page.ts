import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  helpBuoyOutline,
  chevronDownOutline,
  callOutline,
  mailOutline,
  chatbubbleEllipsesOutline,
  flagOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'help-buoy-outline': helpBuoyOutline,
  'chevron-down-outline': chevronDownOutline,
  'call-outline': callOutline,
  'mail-outline': mailOutline,
  'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
  'flag-outline': flagOutline,
});

interface Faq {
  q: string;
  a: string;
  open: boolean;
}

@Component({
  selector: 'app-help-center',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './help-center.page.html',
  styleUrls: ['./help-center.page.scss'],
})
export class HelpCenterPage {
  private location = inject(Location);
  private router = inject(Router);
  private toastController = inject(ToastController);

  faqs: Faq[] = [
    {
      q: 'How do I cancel a booking?',
      a: 'Open the booking on your Ride History, tap Cancel, and pick a reason. Refunds go back to your ByaHero Wallet within 3 business days.',
      open: true,
    },
    {
      q: 'Where is my e-ticket?',
      a: 'After payment, your ticket unlocks in the confirmation screen and stays in your Ride History under View Ticket. You can also download it as an image.',
      open: false,
    },
    {
      q: 'Can I add a Discount Fare ID?',
      a: 'Yes — go to Profile and open Discount Fare ID. Submit your ID anew and it will be verified within 24 hours.',
      open: false,
    },
    {
      q: 'I missed my bus. Now what?',
      a: 'Non-refundable fares can be rebooked to the next available departure by contacting the operator hub directly from the trip details.',
      open: false,
    },
  ];

  goBack() {
    this.location.back();
  }

  reportIssue() {
    this.router.navigateByUrl('/report-problem?from=help');
  }

  toggle(faq: Faq) {
    faq.open = !faq.open;
  }

  async contactUs() {
    const toast = await this.toastController.create({
      message: 'Connecting you to support soon',
      duration: 1700,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}