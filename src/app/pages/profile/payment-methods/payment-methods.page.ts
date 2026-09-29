import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  AlertController,
  AlertOptions,
  IonContent,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cardOutline,
  phonePortraitOutline,
  chevronForwardOutline,
  addOutline,
  lockClosedOutline,
  star,
} from 'ionicons/icons';
import { ProfileService, StoredPaymentMethod } from '../profile.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'card-outline': cardOutline,
  'phone-portrait-outline': phonePortraitOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'add-outline': addOutline,
  'lock-closed-outline': lockClosedOutline,
  star: star,
});

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './payment-methods.page.html',
  styleUrls: ['./payment-methods.page.scss'],
})
export class PaymentMethodsPage {
  private location = inject(Location);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private profileService = inject(ProfileService);

  methods: StoredPaymentMethod[] = [];

  constructor() {
    addIcons({
      arrowBackOutline,
      cardOutline,
      phonePortraitOutline,
      chevronForwardOutline,
      addOutline,
      lockClosedOutline,
    });
    this.refresh();
  }

  ionViewWillEnter() {
    this.refresh();
  }

  // ----------------------------------------------------------- grouped data

  get cards() {
    return this.methods.filter((m) => m.type === 'card');
  }

  get ewallets() {
    return this.methods.filter((m) => m.type === 'gcash' || m.type === 'maya');
  }

  get methodGroups(): { title: string; methods: StoredPaymentMethod[] }[] {
    const groups: { title: string; methods: StoredPaymentMethod[] }[] = [];
    if (this.cards.length) groups.push({ title: 'Credit / Debit Cards', methods: this.cards });
    if (this.ewallets.length) groups.push({ title: 'E-Wallets', methods: this.ewallets });
    return groups;
  }

  iconFor(m: StoredPaymentMethod): string {
    switch (m.type) {
      case 'card':
        return 'card-outline';
      default:
        return 'phone-portrait-outline';
    }
  }

  nameFor(m: StoredPaymentMethod): string {
    switch (m.type) {
      case 'card':
        return m.label;
      case 'gcash':
        return 'GCash';
      case 'maya':
        return 'Maya';
      default:
        return 'Payment Method';
    }
  }

  subFor(m: StoredPaymentMethod): string {
    if (m.type === 'card') return `•••• •••• •••• ${m.last4}`;
    if (m.type === 'gcash' || m.type === 'maya') return this.maskAccount(m.account);
    return '';
  }

  private maskAccount(account?: string): string {
    const digits = String(account ?? '').replace(/\D/g, '');
    if (digits.length < 4) return 'Link a mobile number';
    return `${digits.slice(0, 2)}••••••••${digits.slice(-2)}`;
  }

  isDefault(m: StoredPaymentMethod): boolean {
    return !!m.default;
  }

  // ---------------------------------------------------------------- actions

  goBack() {
    this.location.back();
  }

  /** Progressive disclosure: pick a provider first, then reveal its form. */
  async addMethod() {
    await this.presentAlert({
      header: 'Add Payment Method',
      message: 'Choose where you want to pay your fares from.',
      inputs: [
        { type: 'radio', label: 'Debit / Credit Card', value: 'card', checked: true },
        { type: 'radio', label: 'GCash', value: 'gcash' },
        { type: 'radio', label: 'Maya', value: 'maya' },
      ],
      buttons: [
        {
          text: 'Continue',
          handler: (choice: string) => {
            if (choice === 'card') void this.addCardForm();
            else void this.addEwalletForm(choice as 'gcash' | 'maya');
            return false;
          },
        },
      ],
    });
  }

  private async addCardForm() {
    await this.presentAlert({
      header: 'Add Card',
      message: 'Only the last 4 digits are stored — we never keep full card numbers.',
      inputs: [
        { name: 'label', type: 'text', placeholder: 'Bank name (e.g. Visa, BPI)' },
        { name: 'last4', type: 'text', placeholder: 'Last 4 digits' },
      ],
      buttons: [
        {
          text: 'Save',
          handler: (values) => {
            const last4 = String(values?.last4 ?? '').replace(/\D/g, '');
            if (last4.length !== 4) {
              this.showToast('Enter the last 4 digits of the card.');
              return false;
            }
            const label =
              String(values?.label ?? '').trim() || `Card •••• ${last4}`;
            const methods = this.profileService.readPaymentMethods();
            methods.push({ type: 'card', label, last4 });
            this.profileService.savePaymentMethods(methods);
            this.refresh();
            this.showToast('Card saved for checkout.');
            return true;
          },
        },
      ],
    });
  }

  private async addEwalletForm(type: 'gcash' | 'maya') {
    const name = type === 'gcash' ? 'GCash' : 'Maya';
    await this.presentAlert({
      header: `Link ${name}`,
      message: `We'll verify your ${name} account with the mobile number linked to it.`,
      inputs: [{ name: 'mobile', type: 'tel', placeholder: '+63 917 000 0000' }],
      buttons: [
        {
          text: 'Save',
          handler: (values) => {
            const mobile = String(values?.mobile ?? '').replace(/\s/g, '');
            if (!this.mobileValid(mobile)) {
              this.showToast('Enter a valid PH mobile number (09xx or +63).');
              return false;
            }
            const methods = this.profileService.readPaymentMethods();
            methods.push({ type, account: mobile });
            this.profileService.savePaymentMethods(methods);
            this.refresh();
            this.showToast(`${name} linked for checkout.`);
            return true;
          },
        },
      ],
    });
  }

  async manage(m: StoredPaymentMethod) {
    const buttons: AlertOptions['buttons'] = [];
    if (!m.default) {
      buttons.push({
        text: 'Set as Default',
        handler: () => {
          this.setDefault(m);
          return true;
        },
      });
    }
    buttons.push({
      text: 'Remove',
      role: 'destructive',
      handler: () => {
        this.removeMethod(m);
        return true;
      },
    });
    await this.presentAlert({
      header: this.nameFor(m),
      subHeader: this.subFor(m),
      message: m.default
        ? 'This is your default payment method for fares.'
        : undefined,
      buttons,
    });
  }

  private setDefault(m: StoredPaymentMethod) {
    const methods = this.profileService.readPaymentMethods().map((mm) => ({
      ...mm,
      default: mm === m,
    }));
    this.profileService.savePaymentMethods(methods);
    this.refresh();
    this.showToast(`${this.nameFor(m)} set as default.`);
  }

  private removeMethod(m: StoredPaymentMethod) {
    const methods = this.profileService.readPaymentMethods().filter((mm) => mm !== m);
    if (m.default && methods.length) {
      methods[0] = { ...methods[0], default: true };
    }
    this.profileService.savePaymentMethods(methods);
    this.refresh();
    this.showToast(`${this.nameFor(m)} removed.`);
  }

  private mobileValid(mobile: string): boolean {
    return /^(09\d{9}|\+639\d{9})$/.test(mobile);
  }

  // ------------------------------------------------------------- refresh data

  private refresh() {
    this.methods = this.profileService
      .readPaymentMethods()
      .filter((m) => m.type !== 'cash');
  }

  /** Present an alert with a top-right ✕ close (matched by global overlay styles). */
  private async presentAlert(options: AlertOptions) {
    const alert = await this.alertController.create(options);
    await alert.present();
    const head = alert.querySelector('.alert-head') as HTMLElement | null;
    if (head && !head.querySelector('.alert-close-x')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'alert-close-x';
      closeBtn.setAttribute('aria-label', 'Close dialog');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => void alert.dismiss());
      head.appendChild(closeBtn);
    }
    return alert;
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