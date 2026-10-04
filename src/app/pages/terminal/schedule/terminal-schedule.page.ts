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
  chevronForwardOutline,
  closeCircleOutline,
  locateOutline,
  swapHorizontalOutline,
  ticketOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  RouteCatalogService,
  TerminalDeparture,
  TerminalInfo,
} from '../../../services/route-catalog.service';
import { RouteStopsService, type TimedRouteStop } from '../../../services/route-stops.service';
import { RouteStopTimelineComponent } from '../../../components/route-stop-timeline/route-stop-timeline.component';
import { BookingService, parseFareText } from '../../booking/booking.service';
import { PickupService } from '../../../services/pickup.service';
import {
  NetworkService,
  seatIdsForLayout,
  vehicleById,
} from '../../../services/network.service';
import { SeatService, departureKeyForTrip } from '../../../services/seat.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'arrow-forward-outline': arrowForwardOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'close-circle-outline': closeCircleOutline,
  'locate-outline': locateOutline,
  'swap-horizontal-outline': swapHorizontalOutline,
  'ticket-outline': ticketOutline,
  'time-outline': timeOutline,
});

interface DayOption {
  iso: string;
  dow: string;
  day: string;
  month: string;
}

/**
 * Full departure board for one terminal: travel date → destination filter →
 * scheduled departures → Reserve into the normal booking flow.
 *
 * Data comes only from RouteCatalogService (deterministic slots derived from
 * catalog routes). No drivers, plates, or platforms are shown — the operator
 * assigns those later. Query params `date` and `route` restore the state the
 * user left on Terminal Details, and Back returns there with the same params
 * so nothing is reset.
 */
