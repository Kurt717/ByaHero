import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  bus,
  checkmarkCircleOutline,
  chevronForwardOutline,
  swapHorizontalOutline,
  ticketOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  RouteCatalogService,
  TerminalDeparture,
  TerminalInfo,
} from '../../../services/route-catalog.service';
import { BookingService } from '../../booking/booking.service';
import { PickupService } from '../../../services/pickup.service';
import { SeatService } from '../../../services/seat.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'arrow-forward-outline': arrowForwardOutline,
  bus: bus,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'swap-horizontal-outline': swapHorizontalOutline,
  'ticket-outline': ticketOutline,
  'time-outline': timeOutline,
});

type CompareSort = 'earliest' | 'fare' | 'duration';

interface CompareOption {
  dep: TerminalDeparture;
  fareValue: number;
  durationMinutes: number;
  arrival: string;
  soldOut: boolean;
}

/**
 * Fare comparison for scheduled departures: same terminal + travel date
 * (+ optional destination), side-by-side on base fares. Every value comes
 * from the catalog departure or is arithmetically derived from it
 * (arrival = slot + duration); nothing is ranked or recommended.
 * Selecting an option starts the normal booking session with that EXACT
 * trip — fare, date, slot, operator and route unchanged.
 */
@Component({
  selector: 'app-compare-trips',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './compare.page.html',
  styleUrls: ['./compare.page.scss'],
})
export class ComparePage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private catalog = inject(RouteCatalogService);
  private bookingService = inject(BookingService);
  private pickupService = inject(PickupService);
  private seatService = inject(SeatService);

  terminal: TerminalInfo | null = null;
  travelDate = '';
  destFilter = 'all';
  sort: CompareSort = 'earliest';

  readonly sortOptions: { id: CompareSort; label: string }[] = [
    { id: 'earliest', label: 'Earliest' },
    { id: 'fare', label: 'Lowest fare' },
    { id: 'duration', label: 'Shortest' },
  ];

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      bus,
      checkmarkCircleOutline,
      chevronForwardOutline,
      swapHorizontalOutline,
      ticketOutline,
      timeOutline,
    });
  }

  ngOnInit() {
    const terminalId = this.route.snapshot.queryParamMap.get('terminal');
    this.terminal = terminalId
      ? (this.catalog.terminalById(terminalId) ?? null)
      : null;
    if (!this.terminal) {
      this.router.navigateByUrl('/search');
      return;
    }
    this.travelDate =
      this.route.snapshot.queryParamMap.get('date') ?? new Date().toDateString();
    this.destFilter =
      this.route.snapshot.queryParamMap.get('dest') ?? 'all';
  }

  /** Canonical departures: same catalog derivation as Terminal + Schedule. */
  private baseDepartures(): TerminalDeparture[] {
    if (!this.terminal) return [];
    const all = this.catalog.departuresForTerminal(this.terminal.name);
    return this.destFilter === 'all'
      ? all
      : all.filter((d) => d.to === this.destFilter);
  }

  get isToday(): boolean {
    return this.travelDate === new Date().toDateString();
  }

  isDeparted(dep: TerminalDeparture): boolean {
    if (!this.isToday) return false;
    const now = new Date();
    return dep.timeMinutes <= now.getHours() * 60 + now.getMinutes();
  }

  /** Reservable departures for this date (departed slots excluded). */
  get options(): CompareOption[] {
    const list = this.baseDepartures()
      .filter((d) => !this.isDeparted(d))
      .map((dep) => {
        const fareValue = Number(dep.fare.replace(/[^0-9.]/g, '')) || 0;
        const durationMinutes = this.durationMinutes(dep.duration);
        return {
          dep,
          fareValue,
          durationMinutes,
          arrival: this.arrivalFor(dep.timeMinutes, durationMinutes),
          soldOut: this.isSoldOut(dep),
        } satisfies CompareOption;
      });
    return list.sort((a, b) => {
      if (this.sort === 'fare') return a.fareValue - b.fareValue;
      if (this.sort === 'duration')
        return a.durationMinutes - b.durationMinutes;
      return a.dep.timeMinutes - b.dep.timeMinutes;
    });
  }

  get reservableCount(): number {
    return this.options.filter((o) => !o.soldOut).length;
  }

  get routeTitle(): string {
    if (!this.terminal) return '';
    return this.destFilter === 'all'
      ? `FROM ${this.terminal.city.toUpperCase()}`
      : `${this.departuresFrom(this.destFilter)} → ${this.destFilter}`;
  }

  private departuresFrom(dest: string): string {
    return this.baseDepartures().find((d) => d.to === dest)?.from ?? '';
  }

  setSort(sort: CompareSort) {
    this.sort = sort;
  }

  /** A departure with no free seats left cannot be reserved. */
  private isSoldOut(dep: TerminalDeparture): boolean {
    const key = [dep.operator, dep.from, dep.to, this.travelDate].join('|');
    return (
      this.seatService.availabilityFor(dep.seats, key).available <= 0
    );
  }

  private durationMinutes(duration: string): number {
    const hours = Number(/(\d+)h/.exec(duration)?.[1] ?? 0);
    const minutes = Number(/(\d+)m/.exec(duration)?.[1] ?? 0);
    return hours * 60 + minutes;
  }

  /** Arrival derived arithmetically from slot time + route duration. */
  private arrivalFor(timeMinutes: number, durationMinutes: number): string {
    const total = timeMinutes + durationMinutes;
    const h24 = Math.floor(total / 60) % 24;
    const m = total % 60;
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  formatFare(n: number): string {
    return '₱' + n.toLocaleString('en-PH');
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    if (this.terminal) {
      this.router.navigate(['/terminal', this.terminal.id, 'schedule'], {
        queryParams: { date: this.travelDate },
      });
      return;
    }
    this.router.navigateByUrl('/search');
  }

  /** Select the exact scheduled trip into the normal booking session. */
  select(option: CompareOption) {
    if (option.soldOut) return;
    const dep = option.dep;
    this.bookingService.startBooking({
      operator: dep.operator,
      from: dep.from,
      to: dep.to,
      eta: `Departs ${dep.time}`,
      fare: dep.fare,
      seatsLeft: dep.seats,
      status: dep.status,
      departureTime: dep.time,
    });
    this.bookingService.travelDate = this.travelDate;
    this.bookingService.pickup = this.pickupService.getActive().pickup;
    this.router.navigateByUrl('/booking/trip');
  }
}
