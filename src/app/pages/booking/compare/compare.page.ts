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
import { SeatService, departureKeyForTrip } from '../../../services/seat.service';
import {
  NetworkService,
  seatIdsForLayout,
  vehicleById,
} from '../../../services/network.service';

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
  /** Segment fare/seats for the session's board→alight pair when this
   *  departure serves it (same pair, this operator + class). */
  segmentFare?: number;
  segmentSeats?: number;
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
  private network = inject(NetworkService);

  terminal: TerminalInfo | null = null;
  travelDate = '';
  destFilter = 'all';
  sort: CompareSort = 'earliest';
  /** Rider pair forwarded from Search/Terminal (board/alight stop ids). */
  riderBoard: string | null = null;
  riderAlight: string | null = null;

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
    this.riderBoard = this.route.snapshot.queryParamMap.get('board');
    this.riderAlight = this.route.snapshot.queryParamMap.get('alight');
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
          ...this.segmentFor(dep),
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

  /** Session pair header ('' when the session has no corridor segment). */
  get pairLabel(): string {
    return this.bookingService.hasNetworkSegment
      ? `For ${this.bookingService.segmentLabel}`
      : '';
  }

  /** The pair the selection will ride: forwarded rider pair first, then the
   *  live session pair. Undefined = full-route booking. */
  private get finalPair(): { boardStopId: string; alightStopId: string } | undefined {
    if (this.riderBoard && this.riderAlight) {
      return { boardStopId: this.riderBoard, alightStopId: this.riderAlight };
    }
    const s = this.bookingService;
    if (s.boardStopId && s.alightStopId) {
      return { boardStopId: s.boardStopId, alightStopId: s.alightStopId };
    }
    return undefined;
  }

  /** Segment fare + seats for the final pair on one departure (same
   *  board→alight pair, this departure's operator + class). Empty when
   *  there is no pair or this departure cannot serve it — the full route
   *  then applies at the base fare. */
  private segmentFor(dep: TerminalDeparture): {
    segmentFare?: number;
    segmentSeats?: number;
  } {
    const pair = this.finalPair;
    if (!pair) return {};
    try {
      const corridor = this.network.corridor(this.pairCorridorId(pair));
      const depResolved = this.network.resolveTrip(dep.operator, dep.from, dep.to);
      if (!corridor || !depResolved || depResolved.corridor.id !== corridor.id) {
        return {};
      }
      const board = corridor.stops.find((s) => s.id === pair.boardStopId);
      const alight = corridor.stops.find((s) => s.id === pair.alightStopId);
      if (!board || !alight || board.id === alight.id) return {};
      const dir = alight.sequence > board.sequence ? 'forward' : 'reverse';
      if (dir !== depResolved.trip.direction) return {};
      const depLo = Math.min(depResolved.boardSeq, depResolved.alightSeq);
      const depHi = Math.max(depResolved.boardSeq, depResolved.alightSeq);
      const riderLo = Math.min(board.sequence, alight.sequence);
      const riderHi = Math.max(board.sequence, alight.sequence);
      if (riderLo < depLo || riderHi > depHi) return {};
      const vehicle = vehicleById(depResolved.trip.vehicleId);
      const segmentFare = this.network.fareFor({
        corridorId: corridor.id,
        operatorId: depResolved.operatorId ?? depResolved.trip.operatorId,
        serviceClassId: vehicle?.serviceClassId ?? 'aircon',
        boardStopId: board.id,
        alightStopId: alight.id,
      });
      if (!(segmentFare > 0)) return {};
      const seatIds = vehicle ? seatIdsForLayout(vehicle.layout) : [];
      const segmentSeats = seatIds.length
        ? this.seatService.availabilityForSegment(
            departureKeyForTrip(depResolved.trip.tripId, this.travelDate),
            seatIds,
            riderLo,
            riderHi,
            corridor.stops.length - 1,
          ).available
        : 0;
      return { segmentFare, segmentSeats };
    } catch {
      return {};
    }
  }

  /** Corridor holding both pair stops (null when they span corridors or are
   *  unknown — the pair then cannot apply to any departure). */
  private pairCorridorId(pair: { boardStopId: string; alightStopId: string }): string | null {
    for (const c of this.network.corridors) {
      const hasBoard = c.stops.some((s) => s.id === pair.boardStopId);
      const hasAlight = c.stops.some((s) => s.id === pair.alightStopId);
      if (hasBoard && hasAlight) return c.id;
    }
    return null;
  }

  private departuresFrom(dest: string): string {
    return this.baseDepartures().find((d) => d.to === dest)?.from ?? '';
  }

  setSort(sort: CompareSort) {
    this.sort = sort;
  }

  /** A departure with no free seats left cannot be reserved. Uses the
   *  rider's own segment when the session carries one (same key + date as
   *  the seat map), otherwise the legacy full-route adapter. */
  private isSoldOut(dep: TerminalDeparture): boolean {
    const seg = this.segmentFor(dep);
    if (seg.segmentSeats != null) return seg.segmentSeats <= 0;
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

  /** Select the exact scheduled trip into the normal booking session.
   *  The booking rides the pair at its repriced stretch fare when this
   *  departure serves it — otherwise the full route at the base fare, never
   *  a silent fallback to different stops at a different price. */
  select(option: CompareOption) {
    if (option.soldOut) return;
    const dep = option.dep;
    const pair = this.finalPair;
    const seg = this.segmentFor(dep);
    const keptPair = pair && seg.segmentFare != null ? pair : undefined;
    const quote = seg.segmentFare ?? (option.fareValue > 0 ? option.fareValue : null);
    this.bookingService.startBooking({
      operator: dep.operator,
      from: dep.from,
      to: dep.to,
      eta: `Departs ${dep.time}`,
      fare: dep.fare,
      seatsLeft: dep.seats,
      status: dep.status,
      departureTime: dep.time,
    }, {
      ...keptPair,
      ...(quote != null ? { quotedSeatFare: quote } : {}),
    });
    this.bookingService.travelDate = this.travelDate;
    this.bookingService.pickup = this.pickupService.getActive().pickup;
    this.router.navigateByUrl('/booking/trip');
  }
}
