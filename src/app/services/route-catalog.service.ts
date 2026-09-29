import { Injectable } from '@angular/core';

export type RouteMode = 'bus' | 'uv' | 'shared';

export interface CatalogRoute {
  id: string;
  operator: string;
  from: string;
  to: string;
  fare: string;
  fareValue: number;
  duration: string;
  eta: string;
  etaMinutes: number;
  seats: string;
  seatsLeft: number;
  status: 'on-time' | 'delayed';
  mode: RouteMode;
  rating: number;
}

export interface FavoriteRoute {
  id: string;
  operator: string;
  from: string;
  to: string;
  fare: string;
  seats: string;
  status: string;
  mode: RouteMode;
  savedLabel: string;
  savedAt: number;
  useCount: number;
}

export type CatalogSort = 'Fastest' | 'Cheapest' | 'Rated';

/** A physical terminal: static hub info (hand-written prototype content)
 *  plus coordinates from existing map data. Schedules, operators and route
 *  counts always derive from the catalog — never hard-coded. */
export interface TerminalInfo {
  id: string;
  name: string;
  city: string;
  /** Static prototype string, same pattern as the old search list. */
  distance: string;
  lat: number;
  lng: number;
  hours: string;
  about: string;
  facilities: string[];
}

/** One scheduled departure from a terminal board. Derived deterministically
 *  from a catalog route (same operator/fare/seats — never invented), with a
 *  fixed daily time slot. No driver/vehicle: those are assigned later. */
export interface TerminalDeparture {
  id: string;
  routeId: string;
  operator: string;
  from: string;
  to: string;
  /** Exact slot, e.g. "8:30 AM" — becomes the booking's departure time. */
  time: string;
  /** Minutes since midnight, for sorting + "already departed" marking. */
  timeMinutes: number;
  fare: string;
  seats: string;
  seatsLeft: number;
  status: 'on-time' | 'delayed';
  duration: string;
}

@Injectable({ providedIn: 'root' })
export class RouteCatalogService {
  private readonly favoritesKey = 'byahero.favorite-routes.v1';

  /** Single catalog shared by Home, Search, Favorites, Alerts and the
   *  booking flow. Seeded once; the "live" values evolve as the user
   *  books seats. */
  readonly routes: CatalogRoute[] = [
    {
      id: 'r1',
      operator: 'Florida Bus Line',
      from: 'Tuguegarao',
      to: 'Manila (PITX)',
      fare: '₱ 620',
      fareValue: 620,
      duration: '9h 30m',
      eta: '4 min away',
      etaMinutes: 4,
      seats: '18 seats left',
      seatsLeft: 18,
      status: 'on-time',
      mode: 'bus',
      rating: 4.4,
    },
    {
      id: 'r2',
      operator: 'Victory Liner',
      from: 'Santiago City',
      to: 'Cubao, QC',
      fare: '₱ 480',
      fareValue: 480,
      duration: '7h',
      eta: '11 min away',
      etaMinutes: 11,
      seats: '6 seats left',
      seatsLeft: 6,
      status: 'delayed',
      mode: 'bus',
      rating: 4.7,
    },
    {
      id: 'r3',
      operator: 'GV Florida UV Express',
      from: 'Cauayan',
      to: 'Ilagan',
      fare: '₱ 95',
      fareValue: 95,
      duration: '1h 30m',
      eta: '2 min away',
      etaMinutes: 2,
      seats: '3 seats left',
      seatsLeft: 3,
      status: 'on-time',
      mode: 'uv',
      rating: 4.5,
    },
    {
      id: 'r4',
      operator: 'Baliwag Transit',
      from: 'Solano',
      to: 'Cabanatuan',
      fare: '₱ 210',
      fareValue: 210,
      duration: '2h 45m',
      eta: '19 min away',
      etaMinutes: 19,
      seats: '22 seats left',
      seatsLeft: 22,
      status: 'on-time',
      mode: 'bus',
      rating: 4.2,
    },
    {
      id: 'r5',
      operator: 'Victory Liner',
      from: 'Manila (Cubao)',
      to: 'Baguio City',
      fare: '₱ 480',
      fareValue: 480,
      duration: '5h 30m',
      eta: '18 min away',
      etaMinutes: 18,
      seats: '12 seats left',
      seatsLeft: 12,
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
      fareValue: 850,
      duration: '9h',
      eta: '42 min away',
      etaMinutes: 42,
      seats: '9 seats left',
      seatsLeft: 9,
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
      fareValue: 750,
      duration: '8h',
      eta: '24 min away',
      etaMinutes: 24,
      seats: '18 seats left',
      seatsLeft: 18,
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
      fareValue: 150,
      duration: '1h 30m',
      eta: '7 min away',
      etaMinutes: 7,
      seats: '3 seats left',
      seatsLeft: 3,
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
      fareValue: 250,
      duration: '5h',
      eta: '35 min away',
      etaMinutes: 35,
      seats: '5 seats left',
      seatsLeft: 5,
      status: 'on-time',
      mode: 'shared',
      rating: 4.9,
    },
    {
      id: 'r10',
      operator: 'Victory Liner',
      from: 'Baguio City',
      to: 'Vigan City',
      fare: '₱ 380',
      fareValue: 380,
      duration: '4h 45m',
      eta: '21 min away',
      etaMinutes: 21,
      seats: '14 seats left',
      seatsLeft: 14,
      status: 'on-time',
      mode: 'bus',
      rating: 4.6,
    },
    {
      id: 'r11',
      operator: 'Victory Liner',
      from: 'Baguio City',
      to: 'Tuguegarao City',
      fare: '₱ 480',
      fareValue: 480,
      duration: '7h 30m',
      eta: '8 min away',
      etaMinutes: 8,
      seats: '11 seats left',
      seatsLeft: 11,
      status: 'on-time',
      mode: 'bus',
      rating: 4.8,
    },
  ];

