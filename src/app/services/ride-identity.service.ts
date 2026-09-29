import { Injectable, inject } from '@angular/core';
import type { Booking } from '../pages/bookings/ticket.service';
import { TicketService } from '../pages/bookings/ticket.service';
import type { HailRequest } from './hail.service';

/** How the ride is being viewed. Hail context never carries a travel date. */
export type RideContext = 'hail' | 'scheduled';

/** Canonical ride identity shared by Active Trip, Emergency Mode, E-ticket,
 *  Boarding Pass and Share. Single source of truth — no view hard-codes
 *  driver/vehicle facts.
 *
 *  Assignment rule (deterministic, never fabricated):
 *  - hail (bus already operating) → always assigned
 *  - booking with status `boarding` → assigned (crew at the gate)
 *  - booking whose departure datetime has passed → assigned (bus operating)
 *  - otherwise (future scheduled reservation) → NOT assigned: the operator
 *    has not attached a vehicle/crew yet, so views show a designed
 *    "assignment pending" state instead of invented data.
 */
export interface RideIdentity {
  assigned: boolean;
  context: RideContext;
  operator: string;
  busNo: string;
  plate: string;
  driver: string;
  /** Data-backed sticker: ON THE WAY | BOARDING | ASSIGNED. */
  statusLabel: string;
  /** Hail-only: live bus → pickup meters, when known. */
  hailPickupM: number | null;
  hailPickupLabel: string;
}

/** Operator → plate mapping (prototype fleet table). */
export const FLEET_PLATES: Record<string, string> = {
  'Victory Liner': 'NBC 1932',
  'GV Florida': 'DDE 4821',
  Partas: 'GDH 7205',
  'Florida Bus Line': 'NEE 4108',
};

/** Fallback identity when Active Trip opens with no booking and no hail
 *  (matches the page's long-standing defaults). */
export const FALLBACK_IDENTITY: RideIdentity = {
  assigned: true,
  context: 'scheduled',
  operator: 'Victory Liner',
  busNo: '402',
  plate: 'NBC 1932',
  driver: 'Ramon Cruz',
  statusLabel: 'ON THE WAY',
  hailPickupM: null,
  hailPickupLabel: '',
};

@Injectable({ providedIn: 'root' })
export class RideIdentityService {
  private ticketService = inject(TicketService);

  /** Bus number derived from the stable booking reference (last 3 digits). */
  busNoForRef(ref: string): string {
    const digits = (ref ?? '').replace(/[^0-9]/g, '').slice(-3) || '402';
    return String(Number(digits));
  }

  plateFor(operator: string): string {
    return FLEET_PLATES[operator] ?? 'NAA 0000';
  }

  driverFor(operator: string): string {
    return this.ticketService.driverNameFor(operator);
  }

  private departureTime(b: Booking): Date | null {
    try {
      const d = new Date(`${b.date} ${b.time}`);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  /** True once the scheduled departure moment has passed. */
  hasDeparted(b: Booking): boolean {
    const dep = this.departureTime(b);
    return !!dep && dep.getTime() <= Date.now();
  }

  identityForBooking(b: Booking): RideIdentity {
    const departed = this.hasDeparted(b);
    const assigned = b.status === 'boarding' || departed;
    const busNo = this.busNoForRef(b.bookingRef);
    return {
      assigned,
      context: 'scheduled',
      operator: b.operator,
      busNo,
      plate: this.plateFor(b.operator),
      driver: this.driverFor(b.operator),
      statusLabel: b.status === 'boarding' ? 'BOARDING' : 'ON THE WAY',
      hailPickupM: null,
      hailPickupLabel: '',
    };
  }

  identityForHail(h: HailRequest): RideIdentity {
    const operator = h.route.operator;
    return {
      assigned: true,
      context: 'hail',
      operator,
      busNo: h.busNo,
      plate: this.plateFor(operator),
      driver: this.driverFor(operator),
      statusLabel: 'ON THE WAY',
      hailPickupM: h.busToPickupM,
      hailPickupLabel: h.pickupLabel,
    };
  }

  /** Compact one-liner for share text / ticket rows. Empty when unassigned. */
  shortLabel(id: RideIdentity): string {
    if (!id.assigned) return '';
    return `BUS ${id.busNo} (${id.plate}) · Driver ${id.driver}`;
  }
}
