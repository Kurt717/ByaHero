import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  closeOutline,
  searchOutline,
  micOutline,
  busOutline,
  carSportOutline,
  peopleOutline,
  compassOutline,
  closeCircleOutline,
  chevronForwardOutline,
  chevronDownOutline,
  mapOutline,
  locationOutline,
  bus,
  heart,
  heartOutline,
  arrowForwardOutline,
  star,
  businessOutline,
  swapVerticalOutline,
} from 'ionicons/icons';
import { BookingService, TripSummary, parseFareText } from '../booking/booking.service';
import {
  RouteCatalogService,
  TerminalInfo,
} from '../../services/route-catalog.service';
import { PickupService } from '../../services/pickup.service';
import {
  NetworkService,
  TRIPS,
  seatIdsForLayout,
  serviceById,
  tripById,
  vehicleById,
  riderPairForRoute,
} from '../../services/network.service';
import { SeatService, departureKeyForTrip } from '../../services/seat.service';
import {
  PlacePickerComponent,
  PlacePick,
} from '../../components/place-picker/place-picker.component';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'close-outline': closeOutline,
  'search-outline': searchOutline,
  'mic-outline': micOutline,
  'bus-outline': busOutline,
  'car-sport-outline': carSportOutline,
  'people-outline': peopleOutline,
  'compass-outline': compassOutline,
  'close-circle-outline': closeCircleOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'chevron-down-outline': chevronDownOutline,
  'map-outline': mapOutline,
  'location-outline': locationOutline,
  bus: bus,
  heart: heart,
  'heart-outline': heartOutline,
  'arrow-forward-outline': arrowForwardOutline,
  star: star,
  'business-outline': businessOutline,
  'swap-vertical-outline': swapVerticalOutline,
});

type Category = 'bus' | 'uv' | 'shared' | 'all';
type SortOption = 'Fastest' | 'Cheapest' | 'Rated';

/** 'Tuguegarao City Terminal' → 'Tuguegarao City' for compact ride cards. */
function shortStopName(name: string): string {
  return name.replace(/ Terminal$/, '');
}

/** Minutes → the same duration strings the static cards use ('9h 30m'). */
function formatRideDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Deterministic per-trip rating 4.3–4.8 (no randomness in derivations). */
function ratingForTrip(tripId: string): number {
  let h = 0;
  for (let i = 0; i < tripId.length; i++) {
    h = (h * 31 + tripId.charCodeAt(i)) >>> 0;
  }
  return (43 + (h % 6)) / 10;
}

interface CategoryOption {
  id: Category;
  label: string;
  icon: string;
}
interface Destination {
  name: string;
  tag: string;
  lat: number;
  lng: number;
}
interface RouteCard {
  id: string;
  operator: string;
  from: string;
  to: string;
  fare: string;
  duration: string;
  eta: string;
  seats: string;
  status: string;
  mode: Exclude<Category, 'all'>;
  rating: number;
}

/** Which discovery shelf the scope chips show. */
type SearchScope = 'all' | 'terminals' | 'routes' | 'places';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, IonContent, IonIcon, PlacePickerComponent],
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
})
export class SearchPage {
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private catalog = inject(RouteCatalogService);
  private pickupService = inject(PickupService);
  private network = inject(NetworkService);
  private seatService = inject(SeatService);

  query = '';
  /** Pair filter shared with Home: same corridor-segment rules. */
  origin = '';
  destination = '';
  pickerFor: 'origin' | 'destination' | null = null;
  activeCategory: Category = 'all';
  scope: SearchScope = 'all';
  sortBy: SortOption = 'Fastest';
  showSortMenu = false;
  showAllDestinations = false;
  feedbackMessage = '';
  isListening = false;
  sortOptions: SortOption[] = ['Fastest', 'Cheapest', 'Rated'];

  categories: CategoryOption[] = [
    { id: 'bus', label: 'Bus', icon: 'bus-outline' },
    { id: 'uv', label: 'UV Exp', icon: 'car-sport-outline' },
    { id: 'shared', label: 'Shared', icon: 'people-outline' },
    { id: 'all', label: 'All', icon: 'compass-outline' },
  ];