@Component({
  selector: 'app-terminal-schedule',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, RouteStopTimelineComponent],
  templateUrl: './terminal-schedule.page.html',
  styleUrls: ['./terminal-schedule.page.scss'],
})
export class TerminalSchedulePage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private catalog = inject(RouteCatalogService);
  private routeStops = inject(RouteStopsService);
  private bookingService = inject(BookingService);
  private pickupService = inject(PickupService);
  private network = inject(NetworkService);
  private seatService = inject(SeatService);

  terminal: TerminalInfo | null = null;
  days: DayOption[] = [];
  selectedDate = '';
  /** Destination filter; 'all' shows the whole board. */
  destFilter = 'all';
  /** Route id that focused this board (deep entry from Search/Terminal). */
  focusedRouteId: string | null = null;
  /** Rider pair forwarded from Search (board/alight stop ids). */
  riderBoard: string | null = null;
  riderAlight: string | null = null;

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      bus,
      calendarOutline,
      chevronForwardOutline,
      closeCircleOutline,
      locateOutline,
      swapHorizontalOutline,
      ticketOutline,
      timeOutline,
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.terminal = id ? (this.catalog.terminalById(id) ?? null) : null;
    if (!this.terminal) {
      this.router.navigateByUrl('/search');
      return;
    }
    this.buildDays();
    // Restore the travel date picked on Terminal Details (or deep link).
    const dateParam = this.route.snapshot.queryParamMap.get('date');
    this.selectedDate =
      dateParam && this.days.some((d) => d.iso === dateParam)
        ? dateParam
        : (this.days[0]?.iso ?? '');
    // A focused route narrows the board to its destination.
    const routeParam = this.route.snapshot.queryParamMap.get('route');
    const focused = routeParam
      ? this.catalog.find(routeParam) ?? null
      : null;
    this.focusedRouteId = focused ? focused.id : null;
    this.destFilter = focused ? focused.to : 'all';
    // Rider pair forwarded from Search via Terminal Details.
    this.riderBoard = this.route.snapshot.queryParamMap.get('board');
    this.riderAlight = this.route.snapshot.queryParamMap.get('alight');
  }

  /** Today + next 6 days, same string format as the booking flow. */
  private buildDays() {
    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const out: DayOption[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({
        iso: d.toDateString(),
        dow: i === 0 ? 'Today' : dowNames[d.getDay()],
        day: String(d.getDate()),
        month: monthNames[d.getMonth()],
      });
    }
    this.days = out;
  }

  /** Every scheduled departure from this terminal, time-sorted. */
  get allDepartures(): TerminalDeparture[] {
    if (!this.terminal) return [];
    return this.catalog.departuresForTerminal(this.terminal.name);
  }

  get destinations(): string[] {
    const seen = new Set<string>();
    for (const d of this.allDepartures) seen.add(d.to);
    return [...seen];
  }

  get visibleDepartures(): TerminalDeparture[] {
    const list =
      this.destFilter === 'all'
        ? this.allDepartures
        : this.allDepartures.filter((d) => d.to === this.destFilter);
    if (this.isTodaySelected) {
      // Keep departed slots visible but marked, so the board still reads as
      // a full-day timetable; they cannot be reserved.
      return [...list].sort((a, b) => {
        const ad = this.isDeparted(a) ? 1 : 0;
        const bd = this.isDeparted(b) ? 1 : 0;
        return ad - bd || a.timeMinutes - b.timeMinutes;
      });
    }
    return list;
  }

  get availableCount(): number {
    return this.visibleDepartures.filter((d) => !this.isDeparted(d)).length;
  }

  /** Comparison needs at least 2 reservable options in the current view. */
  get canCompare(): boolean {
    return this.availableCount >= 2;
  }

  /** Fare comparison for this terminal + date (+ destination filter). */
  openCompare() {
    if (!this.terminal || !this.canCompare) return;
    this.router.navigate(['/booking/compare'], {
      queryParams: {
        terminal: this.terminal.id,
        date: this.selectedDate,
        dest: this.destFilter,
        ...this.riderPairParams(),
      },
    });
  }

  /** Rider pair as query params (empty when none was forwarded). */
  private riderPairParams(): Record<string, string> {
    if (this.riderBoard && this.riderAlight) {
      return { board: this.riderBoard, alight: this.riderAlight };
    }
    return {};
  }

  /** The forwarded rider pair repriced on this departure (LTFRB base +
   *  per-km rule for this operator + class over the pair's km — never a
   *  ratio of the full fare). Null without a pair or when this departure
   *  cannot serve the stretch. */
  pairStretchFor(dep: TerminalDeparture): {
    fare: number;
    seatsLeft: number;
    boardName: string;
    alightName: string;
    km: number;
  } | null {
    if (!this.riderBoard || !this.riderAlight) return null;
    try {
      const resolved = this.network.resolveTrip(dep.operator, dep.from, dep.to);
      if (!resolved) return null;
      const corridor = resolved.corridor;
      const board = corridor.stops.find((s) => s.id === this.riderBoard);
      const alight = corridor.stops.find((s) => s.id === this.riderAlight);
      if (!board || !alight || board.id === alight.id) return null;
      const dir = alight.sequence > board.sequence ? 'forward' : 'reverse';
      if (dir !== resolved.trip.direction) return null;
      const depLo = Math.min(resolved.boardSeq, resolved.alightSeq);
      const depHi = Math.max(resolved.boardSeq, resolved.alightSeq);
      const lo = Math.min(board.sequence, alight.sequence);
      const hi = Math.max(board.sequence, alight.sequence);
      if (lo < depLo || hi > depHi) return null;
      const vehicle = vehicleById(resolved.trip.vehicleId);
      const fare = this.network.fareFor({
        corridorId: corridor.id,
        operatorId: resolved.operatorId ?? resolved.trip.operatorId,
        serviceClassId: vehicle?.serviceClassId ?? 'aircon',
        boardStopId: board.id,
        alightStopId: alight.id,
      });
      if (!(fare > 0)) return null;
      const seatIds = vehicle ? seatIdsForLayout(vehicle.layout) : [];
      const seatsLeft = seatIds.length
        ? this.seatService.availabilityForSegment(
            departureKeyForTrip(resolved.trip.tripId, this.selectedDate),
            seatIds,
            lo,
            hi,
            corridor.stops.length - 1,
          ).available
        : 0;
      return {
        fare,
        seatsLeft,
        boardName: board.name,
        alightName: alight.name,
        km: Math.abs(alight.km - board.km),
      };
    } catch {
      return null;
    }
  }

  get isTodaySelected(): boolean {
    return this.days[0]?.iso === this.selectedDate;
  }

  isDeparted(dep: TerminalDeparture): boolean {
    if (!this.isTodaySelected) return false;
    const now = new Date();
    return dep.timeMinutes <= now.getHours() * 60 + now.getMinutes();
  }

  setDay(iso: string) {
    this.selectedDate = iso;
  }

  /** Stop count for a departure's route (board rows stay compact). */
  stopCount(dep: TerminalDeparture): number {
    return this.routeStops.stopsForRoute(dep.routeId).length;
  }

  /**
   * Expandable downstream fares for a departure: every town/terminal ahead
   * of this terminal on the corridor, with the segment fare and seats left
   * on that segment for the selected date. Empty when off-corridor.
   */
  downstreamFares(dep: TerminalDeparture): {
    town: string;
    fare: number;
    seatsLeft: number;
  }[] {
    if (!this.terminal) return [];
    const resolved = this.network.resolveTrip(dep.operator, dep.from, dep.to);
    if (!resolved) return [];
    const corridor = resolved.corridor;
    const boardIdx = corridor.stops.findIndex((s) =>
      s.name.toLowerCase().includes(this.terminal!.city.toLowerCase()) ||
      this.terminal!.city.toLowerCase().includes(
        s.name.replace(/ terminal$/i, '').toLowerCase(),
      ),
    );
    if (boardIdx < 0) return [];
    const forward = resolved.boardSeq < resolved.alightSeq;
    const downstream = forward
      ? corridor.stops.filter((s) => s.sequence > boardIdx)
      : corridor.stops.filter((s) => s.sequence < boardIdx).reverse();
    const vehicle = vehicleById(resolved.trip.vehicleId);
    const seatIds = vehicle ? seatIdsForLayout(vehicle.layout) : [];
    const board = corridor.stops[boardIdx];
    return downstream
      .filter((s) => s.kind !== 'roadside')
      .map((s) => {
        const fare = this.network.fareFor({
          corridorId: corridor.id,
          operatorId: resolved.operatorId ?? resolved.trip.operatorId,
          serviceClassId: vehicle?.serviceClassId ?? 'aircon',
          boardStopId: board.id,
          alightStopId: s.id,
        });
        const seatsLeft = seatIds.length
          ? this.seatService.availabilityForSegment(
              departureKeyForTrip(resolved.trip.tripId, this.selectedDate),
              seatIds,
              Math.min(board.sequence, s.sequence),
              Math.max(board.sequence, s.sequence),
              corridor.stops.length - 1,
            ).available
          : 0;
        return { town: s.name, fare, seatsLeft };
      });
  }

  /** Canonical stop preview for the currently filtered destination —
   *  ETAs anchor on the earliest visible departure + selected date. */
  get filteredStopsPreview(): TimedRouteStop[] {
    if (this.destFilter === 'all' || !this.visibleDepartures.length) return [];
    const first = [...this.visibleDepartures].sort(
      (a, b) => a.timeMinutes - b.timeMinutes,
    )[0];
    if (!first) return [];
    return this.routeStops.previewForRoute(
      first.routeId,
      this.selectedDate,
      first.time,
    ).stops;
  }

  setDestFilter(dest: string) {
    this.destFilter = dest;
    if (dest === 'all') this.focusedRouteId = null;
  }

  clearFocus() {
    this.focusedRouteId = null;
    this.destFilter = 'all';
  }

  /** Back to Terminal Details. Pops history (no new entry pushed) so
   *  Terminal → Schedule → Back → Back walks Terminal → Search instead of
   *  looping between the two pages. Deep links with no history fall back to
   *  an explicit navigation that REPLACES this entry. */
  goBack() {
    if (!this.terminal) {
      this.location.back();
      return;
    }
    let canPop = false;
    try {
      canPop = window.history.length > 1;
    } catch {
      canPop = false;
    }
    if (canPop) {
      this.location.back();
      return;
    }
    this.router.navigate(['/terminal', this.terminal.id], {
      queryParams: {
        date: this.selectedDate,
        ...(this.focusedRouteId ? { route: this.focusedRouteId } : {}),
      },
      replaceUrl: true,
    });
  }

  /** Reserve a scheduled departure: operator/route/date/EXACT slot time
   *  enter the normal booking session (Trip Details → Seats → Payment).
   *  The booking rides the rider's stretch at its repriced fare when this
   *  departure serves it — otherwise the full route at the board fare, never
   *  a silent fallback to different stops at a different price. */
  reserve(dep: TerminalDeparture) {
    if (this.isDeparted(dep)) return;
    const stretch = this.pairStretchFor(dep);
    const pair =
      stretch && this.riderBoard && this.riderAlight
        ? { boardStopId: this.riderBoard, alightStopId: this.riderAlight }
        : undefined;
    const boardFare = parseFareText(dep.fare);
    const quote = stretch?.fare ?? (boardFare > 0 ? boardFare : null);
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
      ...pair,
      ...(quote != null ? { quotedSeatFare: quote } : {}),
    });
    this.bookingService.travelDate = this.selectedDate;
    this.bookingService.pickup = this.pickupService.getActive().pickup;
    this.router.navigateByUrl('/booking/trip');
  }
}
