import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { TicketService } from '../../bookings/ticket.service';
import { VoucherService } from '../../../services/voucher.service';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  trophyOutline,
  ribbonOutline,
  medalOutline,
  diamondOutline,
  flashOutline,
  busOutline,
  checkmarkCircleOutline,
  trendingUpOutline,
  walletOutline,
  sparklesOutline,
  pricetagOutline,
  chevronForwardOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'trophy-outline': trophyOutline,
  'ribbon-outline': ribbonOutline,
  'medal-outline': medalOutline,
  'diamond-outline': diamondOutline,
  'flash-outline': flashOutline,
  'bus-outline': busOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'trending-up-outline': trendingUpOutline,
  'wallet-outline': walletOutline,
  'sparkles-outline': sparklesOutline,
  'pricetag-outline': pricetagOutline,
  'chevron-forward-outline': chevronForwardOutline,
});

interface Tier {
  name: string;
  icon: string;
  points: number;
  perks: string[];
}

interface Activity {
  ref: string;
  label: string;
  date: string;
  pts: number;
  icon: string;
}

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './rewards.page.html',
  styleUrls: ['./rewards.page.scss'],
})
export class RewardsPage {
  private location = inject(Location);
  private router = inject(Router);

  private ticketService = inject(TicketService);
  private voucherService = inject(VoucherService);

  tiers: Tier[] = [
    {
      name: 'Silver',
      icon: 'ribbon-outline',
      points: 0,
      perks: ['5% off selected routes', 'Digital ticket vault', 'SOS support'],
    },
    {
      name: 'Gold',
      icon: 'medal-outline',
      points: 600,
      perks: ['10% off selected routes', 'Priority boarding', 'Free seat pick'],
    },
    {
      name: 'Platinum',
      icon: 'trophy-outline',
      points: 1500,
      perks: ['15% off coach class', 'Free rebooking', 'Concierge line'],
    },
    {
      name: 'Diamond',
      icon: 'diamond-outline',
      points: 3000,
      perks: ['25% off all routes', 'Free add-on bags', 'Airport lounge access'],
    },
  ];

  get stats() {
    const bookings = this.ticketService.bookings;
    const savings = bookings.reduce((sum, b) => sum + (b.savings ?? 0), 0);
    const points =
      bookings.reduce(
        (sum, b) => sum + (b.status === 'completed' ? 50 : 25),
        0,
      ) + Math.round(savings);
    return { trips: bookings.length, points, saved: Math.round(savings) };
  }

  get current(): Tier {
    let tier = this.tiers[0];
    for (const t of this.tiers) {
      if (this.stats.points >= t.points) tier = t;
    }
    return tier;
  }

  get index() {
    return this.tiers.indexOf(this.current);
  }

  get next(): Tier | null {
    return this.tiers[this.index + 1] ?? null;
  }

  get progress(): number {
    if (!this.next) return 100;
    const span = this.next.points - this.current.points;
    const into = this.stats.points - this.current.points;
    return Math.min(100, Math.round((into / span) * 100));
  }

  get toNext(): number {
    return this.next ? Math.max(0, this.next.points - this.stats.points) : 0;
  }

  get activity(): Activity[] {
    const rows: Activity[] = this.ticketService.bookings.map((b) => ({
      ref: b.bookingRef,
      label:
        b.status === 'completed'
          ? `${b.from} → ${b.to} · completed trip`
          : b.status === 'cancelled'
            ? `${b.from} → ${b.to} · cancelled`
            : `${b.from} → ${b.to}`,
      date: b.date,
      pts: b.status === 'completed' ? 50 : b.status === 'cancelled' ? 0 : 25,
      icon:
        b.status === 'completed'
          ? 'trophy-outline'
          : b.status === 'cancelled'
            ? 'sparkles-outline'
            : 'bus-outline',
    }));
    if (this.stats.saved > 0) {
      rows.unshift({
        ref: 'SAVINGS',
        label: `Fare savings counted as points`,
        date: 'Auto',
        pts: this.stats.saved,
        icon: 'wallet-outline',
      });
    }
    return rows;
  }

  goBack() {
    this.location.back();
  }

  /** Unused promos in the wallet — the Rewards entry stays honest. */
  get promoCount(): number {
    return this.voucherService.getVouchers().filter((v) => !v.used).length;
  }

  openPromoWallet() {
    this.router.navigateByUrl('/promo-wallet?from=rewards');
  }

  bookTrip() {
    this.router.navigateByUrl('/bookings');
  }
}