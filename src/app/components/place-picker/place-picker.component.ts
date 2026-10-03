import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  closeOutline,
  locateOutline,
  timeOutline,
  businessOutline,
  locationOutline,
  navigateOutline,
  checkmarkCircle,
} from 'ionicons/icons';
import { RouteCatalogService } from '../../services/route-catalog.service';
import { PickupService } from '../../services/pickup.service';
import {
  NetworkService,
  type Corridor,
  type CorridorStop,
} from '../../services/network.service';

addIcons({
  'search-outline': searchOutline,
  'close-outline': closeOutline,
  'locate-outline': locateOutline,
  'time-outline': timeOutline,
  'business-outline': businessOutline,
  'location-outline': locationOutline,
  'navigate-outline': navigateOutline,
  'checkmark-circle': checkmarkCircle,
});

export interface PlacePick {
  label: string;
  query: string;
}

interface PlaceRow {
  label: string;
  sub: string;
  kind: 'city' | 'terminal';
  /** Text used for route matching (terminal → its city). */
  query: string;
  icon: string;
}

/** Grab-style place picker: search cities + terminals, current location,
 *  recents. Emits display label + route-matching query (terminal → city). */
@Component({
  selector: 'app-place-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './place-picker.component.html',
  styleUrls: ['./place-picker.component.scss'],
})
export class PlacePickerComponent implements OnInit, OnDestroy {
  /** 'Pickup point' | 'Destination' — shown as the sheet title. */
  @Input() fieldLabel = 'Destination';
  /** Currently selected display value (shows a check). */
  @Input() currentValue = '';
  /** When set (destination field), only stops reachable from this origin
   *  place are offered — an impossible trip can't be built. */
  @Input() limitOrigin = '';
  @Output() picked = new EventEmitter<PlacePick>();
  @Output() dismissed = new EventEmitter<void>();

  private catalog = inject(RouteCatalogService);
  private pickup = inject(PickupService);
  private network = inject(NetworkService);

  search = '';
  locating = false;
  locateError = '';
  recents: PlacePick[] = [];
  private readonly recentsKey = 'byahero.recent-places.v1';

  private readonly cities: PlaceRow[] = [
    { label: 'Baguio City', sub: 'Summer Capital · Benguet', kind: 'city', query: 'Baguio City', icon: 'location-outline' },
    { label: 'Tuguegarao City', sub: 'Cagayan Valley', kind: 'city', query: 'Tuguegarao City', icon: 'location-outline' },
    { label: 'Vigan City', sub: 'Heritage Town · Ilocos Sur', kind: 'city', query: 'Vigan City', icon: 'location-outline' },
    { label: 'Laoag City', sub: 'Ilocos Norte', kind: 'city', query: 'Laoag City', icon: 'location-outline' },
    { label: 'Santiago City', sub: 'Isabela', kind: 'city', query: 'Santiago City', icon: 'location-outline' },
    { label: 'Cauayan', sub: 'Isabela', kind: 'city', query: 'Cauayan', icon: 'location-outline' },
    { label: 'Ilagan', sub: 'Isabela', kind: 'city', query: 'Ilagan', icon: 'location-outline' },
    { label: 'Sagada', sub: 'Mountain Province', kind: 'city', query: 'Sagada', icon: 'location-outline' },
    { label: 'Banaue', sub: 'Rice Terraces · Ifugao', kind: 'city', query: 'Banaue', icon: 'location-outline' },
    { label: 'Solano', sub: 'Nueva Vizcaya', kind: 'city', query: 'Solano', icon: 'location-outline' },
    { label: 'Cabanatuan', sub: 'Nueva Ecija', kind: 'city', query: 'Cabanatuan', icon: 'location-outline' },
    { label: 'Manila (PITX)', sub: 'Paranaque Integrated Terminal', kind: 'city', query: 'Manila (PITX)', icon: 'location-outline' },
    { label: 'Cubao, QC', sub: 'Quezon City', kind: 'city', query: 'Cubao, QC', icon: 'location-outline' },
    { label: 'San Fernando City', sub: 'Surf Coast · La Union', kind: 'city', query: 'San Fernando City', icon: 'location-outline' },
    { label: 'Dagupan City', sub: 'Bangus Capital · Pangasinan', kind: 'city', query: 'Dagupan City', icon: 'location-outline' },
    { label: 'Alaminos', sub: 'Hundred Islands · Pangasinan', kind: 'city', query: 'Alaminos', icon: 'location-outline' },
    { label: 'Bontoc', sub: 'Mountain Province', kind: 'city', query: 'Bontoc', icon: 'location-outline' },
    { label: 'Tabuk City', sub: 'Kalinga', kind: 'city', query: 'Tabuk City', icon: 'location-outline' },
    { label: 'Aparri', sub: 'Northern Tip · Cagayan', kind: 'city', query: 'Aparri', icon: 'location-outline' },
    { label: 'Pagudpud', sub: 'White Beaches · Ilocos Norte', kind: 'city', query: 'Pagudpud', icon: 'location-outline' },
    { label: 'Baler', sub: 'Surf Town · Aurora', kind: 'city', query: 'Baler', icon: 'location-outline' },
    { label: 'Bayombong', sub: 'Nueva Vizcaya', kind: 'city', query: 'Bayombong', icon: 'location-outline' },
  ];

