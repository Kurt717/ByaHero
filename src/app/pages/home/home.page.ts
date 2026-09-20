import * as L from 'leaflet';

import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
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
  checkmarkCircle,
  chevronForwardOutline,
  carSportOutline,
  compassOutline,
  bus,
  search,
  locateOutline,
  starSharp,
  closeOutline,
  handLeftOutline,
} from 'ionicons/icons';
import { BookingService, TripSummary } from '../booking/booking.service';

addIcons({
  'navigate-outline': navigateOutline,
  'ticket-outline': ticketOutline,
  'heart-outline': heartOutline,
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
  'checkmark-circle': checkmarkCircle,
  'chevron-forward-outline': chevronForwardOutline,
  'car-sport-outline': carSportOutline,
  'compass-outline': compassOutline,
  bus: bus,
  search: search,
  'locate-outline': locateOutline,
  'star-sharp': starSharp,
  'close-outline': closeOutline,
  'hand-left-outline': handLeftOutline,
});

interface FocusPin {
  lat: number;
  lng: number;
  label: string;
}

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
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonAvatar,
    RouterLink,
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
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
        setTimeout(() => this.ensureMap(), 60);
      }
    });
  }

  ngAfterViewInit() {
    if (this.selectedView === 'map') {
      setTimeout(() => this.ensureMap(), 60);
    }
  }

  ngOnDestroy() {
    if (this.busInterval) clearInterval(this.busInterval);
    if (this.hailTimer) clearTimeout(this.hailTimer);
    this.map?.remove();
  }

  viewLiveTrip() {
    this.router.navigateByUrl('/active-trip');
  }

  goToFavorites() {
    this.router.navigateByUrl('/favorites');
  }

  bookTrip(route: any) {
    const trip: TripSummary = {
      operator: route.operator,
      from: route.from,
      to: route.to,
      eta: route.eta,
      fare: route.fare,
      seatsLeft: route.seats,
      status: route.status,
    };
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

  private ensureMap() {
    if (!this.mapEl) return;

    if (this.map) {
      this.map.invalidateSize();
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
    }

    this.syncHailMarker();
  }

  private focusOn(f: FocusPin) {
    if (!this.map) return;
    if (this.focusMarker) this.map.removeLayer(this.focusMarker);
    this.focusMarker = L.marker([f.lat, f.lng], {
      icon: this.pinIcon('#D32F2F', '★'),
    }).addTo(this.map);
    this.focusMarker.bindPopup(`<strong>${f.label}</strong>`).openPopup();
    this.map.flyTo([f.lat, f.lng], 15, { duration: 0.8 });
    this.pendingFocus = null;
  }

  private interpolate(
    a: [number, number],
    b: [number, number],
    t: number,
  ): [number, number] {
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
  }

  locateMe() {
    if (!navigator.geolocation) {
      this.locateMessage = 'Location not supported on this device';
      this.clearLocateMessage();
      return;
    }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        this.zone.run(() => {
          this.locating = false;
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

  private clearLocateMessage() {
    setTimeout(() => {
      this.locateMessage = '';
    }, 3000);
  }
}