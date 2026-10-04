import L from 'leaflet';

import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  ChangeDetectorRef,
  inject,
} from '@angular/core';

import { Subscription } from 'rxjs';

import { FormsModule } from '@angular/forms';

import { IonContent, IonIcon, IonAvatar } from '@ionic/angular';

import { Router, ActivatedRoute } from '@angular/router';

import { addIcons } from 'ionicons';

import {
  navigateOutline,
  heartOutline,
  heart,
  timeOutline,
  mapOutline,
  arrowForwardOutline,
  busOutline,
  peopleOutline,
  home,
  personOutline,
  radioButtonOn,
  swapVerticalOutline,
  listOutline,
  alertCircle,
  chevronForwardOutline,
  carSportOutline,
  compassOutline,
  bus,
  search,
  locateOutline,
  addOutline,
  removeOutline,
  starSharp,
  handLeftOutline,
  flash,
  sunnyOutline,
  cloudyOutline,
  rainyOutline,
  thunderstormOutline,
  flagOutline,
} from 'ionicons/icons';

import { ProfileService, DEFAULT_AVATAR } from '../profile/profile.service';

import {
  BookingService,
  TripSummary,
  parseFareText,
} from '../booking/booking.service';

import { PickupService } from '../../services/pickup.service';

import {
  HailRequest,
  HailService,
} from '../../services/hail.service';

import {
  CatalogRoute,
  RouteCatalogService,
  RouteMode,
  CatalogSort,
} from '../../services/route-catalog.service';

import { TicketService } from '../bookings/ticket.service';

import { TravelConditionsService } from '../../services/travel-conditions.service';

import {
  NetworkService,
  corridorById,
  tripById,
  vehicleById,
  seatIdsForLayout,
  riderPairForRoute,
  TRIPS,
} from '../../services/network.service';
import { SeatService, departureKeyForTrip } from '../../services/seat.service';

import { TripReminderCardComponent } from '../../components/trip-reminder-card/trip-reminder-card.component';

import { TripReminderService } from '../../services/trip-reminder.service';

import {
  PlacePickerComponent,
  PlacePick,
} from '../../components/place-picker/place-picker.component';

addIcons({
  'navigate-outline': navigateOutline,
  'heart-outline': heartOutline,
  heart: heart,
  'time-outline': timeOutline,
  'map-outline': mapOutline,
  'arrow-forward-outline': arrowForwardOutline,
  'bus-outline': busOutline,
  'people-outline': peopleOutline,
  home: home,
  'person-outline': personOutline,
  'radio-button-on': radioButtonOn,
  'swap-vertical-outline': swapVerticalOutline,
  'list-outline': listOutline,
  'alert-circle': alertCircle,
  'chevron-forward-outline': chevronForwardOutline,
  'car-sport-outline': carSportOutline,
  'compass-outline': compassOutline,
  bus: bus,
  search: search,
  'locate-outline': locateOutline,
  'add-outline': addOutline,
  'remove-outline': removeOutline,
  'star-sharp': starSharp,
  'hand-left-outline': handLeftOutline,
  flash: flash,
  'sunny-outline': sunnyOutline,
  'cloudy-outline': cloudyOutline,
  'rainy-outline': rainyOutline,
  'thunderstorm-outline': thunderstormOutline,
  'flag-outline': flagOutline,
});

interface FocusPin {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Shape shared by every route item — used by both List Mode's
 * trip cards and Map Mode's marker info card, so the two views always
 * carry the exact same catalog route.
 */
type NearbyRoute = CatalogRoute;

/**
 * One simulated bus per route, owned as DATA (not markers): the single
 * source of truth consumed by Map View markers, List View cards and the
 * hail session alike. Shuttles origin ↔ destination, standing in for a
 * real GPS feed (swap for a websocket/poll once operators stream it).
 */
interface BusSim {
  route: NearbyRoute;

  /** Stable bus number shown in both views ("Bus 107"). */
  busNo: string;

  progress: number;

  direction: 1 | -1;

  origin: [number, number];

  dest: [number, number];

  marker: L.Marker | null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FormsModule,
    IonContent,
    IonIcon,
    IonAvatar,
    TripReminderCardComponent,
    PlacePickerComponent,
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})

