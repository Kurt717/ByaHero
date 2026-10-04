import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  bus,
  calendarOutline,
  checkmarkCircle,
  chevronForwardOutline,
  informationCircleOutline,
  swapHorizontalOutline,
  ticketOutline,
  timeOutline,
} from 'ionicons/icons';
import { TicketService, type Booking } from '../../bookings/ticket.service';
import {
  BookingService,
  PASSENGER_TYPE_META,
  type PassengerEntry,
  type PassengerType,
} from '../booking.service';
import {
  RouteCatalogService,
  type TerminalDeparture,
  type TerminalInfo,
} from '../../../services/route-catalog.service';
import { PickupService } from '../../../services/pickup.service';
import { SeatService } from '../../../services/seat.service';
import { VoucherService } from '../../../services/voucher.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'arrow-forward-outline': arrowForwardOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'checkmark-circle': checkmarkCircle,
  'chevron-forward-outline': chevronForwardOutline,
  'information-circle-outline': informationCircleOutline,
  'swap-horizontal-outline': swapHorizontalOutline,
  'ticket-outline': ticketOutline,
  'time-outline': timeOutline,
});

type RebookSort = 'earliest' | 'fare' | 'duration';

export interface RebookOption {
  dep: TerminalDeparture;
  fareValue: number;
  durationMinutes: number;
  arrival: string;
  seatsAvailable: number;
  soldOut: boolean;
  /** Neutral descriptive differences vs the original trip. */
  tags: string[];
  /** Set when fewer seats remain than the original passenger count. */
  shortBy: number;
}

/**
 * Rebook Alternatives: same journey, different ride. Alternatives come
 * from the existing terminal departure derivation (Schedule / Compare) —
 * never a second catalog. Selecting one enters the NORMAL booking
 * session (Trip Details → Seats → Payment) with passengers carried over;
 * the original booking is never touched here.
 */