  mostVisited: Destination[] = [
    { name: 'Baguio City', tag: 'Summer Capital', lat: 16.4023, lng: 120.596 },
    { name: 'Vigan City', tag: 'Heritage Town', lat: 17.5747, lng: 120.3869 },
    { name: 'Sagada', tag: 'Mountain Province', lat: 17.0928, lng: 120.9008 },
    { name: 'Laoag City', tag: 'Ilocos Norte', lat: 18.196, lng: 120.5936 },
    { name: 'Tuguegarao City', tag: 'Cagayan', lat: 17.6132, lng: 121.727 },
    { name: 'Banaue', tag: 'Rice Terraces', lat: 16.9107, lng: 121.0594 },
  ];

popularRoutes: RouteCard[] = [
    {
      id: 'r5',
      operator: 'Victory Liner',
      from: 'Manila (Cubao)',
      to: 'Baguio City',
      fare: '₱ 480',
      duration: '5h 30m',
      eta: '18 min away',
      seats: '12 seats left',
      status: 'on-time',
      mode: 'bus',
      rating: 4.8,
    },
    {
      id: 'r6',
      operator: 'Partas',
      from: 'Manila (Cubao)',
      to: 'Laoag City',
      fare: '₱ 850',
      duration: '9h',
      eta: '42 min away',
      seats: '9 seats left',
      status: 'on-time',
      mode: 'bus',
      rating: 4.7,
    },
    {
      id: 'r7',
      operator: 'Florida Bus Line',
      from: 'Manila (PITX)',
      to: 'Vigan City',
      fare: '₱ 750',
      duration: '8h',
      eta: '24 min away',
      seats: '18 seats left',
      status: 'delayed',
      mode: 'bus',
      rating: 4.6,
    },
    {
      id: 'r8',
      operator: 'GV Florida',
      from: 'Cauayan',
      to: 'Tuguegarao',
      fare: '₱ 150',
      duration: '1h 30m',
      eta: '7 min away',
      seats: '3 seats left',
      status: 'on-time',
      mode: 'uv',
      rating: 4.5,
    },
    {
      id: 'r9',
      operator: 'Sagada Shared Van',
      from: 'Baguio City',
      to: 'Sagada',
      fare: '₱ 250',
      duration: '5h',
      eta: '35 min away',
      seats: '5 seats left',
      status: 'on-time',
      mode: 'shared',
      rating: 4.9,
    },
    // Full-span corridor runs so pair filtering has buses to show.
    {
      id: 'r32',
      operator: 'Victory Liner',
      from: 'Tuguegarao',
      to: 'Manila (PITX)',
      fare: '₱ 650',
      duration: '9h 30m',
      eta: '3 min away',
      seats: '14 seats left',
      status: 'on-time',
      mode: 'bus',
      rating: 4.8,
    },
    {
      id: 'r1',
      operator: 'Florida Bus Line',
      from: 'Tuguegarao',
      to: 'Manila (PITX)',
      fare: '₱ 620',
      duration: '9h 30m',
      eta: '4 min away',
      seats: '18 seats left',
      status: 'on-time',
      mode: 'bus',
      rating: 4.4,
    },
    {
      id: 'r33',
      operator: 'Victory Liner',
      from: 'Manila (PITX)',
      to: 'Tuguegarao',
      fare: '₱ 650',
      duration: '9h 30m',
      eta: '6 min away',
      seats: '11 seats left',
      status: 'on-time',
      mode: 'bus',
      rating: 4.7,
    },
  ];

  /** Terminal directory — single source in the catalog. */
  get terminals(): TerminalInfo[] {
    return this.catalog.terminals;
  }

  /** Terminals matching the typed query (name/city); empty query shows all. */
  get filteredTerminals(): TerminalInfo[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.terminals;
    return this.terminals.filter((t) =>
      `${t.name} ${t.city}`.toLowerCase().includes(q),
    );
  }