  ngOnInit() {
    // Hide the floating tab bar while picking (global rule in global.scss).
    try {
      document.body.classList.add('pp-open');
    } catch {
      /* non-DOM environment */
    }
    try {
      const raw = localStorage.getItem(this.recentsKey);
      this.recents = raw ? (JSON.parse(raw) as PlacePick[]) : [];
    } catch {
      this.recents = [];
    }
    // Keep the user's current selection out of recents.
    this.recents = this.recents.filter((r) => r.label !== this.currentValue).slice(0, 6);
  }

  ngOnDestroy() {
    try {
      document.body.classList.remove('pp-open');
    } catch {
      /* non-DOM environment */
    }
  }

  private get terminals(): PlaceRow[] {
    return this.catalog.terminals.map((t) => ({
      label: t.name,
      sub: `Terminal · ${t.city}`,
      kind: 'terminal' as const,
      query: t.city,
      icon: 'business-outline',
    }));
  }

  private matches(row: PlaceRow, q: string): boolean {
    if (!q) return true;
    const hay = `${row.label} ${row.sub}`.toLowerCase();
    return hay.includes(q);
  }

  /** Prefix matches rank above mid-string matches (recognition first). */
  private rank(row: PlaceRow, q: string): number {
    if (!q) return 0;
    return row.label.toLowerCase().startsWith(q) ? 0 : 1;
  }

  get cityResults(): PlaceRow[] {
    const q = this.search.trim().toLowerCase();
    return this.cities
      .filter((c) => this.matches(c, q) && this.isReachable(c))
      .sort((a, b) => this.rank(a, q) - this.rank(b, q));
  }

  get terminalResults(): PlaceRow[] {
    const q = this.search.trim().toLowerCase();
    return this.terminals
      .filter((t) => this.matches(t, q) && this.isReachable(t))
      .sort((a, b) => this.rank(a, q) - this.rank(b, q));
  }

  get recentResults(): PlacePick[] {
    const q = this.search.trim().toLowerCase();
    const list = q
      ? this.recents.filter((r) => r.label.toLowerCase().includes(q))
      : this.recents;
    const allowed = this.reachableNames();
    if (!allowed) return list;
    return list.filter((r) =>
      allowed.some((n) => tokensOverlap(r.label, n)),
    );
  }

  /** Stop names reachable from the limiting origin (null = no limit). */
  private reachableNames(): string[] | null {
    if (!this.limitOrigin) return null;
    const names: string[] = [];
    for (const corridor of this.network.corridors) {
      const origin = this.bestStop(corridor, this.limitOrigin);
      if (!origin) continue;
      for (const s of corridor.stops) {
        if (s.id !== origin.id) names.push(s.name);
      }
    }
    return names.length ? names : null;
  }

  get reachHint(): string {
    return this.limitOrigin && this.reachableNames()
      ? `Reachable from ${this.limitOrigin}`
      : '';
  }

  private isReachable(row: PlaceRow): boolean {
    const allowed = this.reachableNames();
    if (!allowed) return true;
    const hay = `${row.label} ${row.query}`;
    return allowed.some((n) => tokensOverlap(hay, n));
  }

  private bestStop(corridor: Corridor, text: string): CorridorStop | null {
    const tokens = placeTokens(text);
    if (!tokens.length) return null;
    let best: CorridorStop | null = null;
    let bestScore = 0;
    for (const stop of corridor.stops) {
      const stopTokens = placeTokens(stop.name);
      let score = 0;
      for (const tok of tokens) {
        if (stopTokens.includes(tok)) score += tok.length;
      }
      if (score > 0 && score > bestScore) {
        best = stop;
        bestScore = score;
      }
    }
    return best;
  }

  clearSearch() {
    this.search = '';
    this.locateError = '';
  }

  isCurrent(label: string): boolean {
    return label === this.currentValue;
  }

  /** GPS → nearest known city, picked like any other place. */
  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.locateError = 'Location is not supported on this device.';
      return;
    }
    this.locating = true;
    this.locateError = '';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating = false;
        const city = this.pickup.nearestCity(pos.coords.latitude, pos.coords.longitude);
        this.choose({ label: `Current location · ${city}`, query: city });
      },
      () => {
        this.locating = false;
        this.locateError = 'Could not get your location. Pick a place below instead.';
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  choose(place: PlacePick) {    const next = [
      place,
      ...this.recents.filter((r) => r.label !== place.label),
    ].slice(0, 6);
    this.recents = next;
    try {
      localStorage.setItem(this.recentsKey, JSON.stringify(next));
    } catch {
      // Private mode: recents simply don't persist.
    }
    this.picked.emit(place);
  }
}

const FILLER_WORDS = new Set(['city', 'terminal', 'crossing', 'junction', 'manila']);

function placeTokens(text: string): string[] {
  return (text ?? '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length > 3 && !FILLER_WORDS.has(t));
}

function tokensOverlap(a: string, b: string): boolean {
  const at = placeTokens(a);
  const bt = new Set(placeTokens(b));
  return at.some((t) => bt.has(t));
}
