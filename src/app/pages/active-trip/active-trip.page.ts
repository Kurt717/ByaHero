import * as L from 'leaflet';
import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  shareSocialOutline,
  alertOutline,
  callOutline,
  chatbubbleEllipsesOutline,
  navigateOutline,
  locateOutline,
  star,
  checkmarkCircle,
  chevronForwardOutline,
  ticketOutline,
  sunnyOutline,
  cloudyOutline,
  rainyOutline,
  thunderstormOutline,
  flagOutline,
} from 'ionicons/icons';
import { TicketService, Booking } from '../bookings/ticket.service';
import { TravelConditionsService } from '../../services/travel-conditions.service';
import { PickupService } from '../../services/pickup.service';
import { TripReviewService, TripReview } from '../bookings/trip-review.service';
import { RouteCatalogService } from '../../services/route-catalog.service';
import {
  RouteStopsService,
  type RouteStopTimelineView,
  type TimedRouteStop,
} from '../../services/route-stops.service';
import { RideIdentityService } from '../../services/ride-identity.service';
import { RideCardsComponent } from '../../components/ride-cards/ride-cards.component';
import { RouteStopTimelineComponent } from '../../components/route-stop-timeline/route-stop-timeline.component';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'share-social-outline': shareSocialOutline,
  'alert-outline': alertOutline,
  'call-outline': callOutline,
  'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
  'navigate-outline': navigateOutline,
  'locate-outline': locateOutline,
  star: star,
  'checkmark-circle': checkmarkCircle,
  'chevron-forward-outline': chevronForwardOutline,
  'ticket-outline': ticketOutline,
  'sunny-outline': sunnyOutline,
  'cloudy-outline': cloudyOutline,
  'rainy-outline': rainyOutline,
  'thunderstorm-outline': thunderstormOutline,
  'flag-outline': flagOutline,
});

type TripStage = 'boarding' | 'enroute' | 'arriving';

const CITY_COORDS: Record<string, [number, number]> = {
  'Baguio City': [16.4023, 120.596],
  'Tuguegarao City': [17.6132, 121.727],
  'Manila (PITX)': [14.4722, 120.9991],
  'Manila (Cubao)': [14.6205, 121.0522],
  Vigan: [17.5739, 120.3887],
  Laoag: [18.1977, 120.5927],
  Cauayan: [16.9295, 121.7697],
  Ilagan: [17.1486, 121.8894],
  'Santiago City': [16.6896, 121.5507],
};

const PLATES: Record<string, string> = {
  'Victory Liner': 'NBC 1932',
  'GV Florida': 'DDE 4821',
  Partas: 'GDH 7205',
  'Florida Bus Line': 'NEE 4108',
};

