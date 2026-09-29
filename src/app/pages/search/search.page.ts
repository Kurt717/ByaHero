import { DecimalPipe } from '@angular/common';
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
} from 'ionicons/icons';
import { BookingService, TripSummary } from '../booking/booking.service';
import {
  RouteCatalogService,
  TerminalInfo,
} from '../../services/route-catalog.service';
import { PickupService } from '../../services/pickup.service';

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
});

type Category = 'bus' | 'uv' | 'shared' | 'all';
type SortOption = 'Fastest' | 'Cheapest' | 'Rated';

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
  imports: [FormsModule, IonContent, IonIcon, DecimalPipe],
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
})
export class SearchPage {
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private catalog = inject(RouteCatalogService);
  private pickupService = inject(PickupService);

  query = '';
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
    addIcons({searchOutline,closeCircleOutline,micOutline,arrowForwardOutline,chevronForwardOutline,locationOutline,chevronDownOutline,bus,star,mapOutline,arrowBackOutline,closeOutline,heart,heartOutline,businessOutline,});
  }

  get displayedDestinations(): Destination[] {
    return this.showAllDestinations
      ? this.mostVisited
      : this.mostVisited.slice(0, 4);
  }

  get filteredPopularRoutes(): RouteCard[] {
    const q = this.query.trim().toLowerCase();
    const byCategory =
      this.activeCategory === 'all'
        ? this.popularRoutes
        : this.popularRoutes.filter((route) => route.mode === this.activeCategory);

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

    return [...byQuery].sort((a, b) => {
      if (this.sortBy === 'Cheapest') return this.priceValue(a) - this.priceValue(b);
      if (this.sortBy === 'Rated') return b.rating - a.rating;
      return this.durationMinutes(a) - this.durationMinutes(b);
    });
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
    this.bookingService.startBooking(trip);
    this.bookingService.pickup = this.pickupService.getActive().pickup;
    this.router.navigateByUrl('/booking/trip');
  }

  /** Route → its origin terminal's schedule (date → departures → Reserve).
   *  Falls back to direct booking when no terminal serves that origin. */
  openRouteSchedule(route: RouteCard) {
    const terminal = this.catalog.terminalForCity(route.from);
    if (terminal) {
      this.router.navigate(['/terminal', terminal.id], {
        queryParams: { route: route.id },
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
