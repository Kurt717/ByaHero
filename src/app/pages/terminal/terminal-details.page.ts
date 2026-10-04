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
  compassOutline,
  timeOutline,
  chevronForwardOutline,
  chevronDownOutline,
  locateOutline,
  ticketOutline,
  businessOutline,
  navigateOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import {
  RouteCatalogService,
  TerminalDeparture,
  TerminalInfo,
  CatalogRoute,
} from '../../services/route-catalog.service';
import { RouteStopsService, type TimedRouteStop } from '../../services/route-stops.service';
import { RouteStopTimelineComponent } from '../../components/route-stop-timeline/route-stop-timeline.component';
import { BookingService } from '../booking/booking.service';
import { PickupService } from '../../services/pickup.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'arrow-forward-outline': arrowForwardOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'compass-outline': compassOutline,
  'time-outline': timeOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'chevron-down-outline': chevronDownOutline,
  'locate-outline': locateOutline,
  'ticket-outline': ticketOutline,
  'business-outline': businessOutline,
  'navigate-outline': navigateOutline,
  'swap-horizontal-outline': swapHorizontalOutline,
});

interface DayOption {
  iso: string;
  dow: string;
  day: string;
}

/**
 * Digital terminal: the on-foot visit, without going there. Header + about
 * + facilities + operators, then routes from this terminal. Tapping a route
 * expands its schedule (travel date → departures → Reserve into the normal
 * booking flow with the exact slot time). Driver/vehicle are never claimed —
 * the operator assigns those later.
 */