  routeCount(terminal: TerminalInfo): number {
    return this.catalog.routesFromTerminal(terminal).length;
  }

  setScope(scope: SearchScope) {
    this.scope = scope;
  }

  showSection(section: SearchScope): boolean {
    return this.scope === 'all' || this.scope === section;
  }

constructor() {
    addIcons({searchOutline,closeCircleOutline,micOutline,arrowForwardOutline,chevronForwardOutline,locationOutline,chevronDownOutline,bus,star,mapOutline,arrowBackOutline,closeOutline,heart,heartOutline,businessOutline,swapVerticalOutline,});
  }

  get displayedDestinations(): Destination[] {
    return this.showAllDestinations
      ? this.mostVisited
      : this.mostVisited.slice(0, 4);
  }

  /**
   * Bookable rides synthesized for the typed pickup → destination pair:
   * every network trip whose span covers the rider's stretch becomes a
   * card, priced for the stretch with live seats. This guarantees results
   * for EVERY corridor pair combination — not just the hardcoded popular
   * routes. Empty when no pair is set or no trip serves the pair.
   */
  get pairRides(): RouteCard[] {
    if (!this.hasPair) return [];
    const pair = this.network.resolveTrip('', this.origin, this.destination);
    if (!pair) return [];
    const corridor = pair.corridor;
    const riderForward = pair.boardSeq < pair.alightSeq;
    const riderLo = Math.min(pair.boardSeq, pair.alightSeq);
    const riderHi = Math.max(pair.boardSeq, pair.alightSeq);
    const board = corridor.stops[pair.boardSeq];
    const alight = corridor.stops[pair.alightSeq];
    if (!board || !alight) return [];
    const lastSeq = corridor.stops.length - 1;
    const today = new Date().toDateString();
    const out: RouteCard[] = [];
    for (const trip of TRIPS) {
      if (trip.corridorId !== corridor.id) continue;
      if ((trip.direction === 'forward') !== riderForward) continue;
      const span = this.tripSpanOn(trip.serviceId, corridor.id);
      if (!span || riderLo < span.lo || riderHi > span.hi) continue;
      const vehicle = vehicleById(trip.vehicleId);
      const seatIds = vehicle ? seatIdsForLayout(vehicle.layout) : [];
      if (!seatIds.length) continue;
      const seatsLeft = this.seatService.availabilityForSegment(
        departureKeyForTrip(trip.tripId, today),
        seatIds,
        riderLo,
        riderHi,
        lastSeq,
      ).available;
      if (seatsLeft < 1) continue;
      const cls = vehicle?.serviceClassId ?? 'aircon';
      const fare = this.network.fareFor({
        corridorId: corridor.id,
        operatorId: trip.operatorId,
        serviceClassId: cls,
        boardStopId: board.id,
        alightStopId: alight.id,
      });
      const mins = Math.round(
        (this.network.segmentKm(corridor.id, riderLo, riderHi) /
          (corridor.avgKmh ?? 45)) *
          60,
      );
      out.push({
        id: `pair-${trip.tripId}`,
        operator: this.network.operatorName(trip.operatorId),
        from: shortStopName(board.name),
        to: shortStopName(alight.name),
        fare: `₱ ${fare}`,
        duration: formatRideDuration(mins),
        eta: `Departs ${trip.departureTime}`,
        seats: `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`,
        status: 'on-time',
        mode: cls === 'uv-express' ? 'uv' : cls === 'shared' ? 'shared' : 'bus',
        rating: ratingForTrip(trip.tripId),
      });
    }
    return out;
  }

  /** A trip's served span on a corridor (full span unless the service lists
   *  an explicit short-hop subset). Null when unresolvable. */
  private tripSpanOn(
    serviceId: string | undefined,
    corridorId: string,
  ): { lo: number; hi: number } | null {
    const corridor = this.network.corridor(corridorId);
    if (!corridor) return null;
    const lastSeq = corridor.stops.length - 1;
    if (!serviceId) return { lo: 0, hi: lastSeq };
    const service = serviceById(serviceId);
    if (!service || service.stopsServed === 'all') return { lo: 0, hi: lastSeq };
    const seqs = service.stopsServed
      .map((id) => corridor.stops.find((s) => s.id === id)?.sequence)
      .filter((n): n is number => n != null);
    if (!seqs.length) return null;
    return { lo: Math.min(...seqs), hi: Math.max(...seqs) };
  }

