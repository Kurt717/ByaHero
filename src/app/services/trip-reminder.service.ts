import { Injectable, inject } from '@angular/core';
import { TicketService, type Booking } from '../pages/bookings/ticket.service';

/** Reminder stages, ordered from farthest to nearest departure. */
export type ReminderStage = 'day' | 'hours' | 'soon';

export interface ReminderRecord {
  bookingRef: string;
  enabled: boolean;
  /** Stages that have already fired — each fires at most once per booking. */
  seen: ReminderStage[];
  /** Stages the rider dismissed. A later stage still surfaces normally. */
  dismissed: ReminderStage[];
  createdAt: number;
  updatedAt: number;
}

export interface DueReminder {
  booking: Booking;
  stage: ReminderStage;
  departsAt: number;
  msUntil: number;
}

/** Card view-model. Null means the card renders nothing at all. */
export type ReminderView =
  | { kind: 'due'; due: DueReminder }
  | { kind: 'next'; booking: Booking; departsAt: number }
  | { kind: 'muted'; bookingRef: string };

export interface StageCopy {
  title: string;
  body: string;
  /** Where the primary action should lead. */
  cta: 'prep' | 'ticket';
  ctaLabel: string;
}

const STAGE_ORDER: ReminderStage[] = ['day', 'hours', 'soon'];
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

/**
 * In-app Smart Trip Reminders. There is no push server and no OS-level
 * scheduling in this Capacitor setup, so stages are derived honestly from
 * the canonical booking departure time every time state is read — fully
 * offline, fully local. Storage (`byahero.trip-reminders.v1`) only keeps
 * per-booking reminder state (enabled / seen / dismissed), never trips.
 */
@Injectable({ providedIn: 'root' })
export class TripReminderService {
  private readonly storageKey = 'byahero.trip-reminders.v1';
  private readonly prefsKey = 'byahero.profile-preferences.v1';
  private ticketService = inject(TicketService);

  /** Global kill-switch: master Notifications pref AND Trip Reminders pref. */
  remindersOn(): boolean {
    try {
      const prefs = JSON.parse(
        localStorage.getItem(this.prefsKey) ?? '{}',
      ) as Record<string, unknown>;
      if (prefs['Notifications'] === false) return false;
      return prefs['Trip Reminders'] !== false;
    } catch {
      return true;
    }
  }

  /** Local departure epoch for a booking, or null when unparseable.
   *  Same `${date} ${time}` convention as the ride identity service. */
  departsAt(b: Booking): number | null {
    try {
      const d = new Date(`${b.date} ${b.time}`);
      const t = d.getTime();
      return isNaN(t) ? null : t;
    } catch {
      return null;
    }
  }

  /** Bookings a reminder may ever consider: confirmed/boarding with a
   *  real future departure. Cancelled, completed and past trips never
   *  qualify — no reminders are created for them. */
  upcoming(): { booking: Booking; departsAt: number }[] {
    const now = Date.now();
    const out: { booking: Booking; departsAt: number }[] = [];
    for (const b of this.ticketService.bookings) {
      if (b.status !== 'confirmed' && b.status !== 'boarding') continue;
      const at = this.departsAt(b);
      if (at === null || at <= now) continue;
      out.push({ booking: b, departsAt: at });
    }
    return out.sort((a, b) => a.departsAt - b.departsAt);
  }

  /** Nearest upcoming valid trip, or null when there is none. */
  nextTrip(): { booking: Booking; departsAt: number } | null {
    return this.upcoming()[0] ?? null;
  }

  /** Nearest upcoming trip with reminders still enabled (Home surface). */
  nextVisible(): { booking: Booking; departsAt: number } | null {
    return this.upcoming().find(({ booking }) => this.isEnabled(booking.bookingRef)) ?? null;
  }

  /** Single view-model for the reminder card (null = render nothing).
   *  Null ref → nearest visible trip (Home); set ref → that booking. */
  resolve(ref: string | null): ReminderView | null {
    if (!this.remindersOn()) return null;
    if (ref) {
      const due = this.dueFor(ref);
      if (due) return { kind: 'due', due };
      const found = this.upcoming().find(({ booking }) => booking.bookingRef === ref);
      if (!found) return null;
      if (!this.isEnabled(ref)) return { kind: 'muted', bookingRef: ref };
      return { kind: 'next', booking: found.booking, departsAt: found.departsAt };
    }
    const due = this.due();
    if (due) return { kind: 'due', due };
    const next = this.nextVisible();
    if (!next) return null;
    return { kind: 'next', booking: next.booking, departsAt: next.departsAt };
  }

  stageFor(msUntil: number): ReminderStage | null {
    if (msUntil <= 0 || msUntil > DAY_MS) return null;
    if (msUntil <= 30 * MIN_MS) return 'soon';
    if (msUntil <= 3 * HOUR_MS) return 'hours';
    return 'day';
  }

  /** The reminder to surface now, if any: nearest trip whose current
   *  stage is enabled and not dismissed. Firing (first sighting of a
   *  stage) is recorded so each stage shows at most once per booking. */
  due(): DueReminder | null {
    this.cleanup();
    if (!this.remindersOn()) return null;
    const now = Date.now();
    for (const { booking, departsAt } of this.upcoming()) {
      const rec = this.recordFor(booking.bookingRef);
      if (!rec.enabled) continue;
      const stage = this.stageFor(departsAt - now);
      if (!stage || rec.dismissed.includes(stage)) continue;
      if (!rec.seen.includes(stage)) this.markSeen(booking.bookingRef, stage);
      return { booking, stage, departsAt, msUntil: departsAt - now };
    }
    return null;
  }

