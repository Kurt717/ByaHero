import * as L from 'leaflet';
import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
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
} from 'ionicons/icons';

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
});

type StopStatus = 'done' | 'current' | 'upcoming';
type TripStage = 'boarding' | 'enroute' | 'arriving';

interface TripStop {
  name: string;
  sub: string;
  status: StopStatus;
}

@Component({
  selector: 'app-active-trip',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './active-trip.page.html',
  styleUrls: ['./active-trip.page.scss'],
})
export class ActiveTripPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  trip = {
    operator: 'Victory Liner',
    busNo: '402',
    plate: 'NBC 1932',
    from: 'Baguio City',
    to: 'Tuguegarao City',
    driver: 'Ramon Cruz',
    rating: '4.8',
  };

  stops: TripStop[] = [
    { name: 'Baguio City Terminal', sub: 'Boarded • 7:02 AM', status: 'done' },
    { name: 'Rosario, La Union', sub: 'Rest stop • ETA 7:48 AM', status: 'current' },
    { name: 'Santiago City', sub: 'ETA 9:15 AM', status: 'upcoming' },
    { name: 'Tuguegarao City Terminal', sub: 'Final stop • ETA 11:40 AM', status: 'upcoming' },
  ];

  private readonly originCoords: [number, number] = [16.4023, 120.596]; // Baguio
  private readonly destCoords: [number, number] = [17.6132, 121.727]; // Tuguegarao

  private map: L.Map | null = null;
  private busMarker: L.Marker | null = null;
  private busInterval: any = null;
  private busProgress = 0.12; // trip just departed

  constructor(private router: Router) {
      addIcons({arrowBackOutline,chevronForwardOutline,shareSocialOutline,navigateOutline,locateOutline,star,chatbubbleEllipsesOutline,callOutline,checkmarkCircle,ticketOutline,alertOutline});}

  ngOnInit() {}

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 60);
  }

  ngOnDestroy() {
    if (this.busInterval) clearInterval(this.busInterval);
    this.map?.remove();
  }

  get stage(): TripStage {
    if (this.busProgress < 0.15) return 'boarding';
    if (this.busProgress > 0.85) return 'arriving';
    return 'enroute';
  }

  get progressPercent(): number {
    return Math.round(this.busProgress * 100);
  }

  get etaLabel(): string {
    const minsLeft = Math.max(2, Math.round((1 - this.busProgress) * 90));
    return `${minsLeft} min`;
  }

  goBack() {
    this.router.navigateByUrl('/home');
  }

  recenter() {
    if (!this.map || !this.busMarker) return;
    this.map.panTo(this.busMarker.getLatLng(), { animate: true });
  }

  callDriver() {
    window.open('tel:+639171234567');
  }

  messageDriver() {
    console.log('Opening chat with', this.trip.driver);
  }

  shareTrip() {
    const text = `Tracking my ${this.trip.operator} trip from ${this.trip.from} to ${this.trip.to} on ByaHero.`;
    if ((navigator as any).share) {
      (navigator as any).share({ title: 'My ByaHero trip', text });
    } else {
      console.log('Share:', text);
    }
  }

  sosAlert() {
    console.log('SOS triggered for trip', this.trip.busNo);
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

    this.busMarker = this.busDivMarker(
      this.interpolate(this.originCoords, this.destCoords, this.busProgress),
    );
    this.busMarker.addTo(this.map);

    this.map.fitBounds(routeLine.getBounds(), { padding: [40, 60] });

    this.busInterval = setInterval(() => this.stepBus(), 1200);
  }

  private stepBus() {
    if (this.busProgress >= 0.94) return; // simulate arriving soon, don't overshoot
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