  /** True when a pair is set but no bus line serves it — the empty state
   *  explains instead of showing a bare list. */
  get pairUnservable(): boolean {
    return this.hasPair && this.pairRides.length === 0;
  }

  get filteredPopularRoutes(): RouteCard[] {
    const q = this.query.trim().toLowerCase();
    // Pair mode lists the synthesized pair rides (already stretch-priced
    // with live seats); otherwise the static popular routes.
    const pool =
      this.hasPair && this.pairRides.length ? this.pairRides : this.popularRoutes;
    const byCategory =
      this.activeCategory === 'all'
        ? pool
        : pool.filter((route) => route.mode === this.activeCategory);

    const byQuery = q
      ? byCategory.filter((route) =>
          [
            route.operator,
            route.from,
            route.to,
            route.fare,
            route.duration,
            route.mode,
          ]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      : byCategory;

    // One side typed (no pair yet): narrow to routes touching that place.
    const solo = !this.hasPair
      ? (this.origin.trim() || this.destination.trim()).toLowerCase()
      : '';
    const bySide = solo
      ? byQuery.filter((route) =>
          `${route.operator} ${route.from} ${route.to}`
            .toLowerCase()
            .includes(solo),
        )
      : byQuery;

    return [...bySide].sort((a, b) => {
      if (this.sortBy === 'Cheapest') return this.priceValue(a) - this.priceValue(b);
      if (this.sortBy === 'Rated') return b.rating - a.rating;
      return this.durationMinutes(a) - this.durationMinutes(b);
    }).filter((route) => this.pairServes(route));
  }

  openPicker(field: 'origin' | 'destination') {
    this.pickerFor = field;
  }

  closePicker() {
    this.pickerFor = null;
  }

  onPlacePicked(place: PlacePick) {
    if (this.pickerFor === 'origin') this.origin = place.label;
    else if (this.pickerFor === 'destination') this.destination = place.label;
    this.pickerFor = null;
  }

  swapPair() {
    const current = this.origin;
    this.origin = this.destination;
    this.destination = current;
  }

  clearPair() {
    this.origin = '';
    this.destination = '';
  }

  get hasPair(): boolean {
    return this.origin.trim() !== '' && this.destination.trim() !== '';
  }

  /** Same corridor-segment rule as Home (minus the live bus position —
   *  Search has no sim): corridor span, direction order, seat on stretch. */
  private pairServes(route: RouteCard): boolean {
    if (!this.hasPair) return true;
    const pair = this.network.resolveTrip('', this.origin, this.destination);
    const r = this.network.resolveTrip(route.operator, route.from, route.to);
    if (!pair || !r || r.corridor.id !== pair.corridor.id) return false;
    const forward = r.boardSeq < r.alightSeq;
    if (forward !== pair.boardSeq < pair.alightSeq) return false;
    const riderLo = Math.min(pair.boardSeq, pair.alightSeq);
    const riderHi = Math.max(pair.boardSeq, pair.alightSeq);
    if (
      riderLo < Math.min(r.boardSeq, r.alightSeq) ||
      riderHi > Math.max(r.boardSeq, r.alightSeq)
    ) {
      return false;
    }
    const today = new Date().toDateString();
    const vehicle = vehicleById(r.trip.vehicleId);
    const seatIds = vehicle ? seatIdsForLayout(vehicle.layout) : [];
    if (!seatIds.length) return true;
    return (
      this.seatService.availabilityForSegment(
        departureKeyForTrip(r.trip.tripId, today),
        seatIds,
        riderLo,
        riderHi,
        r.corridor.stops.length - 1,
      ).available >= 1
    );
  }

  /**
   * Card fare sticker: the SAME number checkout will charge per seat.
   * Pair cards from the network already carry the stretch fare; static
   * cards show the stretch fare under a pair, else the full-route network
   * fare, else the catalog text (which checkout parses for legacy trips).
   */
  fareLabelFor(route: RouteCard): string {
    try {
      if (route.id.startsWith('pair-')) return route.fare;
      if (this.hasPair) {
        const seg = this.segmentInfoFor(route);
        if (seg) return `₱ ${seg.fare.toLocaleString('en-PH')}`;
      } else {
        const r = this.network.resolveTrip(route.operator, route.from, route.to);
        if (r) {
          const vehicle = vehicleById(r.trip.vehicleId);
          const lo = Math.min(r.boardSeq, r.alightSeq);
          const hi = Math.max(r.boardSeq, r.alightSeq);
          const fare = this.network.fareFor({
            corridorId: r.corridor.id,
            operatorId: r.operatorId ?? r.trip.operatorId,
            serviceClassId: vehicle?.serviceClassId ?? 'aircon',
            boardStopId: r.corridor.stops[lo].id,
            alightStopId: r.corridor.stops[hi].id,
          });
          if (fare > 0) return `₱ ${fare.toLocaleString('en-PH')}`;
        }
      }
    } catch {
      /* fall through to catalog text */
    }
    return route.fare;
  }

  /** Stretch fare + seats-left for a card under the active pair. */
  segmentInfoFor(route: RouteCard): { fare: number; seatsLeft: number } | null {
    if (!this.hasPair) return null;
    const pair = this.network.resolveTrip('', this.origin, this.destination);
    const r = this.network.resolveTrip(route.operator, route.from, route.to);
    if (!pair || !r || r.corridor.id !== pair.corridor.id) return null;
    const riderLo = Math.min(pair.boardSeq, pair.alightSeq);
    const riderHi = Math.max(pair.boardSeq, pair.alightSeq);
    const board = pair.corridor.stops[pair.boardSeq];
    const alight = pair.corridor.stops[pair.alightSeq];
    const vehicle = vehicleById(r.trip.vehicleId);
    const today = new Date().toDateString();
    const fare = this.network.fareFor({
      corridorId: pair.corridor.id,
      operatorId: r.operatorId ?? r.trip.operatorId,
      serviceClassId: vehicle?.serviceClassId ?? 'aircon',
      boardStopId: board.id,
      alightStopId: alight.id,
    });
    const seatIds = vehicle ? seatIdsForLayout(vehicle.layout) : [];
    const seatsLeft = seatIds.length
      ? this.seatService.availabilityForSegment(
          departureKeyForTrip(r.trip.tripId, today),
          seatIds,
          riderLo,
          riderHi,
          pair.corridor.stops.length - 1,
        ).available
      : 0;
    return { fare, seatsLeft };
  }

  goBack() {
    this.router.navigateByUrl('/home');
  }
  clearQuery() {
    this.query = '';
    this.feedbackMessage = '';
  }
  selectCategory(id: Category) {
    this.activeCategory = id;
  }
  toggleSortMenu() {
    this.showSortMenu = !this.showSortMenu;
  }
  setSort(option: SortOption, event?: Event) {
    event?.stopPropagation();
    this.sortBy = option;
    this.showSortMenu = false;
  }
selectDestination(dest: Destination) {
    this.query = dest.name;
    this.feedbackMessage = `Showing routes that match ${dest.name}.`;
  }

  isFavorite(id: string): boolean {
    return this.catalog.isFavorite(id);
  }

  toggleFavorite(id: string, event: Event) {
    event.stopPropagation();
    this.catalog.toggleFavorite(id);
  }

  toggleDestinations() {
    this.showAllDestinations = !this.showAllDestinations;
  }

  /** Transport-type badge shown on route cards (recognition over recall). */
  modeLabel(mode: Exclude<Category, 'all'>): string {
    switch (mode) {
      case 'bus':
        return 'BUS';
      case 'uv':
        return 'UV EXPRESS';
      case 'shared':
        return 'SHARED';
    }
  }

  /** Price rendered without the data's spacing, e.g. "₱ 850" → "₱850". */
  compactFare(fare: string): string {
    return fare.replace(/\s+/g, '');
  }

  submitSearch() {
    const first = this.filteredPopularRoutes[0];
    if (first) {
      this.feedbackMessage = `${this.filteredPopularRoutes.length} route${
        this.filteredPopularRoutes.length > 1 ? 's' : ''
      } found. Tap a route to view its schedule.`;
      return;
    }
    this.feedbackMessage = 'No matching route yet. Try another city or operator.';
  }

  bookRoute(route: RouteCard) {
    const trip: TripSummary = {
      operator: route.operator,
      from: route.from,
      to: route.to,
      eta: route.eta,
      fare: route.fare,
      seatsLeft: route.seats,
      status: route.status,
    };
    // Lock the sticker price the commuter tapped (stretch fare under a pair,
    // otherwise the full-route fare) so checkout matches this card.
    const quote = parseFareText(this.fareLabelFor(route));
    this.bookingService.startBooking(trip, {
      ...this.riderPairOptions(route),
      ...(quote > 0 ? { quotedSeatFare: quote } : {}),
    });
    this.bookingService.pickup = this.pickupService.getActive().pickup;
    this.router.navigateByUrl('/booking/trip');
  }

  /** Rider's chosen origin→destination as stop ids on the route's corridor
   *  (undefined = defaults / full-route legacy path). */
  private riderPairOptions(route: RouteCard): { boardStopId: string; alightStopId: string } | undefined {
    if (!this.hasPair) return undefined;
    try {
      const pair = this.network.resolveTrip('', this.origin, this.destination);
      const r = this.network.resolveTrip(route.operator, route.from, route.to);
      if (!pair || !r) return undefined;
      return riderPairForRoute(
        pair.corridor.id,
        pair.boardSeq,
        pair.alightSeq,
        pair.corridor.stops,
        r.corridor.id,
        r.boardSeq,
        r.alightSeq,
      );
    } catch {
      return undefined;
    }
  }

  /** Route → its origin terminal's schedule (date → departures → Reserve).
   *  Falls back to direct booking when no terminal serves that origin.
   *  The rider pair rides along as board/alight stop ids so Reserve keeps
   *  the chosen stretch (and its per-seat fare) instead of the full route. */
  openRouteSchedule(route: RouteCard) {
    const terminal = this.catalog.terminalForCity(route.from);
    if (terminal) {
      const pair = this.riderPairOptions(route);
      this.router.navigate(['/terminal', terminal.id], {
        queryParams: {
          route: route.id,
          ...(pair ? { board: pair.boardStopId, alight: pair.alightStopId } : {}),
        },
      });
      return;
    }
    this.bookRoute(route);
  }

  openTerminal(terminal: TerminalInfo) {
    this.router.navigate(['/terminal', terminal.id]);
  }

  startVoiceSearch() {
    const recognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!recognitionCtor) {
      this.feedbackMessage = 'Voice search is not available in this browser.';
      return;
    }

    const recognition = new recognitionCtor();
    recognition.lang = 'en-PH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    this.isListening = true;
    this.feedbackMessage = 'Listening...';

    recognition.onresult = (event: any) => {
      this.query = event.results[0][0].transcript;
      this.isListening = false;
      this.submitSearch();
    };
    recognition.onerror = () => {
      this.isListening = false;
      this.feedbackMessage = 'Voice search could not hear a route.';
    };
    recognition.onend = () => {
      this.isListening = false;
    };
    recognition.start();
  }

  private priceValue(route: RouteCard): number {
    return Number(route.fare.replace(/[^0-9.]/g, '')) || 0;
  }

  private durationMinutes(route: RouteCard): number {
    const hours = Number(/(\d+)h/.exec(route.duration)?.[1] ?? 0);
    const minutes = Number(/(\d+)m/.exec(route.duration)?.[1] ?? 0);
    return hours * 60 + minutes;
  }
}
