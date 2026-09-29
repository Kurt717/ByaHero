import { Injectable, inject } from '@angular/core';
import { TripPreparationService } from './trip-preparation.service';

/** Per-booking luggage counts. Booking-level (not per-passenger) to match
 *  the existing passenger model — the prototype stores one passenger list
 *  per booking without per-passenger luggage, so one record per bookingRef
 *  keeps every passenger's bags under the same ticket. */
export interface LuggageCounts {
  carryOn: number;
  checked: number;
  other: number;
}

export const LUGGAGE_EMPTY: LuggageCounts = {
  carryOn: 0,
  checked: 0,
  other: 0,
};

/** Per-category cap guards against rapid-tap overshoot; total stays sane. */
export const LUGGAGE_MAX_PER_TYPE = 10;

export const LUGGAGE_META = [
  {
    key: 'carryOn' as const,
    label: 'Carry-on',
    hint: 'Small bag or backpack that stays with you',
    icon: 'briefcase-outline',
  },
  {
    key: 'checked' as const,
    label: 'Stored luggage',
    hint: 'Goes in the vehicle luggage compartment',
    icon: 'business-outline',
  },
  {
    key: 'other' as const,
    label: 'Other',
    hint: 'Extra items for this trip',
    icon: 'bag-outline',
  },
];

/** Booking-scoped luggage, keyed by canonical bookingRef.
 *  Storage: `byahero.luggage.v1` -> Record<bookingRef, LuggageCounts>.
 *  Existing bookings without an entry = no luggage (empty state, no fakes). */
@Injectable({ providedIn: 'root' })
export class LuggageService {
  readonly storageKey = 'byahero.luggage.v1';
  private prepService = inject(TripPreparationService);

  private readAll(): Record<string, LuggageCounts> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeAll(state: Record<string, LuggageCounts>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      return;
    }
  }

  private clamp(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.min(LUGGAGE_MAX_PER_TYPE, Math.max(0, Math.floor(n)));
  }

  /** Luggage for one trip; unknown refs return zeros (empty state). */
  read(bookingRef: string): LuggageCounts {
    const saved = this.readAll()[bookingRef];
    if (!saved) return { ...LUGGAGE_EMPTY };
    return {
      carryOn: this.clamp(saved.carryOn ?? 0),
      checked: this.clamp(saved.checked ?? 0),
      other: this.clamp(saved.other ?? 0),
    };
  }

  has(bookingRef: string): boolean {
    return this.total(bookingRef) > 0;
  }

  total(bookingRef: string): number {
    const l = this.read(bookingRef);
    return l.carryOn + l.checked + l.other;
  }

  /** Short ticket-friendly label, e.g. "2 PIECES" / "1 CARRY-ON · 1 STORED". */
  summaryLabel(bookingRef: string): string {
    const l = this.read(bookingRef);
    const total = l.carryOn + l.checked + l.other;
    if (!total) return 'No luggage added';
    const parts: string[] = [];
    if (l.carryOn) parts.push(`${l.carryOn} carry-on`);
    if (l.checked) parts.push(`${l.checked} stored`);
    if (l.other) parts.push(`${l.other} other`);
    return `${total} piece${total === 1 ? '' : 's'} · ${parts.join(' · ')}`;
  }

  shortLabel(bookingRef: string): string {
    const total = this.total(bookingRef);
    if (!total) return 'No luggage';
    return `${total} piece${total === 1 ? '' : 's'}`;
  }

  save(bookingRef: string, counts: LuggageCounts): LuggageCounts {
    const clean: LuggageCounts = {
      carryOn: this.clamp(counts.carryOn),
      checked: this.clamp(counts.checked),
      other: this.clamp(counts.other),
    };
    const all = this.readAll();
    all[bookingRef] = clean;
    this.writeAll(all);
    // Keep the existing Travel Checklist connected: recording bags marks
    // the "Luggage" manual check done; clearing to zero unmarks it.
    try {
      const total = clean.carryOn + clean.checked + clean.other;
      this.prepService.setManual(bookingRef, 'luggage', total > 0);
    } catch {
      return clean;
    }
    return clean;
  }

  clear(bookingRef: string): void {
    const all = this.readAll();
    delete all[bookingRef];
    this.writeAll(all);
    try {
      this.prepService.setManual(bookingRef, 'luggage', false);
    } catch {
      return;
    }
  }
}