  /** Same as due(), scoped to one booking (ticket + alerts use this). */
  dueFor(bookingRef: string): DueReminder | null {
    this.cleanup();
    if (!this.remindersOn()) return null;
    const booking = this.ticketService.findByRef(bookingRef);
    if (
      !booking ||
      (booking.status !== 'confirmed' && booking.status !== 'boarding')
    ) {
      return null;
    }
    const departsAt = this.departsAt(booking);
    if (departsAt === null || departsAt <= Date.now()) return null;
    const rec = this.recordFor(bookingRef);
    if (!rec.enabled) return null;
    const stage = this.stageFor(departsAt - Date.now());
    if (!stage || rec.dismissed.includes(stage)) return null;
    if (!rec.seen.includes(stage)) this.markSeen(bookingRef, stage);
    return { booking, stage, departsAt, msUntil: departsAt - Date.now() };
  }

  isEnabled(bookingRef: string): boolean {
    return this.recordFor(bookingRef).enabled;
  }

  setEnabled(bookingRef: string, enabled: boolean) {
    const all = this.readAll();
    const rec = all[bookingRef] ?? this.fresh(bookingRef);
    rec.enabled = enabled;
    rec.updatedAt = Date.now();
    all[bookingRef] = rec;
    this.writeAll(all);
  }

  dismiss(bookingRef: string, stage: ReminderStage) {
    const all = this.readAll();
    const rec = all[bookingRef] ?? this.fresh(bookingRef);
    if (!rec.dismissed.includes(stage)) rec.dismissed.push(stage);
    rec.updatedAt = Date.now();
    all[bookingRef] = rec;
    this.writeAll(all);
  }

  stageCopy(stage: ReminderStage, b: Booking): StageCopy {
    switch (stage) {
      case 'soon':
        return {
          title: 'Time to get ready',
          body: `${b.operator} to ${b.to} boards at ${b.time}. Keep your e-ticket QR ready.`,
          cta: 'ticket',
          ctaLabel: 'Open E-Ticket',
        };
      case 'hours':
        return {
          title: 'Trip coming up',
          body: `${b.from} → ${b.to} departs at ${b.time} today. E-ticket and checklist ready?`,
          cta: 'prep',
          ctaLabel: 'Open Trip Preparation',
        };
      default:
        return {
          title: 'Trip tomorrow',
          body: `Your ${b.operator} trip to ${b.to} leaves tomorrow at ${b.time}. Check your luggage and travel checklist.`,
          cta: 'prep',
          ctaLabel: 'Open Trip Preparation',
        };
    }
  }

  /** Human countdown for the neutral (no stage due) state. */
  countdown(departsAt: number): string {
    const mins = Math.max(1, Math.round((departsAt - Date.now()) / MIN_MS));
    if (mins < 60) return `Departs in ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Departs in ${hours}h ${mins % 60}m`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Departs tomorrow' : `Departs in ${days} days`;
  }

  /** Drops records for missing/cancelled/completed/past bookings and
   *  merges duplicates — state always re-derives from bookings. */
  cleanup() {
    const live = new Set(
      this.upcoming().map(({ booking }) => booking.bookingRef),
    );
    const all = this.readAll();
    let dirty = false;
    for (const ref of Object.keys(all)) {
      if (!live.has(ref)) {
        delete all[ref];
        dirty = true;
      }
    }
    if (dirty) this.writeAll(all);
  }

  // ---------------------------------------------------------- storage

  private fresh(bookingRef: string): ReminderRecord {
    const now = Date.now();
    return {
      bookingRef,
      enabled: true,
      seen: [],
      dismissed: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private recordFor(bookingRef: string): ReminderRecord {
    return this.readAll()[bookingRef] ?? this.fresh(bookingRef);
  }

  private markSeen(bookingRef: string, stage: ReminderStage) {
    const all = this.readAll();
    const rec = all[bookingRef] ?? this.fresh(bookingRef);
    if (!rec.seen.includes(stage)) rec.seen.push(stage);
    rec.updatedAt = Date.now();
    all[bookingRef] = rec;
    this.writeAll(all);
  }

  private readAll(): Record<string, ReminderRecord> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, ReminderRecord>;
      if (!parsed || typeof parsed !== 'object') return {};
      // Tolerate corruption: keep only well-formed records.
      const clean: Record<string, ReminderRecord> = {};
      for (const [ref, r] of Object.entries(parsed)) {
        if (!r || typeof r !== 'object' || typeof ref !== 'string') continue;
        clean[ref] = {
          bookingRef: ref,
          enabled: r.enabled !== false,
          seen: Array.isArray(r.seen)
            ? r.seen.filter((s): s is ReminderStage => STAGE_ORDER.includes(s))
            : [],
          dismissed: Array.isArray(r.dismissed)
            ? r.dismissed.filter((s): s is ReminderStage => STAGE_ORDER.includes(s))
            : [],
          createdAt: Number(r.createdAt) || Date.now(),
          updatedAt: Number(r.updatedAt) || Date.now(),
        };
      }
      return clean;
    } catch {
      return {};
    }
  }

  private writeAll(all: Record<string, ReminderRecord>) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      // Memory-only if storage is unavailable — state still derives.
    }
  }
}