export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  hailView: 'list' | 'map' | null = null;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private bookingService = inject(BookingService);
  private profileService = inject(ProfileService);
  private hailService = inject(HailService);
  private catalog = inject(RouteCatalogService);
  private ticketService = inject(TicketService);
  private reminderService = inject(TripReminderService);
  private conditionsService = inject(TravelConditionsService);
  private pickupService = inject(PickupService);
  private network = inject(NetworkService);
  private seatService = inject(SeatService);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  /** Empty pickup/destination = no filter yet: the list + map show every
   *  running bus. Typing both filters to the rider's stretch with the
   *  segment price (see displayRoutes / segmentInfoFor). */
  readonly ORIGIN_PLACEHOLDER = 'Where from?';

  readonly DEST_PLACEHOLDER = 'Where to?';

  selectedView: 'list' | 'map' = 'list';

  origin = '';

  destination = '';

  /** Both ends typed: the app can filter to the rider's own stretch. */
  get hasPair(): boolean {
    return this.origin.trim() !== '' && this.destination.trim() !== '';
  }

  /** Grab-style place picker sheet: null = closed. */
  pickerFor: 'origin' | 'destination' | null = null;

  openPicker(field: 'origin' | 'destination') {
    this.pickerFor = field;
  }

  closePicker() {
    this.pickerFor = null;
  }

  onPlacePicked(place: PlacePick) {
    if (this.pickerFor === 'origin') {
      this.origin = place.label;
    } else if (this.pickerFor === 'destination') {
      this.destination = place.label;
    }
    this.pickerFor = null;
  }

  swapOriginDestination() {
    const current = this.origin;
    this.origin = this.destination;
    this.destination = current;
  }

  clearPair() {
    this.origin = '';
    this.destination = '';
  }

  /** Terminal display names match routes by their city. */
  private placeQuery(label: string): string {
    const q = label.trim().toLowerCase();
    const terminal = this.catalog.terminals.find(
      (t) => t.name.toLowerCase() === q,
    );
    return terminal ? terminal.city : label.trim();
  }

  userName = 'Nonie';

  userAvatar = DEFAULT_AVATAR;

  /** Local fallback if a saved avatar URL ever fails to load. */
  readonly fallbackAvatar = DEFAULT_AVATAR;

  activeCategory: 'all' | RouteMode = 'all';

  sortBy: CatalogSort = 'Fastest';

  readonly categories: {
    id: 'all' | RouteMode;
    label: string;
    icon: string;
  }[] = [
    {
      id: 'all',
      label: 'All',
      icon: 'compass-outline',
    },
    {
      id: 'bus',
      label: 'Bus',
      icon: 'bus-outline',
    },
    {
      id: 'uv',
      label: 'UV Exp',
      icon: 'car-sport-outline',
    },
    {
      id: 'shared',
      label: 'Shared',
      icon: 'people-outline',
    },
  ];

  readonly sortOptions: CatalogSort[] = [
    'Fastest',
    'Cheapest',
    'Rated',
  ];

  /**
   * Active routes shown in the list. Home owns the pickup + destination
   * choice: with both set, only buses passing through both places — in
   * order, not yet past pickup, with a free seat on the rider's stretch —
   * appear. Defaults (or one side) fall back to the text filter.
   */
  get displayRoutes(): NearbyRoute[] {
    const fromQ = this.origin.trim();
    const toQ = this.destination.trim();
    if (fromQ && toQ) {
      return this.catalog.sortRoutes(
        this.segmentFilteredRoutes(fromQ, toQ),
        this.sortBy,
      );
    }
    const matches = this.catalog.queryRoutes(
      fromQ ? this.placeQuery(this.origin) : '',
      toQ ? this.placeQuery(this.destination) : '',
      this.activeCategory,
    );
    return this.catalog.sortRoutes(matches, this.sortBy);
  }

  /**
   * Corridor-segment filter (scenarios 1–6): a bus appears only when the
   * rider's pickup and destination are both stops on its corridor span, in
   * travel order, the bus hasn't passed the pickup, and a seat is free on
   * the rider's stretch (not the whole route).
   */
  private segmentFilteredRoutes(fromLabel: string, toLabel: string): NearbyRoute[] {
    const pair = this.network.resolveTrip('', fromLabel, toLabel);
    if (!pair) return [];
    const corridor = pair.corridor;
    const riderForward = pair.boardSeq < pair.alightSeq;
    const riderLo = Math.min(pair.boardSeq, pair.alightSeq);
    const riderHi = Math.max(pair.boardSeq, pair.alightSeq);
    const today = new Date().toDateString();
    const out: NearbyRoute[] = [];
    const base = this.catalog.queryRoutes('', '', this.activeCategory);
    for (const route of base) {
      const r = this.network.resolveTrip(route.operator, route.from, route.to);
      if (!r || r.corridor.id !== corridor.id) continue;
      const forward = r.boardSeq < r.alightSeq;
      if (forward !== riderForward) continue; // wrong direction: hidden
      const routeLo = Math.min(r.boardSeq, r.alightSeq);
      const routeHi = Math.max(r.boardSeq, r.alightSeq);
      if (riderLo < routeLo || riderHi > routeHi) continue; // not served
      // Bus position from the deterministic sim: hide buses past pickup.
      const progress = this.seedProgress(route.id);
      const busSeq =
        r.boardSeq + progress * (r.alightSeq - r.boardSeq);
      if (forward ? busSeq > pair.boardSeq : busSeq < pair.boardSeq) continue;
      const trip = r.trip;
      const ids = this.defaultSegmentSeats(trip.tripId);
      const left = this.seatService.availabilityForSegment(
        departureKeyForTrip(trip.tripId, today),
        ids,
        riderLo,
        riderHi,
        corridor.stops.length - 1,
      ).available;
      if (left < 1) continue; // full on this stretch
      out.push(route);
    }
    return out;
  }

  /** Layout seat ids for a trip (default 40-seat map when unknown). */
  private defaultSegmentSeats(tripId: string): string[] {
    const trip = tripById(tripId);
    const vehicle = trip ? vehicleById(trip.vehicleId) : null;
    if (vehicle) return seatIdsForLayout(vehicle.layout);
    const ids: string[] = [];
    for (let r = 1; r <= 10; r++) {
      for (const c of ['A', 'B', 'C', 'D']) ids.push(`${r}${c}`);
    }
    return ids;
  }

  /**
   * Per-card segment facts for the chosen pair: operator + class, stretch
   * fare, seats left on the rider's stretch, ETA at pickup. Null when the
   * pair or route is off-corridor (card keeps its legacy display).
   */
  segmentInfoFor(route: NearbyRoute): {
    fare: number;
    seatsLeft: number;
    etaAtPickup: string;
    classLabel: string;
    boardName: string;
    alightName: string;
  } | null {
    if (!this.hasPair) {
      return null;
    }
    const pair = this.network.resolveTrip('', this.origin, this.destination);
    const r = this.network.resolveTrip(route.operator, route.from, route.to);
    if (!pair || !r || r.corridor.id !== pair.corridor.id) return null;
    const forward = r.boardSeq < r.alightSeq;
    if (forward !== pair.boardSeq < pair.alightSeq) return null;
    const riderLo = Math.min(pair.boardSeq, pair.alightSeq);
    const riderHi = Math.max(pair.boardSeq, pair.alightSeq);
    const corridor = pair.corridor;
    const board = corridor.stops[pair.boardSeq];
    const alight = corridor.stops[pair.alightSeq];
    const vehicle = vehicleById(r.trip.vehicleId);
    const today = new Date().toDateString();
    const fare = this.network.fareFor({
      corridorId: corridor.id,
      operatorId: r.operatorId ?? r.trip.operatorId,
      serviceClassId: vehicle?.serviceClassId ?? 'aircon',
      boardStopId: board.id,
      alightStopId: alight.id,
    });
    const seatsLeft = this.seatService.availabilityForSegment(
      departureKeyForTrip(r.trip.tripId, today),
      this.defaultSegmentSeats(r.trip.tripId),
      riderLo,
      riderHi,
      corridor.stops.length - 1,
    ).available;
    return {
      fare,
      seatsLeft,
      etaAtPickup: this.network.stopEta(r.trip.tripId, pair.boardSeq, today),
      classLabel: this.network.classLabel(vehicle?.serviceClassId ?? 'aircon'),
      boardName: board.name,
      alightName: alight.name,
    };
  }

  /**
   * Live seats-left for a route card, for today's departure (the hail
   * context Home displays). Corridor routes read the segment inventory —
   * the same store the seat map and payment screens write. Off-corridor
   * routes use the legacy adapter with the same operator|from|to|date key
   * the booking flow files holds under, so those cards move too. Reads
   * the seat store on every call so a purchase is reflected as soon as
   * change detection re-runs (including the ionViewWillEnter refresh).
   */
  liveSeatsLeftFor(route: NearbyRoute): number | null {
    try {
      const today = new Date().toDateString();
      const r = this.network.resolveTrip(route.operator, route.from, route.to);
      if (!r) {
        return this.seatService.availabilityFor(
          route.seats,
          [route.operator, route.from, route.to, today].join('|'),
        ).available;
      }
      const ids = this.defaultSegmentSeats(r.trip.tripId);
      if (!ids.length) return null;
      return this.seatService.availabilityForSegment(
        departureKeyForTrip(r.trip.tripId, today),
        ids,
        Math.min(r.boardSeq, r.alightSeq),
        Math.max(r.boardSeq, r.alightSeq),
        r.corridor.stops.length - 1,
      ).available;
    } catch {
      return null;
    }
  }

  /**
   * Card label: live inventory for today's departure, falling back to the
   * static catalog text only when inventory cannot be computed at all.
   */
  seatsLabelFor(route: NearbyRoute): string {
    const live = this.liveSeatsLeftFor(route);
    if (live == null) return route.seats;
    return `${live} seat${live === 1 ? '' : 's'} left`;
  }

  /**
   * Card fare sticker: the SAME number checkout will charge per seat.
   * Pair mode shows the rider's stretch fare (identical inputs to the
   * booking's seatFare when the same trip + stretch is booked); otherwise
   * the full-route network fare. Falls back to the catalog text only when
   * the route is off-corridor (checkout then parses that same string).
   */
  fareLabelFor(route: NearbyRoute): string {
    try {
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

  /**
   * Cheapest segment fare for the chosen origin → destination pair across
   * corridor trips in the direction of travel (prototype demo fares).
   * Null when no pair is typed or the pair is not on a corridor.
   */
  get pairFarePreview(): string | null {
    if (!this.hasPair) {
      return null;
    }
    const resolved = this.network.resolveTrip('', this.origin, this.destination);
    if (!resolved) return null;
    const corridor = resolved.corridor;
    const forward = resolved.boardSeq < resolved.alightSeq;
    const board = corridor.stops[resolved.boardSeq];
    const alight = corridor.stops[resolved.alightSeq];
    let best: number | null = null;
    for (const trip of TRIPS) {
      if (trip.corridorId !== corridor.id) continue;
      const sameDir =
        (trip.direction === 'forward') === forward;
      if (!sameDir) continue;
      const vehicle =
        this.network.vehicle(trip.vehicleId);
      const fare = this.network.fareFor({
        corridorId: corridor.id,
        operatorId: trip.operatorId,
        serviceClassId: vehicle?.serviceClassId ?? 'aircon',
        boardStopId: board.id,
        alightStopId: alight.id,
      });
      if (fare > 0 && (best == null || fare < best)) best = fare;
    }
    if (best == null) return null;
    return `${board.name} → ${alight.name} from ₱${best}`;
  }

  /**
   * The most recent confirmed/boarding booking,
   * used by the Active Trip pill.
   */
  get activeBooking() {
    return (
      this.ticketService.bookings.find(
        (b) =>
          b.status === 'boarding' ||
          b.status === 'confirmed',
      ) ?? null
    );
  }

  setCategory(id: 'all' | RouteMode) {
    this.activeCategory = id;
  }

  setSort(sort: CatalogSort) {
    this.sortBy = sort;
  }

  isFavorite(id: string): boolean {
    return this.catalog.isFavorite(id);
  }

  toggleFavorite(id: string, event: Event) {
    event.stopPropagation();
    this.catalog.toggleFavorite(id);
  }

  /** Real map state (Leaflet). */
  private map: L.Map | null = null;

  private routeLine: L.Polyline | null = null;

  private userMarker: L.Marker | null = null;

  private focusMarker: L.Marker | null = null;

  private hailMarker: L.Marker | null = null;

  /**
   * Live bus registry (data). Markers render FROM it when the map exists;
   * List View cards and the hail session read the SAME entries.
   */
  private busSims = new Map<string, BusSim>();

  /**
   * Sim heartbeat: 1s ticks advance every bus, reposition markers and
   * refresh hail approach distances, in List and Map views alike.
   */
  private simTimer: any = null;

  private readonly busRate = 0.015;

  private pendingFocus: FocusPin | null = null;

  /**
   * Non-empty when the map failed to initialize or spawn markers —
   * surfaced as a banner inside the map shell so a blank map is
   * self-explanatory instead of a mystery.
   */
  mapError: string | null = null;

  locating = false;

  locateMessage = '';

  private profileSub?: Subscription;

  /**
   * Active hail request (null when the commuter isn't hailing anything).
   * Rendered as a bottom sheet in both List and Map views.
   */
  hail: HailRequest | null = null;

  private hailCoords: [number, number] | null = null;

  constructor() {
    addIcons({
      flash,
      heart,
      chevronForwardOutline,
      listOutline,
      mapOutline,
      starSharp,
      bus,
      handLeftOutline,
      locateOutline,
      arrowForwardOutline,
      heartOutline,
      busOutline,
      carSportOutline,
      peopleOutline,
      compassOutline,
      swapVerticalOutline,
      sunnyOutline,
      cloudyOutline,
      rainyOutline,
      thunderstormOutline,
      flagOutline,
    });
  }

  ngOnInit() {
    // Centralized profile store: name/avatar update live the moment
    // Edit Profile saves, even while this tab instance stays alive.
    const current = this.profileService.currentUser;

    this.userName = current.name;

    this.userAvatar = current.avatar;

    this.profileSub = this.profileService.user$.subscribe(
      (profile) => {
        this.userName = profile.name;
        this.userAvatar = profile.avatar;
      },
    );

    // Search / terminal cards can deep-link here with ?lat=&lng=&label=
    // to jump straight to the map and drop a pin — see search.page.ts.
    this.route.queryParamMap.subscribe((params) => {
      const lat = params.get('lat');

      const lng = params.get('lng');

      if (lat && lng) {
        this.pendingFocus = {
          lat: Number(lat),
          lng: Number(lng),
          label: params.get('label') || 'Selected stop',
        };

        this.selectedView = 'map';

        this.syncSimData();

        setTimeout(() => this.ensureMap(), 60);
      }
    });

    // Live bus registry runs in every view — List cards, map markers and
    // the hail session all read the same sim state from here on.
    this.startSimTick();
  }

  ngAfterViewInit() {
    if (this.selectedView === 'map') {
      setTimeout(() => this.ensureMap(), 60);
    }
  }

  /** Fallback for navigations that bypass the observable push. */
  ionViewWillEnter() {
    const profile = this.profileService.read();

    this.userName = profile.name;

    this.userAvatar = profile.avatar;

    // The tab instance stays alive while the commuter books: re-render on
    // return so the live seat counts above pick up purchases/holds made on
    // the seat map and payment screens.
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.profileSub?.unsubscribe();

    if (this.simTimer) {
      clearInterval(this.simTimer);
    }

    this.map?.remove();
  }

  viewLiveTrip() {
    this.router.navigateByUrl('/active-trip');
  }

  /**
   * Compact sample conditions for the current context (active booking
   * origin, else the typed origin). Small by design — never the hero.
   */
  get conditionsNow() {
    const place =
      this.activeBooking?.from?.trim() ||
      this.origin.trim() ||
      this.conditionsService.defaultPlace;
    return this.conditionsService.forPlace(place);
  }

  get conditionsImpactLine(): string {
    const impact = this.conditionsNow.impact;
    return impact === 'advisory'
      ? 'Heavy rain may affect travel'
      : impact === 'caution'
        ? 'Rain possible — allow extra time'
        : 'Travel looks normal';
  }

  openConditions() {
    this.router.navigateByUrl('/travel-conditions?from=home');
  }

  /** Reminder card view-model — null keeps Home exactly as it was. */
  get reminderView() {
    return this.reminderService.resolve(null);
  }

  goToFavorites() {
    this.router.navigateByUrl('/favorites');
  }

  /**
   * Reservation lives in Search ("digital terminal") and Bookings — never
   * on a moving bus. Home's only trip action is hailing what runs now.
   */

  /**
   * Called by the List/Map segmented control.
   */
  toggleMapView(view: 'list' | 'map') {
    this.selectedView = view;

    if (view === 'map') {
      // Make sure all displayed routes have a bus simulation
      // before the map is initialized.
      this.syncSimData();

      setTimeout(() => this.ensureMap(), 60);
    }
  }

  /**
   * HAIL: flag down a bus that is already on the move. Real-time session,
   * NOT a reservation: no travel date, no seats, no payment, no booking.
   *
   * Tap Hail (list card or marker bubble — both funnel here)
   * → confirm sheet → HAIL THIS BUS → straight into hailing ticketing.
   */
  startHail(route: NearbyRoute, view?: 'list' | 'map') {
    if (this.hail) return;

    // The confirm sheet belongs to the view that launched it.
    this.hailView = view ?? this.selectedView;

    console.info('[ByaHero] Hail started', route.id);

    const sim = this.busSims.get(route.id);

    this.hail = {
      hailId:
        'HL-' +
        Date.now()
          .toString(36)
          .toUpperCase()
          .slice(-6),

      route,

      busNo:
        sim?.busNo ??
        this.busNoFor(route.id),

      status: 'confirm',

      pickupLabel: '',

      busToPickupM: null,

      requestedAt: Date.now(),
    };

    this.hailService.publish(this.hail);

    // Instant simulated fix so the sheet is useful immediately.
    const simulated =
      this.pickupService.simulatedCurrent(
        this.origin,
      );

    this.pickupService.setCurrent(simulated);

    if (!this.pickupService.getActive().pickup) {
      this.pickupService.setPickup({
        ...simulated,
        label: 'your current location',
        source: 'current',
      });
    }

    this.refreshHailPin();

    // Background GPS refine: applies ONLY a real fix,
    // and never touches a pickup the commuter already customized.
    const [fallbackLat, fallbackLng] =
      this.pickupService.coordsFor(this.origin);

    void this.pickupService
      .locateCurrent(
        this.origin,
        fallbackLat,
        fallbackLng,
      )
      .catch(() => null)
      .then((point) =>
        this.zone.run(() => {
          if (
            !this.hail ||
            !point ||
            point.source !== 'gps'
          ) {
            return;
          }

          console.info(
            '[ByaHero] Hail GPS refined',
            point,
          );

          this.pickupService.setCurrent(point);

          if (
            this.pickupService.getActive()
              .pickup?.source === 'current'
          ) {
            this.pickupService.setPickup({
              ...point,
              label: 'your current location',
              source: 'current',
            });

            this.refreshHailPin();
          }
        }),
      );
  }

  /**
   * "Hail this bus" → straight into ticketing for THIS ride.
   */
  confirmHail() {
    if (!this.hail) return;

    const route = this.hail.route;

    const trip: TripSummary = {
      operator: route.operator,
      from: route.from,
      to: route.to,
      eta: route.eta,
      fare: route.fare,
      seatsLeft: route.seats,
      status: route.status,
    };

    // Book the exact stretch the yellow sticker priced: the typed pair rides
    // along as board/alight stops (same mapping as Search) and its fare is
    // locked as the session quote — checkout charges this number, not a
    // recomputation.
    const pairOpts = this.riderPairForHail(route);
    const quote = parseFareText(this.fareLabelFor(route));
    this.bookingService.startBooking(trip, {
      ...pairOpts,
      ...(quote > 0 ? { quotedSeatFare: quote } : {}),
    });

    this.bookingService.hailMode = true;

    this.bookingService.travelDate =
      new Date().toDateString();

    this.bookingService.pickup =
      this.pickupService.getActive().pickup;

    // Hail boards at the nearest downstream stop — but ONLY on a real GPS
    // fix. Simulated/fallback coordinates must never move boarding away from
    // the quoted stretch (that silently repriced the ride past the sticker).
    // No pickup/destination typed and no real GPS fix: the hail is for the
    // FULL ride at the FULL price, so the full-route boarding from
    // attachNetwork stays untouched instead of anchoring to fallback
    // coordinates.
    if (
      this.pickupService.getActive().pickup?.source === 'gps'
    ) {
      this.anchorHailToCorridor();
    }

    // The typed destination rides along as the alighting stop (validated:
    // same corridor, trip direction, downstream of boarding) so the fare
    // is pickup→destination, never the whole route.
    this.applyHailDestination(route);

    console.info(
      '[ByaHero] Hail confirmed, entering ticketing',
      this.hail.hailId,
    );

    this.cancelHail();

    this.router.navigateByUrl(
      '/booking/trip',
    );
  }

  cancelHail() {
    this.hail = null;

    this.hailView = null;

    this.hailService.clear();

    this.hailCoords = null;

    this.syncHailMarker();
  }

  /**
   * Typed origin→destination as stop ids on this route's corridor
   * (undefined = full-route booking). Same mapping as Search so the hail
   * session rides exactly the stretch the card priced.
   */
  private riderPairForHail(
    route: NearbyRoute,
  ): { boardStopId: string; alightStopId: string } | undefined {
    if (!this.hasPair) return undefined;
    try {
      const pair = this.network.resolveTrip('', this.origin, this.destination);
      const r = this.network.resolveTrip(route.operator, route.from, route.to);
      if (!pair || !r) return undefined;
      return (
        riderPairForRoute(
          pair.corridor.id,
          pair.boardSeq,
          pair.alightSeq,
          pair.corridor.stops,
          r.corridor.id,
          r.boardSeq,
          r.alightSeq,
        ) ?? undefined
      );
    } catch {
      return undefined;
    }
  }

  /**
   * Carry the typed destination into the hail session as the alighting stop.
   * Fully validated (same corridor, trip direction, downstream of the
   * anchored boarding, inside the route span) — anything else keeps the
   * full-route alighting as before.
   */
  private applyHailDestination(route: NearbyRoute) {
    const booking = this.bookingService;
    if (!booking.corridorId || !booking.tripId || !booking.boardStopId) return;
    if (!this.hasPair) {
      return;
    }
    try {
      const pair = this.network.resolveTrip('', this.origin, this.destination);
      const r = this.network.resolveTrip(route.operator, route.from, route.to);
      const corridor = corridorById(booking.corridorId);
      if (!pair || !r || !corridor) return;
      const stopIds = riderPairForRoute(
        pair.corridor.id,
        pair.boardSeq,
        pair.alightSeq,
        pair.corridor.stops,
        r.corridor.id,
        r.boardSeq,
        r.alightSeq,
      );
      if (!stopIds) return;
      if (pair.corridor.id !== booking.corridorId) return;
      const boardNow = corridor.stops.find((s) => s.id === booking.boardStopId);
      const alightWant = corridor.stops.find((s) => s.id === stopIds.alightStopId);
      if (!boardNow || !alightWant) return;
      const trip = tripById(booking.tripId);
      if (!trip) return;
      const downstream =
        trip.direction === 'forward'
          ? alightWant.sequence > boardNow.sequence
          : alightWant.sequence < boardNow.sequence;
      if (!downstream) return;
      const routeLo = Math.min(r.boardSeq, r.alightSeq);
      const routeHi = Math.max(r.boardSeq, r.alightSeq);
      if (alightWant.sequence < routeLo || alightWant.sequence > routeHi) return;
      const err = booking.setBoardAlight(boardNow.id, alightWant.id);
      if (err) return;
    } catch {
      return;
    }
  }
  /**
   * Map the hail pickup onto the corridor: nearest downstream stop at or
   * after the bus's current position becomes the boarding stop, so the
   * fare and seat checks run from there (never from a passed stop).
   */
  private anchorHailToCorridor() {
    const booking = this.bookingService;
    if (!booking.corridorId || !booking.tripId || !this.hail) return;
    const trip = tripById(booking.tripId);
    const corridor = corridorById(booking.corridorId);
    if (!trip || !corridor) return;
    const active = this.pickupService.getActive().pickup;
    const fallback = this.pickupService.coordsFor(this.origin);
    const anchor = active ?? { lat: fallback[0], lng: fallback[1] };
    const busPos = this.busPositionOf(this.hail.route.id);
    let busSeq = booking.boardSeq ?? 0;
    if (busPos) {
      let best = busSeq;
      let bestM = Number.POSITIVE_INFINITY;
      for (const s of corridor.stops) {
        const dLat = s.lat - busPos[0];
        const dLng = s.lng - busPos[1];
        const m = dLat * dLat + dLng * dLng;
        if (m < bestM) {
          bestM = m;
          best = s.sequence;
        }
      }
      busSeq = best;
    }
    booking.anchorHailBoarding(anchor.lat, anchor.lng, busSeq);
  }

  /**
   * Straight-line current → pickup distance,
   * or null when unknown.
   */
  hailDistance(): string | null {
    if (!this.hail) return null;

    return this.pickupService.formatDistance(
      this.pickupService.distanceM(
        this.pickupService.getActive(),
      ),
    );
  }

  /**
   * Zone guidance for the hail sheet.
   */
  hailZoneMessage(): string | null {
    if (!this.hail) return null;

    const state =
      this.pickupService.getActive();

    return this.pickupService.zoneMessage(
      this.pickupService.zoneFor(
        this.pickupService.distanceM(state),
      ),
      this.pickupService.formatDistance(
        this.pickupService.distanceM(state),
      ),
    );
  }

  /**
   * Keep the hail label + pin on the pickup point, not raw GPS.
   */
  private refreshHailPin() {
    const pickup =
      this.pickupService.getActive().pickup;

    if (this.hail && pickup) {
      this.hail.pickupLabel = pickup.label;

      this.hailCoords = [
        pickup.lat,
        pickup.lng,
      ];
    }

    this.syncHailMarker();
  }

  /**
   * Live position of a route's bus
   * (same sim the map markers render).
   */
  private busPositionOf(
    routeId: string,
  ): [number, number] | null {
    const sim = this.busSims.get(routeId);

    return sim
      ? this.interpolate(
          sim.origin,
          sim.dest,
          sim.progress,
        )
      : null;
  }

  /**
   * Deterministic bus number per route ("Bus 107") —
   * stable across views.
   */
  busNoFor(routeId: string): string {
    const digits = parseInt(
      routeId.match(/\d+/)?.[0] ?? '',
      10,
    );

    if (Number.isFinite(digits)) {
      return (
        'Bus ' +
        (100 + (digits % 900))
      );
    }

    let hash = 0;

    for (let i = 0; i < routeId.length; i++) {
      hash =
        (hash * 31 +
          routeId.charCodeAt(i)) >>>
        0;
    }

    return (
      'Bus ' +
      (101 + (hash % 800))
    );
  }

  /**
   * Nearest-area hint for a route's live bus position.
   */
  busAreaFor(route: NearbyRoute): string {
    const pos = this.busPositionOf(
      route.id,
    );

    return pos
      ? this.pickupService.nearestCity(
          pos[0],
          pos[1],
        )
      : this.pickupService.nearestCity(
          ...this.pickupService.coordsFor(
            route.from,
          ),
        );
  }

  /**
   * Live bus → current-location distance
   * for list cards (null when unknown).
   */
  busDistanceFor(
    route: NearbyRoute,
  ): string | null {
    const current =
      this.pickupService.getActive()
        .current;

    const pos = this.busPositionOf(
      route.id,
    );

    if (!current || !pos) {
      return null;
    }

    return this.pickupService.formatDistance(
      this.pickupService.haversineM(
        current.lat,
        current.lng,
        pos[0],
        pos[1],
      ),
    );
  }

  /**
   * Heading of a route's bus,
   * derived from the sim direction.
   */
  busHeadingFor(route: NearbyRoute): string {
    const sim = this.busSims.get(
      route.id,
    );

    if (!sim) {
      return route.to;
    }

    return sim.direction === 1
      ? route.to
      : route.from;
  }

  /**
   * Keeps the hail pin on the map in sync with the hail state.
   * Safe to call before the map exists.
   */
  private syncHailMarker() {
    if (!this.map) return;

    if (this.hailMarker) {
      this.hailMarker.remove();

      this.hailMarker = null;
    }

    if (this.hail && this.hailCoords) {
      this.hailMarker = L.marker(
        this.hailCoords,
        {
          icon: this.pinIcon(
            '#059669',
            this.HAIL_SVG,
          ),
        },
      ).addTo(this.map);
    }
  }

  private readonly HAIL_SVG =
    '<svg width="14" height="14" viewBox="0 0 512 512" fill="#fff"><path d="M432.8 211.44c-15.52-8.82-34.91-2.28-43.31 13.68l-41.38 84.41a7 7 0 01-8.93 3.43 7 7 0 01-4.41-6.52V72c0-13.91-12.85-24-26.77-24s-26 10.09-26 24v156.64A11.24 11.24 0 01271.21 240 11 11 0 01260 229V24c0-13.91-10.94-24-24.86-24S210 10.09 210 24v204.64A11.24 11.24 0 01199.21 240 11 11 0 01188 229V56c0-13.91-12.08-24-26-24s-26 11.09-26 25v187.64A11.24 11.24 0 01125.21 256 11 11 0 01114 245V120c0-13.91-11.08-24-25-24s-25.12 10.22-25 24v216c0 117.41 72 176 160 176h16c88 0 115.71-39.6 136-88l68.71-169c6.62-18 3.6-34.75-11.91-43.56z"/></svg>';

  private ensureMap() {
    if (!this.mapEl) return;

    if (this.map) {
      this.map.invalidateSize();

      if (this.pendingFocus) {
        this.focusOn(
          this.pendingFocus,
        );
      }

      this.syncHailMarker();

      this.syncMarkers();

      return;
    }

    const originCoords =
      this.resolveCoords(
        this.origin,
      );

    const destCoords =
      this.resolveCoords(
        this.destination,
      );

    const start = this.pendingFocus
      ? ([
          this.pendingFocus.lat,
          this.pendingFocus.lng,
        ] as [number, number])
      : originCoords;

    this.map = L.map(
      this.mapEl.nativeElement,
      {
        center: start,
        zoom: 6,
        // Custom +/- buttons (bottom-right) replace the default top-left
        // control, which sat underneath the On-time/Delayed legend.
        zoomControl: false,
      },
    );

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; OpenStreetMap contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
      },
    ).addTo(this.map);

    console.info(
      '[ByaHero] LiveMap init (Leaflet)',
      {
        mk: '2026-09-22',
        container: `${this.mapEl.nativeElement.clientWidth}x${this.mapEl.nativeElement.clientHeight}`,
        routes:
          this.displayRoutes.length,
      },
    );

    this.routeLine = L.polyline(
      [
        originCoords,
        destCoords,
      ],
      {
        color: '#151D48',
        weight: 4,
        opacity: 0.55,
        dashArray: '1 10',
        lineJoin: 'round',
      },
    ).addTo(this.map);

    this.addPin(
      originCoords,
      '#151D48',
      'A',
    );

    this.addPin(
      destCoords,
      '#D32F2F',
      'B',
    );

    /**
     * Clicking empty map space closes the popup.
     *
     * Bus marker clicks explicitly stop propagation,
     * so they do NOT reach this handler.
     */
    this.map.on(
      'click',
      () => {
        this.map?.closePopup();
      },
    );

    /**
     * Delegated Hail taps:
     * ONE container-level listener serves every bus
     * popup button, present and future.
     */
    this.map
      .getContainer()
      .addEventListener(
        'click',
        (ev: Event) => {
          const target =
            ev.target as
              | Element
              | null;

          const btn =
            target?.closest?.(
              '[data-route-id]',
            ) as HTMLElement | null;

          const id =
            btn?.dataset?.['routeId'];

          if (!btn || !id) {
            return;
          }

          /**
           * Prevent the Hail-button click from
           * becoming a map click as well.
           */
          ev.stopPropagation();
          ev.stopImmediatePropagation();

          this.zone.run(() => {
            const route =
              this.busSims.get(id)
                ?.route;

            if (!route) {
              return;
            }

            console.info(
              '[ByaHero] Hail tapped from map popup',
              id,
            );

            this.map?.closePopup();

            this.startHail(route);

            // Native Leaflet taps don't always kick change detection
            // (the sheet only appeared after switching views), so render
            // the hail sheet synchronously right here.
            this.cdr.detectChanges();
          });
        },
      );

    /**
     * Live bus markers render from the shared registry.
     */
    try {
      this.syncMarkers();

      console.info(
        '[ByaHero] LiveMap buses rendered',
        this.busSims.size,
      );
    } catch (err) {
      console.error(
        '[ByaHero] LiveMap render failed',
        err,
      );

      this.mapError =
        `Buses failed to render: ${String(err)}`;
    }

    /**
     * Initial map viewport.
     *
     * Include:
     * - main origin
     * - main destination
     * - every currently visible bus
     *
     * This prevents buses shown in List View from
     * being outside the initial map viewport.
     */
    if (this.pendingFocus) {
      this.focusOn(
        this.pendingFocus,
      );
    } else {
      const bounds =
        L.latLngBounds([]);

      bounds.extend(
        originCoords,
      );

      bounds.extend(
        destCoords,
      );

      for (
        const sim of this.busSims.values()
      ) {
        if (!sim.marker) {
          continue;
        }

        const pos =
          sim.marker.getLatLng();

        bounds.extend([
          pos.lat,
          pos.lng,
        ]);
      }

      if (bounds.isValid()) {
        this.map.fitBounds(
          bounds,
          {
            padding: [48, 48],
            maxZoom: 12,
          },
        );
      }
    }

    this.syncHailMarker();
  }

  private focusOn(
    f: FocusPin,
  ) {
    if (!this.map) return;

    this.focusMarker?.remove();

    this.focusMarker =
      L.marker(
        [f.lat, f.lng],
        {
          icon: this.pinIcon(
            '#D32F2F',
            '★',
          ),
        },
      ).addTo(this.map);

    this.map.flyTo(
      [f.lat, f.lng],
      15,
      {
        duration: 800,
      },
    );

    this.pendingFocus = null;
  }

  private interpolate(
    a: [number, number],
    b: [number, number],
    t: number,
  ): [number, number] {
    return [
      a[0] +
        (b[0] - a[0]) * t,

      a[1] +
        (b[1] - a[1]) * t,
    ];
  }

  /**
   * Reconcile the live bus registry with the routes currently listed.
   *
   * DATA ONLY, no map needed.
   *
   * Listed routes keep running mid-route when a filter merely reorders.
   * The hailed route is pinned even if filtered out.
   */
  private syncSimData() {
    const wanted =
      new Set(
        this.displayRoutes.map(
          (r) => r.id,
        ),
      );

    if (this.hail) {
      wanted.add(
        this.hail.route.id,
      );
    }

    /**
     * Remove simulations that no longer belong
     * to the active route list.
     */
    for (
      const [id, sim] of this.busSims
    ) {
      if (!wanted.has(id)) {
        sim.marker?.remove();

        this.busSims.delete(id);
      }
    }

    const ensure = (
      route: NearbyRoute,
    ) => {
      const origin =
        this.resolveCoords(
          route.from,
        );

      const dest =
        this.resolveCoords(
          route.to,
        );

      const existing =
        this.busSims.get(
          route.id,
        );

      if (
        existing &&
        existing.origin[0] ===
          origin[0] &&
        existing.origin[1] ===
          origin[1] &&
        existing.dest[0] ===
          dest[0] &&
        existing.dest[1] ===
          dest[1]
      ) {
        existing.route =
          route;

        return;
      }

      existing?.marker?.remove();

      this.busSims.set(
        route.id,
        {
          route,

          busNo:
            this.busNoFor(
              route.id,
            ),

          progress:
            this.seedProgress(
              route.id,
            ),

          direction: 1,

          origin,

          dest,

          marker:
            existing?.marker ??
            null,
        },
      );
    };

    this.displayRoutes.forEach(
      ensure,
    );

    if (
      this.hail &&
      !this.busSims.has(
        this.hail.route.id,
      )
    ) {
      ensure(
        this.hail.route,
      );
    }
  }

  /**
   * Demo starting positions (fraction along the bus's own route) so the
   * corridor filter scenarios are testable:
   * - r32 sits at its origin terminal (catches early pickups),
   * - r1 is past Ilagan but before Cauayan (scenario 5),
   * - r33 just left Manila northbound.
   * Every other route seeds deterministically from its id.
   */
  private readonly DEMO_START: Record<string, number> = {
    r1: 0.14,
    r32: 0.0,
    r33: 0.1,
  };

  /**
   * Deterministic 0.02–0.70 seed from the route id. The old 0.2 floor made
   * early pickups uncatchable (no full-span bus could ever sit before them).
   */
  private seedProgress(
    routeId: string,
  ): number {
    const fixed = this.DEMO_START[routeId];
    if (fixed != null) return fixed;

    let hash = 0;

    for (
      let i = 0;
      i < routeId.length;
      i++
    ) {
      hash =
        (hash * 31 +
          routeId.charCodeAt(i)) >>>
        0;
    }

    return (
      0.02 +
      (hash % 68) / 100
    );
  }

  /**
   * Render markers FROM the registry (map only).
   *
   * The featured (fastest pick) bus keeps
   * the soft pulse halo.
   */
  private syncMarkers() {
    if (!this.map) {
      return;
    }

    const featuredId =
      this.displayRoutes[0]?.id;

    const visible =
      new Set(
        this.displayRoutes.map(
          (r) => r.id,
        ),
      );

    if (this.hail) {
      visible.add(
        this.hail.route.id,
      );
    }

    for (
      const [id, sim] of
      this.busSims
    ) {
      if (!visible.has(id)) {
        sim.marker?.remove();

        sim.marker = null;

        continue;
      }

      if (!sim.marker) {
        const marker =
          L.marker(
            this.interpolate(
              sim.origin,
              sim.dest,
              sim.progress,
            ),
            {
              icon:
                this.busIcon(
                  sim.route.status ===
                    'delayed',
                  sim.route.id ===
                    featuredId,
                ),
            },
          );

        /**
         * IMPORTANT:
         * Stop this click from bubbling to the map.
         *
         * Otherwise the map's click handler immediately
         * closes the popup we are trying to open.
         */
        marker.on(
          'click',
          (e) => {
            L.DomEvent.stopPropagation(
              e,
            );

            this.openBusPopup(
              marker,
              sim.route,
            );
          },
        );

        marker.addTo(
          this.map!,
        );

        sim.marker = marker;
      } else {
        sim.marker.setLatLng(
          this.interpolate(
            sim.origin,
            sim.dest,
            sim.progress,
          ),
        );
      }
    }
  }

  /**
   * One heartbeat for every consumer:
   * advance the sims, reposition markers,
   * refresh hail approach.
   *
   * Runs in List and Map views alike.
   */
  private startSimTick() {
    if (this.simTimer) {
      return;
    }

    this.syncSimData();

    this.simTimer = setInterval(
      () => {
        this.syncSimData();

        for (
          const sim of
          this.busSims.values()
        ) {
          sim.progress +=
            this.busRate *
            sim.direction;

          if (
            sim.progress >= 1
          ) {
            sim.progress = 1;

            sim.direction = -1;
          } else if (
            sim.progress <= 0
          ) {
            sim.progress = 0;

            sim.direction = 1;
          }
        }

        this.syncMarkers();
      },
      1000,
    );
  }

  /**
   * Leaflet needs a plain DOM anchor below the marker tip.
   */
  private pinIcon(
    color: string,
    inner: string,
  ): L.DivIcon {
    return L.divIcon({
      className: '',

      html: `
        <div
          style="
            width:30px;
            height:30px;
            border-radius:50% 50% 50% 0;
            background:${color};
            transform:rotate(-45deg);
            display:flex;
            align-items:center;
            justify-content:center;
            border:2px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          "
        >
          <span
            style="
              transform:rotate(45deg);
              color:#fff;
              font-size:12px;
              font-weight:800;
              line-height:1;
              display:flex;
            "
          >
            ${inner}
          </span>
        </div>
      `,

      iconSize: [30, 30],

      iconAnchor: [15, 29],
    });
  }

  private busIcon(
    delayed: boolean,
    featured: boolean,
  ): L.DivIcon {
    const bg = delayed
      ? '#D32F2F'
      : '#151D48';

    const pulse = featured
      ? `
        <span
          style="
            position:absolute;
            inset:-6px;
            border-radius:50%;
            border:2px solid ${bg};
            opacity:0.5;
            animation:byaheroPulse 1.6s ease-out infinite;
          "
        ></span>
      `
      : '';

    return L.divIcon({
      className: '',

      html: `
        <div
          style="
            position:relative;
            width:30px;
            height:30px;
          "
        >
          ${pulse}

          <div
            style="
              width:30px;
              height:30px;
              border-radius:50%;
              background:${bg};
              display:flex;
              align-items:center;
              justify-content:center;
              border:2.5px solid #fff;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
            "
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="#fff"
            >
              <path
                d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM18 11H6V6h12v5z"
              />
            </svg>
          </div>
        </div>
      `,

      iconSize: [30, 30],

      iconAnchor: [15, 15],
    });
  }

  private addPin(
    coords: [number, number],
    color: string,
    glyph: string,
  ) {
    L.marker(
      coords,
      {
        icon: this.pinIcon(
          color,
          glyph,
        ),
      },
    ).addTo(this.map!);
  }

  private openBusPopup(
    marker: L.Marker,
    route: NearbyRoute,
  ) {
    marker.bindPopup(
      this.busPopupHtml(route),
      {
        closeButton: false,
        offset: L.point(0, -14),
        className:
          'bh-bus-popup',
      },
    );

    marker.openPopup();
  }

  /**
   * Compact LIVE-BUS card inside the Leaflet popup.
   *
   * Its CTA hails the moving bus.
   */
  private busPopupHtml(
    route: NearbyRoute,
  ): string {
    const dot =
      route.status === 'delayed'
        ? '#D32F2F'
        : '#151D48';

    const busNo =
      this.busSims.get(
        route.id,
      )?.busNo ??
      this.busNoFor(
        route.id,
      );

    const liveSeats = this.liveSeatsLeftFor(route);
    const seatsLabel =
      liveSeats == null
        ? route.seats
        : `${liveSeats} seat${liveSeats === 1 ? '' : 's'} left`;

    return `
      <div class="bh-bus-pop">

        <div class="bh-bus-pop-head">

          <span
            class="bh-bus-dot"
            style="background:${dot}"
          ></span>

          <div class="bh-bus-pop-operator">

            <b>
              ${busNo} · ${route.operator}
            </b>

            <span
              class="bh-bus-pop-status ${route.status}"
            >
              ${route.status}
            </span>

          </div>

        </div>

        <div class="bh-bus-pop-route">
          ${route.from}
          <i>→</i>
          ${route.to}
        </div>

        <div class="bh-bus-pop-meta">

          <span>
            Currently on route
          </span>

          ·

          <span>
            ${this.fareLabelFor(route)}
          </span>

          ·

          <span>
            ${seatsLabel}
          </span>

        </div>

        <button
          type="button"
          class="bh-bus-pop-cta"
          data-route-id="${route.id}"
        >
          Hail
        </button>

      </div>
    `;
  }

  private resolveCoords(
    place: string,
  ): [number, number] {
    return this.pickupService.coordsFor(
      place,
    );
  }

  /** Custom map zoom (wired to the +/- buttons — default control is off). */
  zoomIn() {
    this.map?.zoomIn();
  }

  zoomOut() {
    this.map?.zoomOut();
  }

  locateMe() {
    // Every tap visibly focuses the map: GPS fix when available,
    // route overview when it is not (denied/timeout/unsupported).
    if (!navigator.geolocation) {
      this.focusRoute(
        'Location not supported — showing route',
      );

      return;
    }

    this.locating = true;

    let settled = false;

    const timer =
      setTimeout(
        () => {
          if (settled) return;

          settled = true;

          this.zone.run(
            () => {
              this.locating = false;

              this.focusRoute(
                'GPS timed out — showing route',
              );
            },
          );
        },
        9000,
      );

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        this.zone.run(() => {
          if (settled) return;

          settled = true;

          clearTimeout(timer);

          this.locating = false;

          const coords: [
            number,
            number,
          ] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];

          // Share the fix so pickup distances stay honest on every screen.
          this.pickupService.setCurrent(
            {
              label:
                'Your current location',

              lat: coords[0],

              lng: coords[1],

              source: 'gps',

              simulated: false,
            },
          );

          if (!this.map) {
            return;
          }

          this.userMarker?.remove();

          this.userMarker =
            L.marker(
              coords,
              {
                icon:
                  this.userIcon(),

                interactive:
                  false,
              },
            ).addTo(this.map);

          this.map.invalidateSize();

          this.map.flyTo(
            coords,
            14,
            {
              duration: 800,
            },
          );
        }),

      () =>
        this.zone.run(() => {
          if (settled) return;

          settled = true;

          clearTimeout(timer);

          this.locating = false;

          this.focusRoute(
            'Location unavailable — showing route',
          );
        }),

      {
        enableHighAccuracy: true,
        timeout: 8000,
      },
    );
  }

  /** Fallback focus: frame the current route so the button never no-ops. */
  private focusRoute(message?: string) {
    if (this.map) {
      this.map.invalidateSize();

      if (this.routeLine) {
        this.map.flyToBounds(
          this.routeLine.getBounds(),
          {
            padding: [40, 40],
            duration: 800,
          },
        );
      } else {
        const origin =
          this.resolveCoords(
            this.origin,
          );

        const dest =
          this.resolveCoords(
            this.destination,
          );

        this.map.flyToBounds(
          L.latLngBounds(
            origin,
            dest,
          ),
          {
            padding: [40, 40],
            duration: 800,
          },
        );
      }
    }

    if (message) {
      this.locateMessage =
        message;

      this.clearLocateMessage();
    }
  }

  private userIcon(): L.DivIcon {
    return L.divIcon({
      className: '',

      html: `
        <div
          style="
            width:18px;
            height:18px;
            border-radius:50%;
            background:#151D48;
            border:3px solid #fff;
            box-shadow:0 0 0 4px rgba(21,29,72,0.25);
          "
        ></div>
      `,

      iconSize: [18, 18],

      iconAnchor: [9, 9],
    });
  }

  private clearLocateMessage() {
    setTimeout(() => {
      this.locateMessage = '';
    }, 3000);
  }
}