@Component({
  selector: 'app-active-trip',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, RideCardsComponent, RouteStopTimelineComponent],
  templateUrl: './active-trip.page.html',
  styleUrls: ['./active-trip.page.scss'],
})
export class ActiveTripPage implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastController = inject(ToastController);
  private ticketService = inject(TicketService);
  private pickupService = inject(PickupService);
  private reviewService = inject(TripReviewService);
  private catalog = inject(RouteCatalogService);
  private routeStops = inject(RouteStopsService);
  private rideIdentity = inject(RideIdentityService);
  private conditionsService = inject(TravelConditionsService);

  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  /** The timeline always follows the booking opened via `?ref=` when present
   *  (multiple active bookings), otherwise the current active booking. */
  booking: Booking | null = this.resolveBooking();

  /** Ride facts come from RideIdentityService (single source of truth shared
   *  with Emergency Mode, E-ticket and Boarding Pass). */
  trip = {
    operator: this.booking?.operator ?? 'Victory Liner',
    busNo: this.booking
      ? this.rideIdentity.busNoForRef(this.booking.bookingRef)
      : '402',
    plate: this.booking
      ? this.rideIdentity.plateFor(this.booking.operator)
      : 'NBC 1932',
    from: this.booking?.from ?? 'Baguio City',
    to: this.booking?.to ?? 'Tuguegarao City',
    driver: this.booking
      ? this.rideIdentity.driverFor(this.booking.operator)
      : 'Ramon Cruz',
    rating: '4.8',
  };

  /** Journey timeline (see `get stops()` below) derives from booking data. */
  private readonly originCoords: [number, number] =
    CITY_COORDS[this.trip.from] ?? [16.4023, 120.596];
  private readonly destCoords: [number, number] =
    CITY_COORDS[this.trip.to] ?? [17.6132, 121.727];

  /** Estimated full journey in minutes — taken from the route catalog
   *  entry for this origin → destination (e.g. '7h 30m' → 450) so ETA and
   *  progress share one basis; falls back to 90 when unmatched. */
  private readonly tripMinutes = this.tripMinutesFor(this.booking);

  private map: L.Map | null = null;
  private busMarker: L.Marker | null = null;
  private busInterval: any = null;
  /** Map display position, seeded deterministically from departure + device
   *  time (see derivedProgress). Refreshing restores the same position. */
  private busProgress = this.initialBusProgress();
  /** True once the estimated arrival has passed. Marker parks at the
   *  destination and the timeline reads all-done. */
  private hasArrived = this.derivedProgress() >= 1;

  constructor() {
      addIcons({arrowBackOutline,chevronForwardOutline,shareSocialOutline,navigateOutline,locateOutline,star,chatbubbleEllipsesOutline,callOutline,checkmarkCircle,ticketOutline,alertOutline});}

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 60);
    this.maybeAnnounceArrival();
    // Best-effort refresh of the traveler's current location so pickup
    // distances and Alerts stay honest. Silent: keeps the old fix on failure.
    const b = this.booking;
    if (b && (b.status === 'confirmed' || b.status === 'boarding')) {
      void this.pickupService.refreshCurrentForBooking(b.bookingRef);
    }
  }

  ngOnDestroy() {
    if (this.busInterval) clearInterval(this.busInterval);
    this.map?.remove();
  }

  private resolveBooking(): Booking | null {
    const ref = this.route.snapshot.queryParamMap.get('ref');
    if (ref) {
      return (
        this.ticketService.findByRef(ref) ?? this.ticketService.activeBooking
      );
    }
    return this.ticketService.activeBooking;
  }

  /** Catalog duration (e.g. '7h 30m', '7h', '1h 30m') → minutes. */
  private tripMinutesFor(b: Booking | null): number {
    if (b) {
      const from = b.from.trim().toLowerCase();
      const to = b.to.trim().toLowerCase();
      const hit =
        this.catalog.routes.find(
          (r) =>
            r.from.trim().toLowerCase() === from &&
            r.to.trim().toLowerCase() === to,
        ) ??
        this.catalog.routes.find(
          (r) =>
            from.includes(r.from.trim().toLowerCase()) ||
            r.from.trim().toLowerCase().includes(from),
        );
      const mins = hit ? this.durationToMinutes(hit.duration) : NaN;
      if (Number.isFinite(mins) && mins > 0) return mins;
    }
    return 90;
  }

  private durationToMinutes(duration: string): number {
    const hours = /(\d+(?:\.\d+)?)\s*h/i.exec(duration)?.[1];
    const minutes = /(\d+(?:\.\d+)?)\s*m(?!s)/i.exec(duration)?.[1];
    return (
      (hours ? Number(hours) * 60 : 0) + (minutes ? Number(minutes) : 0)
    );
  }

  /** Canonical route-stop timeline for this booking — same deterministic
   *  progress fraction drives the map marker and these stop states, so
   *  both always tell the same story. */
  get timelineView(): RouteStopTimelineView {
    return this.routeStops.timelineForBooking(
      this.booking,
      this.timelineProgress(),
    );
  }

  /** Journey stops in canonical form (route stops + ETAs + states). */
  get stops(): TimedRouteStop[] {
    return this.timelineView.stops;
  }

  /** Single progress value shared by map marker + timeline. Completed
   *  bookings pin at 1; cancelled bookings pin at 0 (timeline hides). */
  private timelineProgress(): number {
    if (this.booking?.status === 'completed') return 1;
    if (this.booking?.status === 'cancelled') return 0;
    if (this.hasArrived) return 1;
    return this.busProgress;
  }

  /** High-level pill state (Boarding / En Route / Arriving) from the same
   *  progress fraction — a label only, the stop list is the timeline. */

  /** Deterministic 0..1+ journey fraction from departure + device time.
   *  Same booking + same clock = same progress on every refresh. */
  private derivedProgress(): number {
    const dep = this.departureTime();
    if (!dep) return 0;
    return (Date.now() - dep.getTime()) / (this.tripMinutes * 60000);
  }

  private initialBusProgress(): number {
    const p = this.derivedProgress();
    if (p <= 0) return 0;
    return Math.min(p, 0.97);
  }

  private departureTime(): Date | null {
    const b = this.booking;
    if (!b) return null;
    const d = new Date(`${b.date} ${b.time}`);
    return isNaN(d.getTime()) ? null : d;
  }

  get stage(): TripStage {
    if (this.busProgress < 0.15) return 'boarding';
    if (this.busProgress > 0.85) return 'arriving';
    return 'enroute';
  }

  get progressPercent(): number {
    if (this.booking?.status === 'cancelled') return 0;
    if (this.booking?.status === 'completed' || this.hasArrived) return 100;
    return Math.round(Math.max(0, Math.min(this.busProgress, 1)) * 100);
  }

  get etaLabel(): string {
    if (this.hasArrived) return 'Arrived';
    // No valid departure/arrival data — hide the countdown instead of
    // showing NaN or a fabricated ETA (template falls back to route info).
    if (!this.departureTime()) return '';
    const minsLeft = Math.max(2, Math.round((1 - Math.min(Math.max(this.busProgress, 0), 1)) * this.tripMinutes));
    return `${minsLeft} min`;
  }

  /** Next-stop line uses the canonical current/next stops. */
  get nextStopLabel(): string {
    const view = this.timelineView;
    if (this.booking?.status === 'cancelled') return 'Booking cancelled — no live tracking';
    if (this.hasArrived || view.mode === 'completed') {
      return `Arrived at ${this.trip.to} Terminal`;
    }
    const next = view.nextStop ?? view.currentStop;
    if (!next) return `Next stop: ${this.trip.to} Terminal`;
    const eta = next.etaLabel ? ` · ETA ${next.etaLabel}` : this.etaLabel ? ` · ETA ${this.etaLabel}` : '';
    const prefix = view.mode === 'preview' ? 'First stop' : 'Next stop';
    return `${prefix}: ${next.name}${eta} (simulated position)`;
  }

  /** Template-facing arrival state (timeline reached Arrived). */
  get arrived(): boolean {
    return this.hasArrived;
  }

  /** True once the user confirms arrival via TicketService.updateStatus. */
  get isCompleted(): boolean {
    return this.booking?.status === 'completed';
  }

  /** Saved post-ride review for this booking, if any. */
  get review(): TripReview | null {
    return this.booking ? this.reviewService.getFor(this.booking.bookingRef) : null;
  }

  /**
   * Arrival confirmation — the ONLY path that completes a trip from here.
   * Reuses TicketService.updateStatus so the booking keeps its history,
   * E-Ticket and details and simply moves to Past/Completed. Never fires
   * automatically: the user must tap CONFIRM ARRIVAL.
   */
  confirmArrival() {
    const b = this.booking;
    if (!b || !this.hasArrived || b.status === 'completed' || b.status === 'cancelled') return;
    const updated = this.ticketService.updateStatus(b.bookingRef, 'completed');
    if (updated) {
      this.booking = updated;
      void this.showToast('Arrival confirmed. Enjoy the rest of your day, Kabyahe!');
    }
  }

  openReview() {
    if (this.booking) {
      this.router.navigateByUrl(`/review-ride/${this.booking.bookingRef}`);
    }
  }

  /** One-time arrival notice reusing the existing toast + the arrival-alert
   *  preference — no new notification infrastructure, no auto-completing
   *  the booking (TicketService.updateStatus stays the single status path). */
  private maybeAnnounceArrival() {
    if (!this.hasArrived || !this.booking) return;
    const key = `byahero.arrived-toast.${this.booking.bookingRef}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      return;
    }
    if (!this.arrivalAlertsEnabled()) return;
    void this.showToast(
      `You have arrived at ${this.trip.to} Terminal. Safe travels, Kabyahe!`,
    );
  }

  private arrivalAlertsEnabled(): boolean {
    try {
      const prefs = JSON.parse(
        localStorage.getItem('byahero.profile-preferences.v1') ?? '{}',
      ) as Record<string, unknown>;
      return prefs['Arrival Alerts'] !== false;
    } catch {
      return true;
    }
  }

  goBack() {
    this.router.navigateByUrl('/home');
  }

  /** Slim sample-conditions indicator for the live corridor. Compact by
   *  design — the map stays the hero of this screen. */
  get corridorConditions() {
    const sample = this.conditionsService.forTrip(this.trip.from, this.trip.to);
    if (sample.kind === 'unknown') return null;
    const line =
      sample.impact === 'advisory'
        ? 'Heavy rain may affect travel'
        : sample.impact === 'caution'
          ? 'Rain possible — allow extra time'
          : 'Conditions look normal';
    return { icon: sample.icon, line, impact: sample.impact };
  }

  openConditions() {
    this.router.navigateByUrl('/travel-conditions?from=active');
  }

  viewTicket() {
    if (this.booking) {
      this.router.navigateByUrl(`/e-ticket/${this.booking.bookingRef}`);
    } else {
      this.router.navigateByUrl('/bookings');
    }
  }

  recenter() {
    if (!this.map || !this.busMarker) return;
    this.map.panTo(this.busMarker.getLatLng(), { animate: true });
  }

  async shareTrip() {
    const id = this.booking
      ? this.rideIdentity.identityForBooking(this.booking)
      : null;
    const extra = id?.assigned
      ? ` ${this.rideIdentity.shortLabel(id)}. Ref ${this.booking?.bookingRef}.`
      : this.booking
        ? ` Ref ${this.booking.bookingRef}.`
        : '';
    const text = `Tracking my ${this.trip.operator} trip from ${this.trip.from} to ${this.trip.to} on ByaHero.${extra}`;
    const share = (navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    }).share;

    if (share) {
      try {
        await share({ title: 'My ByaHero trip', text });
        return;
      } catch {
        return;
      }
    }

    await navigator.clipboard.writeText(text);
    await this.showToast('Trip link copied.');
  }

  /** Enhanced SOS entry: opens dedicated Emergency Mode for this trip. */
  openEmergency() {
    if (this.booking) {
      this.router.navigate(['/emergency'], {
        queryParams: { ref: this.booking.bookingRef },
      });
    } else {
      this.router.navigateByUrl('/emergency');
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1700,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }

  private initMap() {
    if (!this.mapEl || this.map) return;

    this.map = L.map(this.mapEl.nativeElement, { zoomControl: false }).setView(
      this.interpolate(this.originCoords, this.destCoords, this.busProgress),
      8,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    const routeLine = L.polyline([this.originCoords, this.destCoords], {
      color: '#151D48',
      weight: 4,
      opacity: 0.55,
      dashArray: '1, 10',
      lineCap: 'round',
    }).addTo(this.map);

    this.addPin(this.originCoords, '#151D48', 'A');
    this.addPin(this.destCoords, '#D32F2F', 'B');
    this.addStopDots();

    this.busMarker = this.busDivMarker(
      this.interpolate(this.originCoords, this.destCoords, this.busProgress),
    );
    this.busMarker.addTo(this.map);

    this.map.fitBounds(routeLine.getBounds(), { padding: [40, 60] });

    this.busInterval = setInterval(() => this.stepBus(), 1200);
  }

  private stepBus() {
    if (this.hasArrived || this.busProgress >= 0.97) return;
    this.busProgress += 0.01;
    const pos = this.interpolate(this.originCoords, this.destCoords, this.busProgress);
    this.busMarker?.setLatLng(pos);
  }

  private interpolate(
    a: [number, number],
    b: [number, number],
    t: number,
  ): [number, number] {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  private addPin(coords: [number, number], color: string, glyph: string) {
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;">
               <span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:800;">${glyph}</span>
             </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    L.marker(coords, { icon }).addTo(this.map!);
  }

  /**
   * Intermediate stop dots along the same straight corridor the bus
   * marker travels, so map and timeline share one stop sequence. Visual
   * only (no GPS claim): positions interpolate by stop fraction.
   */
  private addStopDots() {
    if (!this.map || !this.booking) return;
    const stops = this.routeStops.stopsForRoute(this.booking.from, this.booking.to);
    for (const stop of stops.slice(1, -1)) {
      const pos = this.interpolate(this.originCoords, this.destCoords, stop.fraction);
      L.circleMarker(pos, {
        radius: 5,
        color: '#151D48',
        weight: 2,
        fillColor: '#ffffff',
        fillOpacity: 1,
      })
        .bindTooltip(stop.name, { direction: 'top', offset: [0, -6] })
        .addTo(this.map);
    }
  }

  private busDivMarker(coords: [number, number]): L.Marker {
    const html = `
      <div style="position:relative;width:30px;height:30px;">
        <span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid #151D48;opacity:0.5;animation:byaheroPulse 1.6s ease-out infinite;"></span>
        <div style="width:30px;height:30px;border-radius:50%;background:#151D48;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM18 11H6V6h12v5z"/></svg>
        </div>
      </div>`;
    return L.marker(coords, {
      icon: L.divIcon({ className: '', html, iconSize: [30, 30], iconAnchor: [15, 15] }),
    });
  }
}