@Component({
  selector: 'app-rebook',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './rebook.page.html',
  styleUrls: ['./rebook.page.scss'],
})
export class RebookPage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private ticketService = inject(TicketService);
  private bookingService = inject(BookingService);
  private catalog = inject(RouteCatalogService);
  private pickupService = inject(PickupService);
  private seatService = inject(SeatService);
  private voucherService = inject(VoucherService);

  original: Booking | null = null;
  terminal: TerminalInfo | null = null;

  days: { iso: string; dow: string; day: string }[] = [];
  selectedDate = '';
  operatorFilter = 'all';
  destFilter = 'all';
  sort: RebookSort = 'earliest';

  readonly sortOptions: { id: RebookSort; label: string }[] = [
    { id: 'earliest', label: 'Earliest' },
    { id: 'fare', label: 'Lowest fare' },
    { id: 'duration', label: 'Shortest' },
  ];

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      bus,
      calendarOutline,
      checkmarkCircle,
      chevronForwardOutline,
      informationCircleOutline,
      swapHorizontalOutline,
      ticketOutline,
      timeOutline,
    });
  }

  ngOnInit() {
    const ref = this.route.snapshot.paramMap.get('ref');
    this.original = ref ? this.ticketService.findByRef(ref) : null;
    if (!this.original) {
      this.router.navigateByUrl('/bookings');
      return;
    }
    this.terminal = this.catalog.terminalForCity(this.original.from) ?? null;
    this.buildDays();
    this.selectedDate = this.days[0]?.iso ?? new Date().toDateString();
    this.destFilter = this.original.to;
  }

  // --- Original journey context ---

  /** Boarding → alighting stretch of the original (falls back to from → to). */
  originalPair(b: Booking): string {
    return this.ticketService.segmentPair(b);
  }

  get paxCount(): number {
    const b = this.original;
    if (!b) return 1;
    if (b.passengerTypes?.length) return b.passengerTypes.length;
    if (b.seatIds?.length) return b.seatIds.length;
    return 1;
  }

  get originalTimeMinutes(): number | null {
    return this.original ? this.timeToMinutes(this.original.time) : null;
  }

  get originalFare(): number {
    return Number((this.original?.fare ?? '').replace(/[^0-9.]/g, '')) || 0;
  }

  get originalDuration(): number {
    const route = this.catalog.routes.find(
      (r) => r.from === this.original?.from && r.to === this.original?.to,
    );
    return route ? this.durationMinutes(route.duration) : 0;
  }

  /** Voucher on the original trip, kept as a candidate note only — the
   *  voucher step re-checks it against the new trip. */
  get originalVoucherNote(): string | null {
    const code = this.original?.voucherCode;
    if (!code) return null;
    const match = this.voucherService.getVouchers().find((v) => v.code === code);
    if (!match) return `${code} was on the original trip — re-check it on the voucher step.`;
    if (match.used) {
      return `${code} is already used, so it can't move to the new trip.`;
    }
    return `${code} may still be usable — check it on the voucher step.`;
  }

  // --- Day strip (original date forward, or from today) ---

  private buildDays() {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const start = new Date();
    const orig = this.original ? new Date(this.original.date) : null;
    if (orig && !isNaN(orig.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (orig >= today) start.setTime(orig.getTime());
    }
    this.days = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return {
        iso: d.toDateString(),
        dow: i === 0 ? 'Today' : names[d.getDay()],
        day: String(d.getDate()),
      };
    });
  }

  selectDay(iso: string) {
    this.selectedDate = iso;
  }

  // --- Alternative search (existing derivation, inherited filters) ---

  get operators(): string[] {
    const seen = new Set<string>();
    for (const d of this.baseDepartures()) seen.add(d.operator);
    return [...seen];
  }

  get destinations(): string[] {
    const seen = new Set<string>();
    for (const d of this.baseDepartures()) seen.add(d.to);
    return [...seen];
  }

  private baseDepartures(): TerminalDeparture[] {
    if (!this.original) return [];
    if (this.terminal) {
      return this.catalog.departuresForTerminal(this.terminal.name);
    }
    // Origin matches no catalog terminal — fall back to catalog routes
    // on the same corridor so the page still works.
    return this.catalog.routes
      .filter((r) => r.from === this.original!.from)
      .flatMap((r) =>
        this.catalog
          .departuresForTerminal(r.from)
          .filter((d) => d.routeId === r.id),
      );
  }

  get isToday(): boolean {
    return this.selectedDate === new Date().toDateString();
  }

  private isDeparted(dep: TerminalDeparture): boolean {
    if (!this.isToday) return false;
    const now = new Date();
    return dep.timeMinutes <= now.getHours() * 60 + now.getMinutes();
  }

  get options(): RebookOption[] {
    const list = this.baseDepartures()
      .filter((d) => !this.isDeparted(d))
      .filter((d) => this.destFilter === 'all' || d.to === this.destFilter)
      .filter((d) => this.operatorFilter === 'all' || d.operator === this.operatorFilter)
      .map((dep) => this.toOption(dep));
    return list.sort((a, b) => {
      if (this.sort === 'fare') return a.fareValue - b.fareValue;
      if (this.sort === 'duration') return a.durationMinutes - b.durationMinutes;
      return a.dep.timeMinutes - b.dep.timeMinutes;
    });
  }

  get reservableCount(): number {
    return this.options.filter((o) => !o.soldOut && o.shortBy === 0).length;
  }

  private toOption(dep: TerminalDeparture): RebookOption {
    const fareValue = Number(dep.fare.replace(/[^0-9.]/g, '')) || 0;
    const durationMinutes = this.durationMinutes(dep.duration);
    const key = [dep.operator, dep.from, dep.to, this.selectedDate].join('|');
    const seatsAvailable = this.seatService.availabilityFor(dep.seats, key).available;
    const tags = this.diffTags(dep, fareValue, durationMinutes, seatsAvailable);
    return {
      dep,
      fareValue,
      durationMinutes,
      arrival: this.arrivalFor(dep.timeMinutes, durationMinutes),
      seatsAvailable,
      soldOut: seatsAvailable <= 0,
      tags,
      shortBy: Math.max(0, this.paxCount - seatsAvailable),
    };
  }

  /** Neutral descriptive differences — never "best" or "better". */
  private diffTags(
    dep: TerminalDeparture,
    fareValue: number,
    durationMinutes: number,
    seatsAvailable: number,
  ): string[] {
    const tags: string[] = [];
    const origTime = this.originalTimeMinutes;
    if (origTime !== null && this.selectedDate === this.original?.date) {
      if (dep.timeMinutes < origTime) tags.push('EARLIER');
      else if (dep.timeMinutes > origTime) tags.push('LATER');
    }
    if (this.originalFare && fareValue < this.originalFare) tags.push('LOWER FARE');
    if (this.originalDuration && durationMinutes < this.originalDuration) {
      tags.push('SHORTER TRIP');
    }
    const origSeats = this.originalSeatsLeft();
    if (origSeats !== null && seatsAvailable > origSeats) tags.push('MORE SEATS');
    if (dep.operator === this.original?.operator) tags.push('SAME OPERATOR');
    return tags.slice(0, 3);
  }

  private originalSeatsLeft(): number | null {
    const m = /(\d+)\s*seats?\s*left/i.exec(
      this.catalog.routes.find(
        (r) => r.from === this.original?.from && r.to === this.original?.to,
      )?.seats ?? '',
    );
    return m ? Number(m[1]) : null;
  }

  setOperator(op: string) {
    this.operatorFilter = op;
  }

  setDest(dest: string) {
    this.destFilter = dest;
  }

  setSort(sort: RebookSort) {
    this.sort = sort;
  }

  formatFare(n: number): string {
    return '₱' + n.toLocaleString('en-PH');
  }

  // --- Compare (existing flow) ---

  openCompare() {
    if (!this.terminal) return;
    const o = this.original;
    this.router.navigate(['/booking/compare'], {
      queryParams: {
        terminal: this.terminal.id,
        date: this.selectedDate,
        dest: this.destFilter,
        ...(o?.boardStopId && o?.alightStopId
          ? { board: o.boardStopId, alight: o.alightStopId }
          : {}),
      },
    });
  }

  // --- Selection → existing booking flow ---

  select(option: RebookOption) {
    if (!this.original || option.soldOut || option.shortBy > 0) return;
    const dep = option.dep;
    const o = this.original;
    this.bookingService.startBooking({
      operator: dep.operator,
      from: dep.from,
      to: dep.to,
      eta: `Departs ${dep.time}`,
      fare: dep.fare,
      seatsLeft: dep.seats,
      status: dep.status,
      departureTime: dep.time,
    }, o?.boardStopId && o?.alightStopId
      ? { boardStopId: o.boardStopId, alightStopId: o.alightStopId }
      : undefined);
    this.bookingService.travelDate = this.selectedDate;
    this.bookingService.passengers = this.carriedPassengers();
    this.bookingService.pickup = this.pickupService.getActive().pickup;
    this.bookingService.rebookedFrom = this.original.bookingRef;
    this.router.navigateByUrl('/booking/trip');
  }

  /** Original passenger configuration, revalidated: unknown labels fall
   *  back to regular rather than copying blindly. */
  private carriedPassengers(): PassengerEntry[] {
    const types = this.original?.passengerTypes?.length
      ? this.original.passengerTypes
      : ['Regular'];
    const ids = this.original?.idNumbers ?? [];
    return types.map((label, i) => ({
      id: `p${i + 1}`,
      type: this.toPassengerType(label),
      idNumber: (ids[i] ?? '').trim() || undefined,
    }));
  }

  private toPassengerType(label: string): PassengerType {
    const clean = (label ?? '').trim().toLowerCase();
    const hit = (Object.keys(PASSENGER_TYPE_META) as PassengerType[]).find(
      (key) =>
        key === clean || PASSENGER_TYPE_META[key].label.toLowerCase() === clean,
    );
    return hit ?? 'regular';
  }

  // --- Navigation ---

  goBack() {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        this.location.back();
        return;
      }
    } catch {
      // Fall through to the explicit fallback below.
    }
    this.router.navigateByUrl(
      this.original ? `/e-ticket/${this.original.bookingRef}` : '/bookings',
    );
  }

  bookFresh() {
    this.router.navigateByUrl('/search');
  }

  private timeToMinutes(time: string): number | null {
    const m = /(\d{1,2})(?::(\d{2}))?\s*([AP]M)?/i.exec(time ?? '');
    if (!m) return null;
    let hour = Number(m[1]);
    const meridiem = (m[3] ?? '').toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return hour * 60 + Number(m[2] ?? 0);
  }

  private durationMinutes(duration: string): number {
    const hours = Number(/(\d+)h/.exec(duration)?.[1] ?? 0);
    const minutes = Number(/(\d+)m/.exec(duration)?.[1] ?? 0);
    return hours * 60 + minutes;
  }

  private arrivalFor(timeMinutes: number, durationMinutes: number): string {
    const total = timeMinutes + durationMinutes;
    const h24 = Math.floor(total / 60) % 24;
    const m = total % 60;
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}
