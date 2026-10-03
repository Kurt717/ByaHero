import { Injectable } from '@angular/core';

export interface EmergencyAlertEntry {
  name: string;
  phone: string;
  at: string;
}

export interface EmergencyRecord {
  bookingRef: string;
  startedAt: string;
  alerts: EmergencyAlertEntry[];
}

/** Local emergency state per booking reference. Frontend-only: records that
 *  an alert was created (never claims real SMS/push delivery). Records are
 *  dropped the moment the trip completes or is cancelled. */
@Injectable({ providedIn: 'root' })
export class EmergencyService {
  readonly storageKey = 'byahero.emergency.v1';

  private readAll(): Record<string, EmergencyRecord> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeAll(state: Record<string, EmergencyRecord>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      return;
    }
  }

  getRecord(bookingRef: string): EmergencyRecord | null {
    return this.readAll()[bookingRef] ?? null;
  }

  isActive(bookingRef: string): boolean {
    return !!this.getRecord(bookingRef);
  }

  start(bookingRef: string): EmergencyRecord {
    const all = this.readAll();
    const existing = all[bookingRef];
    if (existing) return existing;
    const record: EmergencyRecord = {
      bookingRef,
      startedAt: new Date().toISOString(),
      alerts: [],
    };
    all[bookingRef] = record;
    this.writeAll(all);
    return record;
  }

  alertContact(bookingRef: string, name: string, phone: string): EmergencyRecord {
    const all = this.readAll();
    const record = all[bookingRef] ?? {
      bookingRef,
      startedAt: new Date().toISOString(),
      alerts: [],
    };
    if (!record.alerts.some((a) => a.phone === phone)) {
      record.alerts.push({ name, phone, at: new Date().toISOString() });
    }
    all[bookingRef] = record;
    this.writeAll(all);
    return record;
  }

  /** Drops emergency state for a trip that ended (completed/cancelled). */
  clearForBooking(bookingRef: string): void {
    const all = this.readAll();
    if (all[bookingRef]) {
      delete all[bookingRef];
      this.writeAll(all);
    }
  }
}