@Component({
  selector: 'app-terminal-details',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, RouteStopTimelineComponent],
  templateUrl: './terminal-details.page.html',
  styleUrls: ['./terminal-details.page.scss'],
})
export class TerminalDetailsPage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private catalog = inject(RouteCatalogService);
  private routeStops = inject(RouteStopsService);
  private bookingService = inject(BookingService);
  private pickupService = inject(PickupService);

  terminal: TerminalInfo | null = null;
  expandedRouteId: string | null = null;

  days: DayOption[] = [];
  selectedDate = '';
  /** Rider pair forwarded from Search (board/alight stop ids). Consumed by
   *  Reserve so the booking keeps the chosen stretch and per-seat fare. */
  riderBoard: string | null = null;
  riderAlight: string | null = null;

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      bus,
      calendarOutline,
      compassOutline,
      timeOutline,
      chevronForwardOutline,
      chevronDownOutline,
      locateOutline,
      ticketOutline,
      businessOutline,
      navigateOutline,
      swapHorizontalOutline,
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
    // Restore the travel date when returning from the full schedule board
    // (Back preserves ?date=), otherwise start on today.
    const dateParam = this.route.snapshot.queryParamMap.get('date');
    this.selectedDate =
      dateParam && this.days.some((d) => d.iso === dateParam)
        ? dateParam
        : (this.days[0]?.iso ?? '');
    // Deep entry from a route card (Search → Popular Routes) opens that
    // route's schedule directly.
    const routeId = this.route.snapshot.queryParamMap.get('route');
    if (routeId && this.routes.some((r) => r.id === routeId)) {
      this.expandedRouteId = routeId;
    }
    // Rider pair from Search (validated again at booking time).
    this.riderBoard = this.route.snapshot.queryParamMap.get('board');
    this.riderAlight = this.route.snapshot.queryParamMap.get('alight');
  }

  /** Today + next 5 days, same string format as the booking flow. */
  private buildDays() {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const out: DayOption[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({
        iso: d.toDateString(),
        dow: i === 0 ? 'Today' : names[d.getDay()],
        day: String(d.getDate()),
      });
    }
    this.days = out;
  }

  get routes(): CatalogRoute[] {
    return this.terminal ? this.catalog.routesFromTerminal(this.terminal) : [];
  }

  get operators(): string[] {
    return this.terminal ? this.catalog.operatorsAtTerminal(this.terminal) : [];
  }

  /** Every scheduled departure from this terminal (all routes, time-sorted).
   *  Derived from the catalog — no fabricated timetable. */
  get allDepartures(): TerminalDeparture[] {
    if (!this.terminal) return [];
    return this.catalog.departuresForTerminal(this.terminal.name);
  }

  /** Strongest-section shortlist for the selected date: next departures
   *  first (already-passed slots hidden for today), capped at 4. */
  get upcomingDepartures(): TerminalDeparture[] {
    const list = this.isTodaySelected
      ? this.allDepartures.filter((d) => !this.isDeparted(d))
      : this.allDepartures;
    return list.slice(0, 4);
  }

  get departuresCount(): number {
    return this.allDepartures.length;
  }

  /** Comparison needs at least 2 reservable departures for the selected date. */
  get canCompare(): boolean {
    const list = this.isTodaySelected
      ? this.allDepartures.filter((d) => !this.isDeparted(d))
      : this.allDepartures;
    return list.length >= 2;
  }

  /** Fare comparison for this terminal + selected travel date. */
  openCompare() {
    if (!this.terminal || !this.canCompare) return;
    this.router.navigate(['/booking/compare'], {
      queryParams: {
        terminal: this.terminal.id,
        date: this.selectedDate,
        dest: 'all',
        ...this.riderPairParams(),
      },
    });
  }

  /** Unique destinations served from this terminal (for filter chips /
   *  route index). Derived from catalog routes only. */
  get destinations(): string[] {
    const seen = new Set<string>();
    for (const r of this.routes) seen.add(r.to);
    return [...seen];
  }

  /** Presentation index only ("01", "02") — not a production route number. */
  routeNo(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  departuresFor(routeId: string): TerminalDeparture[] {
    if (!this.terminal) return [];
    return this.catalog
      .departuresForTerminal(this.terminal.name)
      .filter((d) => d.routeId === routeId);
  }

  /** Compact canonical stop preview for an expanded route — ETAs anchor
   *  on the route's first listed departure + selected travel date. */
  stopsPreview(routeId: string): TimedRouteStop[] {
    const first = this.departuresFor(routeId)[0];
    const view = this.routeStops.previewForRoute(
      routeId,
      this.selectedDate,
      first?.time ?? '',
    );
    return view.stops;
  }

  stopCount(routeId: string): number {
    return this.routeStops.stopsForRoute(routeId).length;
  }

  get isTodaySelected(): boolean {
    return this.days[0]?.iso === this.selectedDate;
  }

  /** A slot already passed today can't be reserved (device clock). */
  isDeparted(dep: TerminalDeparture): boolean {
    if (!this.isTodaySelected) return false;
    const now = new Date();
    return dep.timeMinutes <= now.getHours() * 60 + now.getMinutes();
  }

  toggleRoute(routeId: string) {
    this.expandedRouteId = this.expandedRouteId === routeId ? null : routeId;
    this.syncUrl();
  }

  setDay(iso: string) {
    this.selectedDate = iso;
    this.syncUrl();
  }

  /** Mirror date + expanded route into this entry's URL (replace, not push)
   *  so popping back from the full schedule restores the same state instead
   *  of resetting to today. Same-component navigation never re-runs ngOnInit,
   *  so in-memory state is untouched. */
  private syncUrl() {
    if (!this.terminal) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        date: this.selectedDate,
        route: this.expandedRouteId,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Dedicated departure board. Preserves the picked travel date (and an
   *  optional route focus) so Back returns to the same terminal state. */
  openFullSchedule(routeId?: string) {
    if (!this.terminal) return;
    this.router.navigate(['/terminal', this.terminal.id, 'schedule'], {
      queryParams: {
        date: this.selectedDate,
        ...(routeId ? { route: routeId } : {}),
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

  /** Reserve a scheduled departure: operator/route/date/EXACT slot time
   *  enter the normal booking session (Trip Details → Seats → Payment).
   *  A forwarded rider pair keeps the chosen stretch and per-seat fare. */
  reserve(dep: TerminalDeparture) {
    if (this.isDeparted(dep)) return;
    this.bookingService.startBooking({
      operator: dep.operator,
      from: dep.from,
      to: dep.to,
      eta: `Departs ${dep.time}`,
      fare: dep.fare,
      seatsLeft: dep.seats,
      status: dep.status,
      departureTime: dep.time,
    }, this.riderPairOpts());
    this.bookingService.travelDate = this.selectedDate;
    this.bookingService.pickup = this.pickupService.getActive().pickup;
    this.router.navigateByUrl('/booking/trip');
  }

  /** Rider pair as booking options (undefined = full-route fallback). */
  private riderPairOpts(): { boardStopId: string; alightStopId: string } | undefined {
    if (this.riderBoard && this.riderAlight) {
      return { boardStopId: this.riderBoard, alightStopId: this.riderAlight };
    }
    return undefined;
  }

  /** The old terminal-tap behavior, kept as an explicit action. */
  viewOnMap() {
    if (!this.terminal) return;
    this.router.navigate(['/home'], {
      queryParams: {
        lat: this.terminal.lat,
        lng: this.terminal.lng,
        label: this.terminal.name,
      },
    });
  }

  goBack() {
    this.location.back();
  }
}
