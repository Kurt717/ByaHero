import { Component, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  searchOutline,
  personOutline,
  closeCircleOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { ProfileService, TrustedContact } from '../../profile/profile.service';
import { WalletTxService } from '../wallet-tx.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'search-outline': searchOutline,
  'person-outline': personOutline,
  'close-circle-outline': closeCircleOutline,
  'chevron-forward-outline': chevronForwardOutline,
});

interface RecipientChoice {
  name: string;
  sub: string;
}

/** Default suggestion list (page-local, not a stored contact book). */
const SUGGESTED: RecipientChoice[] = [
  { name: 'Miguel Ramos', sub: 'Driver · Florida Bus Line' },
  { name: 'Ana Cruz', sub: '+63 917 555 0101' },
  { name: 'Marco Santos', sub: '+63 917 555 0102' },
];

@Component({
  selector: 'app-send-money',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './send.page.html',
  styleUrls: ['./send.page.scss'],
})
export class SendMoneyPage implements OnDestroy {
  private router = inject(Router);
  private location = inject(Location);
  private profileService = inject(ProfileService);
  private walletTx = inject(WalletTxService);
  private cdr = inject(ChangeDetectorRef);

  query = '';
  recipient: RecipientChoice | null = null;
  amount = 0;
  note = '';

  private walletSub: Subscription = this.profileService.wallet$.subscribe(() => {
    this.cdr.markForCheck();
  });

  get contacts(): RecipientChoice[] {
    const trusted = this.trustedContacts().map((c) => ({ name: c.name, sub: c.phone }));
    const combined = [...trusted, ...SUGGESTED];
    const seen = new Set<string>();
    return combined.filter((c) => {
      const key = `${c.name.trim().toLowerCase()}|${c.sub.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  constructor() {
    addIcons({
      arrowBackOutline,
      searchOutline,
      personOutline,
      closeCircleOutline,
      chevronForwardOutline,
    });
  }

  private trustedContacts(): TrustedContact[] {
    return this.profileService.readTrustedContacts();
  }

  get balanceLabel(): string {
    return this.profileService.readWallet().balance;
  }

  get searched(): RecipientChoice[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.contacts;
    return this.contacts.filter((c) =>
      (c.name + ' ' + c.sub).toLowerCase().includes(q),
    );
  }

  get amountValid(): boolean {
    return this.amount > 0;
  }

  get canReview(): boolean {
    return !!this.recipient && this.amountValid;
  }

  select(c: RecipientChoice) {
    this.recipient = c;
  }

  imageFor(c: RecipientChoice): string {
    const initials = c.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return initials;
  }

  onAmountChange(v: string | number) {
    this.amount = Number(v) || 0;
  }

  goBack() {
    this.location.back();
  }

  reviewTransfer() {
    if (!this.canReview || !this.recipient) return;
    this.walletTx.draft = {
      recipient: this.recipient.name,
      recipientSub: this.recipient.sub,
      amount: this.amount,
      note: this.note.trim() || undefined,
    };
    void this.router.navigateByUrl('/wallet/send/review');
  }

  ionViewWillEnter() {
    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    this.walletSub.unsubscribe();
  }
}