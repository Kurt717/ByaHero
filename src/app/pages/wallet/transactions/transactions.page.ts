import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  busOutline,
  addCircleOutline,
  paperPlaneOutline,
  refreshOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { WalletTxService } from '../wallet-tx.service';
import { WalletTx } from '../../profile/profile.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'bus-outline': busOutline,
  'add-circle-outline': addCircleOutline,
  'paper-plane-outline': paperPlaneOutline,
  'refresh-outline': refreshOutline,
  'chevron-forward-outline': chevronForwardOutline,
});

type Filter = 'all' | 'payments' | 'topups' | 'refunds';

interface TxGroup {
  label: string;
  txns: WalletTx[];
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
})
export class TransactionsPage {
  private router = inject(Router);
  private location = inject(Location);
  private walletTx = inject(WalletTxService);

  filter: Filter = 'all';

  readonly filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'payments', label: 'Payments' },
    { id: 'topups', label: 'Money Added' },
    { id: 'refunds', label: 'Refunds' },
  ];

  constructor() {
    addIcons({
      arrowBackOutline,
      busOutline,
      addCircleOutline,
      paperPlaneOutline,
      refreshOutline,
      chevronForwardOutline,
    });
  }

  all(): WalletTx[] {
    return this.walletTx.all();
  }

  get groups(): TxGroup[] {
    const rows = this.all();
    const map = new Map<string, WalletTx[]>();
    for (const t of rows) {
      const bucket = (map.get(t.date) ?? []);
      bucket.push(t);
      map.set(t.date, bucket);
    }
    const sortedDates = [...map.keys()].sort(
      (a, b) => (new Date(b).getTime() || 0) - (new Date(a).getTime() || 0),
    );
    return sortedDates.map((date) => ({ label: this.groupLabel(date), txns: map.get(date)! }));
  }

  filtered(rows: WalletTx[]): WalletTx[] {
    switch (this.filter) {
      case 'payments':
        return rows.filter((t) => t.kind === 'ride' || t.kind === 'sent');
      case 'topups':
        return rows.filter((t) => t.kind === 'topup');
      case 'refunds':
        return rows.filter((t) => t.kind === 'refund');
      default:
        return rows;
    }
  }

  get empty(): boolean {
    return !this.groups.some((g) => this.filtered(g.txns).length);
  }

  iconFor(t: WalletTx): string {
    switch (t.kind) {
      case 'topup':
        return 'add-circle-outline';
      case 'ride':
        return 'bus-outline';
      case 'sent':
        return 'paper-plane-outline';
      default:
        return 'refresh-outline';
    }
  }

  setFilter(f: Filter) {
    this.filter = f;
  }

  open(t: WalletTx) {
    this.router.navigateByUrl(`/wallet/transactions/${t.ref}`);
  }

  goBack() {
    this.location.back();
  }

  formatAmount(amount: number): string {
    return `₱${Math.abs(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private groupLabel(date: string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date.toUpperCase();
    return d
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      .toUpperCase();
  }
}