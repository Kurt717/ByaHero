import { Injectable, inject } from '@angular/core';
import { ProfileService, WalletTx } from '../profile/profile.service';
import { TicketService } from '../bookings/ticket.service';

/** Composes wallet transactions: stored top-ups / sends / refunds plus
 *  ride payments derived from the user's actual bookings. */
/** Holds an in-progress Send Money transfer between the Send and Confirm
 *  screens (transient, survives only within the session). */
export interface SendDraft {
  recipient: string;
  recipientSub: string;
  amount: number;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class WalletTxService {
  private profileService = inject(ProfileService);
  private ticketService = inject(TicketService);
  draft: SendDraft | null = null;

  all(): WalletTx[] {
    const rows: WalletTx[] = [...this.profileService.readWalletTransactions()];
    for (const b of this.ticketService.bookings) {
      rows.push(this.fromBooking(b));
    }
    return rows.sort(
      (a, b) =>
        (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0),
    );
  }

  find(id: string): WalletTx | undefined {
    return this.all().find((t) => t.id === id || t.ref === id);
  }

  private fromBooking(b: {
    operator: string;
    from: string;
    to: string;
    date: string;
    time: string;
    seat: string;
    fare: string;
    status: string;
    bookingRef: string;
  }): WalletTx {
    return {
      id: b.bookingRef,
      kind: 'ride',
      title: 'Ride Payment',
      subtitle: `${b.from} → ${b.to}`,
      amount: -this.parseFare(b.fare),
      date: b.date,
      time: b.time,
      source: 'ByaHero Wallet',
      status: b.status === 'cancelled' ? 'failed' : 'success',
      ref: b.bookingRef,
      route: `${b.from} → ${b.to}`,
      vehicle: `${b.operator} · ${b.seat}`,
    };
  }

  private parseFare(fare: string): number {
    const n = Number(String(fare).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}