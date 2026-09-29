<<<<<<< HEAD
import L from 'leaflet';
=======
import * as L from 'leaflet';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
<<<<<<< HEAD
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
=======
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonAvatar } from '@ionic/angular';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  navigateOutline,
  ticketOutline,
  heartOutline,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
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
<<<<<<< HEAD
=======
  checkmarkCircle,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  chevronForwardOutline,
  carSportOutline,
  compassOutline,
  bus,
  search,
  locateOutline,
  starSharp,
<<<<<<< HEAD
  handLeftOutline,
  flash,
  sunnyOutline,
  cloudyOutline,
  rainyOutline,
  thunderstormOutline,
  flagOutline,
} from 'ionicons/icons';

import { ProfileService } from '../profile/profile.service';

import {
  BookingService,
  TripSummary,
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

import { TripReminderCardComponent } from '../../components/trip-reminder-card/trip-reminder-card.component';

import { TripReminderService } from '../../services/trip-reminder.service';

addIcons({
  'navigate-outline': navigateOutline,
  'heart-outline': heartOutline,
  heart: heart,
=======
  closeOutline,
  handLeftOutline,
} from 'ionicons/icons';
import { BookingService, TripSummary } from '../booking/booking.service';

addIcons({
  'navigate-outline': navigateOutline,
  'ticket-outline': ticketOutline,
  'heart-outline': heartOutline,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
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
<<<<<<< HEAD
=======
  'checkmark-circle': checkmarkCircle,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  'chevron-forward-outline': chevronForwardOutline,
  'car-sport-outline': carSportOutline,
  'compass-outline': compassOutline,
  bus: bus,
  search: search,
  'locate-outline': locateOutline,
  'star-sharp': starSharp,
<<<<<<< HEAD
  'hand-left-outline': handLeftOutline,
  flash: flash,
  'sunny-outline': sunnyOutline,
  'cloudy-outline': cloudyOutline,
  'rainy-outline': rainyOutline,
  'thunderstorm-outline': thunderstormOutline,
  'flag-outline': flagOutline,
=======
  'close-outline': closeOutline,
  'hand-left-outline': handLeftOutline,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
});

interface FocusPin {
  lat: number;
  lng: number;
  label: string;
}

<<<<<<< HEAD
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
=======
/** Shape shared by every nearby-route item — used by both List Mode's
 *  trip cards and Map Mode's marker info card, so the two views always
 *  carry the exact same data. */
interface NearbyRoute {
  operator: string;
  from: string;
  to: string;
  eta: string;
  fare: string;
  seats: string;
  status: string;
}

type HailStatus = 'locating' | 'sent' | 'accepted';

/** One active hail (flag-down) request. Only one can be active at a time. */
interface HailRequest {
  route: NearbyRoute;
  status: HailStatus;
  etaMin: number;
  pickupLabel: string;
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
<<<<<<< HEAD
=======
    CommonModule,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    FormsModule,
    IonContent,
    IonIcon,
    IonAvatar,
<<<<<<< HEAD
    TripReminderCardComponent,
=======
    RouterLink,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
<<<<<<< HEAD

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
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  private readonly DEFAULT_ORIGIN = 'Baguio City, Benguet';

  private readonly DEFAULT_DEST = 'Tuguegarao City, Cagayan';

  selectedView: 'list' | 'map' = 'list';

  origin = this.DEFAULT_ORIGIN;

  destination = this.DEFAULT_DEST;

  userName = 'Nonie';

  userAvatar =
    'https://ionicframework.com/docs/img/demos/avatar.svg';

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
   * Active routes shown in the list. Category, sort and typed
   * origin/destination edits all drive this live. The pre-filled default
   * origin/destination are treated as "no filter".
   */
  get displayRoutes(): NearbyRoute[] {
    const fromQ =
      this.origin.trim() === this.DEFAULT_ORIGIN
        ? ''
        : this.origin.trim();

    const toQ =
      this.destination.trim() === this.DEFAULT_DEST
        ? ''
        : this.destination.trim();

    const matches = this.catalog.queryRoutes(
      fromQ,
      toQ,
      this.activeCategory,
    );

    return this.catalog.sortRoutes(matches, this.sortBy);
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

=======
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  selectedView: 'list' | 'map' = 'list';
  origin = 'Baguio City, Benguet';
  destination = 'Tuguegarao City, Cagayan';
  userName = 'Nonie';

  liveTrip = {
    operator: 'Victory Liner',
    busNo: '402',
    eta: '8 min',
    route: 'Baguio → Tuguegarao',
  };

  nearbyRoutes: NearbyRoute[] = [
    {
      operator: 'Florida Bus Line',
      from: 'Tuguegarao',
      to: 'Manila (PITX)',
      eta: '4 min away',
      fare: '₱ 620',
      seats: '18 seats left',
      status: 'on-time',
    },
    {
      operator: 'Victory Liner',
      from: 'Santiago City',
      to: 'Cubao, QC',
      eta: '11 min away',
      fare: '₱ 480',
      seats: '6 seats left',
      status: 'delayed',
    },
    {
      operator: 'GV Florida UV Express',
      from: 'Cauayan',
      to: 'Ilagan',
      eta: '2 min away',
      fare: '₱ 95',
      seats: '3 seats left',
      status: 'on-time',
    },
    {
      operator: 'Baliwag Transit',
      from: 'Solano',
      to: 'Cabanatuan',
      eta: '19 min away',
      fare: '₱ 210',
      seats: '22 seats left',
      status: 'on-time',
    },
  ];

  /** Real map state */
  private map: L.Map | null = null;
  private routeLine: L.Polyline | null = null;
  private busMarker: L.Marker | null = null;
  private userMarker: L.Marker | null = null;
  private focusMarker: L.Marker | null = null;
  private busInterval: any = null;
  private busProgress = 0;
  private busDirection = 1;
  private pendingFocus: FocusPin | null = null;

  /** The nearby route whose marker was last tapped on the Live Map —
   *  drives the compact info card and its View button. Same object
   *  shape/reference as the items List Mode renders, so View reuses
   *  bookTrip() exactly as List Mode's Select button does. */
  selectedMapRoute: NearbyRoute | null = null;

  locating = false;
  locateMessage = '';

  /** Active hail request (null when the commuter isn't hailing anything).
   *  Rendered as a bottom sheet in both List and Map views. */
  hail: HailRequest | null = null;
  private hailCoords: [number, number] | null = null;
  private hailMarker: L.Marker | null = null;
  private hailTimer: any = null;

  /** Fixed lookup table standing in for a geocoder — swap for a real geocoding
   *  service once the backend exists. Coordinates are real city centers. */
  private readonly CITY_COORDS: Record<string, [number, number]> = {
    baguio: [16.4023, 120.596],
    tuguegarao: [17.6132, 121.727],
    pitx: [14.493, 120.986],
    manila: [14.5995, 120.9842],
    cubao: [14.622, 121.0533],
    cauayan: [16.9333, 121.7667],
    ilagan: [17.1487, 121.8895],
    solano: [16.5167, 121.1833],
    cabanatuan: [15.4864, 120.9679],
    santiago: [16.6864, 121.549],
    vigan: [17.5747, 120.3869],
    laoag: [18.196, 120.5936],
    sagada: [17.0928, 120.9008],
    banaue: [16.9107, 121.0594],
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private bookingService: BookingService,
    private zone: NgZone,
  ) {
    addIcons({heartOutline,chevronForwardOutline,busOutline,carSportOutline,peopleOutline,compassOutline,listOutline,mapOutline,starSharp,bus,handLeftOutline,locateOutline,closeOutline,arrowForwardOutline,});
  }

  ngOnInit() {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    // Search / terminal cards can deep-link here with ?lat=&lng=&label=
    // to jump straight to the map and drop a pin — see search.page.ts.
    this.route.queryParamMap.subscribe((params) => {
      const lat = params.get('lat');
<<<<<<< HEAD

      const lng = params.get('lng');

=======
      const lng = params.get('lng');
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
      if (lat && lng) {
        this.pendingFocus = {
          lat: Number(lat),
          lng: Number(lng),
          label: params.get('label') || 'Selected stop',
        };
<<<<<<< HEAD

        this.selectedView = 'map';

        this.syncSimData();

        setTimeout(() => this.ensureMap(), 60);
      }
    });

    // Live bus registry runs in every view — List cards, map markers and
    // the hail session all read the same sim state from here on.
    this.startSimTick();
=======
        this.selectedView = 'map';
        setTimeout(() => this.ensureMap(), 60);
      }
    });
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }

  ngAfterViewInit() {
    if (this.selectedView === 'map') {
      setTimeout(() => this.ensureMap(), 60);
    }
  }

<<<<<<< HEAD
  /** Fallback for navigations that bypass the observable push. */
  ionViewWillEnter() {
    const profile = this.profileService.read();

    this.userName = profile.name;

    this.userAvatar = profile.avatar;
  }

  ngOnDestroy() {
    this.profileSub?.unsubscribe();

    if (this.simTimer) {
      clearInterval(this.simTimer);
    }

=======
  ngOnDestroy() {
    if (this.busInterval) clearInterval(this.busInterval);
    if (this.hailTimer) clearTimeout(this.hailTimer);
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    this.map?.remove();
  }

  viewLiveTrip() {
    this.router.navigateByUrl('/active-trip');
  }

<<<<<<< HEAD
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

=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  goToFavorites() {
    this.router.navigateByUrl('/favorites');
  }

<<<<<<< HEAD
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

=======
  bookTrip(route: any) {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    const trip: TripSummary = {
      operator: route.operator,
      from: route.from,
      to: route.to,
      eta: route.eta,
      fare: route.fare,
      seatsLeft: route.seats,
      status: route.status,
    };
<<<<<<< HEAD

    this.bookingService.startBooking(trip);

    this.bookingService.hailMode = true;

    this.bookingService.travelDate =
      new Date().toDateString();

    this.bookingService.pickup =
      this.pickupService.getActive().pickup;

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

=======
    this.bookingService.startBooking(trip);
    this.router.navigateByUrl('/booking/trip');
  }

  /** Called by the List/Map segmented control. */
  toggleMapView(view: 'list' | 'map') {
    this.selectedView = view;
    if (view === 'map') setTimeout(() => this.ensureMap(), 60);
  }

  /** Dismisses the Map Mode marker info card (X button / tap outside). */
  closeMapCard() {
    this.selectedMapRoute = null;
  }

  /** HAIL: the commuter flags down a nearby bus/PUV from where they're
   *  standing. Works from both the List cards and the Map info card. */
  startHail(route: NearbyRoute) {
    if (this.hail) return;

    const minutes = Number(/\d+/.exec(route.eta)?.[0]);
    this.hail = {
      route,
      status: 'locating',
      etaMin: isNaN(minutes) ? 5 : minutes,
      pickupLabel: '',
    };
    this.selectedMapRoute = null;

    this.resolvePickup((coords, usedFallback) => {
      // Commuter cancelled while we were still locating them
      if (!this.hail) return;

      this.hailCoords = coords;
      this.hail.pickupLabel = usedFallback
        ? `${this.origin} (GPS unavailable)`
        : 'your current location';
      this.hail.status = 'sent';
      this.syncHailMarker();

      if (this.map && this.selectedView === 'map') {
        this.map.flyTo(coords, 13, { duration: 0.8 });
      }

      // SIMULATED: the driver acknowledging the hail.
      // Replace with a real push (websocket/FCM) from the operator's driver app.
      this.hailTimer = setTimeout(() => {
        this.zone.run(() => {
          if (this.hail) this.hail.status = 'accepted';
        });
      }, 2200);
    });
  }

  cancelHail() {
    if (this.hailTimer) {
      clearTimeout(this.hailTimer);
      this.hailTimer = null;
    }
    this.hail = null;
    this.hailCoords = null;
    this.syncHailMarker();
  }

  /** Uses GPS for the pickup point; falls back to the selected origin
   *  city if location is unsupported or permission is denied. */
  private resolvePickup(
    done: (coords: [number, number], usedFallback: boolean) => void,
  ) {
    const fallback = () =>
      this.zone.run(() => done(this.resolveCoords(this.origin), true));

    if (!navigator.geolocation) {
      fallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        this.zone.run(() =>
          done([pos.coords.latitude, pos.coords.longitude], false),
        ),
      () => fallback(),
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }

  /** Keeps the hail pin on the map in sync with the hail state.
   *  Safe to call before the map exists (ensureMap calls it again). */
  private syncHailMarker() {
    if (!this.map) return;
    if (this.hailMarker) {
      this.map.removeLayer(this.hailMarker);
      this.hailMarker = null;
    }
    if (this.hail && this.hailCoords) {
      this.hailMarker = L.marker(this.hailCoords, {
        icon: this.hailPinIcon(),
      }).addTo(this.map);
    }
  }

>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  private ensureMap() {
    if (!this.mapEl) return;

    if (this.map) {
      this.map.invalidateSize();
<<<<<<< HEAD

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
=======
      if (this.pendingFocus) this.focusOn(this.pendingFocus);
      this.syncHailMarker();
      return;
    }

    const originCoords = this.resolveCoords(this.origin);
    const destCoords = this.resolveCoords(this.destination);
    const start = this.pendingFocus
      ? ([this.pendingFocus.lat, this.pendingFocus.lng] as [number, number])
      : originCoords;

    this.map = L.map(this.mapEl.nativeElement, { zoomControl: false }).setView(
      start,
      this.pendingFocus ? 15 : 8,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.routeLine = L.polyline([originCoords, destCoords], {
      color: '#151D48',
      weight: 4,
      opacity: 0.55,
      dashArray: '1, 10',
      lineCap: 'round',
    }).addTo(this.map);

    this.addPin(originCoords, '#151D48', 'A');
    this.addPin(destCoords, '#D32F2F', 'B');

    // Static markers for the other nearby routes, spread along the line.
    // Tapping one selects that exact route (never a default/first item)
    // and opens the compact info card, whose View button reuses the
    // same bookTrip() flow as List Mode.
    this.nearbyRoutes.forEach((route, i) => {
      const frac = Math.min(0.15 + i * 0.18, 0.9);
      const pos = this.interpolate(originCoords, destCoords, frac);
      const marker = this.busDivMarker(pos, route.status === 'delayed');
      marker.on('click', (e) => {
        // Leaflet markers bubble clicks up to the map by default
        // (bubblingMouseEvents). Without stopping it here, the map's own
        // "tap empty area to dismiss" click handler below fires right
        // after this one and immediately nulls the card back out.
        L.DomEvent.stopPropagation(e);
        this.zone.run(() => {
          this.selectedMapRoute = route;
        });
      });
      marker.addTo(this.map!);
    });

    // Tapping empty map area dismisses the info card. (Marker clicks are
    // explicitly stopped from bubbling here — see stopPropagation above —
    // so this only ever fires for genuine empty-area taps.)
    this.map.on('click', () => {
      this.zone.run(() => {
        this.selectedMapRoute = null;
      });
    });

    // SIMULATED: the "fastest pick" bus animating along the route.
    // Replace with a real position feed (websocket/poll) once operators share GPS.
    // It represents nearbyRoutes[0] (today's fastest-arriving pick), so tapping
    // it opens the exact same info card/booking flow as tapping its static
    // marker below — this was previously missing a click handler entirely,
    // which made the moving bus look tappable but do nothing.
    const featuredRoute = this.nearbyRoutes[0];
    this.busMarker = this.busDivMarker(originCoords, false, true);
    this.busMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      this.zone.run(() => {
        this.selectedMapRoute = featuredRoute;
      });
    });
    this.busMarker.addTo(this.map);
    this.busInterval = setInterval(
      () => this.stepBus(originCoords, destCoords),
      900,
    );

    if (this.pendingFocus) {
      this.focusOn(this.pendingFocus);
    } else {
      this.map.fitBounds(this.routeLine.getBounds(), { padding: [40, 40] });
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    }

    this.syncHailMarker();
  }

<<<<<<< HEAD
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

=======
  private focusOn(f: FocusPin) {
    if (!this.map) return;
    if (this.focusMarker) this.map.removeLayer(this.focusMarker);
    this.focusMarker = L.marker([f.lat, f.lng], {
      icon: this.pinIcon('#D32F2F', '★'),
    }).addTo(this.map);
    this.focusMarker.bindPopup(`<strong>${f.label}</strong>`).openPopup();
    this.map.flyTo([f.lat, f.lng], 15, { duration: 0.8 });
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    this.pendingFocus = null;
  }

  private interpolate(
    a: [number, number],
    b: [number, number],
    t: number,
  ): [number, number] {
<<<<<<< HEAD
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
   * Deterministic 0.2–0.79 seed from the route id.
   */
  private seedProgress(
    routeId: string,
  ): number {
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
      0.2 +
      (hash % 60) / 100
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
            ${route.fare}
          </span>

          ·

          <span>
            ${route.seats}
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
=======
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  private stepBus(origin: [number, number], dest: [number, number]) {
    this.busProgress += 0.02 * this.busDirection;
    if (this.busProgress >= 1) {
      this.busProgress = 1;
      this.busDirection = -1;
    }
    if (this.busProgress <= 0) {
      this.busProgress = 0;
      this.busDirection = 1;
    }
    this.busMarker?.setLatLng(this.interpolate(origin, dest, this.busProgress));
  }

  private pinIcon(color: string, glyph: string): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;">
               <span style="transform:rotate(45deg);color:#fff;font-size:12px;font-weight:800;">${glyph}</span>
             </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });
  }

  /** Same drop-pin shape as pinIcon(), but with the ionicons "hand-left"
   *  icon (inline SVG) instead of a text glyph. */
  private hailPinIcon(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#059669;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;">
               <svg style="transform:rotate(45deg);" width="14" height="14" viewBox="0 0 512 512" fill="#fff"><path d="M432.8 211.44c-15.52-8.82-34.91-2.28-43.31 13.68l-41.38 84.41a7 7 0 01-8.93 3.43 7 7 0 01-4.41-6.52V72c0-13.91-12.85-24-26.77-24s-26 10.09-26 24v156.64A11.24 11.24 0 01271.21 240 11 11 0 01260 229V24c0-13.91-10.94-24-24.86-24S210 10.09 210 24v204.64A11.24 11.24 0 01199.21 240 11 11 0 01188 229V56c0-13.91-12.08-24-26-24s-26 11.09-26 25v187.64A11.24 11.24 0 01125.21 256 11 11 0 01114 245V120c0-13.91-11.08-24-25-24s-25.12 10.22-25 24v216c0 117.41 72 176 160 176h16c88 0 115.71-39.6 136-88l68.71-169c6.62-18 3.6-34.75-11.91-43.56z"/></svg>
             </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });
  }

  private addPin(coords: [number, number], color: string, glyph: string) {
    L.marker(coords, { icon: this.pinIcon(color, glyph) }).addTo(this.map!);
  }

  private busDivMarker(
    coords: [number, number],
    delayed: boolean,
    animated = false,
  ): L.Marker {
    const bg = delayed ? '#D32F2F' : '#151D48';
    const pulse = animated
      ? `<span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${bg};opacity:0.5;animation:byaheroPulse 1.6s ease-out infinite;"></span>`
      : '';
    const html = `
      <div style="position:relative;width:30px;height:30px;">
        ${pulse}
        <div style="width:30px;height:30px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM18 11H6V6h12v5z"/></svg>
        </div>
      </div>`;
    return L.marker(coords, {
      icon: L.divIcon({
        className: '',
        html,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    });
  }

  private resolveCoords(place: string): [number, number] {
    const p = place.toLowerCase();
    const key = Object.keys(this.CITY_COORDS).find((k) => p.includes(k));
    return key ? this.CITY_COORDS[key] : this.CITY_COORDS['baguio'];
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }

  locateMe() {
    if (!navigator.geolocation) {
<<<<<<< HEAD
      this.locateMessage =
        'Location not supported on this device';

      this.clearLocateMessage();

      return;
    }

    this.locating = true;

=======
      this.locateMessage = 'Location not supported on this device';
      this.clearLocateMessage();
      return;
    }
    this.locating = true;
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        this.zone.run(() => {
          this.locating = false;
<<<<<<< HEAD

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
          this.locating = false;

          this.locateMessage =
            'Location permission denied';

          this.clearLocateMessage();
        }),

      {
        enableHighAccuracy: true,
        timeout: 8000,
      },
    );
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

=======
          const coords: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          if (!this.map) return;
          if (this.userMarker) this.map.removeLayer(this.userMarker);
          this.userMarker = L.marker(coords, {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:18px;height:18px;border-radius:50%;background:#151D48;border:3px solid #fff;box-shadow:0 0 0 4px rgba(21,29,72,0.25);"></div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            }),
          }).addTo(this.map);
          this.map.flyTo(coords, 14, { duration: 0.8 });
        }),
      () =>
        this.zone.run(() => {
          this.locating = false;
          this.locateMessage = 'Location permission denied';
          this.clearLocateMessage();
        }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  private clearLocateMessage() {
    setTimeout(() => {
      this.locateMessage = '';
    }, 3000);
  }
}