  // ----------------------------------------------------------- filtering

  find(id: string): CatalogRoute | undefined {
    return this.routes.find((r) => r.id === id);
  }

  /** Matches typed origin / destination text against route endpoints. */
  queryRoutes(
    from = '',
    to = '',
    mode: 'all' | RouteMode = 'all',
  ): CatalogRoute[] {
    const f = from.trim().toLowerCase();
    const t = to.trim().toLowerCase();
    return this.routes.filter((r) => {
      if (mode !== 'all' && r.mode !== mode) return false;
      if (f && !r.from.toLowerCase().includes(f) && !r.operator.toLowerCase().includes(f))
        return false;
      if (t && !r.to.toLowerCase().includes(t)) return false;
      return true;
    });
  }

  sortRoutes(list: CatalogRoute[], sort: CatalogSort): CatalogRoute[] {
    return [...list].sort((a, b) => {
      if (sort === 'Cheapest') return a.fareValue - b.fareValue;
      if (sort === 'Rated') return b.rating - a.rating;
      return a.etaMinutes - b.etaMinutes;
    });
  }

  // ------------------------------------------------- terminal departures

  /** Terminal directory. Coordinates reuse existing map data (search/home);
   *  distance strings follow the old search list's static pattern. */
  readonly terminals: TerminalInfo[] = [
    {
      id: 'baguio-terminal',
      name: 'Baguio Terminal',
      city: 'Baguio City',
      distance: '0.4 km',
      lat: 16.412,
      lng: 120.596,
      hours: 'Open until 10:00 PM',
      about:
        'Major departure point for buses across the Cordillera and North Luzon.',
      facilities: ['Waiting area', 'Restrooms', 'Ticket counters', 'Food stalls'],
    },
    {
      id: 'cubao-terminal',
      name: 'Victory Liner Cubao',
      city: 'Cubao, QC',
      distance: '2.1 km',
      lat: 14.622,
      lng: 121.0533,
      hours: 'Open 24 hours',
      about:
        'Metro Manila hub for northbound trips to the Cordillera, Ilocos, and Cagayan Valley.',
      facilities: [
        'Waiting area',
        'Restrooms',
        'Ticket counters',
        'Parking',
        'Accessibility',
      ],
    },
    {
      id: 'tuguegarao-terminal',
      name: 'Tuguegarao City Terminal',
      city: 'Tuguegarao City',
      distance: '1.2 km',
      lat: 17.6132,
      lng: 121.727,
      hours: 'Open until 10:00 PM',
      about:
        'Major departure and arrival point serving routes throughout Cagayan and nearby provinces.',
      facilities: [
        'Waiting area',
        'Restrooms',
        'Ticket counters',
        'Parking',
        'Food stalls',
      ],
    },
    {
      id: 'santiago-terminal',
      name: 'Santiago City Terminal',
      city: 'Santiago City',
      distance: '3.4 km',
      lat: 16.6864,
      lng: 121.549,
      hours: 'Open until 9:00 PM',
      about:
        'Key transfer point connecting Cagayan Valley routes to Metro Manila and the Cordillera.',
      facilities: ['Waiting area', 'Restrooms', 'Ticket counters'],
    },
  ];

  terminalById(id: string): TerminalInfo | undefined {
    return this.terminals.find((t) => t.id === id);
  }

  /** Terminal serving a free-text place (e.g. a route origin), if any. */
  terminalForCity(place: string): TerminalInfo | undefined {
    const placeTokens = new Set(this.terminalTokens(place));
    if (!placeTokens.size) return undefined;
    return this.terminals.find((t) =>
      this.terminalTokens(t.city).some((tok) => placeTokens.has(tok)),
    );
  }

