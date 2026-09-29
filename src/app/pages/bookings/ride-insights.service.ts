import { Injectable, inject } from '@angular/core';
import { TicketService, type Booking } from './ticket.service';

/** Lightweight time filter for the insights page. Never a dashboard — the
 *  user should grasp their travel history within seconds. */
export type InsightsRange = 'all' | 'year' | 'recent';

export interface TopPick {
  name: string;
  count: number;
}

export interface InsightsOverview {
  totalRides: number;
  totalPax: number;
  totalSpend: number;
  avgFare: number;
  topOperator: TopPick | null;
  topDestination: TopPick | null;
  topOrigin: TopPick | null;
}

export interface TimingBreakdown {
  label: string;
  count: number;
}

export interface InsightsPatterns {
  topDestination: TopPick | null;
  topOrigin: TopPick | null;
  topOperator: TopPick | null;
  topPassengerType: TopPick | null;
  /** Most common travel window derived from stored departure times. */
  timing: TimingBreakdown | null;
  timingAll: TimingBreakdown[];
}

export interface MonthlyBucket {
  key: string;
  label: string;
  count: number;
}

/**
 * Derives lightweight travel statistics from the canonical booking store
 * (`byahero.bookings.v1` via TicketService). Read-only: never writes,
 * never duplicates records, never invents data.
 *
 * Only `completed` bookings contribute. Cancelled, confirmed and boarding
 * rides are always excluded from every statistic.
 */
@Injectable({ providedIn: 'root' })
export class RideInsightsService {
  private ticketService = inject(TicketService);

  /** Every completed ride, newest first. The single source for this feature. */
  completed(): Booking[] {
    return this.ticketService.bookings
      .filter((b) => b.status === 'completed')
      .sort((a, b) => this.rideTime(b) - this.rideTime(a));
  }

  filtered(range: InsightsRange): Booking[] {
    const all = this.completed();
    if (range === 'all') return all;
    const now = new Date();
    if (range === 'year') {
      return all.filter((b) => this.rideDate(b)?.getFullYear() === now.getFullYear());
    }
    // 'recent' — last 6 calendar months including the current one.
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return all.filter((b) => {
      const d = this.rideDate(b);
      return !!d && d >= cutoff;
    });
  }

  overview(rides: Booking[]): InsightsOverview {
    const totalRides = rides.length;
    const totalPax = rides.reduce((sum, b) => sum + this.paxCount(b), 0);
    const totalSpend = rides.reduce((sum, b) => sum + this.fareNumber(b.fare), 0);
    return {
      totalRides,
      totalPax,
      totalSpend,
      avgFare: totalRides ? Math.round(totalSpend / totalRides) : 0,
      topOperator: this.topBy(rides, (b) => b.operator),
      topDestination: this.topBy(rides, (b) => b.to),
      topOrigin: this.topBy(rides, (b) => b.from),
    };
  }

  patterns(rides: Booking[]): InsightsPatterns {
    const timingAll = this.timingBreakdown(rides);
    const topTiming = [...timingAll].sort((a, b) => b.count - a.count)[0] ?? null;
    return {
      topDestination: this.topBy(rides, (b) => b.to),
      topOrigin: this.topBy(rides, (b) => b.from),
      topOperator: this.topBy(rides, (b) => b.operator),
      topPassengerType: this.topPassengerType(rides),
      timing: topTiming && topTiming.count > 0 ? topTiming : null,
      timingAll,
    };
  }

  /** Rides-per-month buckets. Empty months are included for the ranged
   *  views so the bar chart stays honest; 'all' shows only months with
   *  at least one ride, oldest first. */
  monthly(rides: Booking[], range: InsightsRange): MonthlyBucket[] {
    const counts = new Map<string, number>();
    for (const b of rides) {
      const d = this.rideDate(b);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const keys = this.monthKeys(range);
    return keys
      .map((key) => ({ key, label: this.monthLabel(key), count: counts.get(key) ?? 0 }))
      .filter((bucket) => (range === 'all' ? bucket.count > 0 : true));
  }

  recent(rides: Booking[], limit = 10): Booking[] {
    return rides.slice(0, limit);
  }

  /** Seats actually booked: explicit passenger list first, then the
   *  selected seat ids, then a count parsed from the seat label. */
  paxCount(b: Booking): number {
    if (b.passengerTypes?.length) return b.passengerTypes.length;
    if (b.seatIds?.length) return b.seatIds.length;
    const ids = (b.seat ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    return ids.length || 1;
  }

  fareNumber(fare: string | undefined): number {
    const n = Number((fare ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  formatPeso(n: number): string {
    return '₱ ' + Math.round(n).toLocaleString('en-PH');
  }

  /** Epoch ms of the stored travel datetime; 0 when unparseable so the
   *  ride sorts last instead of breaking the list. */
  rideTime(b: Booking): number {
    return this.rideDate(b)?.getTime() ?? 0;
  }

  rideDate(b: Booking): Date | null {
    const candidates = [`${b.date} ${b.time}`, b.date];
    for (const raw of candidates) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  private topBy(rides: Booking[], pick: (b: Booking) => string): TopPick | null {
    const counts = new Map<string, number>();
    for (const b of rides) {
      const name = (pick(b) ?? '').trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    let top: TopPick | null = null;
    for (const [name, count] of counts) {
      if (!top || count > top.count) top = { name, count };
    }
    return top;
  }

  private topPassengerType(rides: Booking[]): TopPick | null {
    const counts = new Map<string, number>();
    for (const b of rides) {
      for (const raw of b.passengerTypes ?? []) {
        const name = (raw ?? '').trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    let top: TopPick | null = null;
    for (const [name, count] of counts) {
      if (!top || count > top.count) top = { name, count };
    }
    return top;
  }

  /** Morning (5–11) / Afternoon (12–17) / Evening (18–4) from the stored
   *  departure time. Rides with unparseable times are skipped, never
   *  guessed. */
  private timingBreakdown(rides: Booking[]): TimingBreakdown[] {
    const buckets: TimingBreakdown[] = [
      { label: 'Morning', count: 0 },
      { label: 'Afternoon', count: 0 },
      { label: 'Evening', count: 0 },
    ];
    for (const b of rides) {
      const hour = this.hourOf(b.time);
      if (hour === null) continue;
      if (hour >= 5 && hour < 12) buckets[0].count++;
      else if (hour >= 12 && hour < 18) buckets[1].count++;
      else buckets[2].count++;
    }
    return buckets;
  }

  private hourOf(time: string): number | null {
    const m = /(\d{1,2})(?::(\d{2}))?\s*([AP]M)?/i.exec(time ?? '');
    if (!m) return null;
    let hour = Number(m[1]);
    const meridiem = (m[3] ?? '').toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    if (hour < 0 || hour > 23) return null;
    return hour;
  }

  private monthKeys(range: InsightsRange): string[] {
    if (range === 'all') {
      const keys = new Set<string>();
      for (const b of this.completed()) {
        const d = this.rideDate(b);
        if (d) keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      return [...keys].sort();
    }
    const now = new Date();
    if (range === 'year') {
      return Array.from(
        { length: now.getMonth() + 1 },
        (_, m) => `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`,
      );
    }
    // 'recent' — last 6 calendar months, oldest first.
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  }

  private monthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-PH', { month: 'short' });
  }
}
