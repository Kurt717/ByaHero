import { Injectable } from '@angular/core';
import type { CatalogRoute } from './route-catalog.service';

/** Real-time hailing session — deliberately NOT a Booking: no travel date,
 *  no seats, no payment. The bus is already moving; confirming the sheet
 *  continues straight into hailing ticketing (no date picker). */
export type HailStatus = 'confirm';

/** One active hail (flag-down) request. Only one can be active at a time. */
export interface HailRequest {
  /** Stable id for the session (HL-…), created at hail time — never a date. */
  hailId: string;
  route: CatalogRoute;
  busNo: string;
  status: HailStatus;
  pickupLabel: string;
  /** Live bus → pickup meters (null until a bus position + pickup exist). */
  busToPickupM: number | null;
  requestedAt: number;
}

/**
 * Live hailing session mirror. Home owns the session (timers, map pin);
 * this root singleton only holds the CURRENT reference so Bookings can
 * render an Active tab without duplicating state or storage. Same-tab
 * only: a reload yields null (no ghost hails), cancel/board clear it, so
 * approach display can never outlive the session.
 */
@Injectable({ providedIn: 'root' })
export class HailService {
  active: HailRequest | null = null;

  publish(hail: HailRequest | null) {
    this.active = hail;
  }

  clear() {
    this.active = null;
  }
}
