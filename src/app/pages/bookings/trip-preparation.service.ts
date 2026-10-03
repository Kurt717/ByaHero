import { Injectable } from '@angular/core';
import type { Booking } from './ticket.service';

export type ManualCheckKey = 'validId' | 'powerBank' | 'cash' | 'luggage';

export type ChecklistKind = 'auto' | 'manual';

export interface ChecklistItem {
  key: string;
  kind: ChecklistKind;
  label: string;
  hint: string;
  icon: string;
  done: boolean;
  /** Where an incomplete auto item sends the user. */
  link?: string;
  linkLabel?: string;
}

export interface TripReadiness {
  items: ChecklistItem[];
  done: number;
  total: number;
}

const MANUAL_DEFAULTS: Record<ManualCheckKey, boolean> = {
  validId: false,
  powerBank: false,
  cash: false,
  luggage: false,
};

export const MANUAL_CHECK_META: { key: ManualCheckKey; label: string; hint: string; icon: string }[] = [
  { key: 'validId', label: 'Valid ID', hint: 'Must match the passenger name', icon: 'id-card-outline' },
  { key: 'powerBank', label: 'Power bank', hint: 'Stay reachable on long trips', icon: 'flash-outline' },
  { key: 'cash', label: 'Cash', hint: 'For terminals and small stops', icon: 'cash-outline' },
  { key: 'luggage', label: 'Luggage', hint: 'Packed and labeled', icon: 'briefcase-outline' },
];

/** Manual checklist state, namespaced per booking reference. */
@Injectable({ providedIn: 'root' })
export class TripPreparationService {
  readonly storageKey = 'byahero.trip-preparation.v1';

  private readAll(): Record<string, Partial<Record<ManualCheckKey, boolean>>> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeAll(state: Record<string, Partial<Record<ManualCheckKey, boolean>>>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      return;
    }
  }

  /** Manual checks for one trip, merged over defaults. */
  readManual(bookingRef: string): Record<ManualCheckKey, boolean> {
    const saved = this.readAll()[bookingRef] ?? {};
    return { ...MANUAL_DEFAULTS, ...saved };
  }

  setManual(bookingRef: string, key: ManualCheckKey, value: boolean): void {
    const all = this.readAll();
    all[bookingRef] = { ...this.readManual(bookingRef), [key]: value };
    this.writeAll(all);
  }

  toggleManual(bookingRef: string, key: ManualCheckKey): boolean {
    const next = !this.readManual(bookingRef)[key];
    this.setManual(bookingRef, key, next);
    return next;
  }

  /** Full 7-item readiness derived from live app state + manual checks. */
  summarize(booking: Booking, fareVerified: boolean): TripReadiness {
    const active = booking.status === 'confirmed' || booking.status === 'boarding';
    const manual = this.readManual(booking.bookingRef);
    const items: ChecklistItem[] = [
      {
        key: 'eticket',
        kind: 'auto',
        label: 'E-Ticket',
        hint: active ? 'Issued for this trip' : 'See ticket status',
        icon: 'qr-code-outline',
        done: active,
      },
      {
        key: 'fareId',
        kind: 'auto',
        label: 'Fare ID',
        hint: fareVerified ? 'Verified' : 'Not verified yet',
        icon: 'shield-checkmark-outline',
        done: fareVerified,
        link: '/fare-id',
        linkLabel: 'Verify',
      },
      {
        key: 'payment',
        kind: 'auto',
        label: 'Payment',
        hint: booking.paymentMethod ? `Paid via ${booking.paymentMethod}` : 'No payment recorded',
        icon: 'card-outline',
        done: !!booking.paymentMethod,
      },
      ...MANUAL_CHECK_META.map((m) => ({
        key: m.key,
        kind: 'manual' as const,
        label: m.label,
        hint: m.hint,
        icon: m.icon,
        done: manual[m.key],
      })),
    ];
    return { items, done: items.filter((i) => i.done).length, total: items.length };
  }
}