  /** Catalog routes departing from a terminal (origin token overlap). */
  routesFromTerminal(terminal: TerminalInfo): CatalogRoute[] {
    const tokens = this.terminalTokens(terminal.name).concat(
      this.terminalTokens(terminal.city),
    );
    if (!tokens.length) return [];
    return this.routes.filter((route) => {
      const fromTokens = new Set(this.terminalTokens(route.from));
      return tokens.some((t) => fromTokens.has(t));
    });
  }

  /** Operators serving a terminal, derived from its routes. */
  operatorsAtTerminal(terminal: TerminalInfo): string[] {
    const seen = new Set<string>();
    for (const route of this.routesFromTerminal(terminal)) {
      seen.add(route.operator);
    }
    return [...seen];
  }

  /** Fixed daily slot table for terminal boards (same every day). */
  private readonly departureSlots = [
    { label: '6:00 AM', minutes: 360 },
    { label: '8:30 AM', minutes: 510 },
    { label: '10:00 AM', minutes: 600 },
    { label: '1:00 PM', minutes: 780 },
    { label: '3:30 PM', minutes: 930 },
    { label: '6:00 PM', minutes: 1080 },
    { label: '8:00 PM', minutes: 1200 },
  ];

  /** Generic words ignored when matching a terminal to route origins. */
  private readonly terminalStopwords = new Set([
    'terminal',
    'city',
    'liner',
    'victory',
    'transit',
    'bus',
    'line',
    'lines',
    'express',
    'station',
    'grand',
  ]);

  private terminalTokens(label: string): string[] {
    return (label ?? '')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length > 2 && !this.terminalStopwords.has(t));
  }

  private hashText(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  /**
   * Scheduled departures for a terminal's board, derived from catalog routes
   * whose ORIGIN matches the terminal (token overlap on place names).
   * Deterministic: same terminal always yields the same board — 3 daily
   * slots per route, offset by route hash. Operator/fare/seats/duration
   * come straight from the catalog entry.
   */
  departuresForTerminal(terminalLabel: string): TerminalDeparture[] {
    const tokens = this.terminalTokens(terminalLabel);
    if (!tokens.length) return [];
    const out: TerminalDeparture[] = [];
    for (const route of this.routes) {
      const fromTokens = new Set(this.terminalTokens(route.from));
      if (!tokens.some((t) => fromTokens.has(t))) continue;
      const start = this.hashText(route.id) % this.departureSlots.length;
      for (let k = 0; k < 3; k++) {
        const slot = this.departureSlots[(start + k * 2) % this.departureSlots.length];
        out.push({
          id: `${route.id}-slot${(start + k * 2) % this.departureSlots.length}`,
          routeId: route.id,
          operator: route.operator,
          from: route.from,
          to: route.to,
          time: slot.label,
          timeMinutes: slot.minutes,
          fare: route.fare,
          seats: route.seats,
          seatsLeft: route.seatsLeft,
          status: route.status,
          duration: route.duration,
        });
      }
    }
    return out.sort((a, b) => a.timeMinutes - b.timeMinutes);
  }

  // ----------------------------------------------------------- favorites

  readFavorites(): FavoriteRoute[] {
    try {
      const raw = localStorage.getItem(this.favoritesKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  isFavorite(id: string): boolean {
    return this.readFavorites().some((f) => f.id === id);
  }

  /** Adds or removes a catalog route in the user's favorites. */
  toggleFavorite(routeId: string): boolean {
    const favorites = this.readFavorites();
    const existing = favorites.find((f) => f.id === routeId);
    if (existing) {
      const next = favorites.filter((f) => f.id !== routeId);
      this.writeFavorites(next);
      return false;
    }
    const route = this.find(routeId);
    if (!route) return false;
    const favorite: FavoriteRoute = {
      id: route.id,
      operator: route.operator,
      from: route.from,
      to: route.to,
      fare: route.fare,
      seats: route.seats,
      status: route.status,
      mode: route.mode,
      savedLabel: 'Saved just now',
      savedAt: Date.now(),
      useCount: 0,
    };
    this.writeFavorites([favorite, ...favorites]);
    return true;
  }

  removeFavorite(id: string) {
    const next = this.readFavorites().filter((f) => f.id !== id);
    this.writeFavorites(next);
  }

  bumpFavoriteUse(id: string) {
    const favorites = this.readFavorites();
    const next = favorites.map((f) =>
      f.id === id ? { ...f, useCount: f.useCount + 1 } : f,
    );
    this.writeFavorites(next);
  }

  private writeFavorites(favorites: FavoriteRoute[]) {
    try {
      localStorage.setItem(this.favoritesKey, JSON.stringify(favorites));
    } catch {
      return;
    }
  }
}