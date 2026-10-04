/**
 * ByaHero - centralized network data (single source of truth).
 *
 * As of 2026-10-03. EVERYTHING the app needs about buses lives here:
 * places, operators, terminals, service classes, LTFRB fare rules,
 * discounts, seat layouts, vehicles, corridors + stops, services, trips,
 * and real-world fare benchmarks used by the fare-accuracy tests.
 *
 * Every record carries a `confidence` so the UI and the team always know
 * what is real and what is prototype:
 *   official   - taken from an LTFRB / government publication
 *   sourced    - taken from a published operator / reference page
 *   estimated  - derived or approximated (distances, coordinates, times)
 *   demo       - invented for the prototype (plates, most schedules)
 *   unverified - carried over from the old app or general knowledge; confirm
 *
 * Fares are NOT stored per town pair. They are computed from the LTFRB
 * per-kilometre rules (see fareFor() in network.service.ts) over the stop
 * distances below, which is how the regulated matrices are built. Official
 * LTFRB matrices (per route) always win over this computation once we have
 * them.
 *
 * Pure data: no Math.random, no Date.now, no logic. All derivation lives
 * in network.service.ts so this file stays auditable against its sources.
 */

export type Confidence = 'official' | 'sourced' | 'estimated' | 'demo' | 'unverified';

export const DATA_META = {
  version: '1.0.0',
  asOf: '2026-10-03',
  fareRulesEffective: '2026-09-28',
  currency: 'PHP',
  disclaimer:
    'Prototype data. Fares follow the LTFRB provincial per-km rules effective 2026-09-28, ' +
    'but distances, schedules and fleet details are approximations. Not an official fare matrix.',
} as const;

export const SOURCES = {
  ltfrbSept2026: 'https://baguiocityguide.com/new-jeepney-taxi-bus-and-tnvs-fares-start-september-28/',
  ltfrbRates: 'https://www.sunstar.com.ph/cebu/fare-hike-takes-effect-before-wage-increase',
  ltfrbBaseFares: 'https://www.sunstar.com.ph/manila/ltfrb-approves-provisional-fare-increase-for-provincial-buses',
  ltfrbBaguioExample: 'https://currentph.com/2026/03/17/ltfrb-approves-fare-hike-for-jeepneys-buses-and-tnvs/',
  n1Highway: 'https://en.wikipedia.org/wiki/N1_highway_(Philippines)',
  santiagoTuguegarao: 'https://en.wikipedia.org/wiki/Santiago%E2%80%93Tuguegarao_Road',
  victoryLinerFares: 'https://pamasahe.com/routes/caloocan-manila-tuguegarao-cagayan-valley-victory-liner-bus-schedule-fares',
  victoryLinerSchedules: 'https://outoftownblog.com/victory-liner-bus-schedule/',
  victoryLinerTerminals: 'https://www.phbus.com/victory-liner-bus/',
  floridaBus: 'https://bustickets.ph/florida-bus-manila-to-tuguegarao-bus/',
  fiveStar: 'https://en.wikipedia.org/wiki/Five_Star_Bus_Company',
  busClasses: 'https://5starbus.com/',
} as const;

// ---------------------------------------------------------------- places

export interface Place {
  id: string;
  name: string;
  kind: 'hub' | 'city' | 'town';
  province: string;
  lat: number;
  lng: number;
  /** Every spelling the old app / users may use. Matched case-insensitively. */
  aliases: string[];
  confidence: Confidence;
}

export const PLACES: Place[] = [
  {
    id: 'metro-manila', name: 'Metro Manila', kind: 'hub', province: 'NCR',
    lat: 14.6205, lng: 121.0522,
    aliases: ['manila', 'metro manila', 'manila (cubao)', 'manila (pitx)', 'cubao', 'cubao, qc', 'quezon city',
      'sampaloc', 'kamias', 'caloocan', 'pasay', 'monumento'],
    confidence: 'estimated',
  },
  { id: 'cabanatuan', name: 'Cabanatuan', kind: 'city', province: 'Nueva Ecija', lat: 15.4864, lng: 120.9679, aliases: ['cabanatuan city', 'cabanatuan'], confidence: 'sourced' },
  { id: 'san-jose-ne', name: 'San Jose City', kind: 'city', province: 'Nueva Ecija', lat: 15.7886, lng: 120.993, aliases: ['san jose', 'san jose city', 'san jose, nueva ecija'], confidence: 'estimated' },
  { id: 'bambang', name: 'Bambang', kind: 'town', province: 'Nueva Vizcaya', lat: 16.3893, lng: 121.1103, aliases: ['bambang'], confidence: 'estimated' },
  { id: 'bayombong', name: 'Bayombong', kind: 'town', province: 'Nueva Vizcaya', lat: 16.4829, lng: 121.1495, aliases: ['bayombong'], confidence: 'sourced' },
  { id: 'solano', name: 'Solano', kind: 'town', province: 'Nueva Vizcaya', lat: 16.5164, lng: 121.1833, aliases: ['solano'], confidence: 'sourced' },
  { id: 'santiago', name: 'Santiago City', kind: 'city', province: 'Isabela', lat: 16.687, lng: 121.548, aliases: ['santiago', 'santiago city', 'santiago, isabela'], confidence: 'sourced' },
  { id: 'cauayan', name: 'Cauayan', kind: 'city', province: 'Isabela', lat: 16.9293, lng: 121.7686, aliases: ['cauayan', 'cauayan city'], confidence: 'sourced' },
  { id: 'ilagan', name: 'Ilagan', kind: 'city', province: 'Isabela', lat: 17.1486, lng: 121.8895, aliases: ['ilagan', 'ilagan city', 'ilagan, isabela'], confidence: 'sourced' },
  { id: 'tuguegarao', name: 'Tuguegarao City', kind: 'city', province: 'Cagayan', lat: 17.6132, lng: 121.727, aliases: ['tuguegarao', 'tuguegarao city', 'tuguegarao city, cagayan'], confidence: 'sourced' },
  { id: 'baguio', name: 'Baguio City', kind: 'city', province: 'Benguet', lat: 16.4023, lng: 120.596, aliases: ['baguio', 'baguio city', 'baguio city, benguet'], confidence: 'sourced' },
  { id: 'rosario-lu', name: 'Rosario (La Union)', kind: 'town', province: 'La Union', lat: 16.2333, lng: 120.4833, aliases: ['rosario', 'rosario, la union', 'rosario junction'], confidence: 'estimated' },
  { id: 'urdaneta', name: 'Urdaneta', kind: 'city', province: 'Pangasinan', lat: 15.9761, lng: 120.5711, aliases: ['urdaneta', 'urdaneta city'], confidence: 'sourced' },
  { id: 'tarlac-city', name: 'Tarlac City', kind: 'city', province: 'Tarlac', lat: 15.4755, lng: 120.5963, aliases: ['tarlac', 'tarlac city'], confidence: 'sourced' },
  { id: 'dau', name: 'Dau (Mabalacat)', kind: 'town', province: 'Pampanga', lat: 15.172, lng: 120.577, aliases: ['dau', 'dau terminal', 'mabalacat', 'mabalacat city'], confidence: 'estimated' },
  { id: 'san-fernando-lu', name: 'San Fernando (La Union)', kind: 'city', province: 'La Union', lat: 16.6159, lng: 120.3166, aliases: ['san fernando', 'san fernando city', 'san fernando, la union'], confidence: 'estimated' },
  { id: 'vigan', name: 'Vigan City', kind: 'city', province: 'Ilocos Sur', lat: 17.5747, lng: 120.3869, aliases: ['vigan', 'vigan city'], confidence: 'estimated' },
  { id: 'laoag', name: 'Laoag City', kind: 'city', province: 'Ilocos Norte', lat: 18.196, lng: 120.5936, aliases: ['laoag', 'laoag city'], confidence: 'estimated' },
  { id: 'dagupan', name: 'Dagupan City', kind: 'city', province: 'Pangasinan', lat: 16.0433, lng: 120.3333, aliases: ['dagupan', 'dagupan city'], confidence: 'estimated' },
  { id: 'alaminos', name: 'Alaminos', kind: 'town', province: 'Pangasinan', lat: 16.1556, lng: 119.9817, aliases: ['alaminos', 'alaminos city'], confidence: 'estimated' },
  { id: 'banaue', name: 'Banaue', kind: 'town', province: 'Ifugao', lat: 16.9107, lng: 121.0594, aliases: ['banaue'], confidence: 'estimated' },
  { id: 'bontoc', name: 'Bontoc', kind: 'town', province: 'Mountain Province', lat: 17.0917, lng: 120.9777, aliases: ['bontoc'], confidence: 'estimated' },
  { id: 'tabuk', name: 'Tabuk City', kind: 'city', province: 'Kalinga', lat: 17.4187, lng: 121.4443, aliases: ['tabuk', 'tabuk city'], confidence: 'estimated' },
  { id: 'aparri', name: 'Aparri', kind: 'town', province: 'Cagayan', lat: 18.3546, lng: 121.6485, aliases: ['aparri'], confidence: 'estimated' },
  { id: 'pagudpud', name: 'Pagudpud', kind: 'town', province: 'Ilocos Norte', lat: 18.5614, lng: 120.7878, aliases: ['pagudpud'], confidence: 'estimated' },
  { id: 'baler', name: 'Baler', kind: 'town', province: 'Aurora', lat: 15.7595, lng: 121.5627, aliases: ['baler'], confidence: 'estimated' },
];

// ------------------------------------------------------------- operators

export interface Operator {
  id: string;
  name: string;
  shortName: string;
  /** Free-text names used by the old app; longest match wins. */
  legacyNames: string[];
  confidence: Confidence;
  note?: string;
}

export const OPERATORS: Operator[] = [
  {
    id: 'victory-liner', name: 'Victory Liner', shortName: 'Victory',
    legacyNames: ['victory liner', 'victory', 'vl'], confidence: 'sourced',
    note: 'Metro Manila terminals: Cubao, Pasay, Sampaloc, Kamias, Caloocan, Monumento.',
  },
  {
    id: 'florida', name: 'Florida Bus Line', shortName: 'Florida',
    legacyNames: ['florida bus line', 'florida bus', 'gv florida', 'fbl'], confidence: 'sourced',
    note: 'Manila departures from the Sampaloc terminal; routes via Ilagan (many daily trips) and via Roxas.',
  },
  {
    id: 'five-star', name: 'Five Star', shortName: 'Five Star',
    legacyNames: ['five star', 'pangasinan five star'], confidence: 'sourced',
    note: 'Pangasinan Five Star Bus Co. Terminals: Cubao, Pasay (HQ), Sampaloc, Tuguegarao.',
  },
  {
    id: 'partas', name: 'Partas', shortName: 'Partas',
    legacyNames: ['partas'], confidence: 'sourced',
    note: 'Manila terminals: Cubao, Pasay. Runs Ilocos, Baguio and Cagayan Valley services.',
  },
  {
    id: 'baliwag', name: 'Baliwag Transit', shortName: 'Baliwag',
    legacyNames: ['baliwag', 'baliwag transit'], confidence: 'sourced',
    note: 'Nueva Ecija (Cabanatuan) + Manila services.',
  },
  {
    id: 'genesis', name: 'Genesis', shortName: 'Genesis',
    legacyNames: ['genesis', 'genesis joybus', 'joybus'], confidence: 'sourced',
    note: 'Genesis JoyBus: Baguio deluxe + Cagayan Valley services.',
  },
  {
    id: 'ohayami', name: 'Ohayami Trans', shortName: 'Ohayami',
    legacyNames: ['ohayami', 'ohayami trans'], confidence: 'unverified',
    note: 'Mountain Province (Banaue/Bontoc)–Manila. Corridor assignment below is a demo placeholder.',
  },
  {
    id: 'gl-trans', name: 'GL Trans', shortName: 'GL',
    legacyNames: ['gl trans'], confidence: 'unverified',
    note: 'Corridor assignment below is a demo placeholder.',
  },
  {
    id: 'sagada-shared', name: 'Sagada Shared Van', shortName: 'Sagada Van',
    legacyNames: ['sagada shared van', 'sagada van', 'sagada'], confidence: 'unverified',
    note: 'Baguio–Sagada shared vans run off-corridor; registered here for fleet completeness.',
  },
  {
    id: 'dagupan-shared', name: 'Dagupan Shared Van', shortName: 'Dagupan Van',
    legacyNames: ['dagupan shared van', 'dagupan van'], confidence: 'unverified',
    note: 'Pangasinan shared vans run off-corridor; registered here for fleet completeness.',
  },
  {
    id: 'bontoc-shared', name: 'Bontoc Shared Van', shortName: 'Bontoc Van',
    legacyNames: ['bontoc shared van', 'bontoc van', 'bontoc'], confidence: 'unverified',
    note: 'Cordillera shared vans run off-corridor; registered here for fleet completeness.',
  },
  {
    id: 'tabuk-uv', name: 'Tabuk UV Express', shortName: 'Tabuk UV',
    legacyNames: ['tabuk uv express', 'tabuk uv', 'tabuk'], confidence: 'unverified',
    note: 'Tuguegarao–Tabuk UVs run off-corridor; registered here for fleet completeness.',
  },
  {
    id: 'cagayan-uv', name: 'Cagayan UV', shortName: 'Cagayan UV',
    legacyNames: ['cagayan uv'], confidence: 'unverified',
    note: 'Short-hop Cagayan Valley UVs (Tuguegarao–Ilagan–Cauayan).',
  },
  {
    id: 'solano-uv', name: 'Solano UV', shortName: 'Solano UV',
    legacyNames: ['solano uv'], confidence: 'unverified',
    note: 'Short-hop Nueva Vizcaya UVs (Solano–Bayombong–Santiago).',
  },
];

// ------------------------------------------------------------- terminals

export interface Terminal {
  id: string;
  operatorId: string;
  name: string;
  placeId: string;
  /** Street / area, only when published. */
  area?: string;
  confidence: Confidence;
}

export const TERMINALS: Terminal[] = [
  { id: 'vl-cubao', operatorId: 'victory-liner', name: 'Victory Liner Cubao', placeId: 'metro-manila', confidence: 'sourced' },
  { id: 'vl-pasay', operatorId: 'victory-liner', name: 'Victory Liner Pasay', placeId: 'metro-manila', confidence: 'sourced' },
  { id: 'vl-sampaloc', operatorId: 'victory-liner', name: 'Victory Liner Sampaloc', placeId: 'metro-manila', confidence: 'sourced' },
  { id: 'vl-kamias', operatorId: 'victory-liner', name: 'Victory Liner Kamias', placeId: 'metro-manila', confidence: 'sourced' },
  { id: 'vl-caloocan', operatorId: 'victory-liner', name: 'Victory Liner Caloocan', placeId: 'metro-manila', confidence: 'sourced' },
  { id: 'vl-santiago', operatorId: 'victory-liner', name: 'Victory Liner Santiago City', placeId: 'santiago', confidence: 'unverified' },
  { id: 'vl-tuguegarao', operatorId: 'victory-liner', name: 'Victory Liner Tuguegarao', placeId: 'tuguegarao', confidence: 'sourced' },
  { id: 'vl-baguio', operatorId: 'victory-liner', name: 'Victory Liner Baguio', placeId: 'baguio', confidence: 'sourced' },
  { id: 'fl-sampaloc', operatorId: 'florida', name: 'Florida Sampaloc', placeId: 'metro-manila', confidence: 'sourced' },
  { id: 'fl-tuguegarao', operatorId: 'florida', name: 'Florida Tuguegarao', placeId: 'tuguegarao', confidence: 'unverified' },
  { id: 'fs-cubao', operatorId: 'five-star', name: 'Five Star Cubao', placeId: 'metro-manila', area: 'EDSA Cubao, Quezon City', confidence: 'sourced' },
  { id: 'fs-pasay', operatorId: 'five-star', name: 'Five Star Pasay', placeId: 'metro-manila', area: 'Aurora Blvd., Pasay', confidence: 'sourced' },
  { id: 'fs-sampaloc', operatorId: 'five-star', name: 'Five Star Sampaloc', placeId: 'metro-manila', area: 'Legarda Street, Sampaloc', confidence: 'sourced' },
  { id: 'fs-tuguegarao', operatorId: 'five-star', name: 'Five Star Tuguegarao', placeId: 'tuguegarao', area: 'Balzain Highway, Tuguegarao', confidence: 'sourced' },
  { id: 'pt-cubao', operatorId: 'partas', name: 'Partas Cubao', placeId: 'metro-manila', area: 'EDSA Cubao, Quezon City', confidence: 'unverified' },
  { id: 'pt-tuguegarao', operatorId: 'partas', name: 'Partas Tuguegarao', placeId: 'tuguegarao', confidence: 'unverified' },
  { id: 'pt-laoag', operatorId: 'partas', name: 'Partas Laoag', placeId: 'laoag', confidence: 'unverified' },
  { id: 'bl-sampaloc', operatorId: 'baliwag', name: 'Baliwag Sampaloc', placeId: 'metro-manila', confidence: 'unverified' },
  { id: 'bl-cabanatuan', operatorId: 'baliwag', name: 'Baliwag Cabanatuan', placeId: 'cabanatuan', confidence: 'unverified' },
  { id: 'gn-cubao', operatorId: 'genesis', name: 'Genesis Cubao', placeId: 'metro-manila', confidence: 'unverified' },
  { id: 'gn-baguio', operatorId: 'genesis', name: 'Genesis Baguio', placeId: 'baguio', confidence: 'unverified' },
  { id: 'su-solano', operatorId: 'solano-uv', name: 'Solano UV Terminal', placeId: 'solano', confidence: 'unverified' },
  { id: 'cy-cauayan', operatorId: 'cagayan-uv', name: 'Cagayan UV Cauayan', placeId: 'cauayan', confidence: 'unverified' },
  { id: 'cy-tuguegarao', operatorId: 'cagayan-uv', name: 'Cagayan UV Tuguegarao', placeId: 'tuguegarao', confidence: 'unverified' },
];

// -------------------------------------------------------- service classes

export type ServiceClassId = 'ordinary' | 'aircon' | 'deluxe' | 'super-deluxe' | 'luxury' | 'uv-express' | 'shared';

export interface ServiceClass {
  id: ServiceClassId;
  label: string;
  /** Names operators print on tickets that map to this LTFRB category. */
  marketingNames: string[];
  amenities: string[];
  /** Typical seats on the vehicle (min, max). */
  typicalSeats: [number, number];
  confidence: Confidence;
  note?: string;
}

export const SERVICE_CLASSES: ServiceClass[] = [
  { id: 'ordinary', label: 'Ordinary', marketingNames: ['Ordinary'], amenities: ['Non-aircon'], typicalSeats: [49, 60], confidence: 'estimated' },
  { id: 'aircon', label: 'Aircon', marketingNames: ['Regular Aircon', 'Aircon'], amenities: ['Aircon', '2+2 seating', 'Reclining seats', 'Onboard TV'], typicalSeats: [45, 49], confidence: 'sourced' },
  { id: 'deluxe', label: 'Deluxe', marketingNames: ['Deluxe', 'Inner Cities'], amenities: ['Aircon', '2+1 seating', 'Extra legroom', 'Onboard restroom'], typicalSeats: [29, 35], confidence: 'sourced' },
  {
    id: 'super-deluxe', label: 'Super Deluxe', marketingNames: ['First Class', 'Express'],
    amenities: ['Aircon', '2+1 seating', 'Extra legroom', 'Onboard restroom'], typicalSeats: [29, 35],
    confidence: 'unverified', note: 'Mapping "First Class" to the LTFRB super-deluxe category is an assumption.',
  },
  {
    id: 'luxury', label: 'Luxury / Sleeper', marketingNames: ['Sleeper', 'Royal', 'Premium'],
    amenities: ['Aircon', '1+1+1 seating', 'Double-deck beds', 'Onboard restroom'], typicalSeats: [28, 36],
    confidence: 'unverified', note: 'Mapping sleeper classes to the LTFRB luxury category is an assumption.',
  },
  {
    id: 'uv-express', label: 'UV Express', marketingNames: ['UV Express', 'UV'],
    amenities: ['Aircon van', '~15 seats', 'Point-to-point'], typicalSeats: [13, 18],
    confidence: 'estimated', note: 'Prototype class for UV Express vans; fares are estimates, not an LTFRB matrix.',
  },
  {
    id: 'shared', label: 'Shared Van', marketingNames: ['Shared', 'Shared Van'],
    amenities: ['Shared van', 'Flexible pickup'], typicalSeats: [12, 16],
    confidence: 'estimated', note: 'Prototype class for shared vans; fares are estimates, not an LTFRB matrix.',
  },
];

// ------------------------------------------------------------ fare rules

export interface FareRule {
  classId: ServiceClassId;
  /** Distance covered by the base fare. */
  baseKm: number;
  baseFare: number;
  perKm: number;
  /** reported = published as-is; derived = follows the published baseKm x perKm pattern. */
  baseFareBasis: 'reported' | 'derived';
  effective: string;
  confidence: Confidence;
}

/** LTFRB provincial bus rules effective 2026-09-28. */
export const FARE_RULES: FareRule[] = [
  { classId: 'ordinary', baseKm: 5, baseFare: 12, perKm: 2.2, baseFareBasis: 'reported', effective: '2026-09-28', confidence: 'official' },
  { classId: 'aircon', baseKm: 5, baseFare: 12.25, perKm: 2.45, baseFareBasis: 'reported', effective: '2026-09-28', confidence: 'official' },
  { classId: 'deluxe', baseKm: 5, baseFare: 13, perKm: 2.6, baseFareBasis: 'derived', effective: '2026-09-28', confidence: 'official' },
  { classId: 'super-deluxe', baseKm: 5, baseFare: 13.5, perKm: 2.7, baseFareBasis: 'reported', effective: '2026-09-28', confidence: 'official' },
  { classId: 'luxury', baseKm: 5, baseFare: 16.75, perKm: 3.35, baseFareBasis: 'derived', effective: '2026-09-28', confidence: 'official' },
  { classId: 'uv-express', baseKm: 5, baseFare: 15, perKm: 2.6, baseFareBasis: 'derived', effective: '2026-09-28', confidence: 'estimated' },
  { classId: 'shared', baseKm: 5, baseFare: 14, perKm: 2.4, baseFareBasis: 'derived', effective: '2026-09-28', confidence: 'estimated' },
];

export interface DiscountRule {
  id: 'student' | 'senior' | 'pwd';
  label: string;
  rate: number;
  law: string;
  requiresId: boolean;
  idTypes: string[];
  confidence: Confidence;
}

export const DISCOUNTS: DiscountRule[] = [
  { id: 'student', label: 'Student', rate: 0.2, law: 'RA 11314', requiresId: true, idTypes: ['School ID', 'Certificate of Registration'], confidence: 'unverified' },
  { id: 'senior', label: 'Senior Citizen', rate: 0.2, law: 'RA 9994', requiresId: true, idTypes: ['OSCA ID', 'Senior Citizen ID'], confidence: 'unverified' },
  { id: 'pwd', label: 'PWD', rate: 0.2, law: 'RA 10754', requiresId: true, idTypes: ['PWD ID'], confidence: 'unverified' },
];

// ----------------------------------------------------------- seat layouts

export interface SeatLayout {
  id: string;
  rows: number;
  /** Seat letters left to right; '|' is an aisle gap (may appear more than once). */
  columns: string[];
  /** Seats that exist in the grid but cannot be sold (restroom, driver bay...). */
  blockedSeats: string[];
  confidence: Confidence;
  note?: string;
}

export const SEAT_LAYOUTS: SeatLayout[] = [
  { id: 'aircon-2x2', rows: 12, columns: ['A', 'B', '|', 'C', 'D'], blockedSeats: [], confidence: 'sourced', note: '48 seats; regular aircon buses run 45-49.' },
  { id: 'ordinary-2x3', rows: 10, columns: ['A', 'B', '|', 'C', 'D', 'E'], blockedSeats: [], confidence: 'estimated', note: '50 seats.' },
  { id: 'deluxe-2x1', rows: 11, columns: ['A', 'B', '|', 'C'], blockedSeats: [], confidence: 'sourced', note: '33 seats; deluxe buses run 29-35.' },
  { id: 'deluxe-2x1-restroom', rows: 10, columns: ['A', 'B', '|', 'C'], blockedSeats: ['10C'], confidence: 'sourced', note: '29 seats (Florida deluxe, onboard restroom). Blocked seat position is a demo placement.' },
  { id: 'sleeper-1x1x1', rows: 11, columns: ['A', '|', 'B', '|', 'C'], blockedSeats: ['11B'], confidence: 'sourced', note: '32 sleeper berths. Has TWO aisles: seat-selection UI must handle more than one "|".' },
  { id: 'uv-van-5x3', rows: 5, columns: ['A', 'B', 'C'], blockedSeats: [], confidence: 'estimated', note: '15 seats; typical UV Express van (no aisle).' },
  { id: 'shared-van-4x4', rows: 4, columns: ['A', 'B', 'C', 'D'], blockedSeats: [], confidence: 'estimated', note: '16 seats; typical shared van (no aisle).' },
];

// --------------------------------------------------------------- vehicles

export interface Vehicle {
  id: string;
  operatorId: string;
  classId: ServiceClassId;
  layoutId: string;
  /** Demo plate numbers: not real registrations. */
  plate: string;
  confidence: Confidence;
}

export const VEHICLES: Vehicle[] = [
  { id: 'vl-ac-01', operatorId: 'victory-liner', classId: 'aircon', layoutId: 'aircon-2x2', plate: 'NBC 1932', confidence: 'demo' },
  { id: 'vl-ac-02', operatorId: 'victory-liner', classId: 'aircon', layoutId: 'aircon-2x2', plate: 'NBD 2071', confidence: 'demo' },
  { id: 'vl-dlx-01', operatorId: 'victory-liner', classId: 'deluxe', layoutId: 'deluxe-2x1', plate: 'GDH 7205', confidence: 'demo' },
  { id: 'vl-dlx-02', operatorId: 'victory-liner', classId: 'deluxe', layoutId: 'deluxe-2x1', plate: 'GDJ 3318', confidence: 'demo' },
  { id: 'fl-dlx-01', operatorId: 'florida', classId: 'deluxe', layoutId: 'deluxe-2x1-restroom', plate: 'DDE 4821', confidence: 'demo' },
  { id: 'fl-dlx-02', operatorId: 'florida', classId: 'deluxe', layoutId: 'deluxe-2x1-restroom', plate: 'DDF 6150', confidence: 'demo' },
  { id: 'fl-slp-01', operatorId: 'florida', classId: 'luxury', layoutId: 'sleeper-1x1x1', plate: 'DDG 9042', confidence: 'demo' },
  { id: 'fs-ac-01', operatorId: 'five-star', classId: 'aircon', layoutId: 'aircon-2x2', plate: 'CXJ 2210', confidence: 'demo' },
  { id: 'fs-ac-02', operatorId: 'five-star', classId: 'aircon', layoutId: 'aircon-2x2', plate: 'CXK 4417', confidence: 'demo' },
  { id: 'pt-dlx-01', operatorId: 'partas', classId: 'deluxe', layoutId: 'deluxe-2x1', plate: 'PQT 1123', confidence: 'demo' },
  { id: 'pt-ac-01', operatorId: 'partas', classId: 'aircon', layoutId: 'aircon-2x2', plate: 'PQT 1456', confidence: 'demo' },
  { id: 'bl-ord-01', operatorId: 'baliwag', classId: 'ordinary', layoutId: 'ordinary-2x3', plate: 'BWH 2201', confidence: 'demo' },
  { id: 'bl-ac-01', operatorId: 'baliwag', classId: 'aircon', layoutId: 'aircon-2x2', plate: 'BWH 2334', confidence: 'demo' },
  { id: 'gn-dlx-01', operatorId: 'genesis', classId: 'deluxe', layoutId: 'deluxe-2x1', plate: 'GNS 3101', confidence: 'demo' },
  { id: 'gn-ac-01', operatorId: 'genesis', classId: 'aircon', layoutId: 'aircon-2x2', plate: 'GNS 3245', confidence: 'demo' },
  { id: 'oh-dlx-01', operatorId: 'ohayami', classId: 'deluxe', layoutId: 'deluxe-2x1', plate: 'OHY 4102', confidence: 'demo' },
  { id: 'gl-ac-01', operatorId: 'gl-trans', classId: 'aircon', layoutId: 'aircon-2x2', plate: 'GLT 5203', confidence: 'demo' },
  { id: 'sg-van-01', operatorId: 'sagada-shared', classId: 'shared', layoutId: 'shared-van-4x4', plate: 'SGD 6104', confidence: 'demo' },
  { id: 'dg-van-01', operatorId: 'dagupan-shared', classId: 'shared', layoutId: 'shared-van-4x4', plate: 'DGD 6205', confidence: 'demo' },
  { id: 'bn-van-01', operatorId: 'bontoc-shared', classId: 'shared', layoutId: 'shared-van-4x4', plate: 'BND 6306', confidence: 'demo' },
  { id: 'tb-uv-01', operatorId: 'tabuk-uv', classId: 'uv-express', layoutId: 'uv-van-5x3', plate: 'TBK 7107', confidence: 'demo' },
  { id: 'cy-uv-01', operatorId: 'cagayan-uv', classId: 'uv-express', layoutId: 'uv-van-5x3', plate: 'CGY 7208', confidence: 'demo' },
  { id: 'su-uv-01', operatorId: 'solano-uv', classId: 'uv-express', layoutId: 'uv-van-5x3', plate: 'SLN 7309', confidence: 'demo' },
];

// -------------------------------------------------------------- corridors

export type StopKind = 'terminal' | 'town' | 'roadside';

export interface CorridorStop {
  id: string;
  placeId: string;
  name: string;
  kind: StopKind;
  /** 0-based order from the corridor start (Metro Manila). */
  sequence: number;
  /** Road km from the corridor start (Metro Manila hub). */
  km: number;
  /** anchor = tied to a published figure; estimate = +/- 5-10 km. */
  kmConfidence: 'anchor' | 'estimate';
  /** Map position (copied from the stop's place so stops stay mappable). */
  lat: number;
  lng: number;
}

export interface Corridor {
  id: string;
  name: string;
  /** 'forward' runs Metro Manila outward; 'reverse' runs back to Metro Manila. */
  forwardLabel: string;
  reverseLabel: string;
  /** Average operating speed incl. stops, used for ETAs (km/h). */
  avgKmh: number;
  stops: CorridorStop[];
  confidence: Confidence;
  note?: string;
}

export const CORRIDORS: Corridor[] = [
  {
    id: 'CAGAYAN',
    name: 'Metro Manila - Tuguegarao (Maharlika Highway)',
    forwardLabel: 'Northbound to Tuguegarao',
    reverseLabel: 'Southbound to Metro Manila',
    avgKmh: 45, // 471 km / 45 = ~10.5 h, matching the 10-12 h operators advertise
    confidence: 'estimated',
    note:
      'Via Cabanatuan - San Jose City - Dalton Pass - Bayombong - Santiago - Cauayan - Ilagan. ' +
      'Anchors: Cabanatuan ~105, Santiago ~316 (km post 327 from Manila), Tuguegarao ~471 (~482 from Manila).',
    stops: [
      { id: 'MNL', placeId: 'metro-manila', name: 'Metro Manila', kind: 'terminal', sequence: 0, km: 0, kmConfidence: 'anchor', lat: 14.6205, lng: 121.0522 },
      { id: 'CAB', placeId: 'cabanatuan', name: 'Cabanatuan', kind: 'town', sequence: 1, km: 105, kmConfidence: 'anchor', lat: 15.4864, lng: 120.9679 },
      { id: 'SJC', placeId: 'san-jose-ne', name: 'San Jose City', kind: 'town', sequence: 2, km: 150, kmConfidence: 'anchor', lat: 15.7886, lng: 120.993 },
      { id: 'BMB', placeId: 'bambang', name: 'Bambang', kind: 'town', sequence: 3, km: 247, kmConfidence: 'estimate', lat: 16.3893, lng: 121.1103 },
      { id: 'BYB', placeId: 'bayombong', name: 'Bayombong', kind: 'town', sequence: 4, km: 257, kmConfidence: 'estimate', lat: 16.4829, lng: 121.1495 },
      { id: 'SOL', placeId: 'solano', name: 'Solano', kind: 'town', sequence: 5, km: 264, kmConfidence: 'estimate', lat: 16.5164, lng: 121.1833 },
      { id: 'STG', placeId: 'santiago', name: 'Santiago City', kind: 'terminal', sequence: 6, km: 316, kmConfidence: 'anchor', lat: 16.687, lng: 121.548 },
      { id: 'CAU', placeId: 'cauayan', name: 'Cauayan', kind: 'terminal', sequence: 7, km: 350, kmConfidence: 'estimate', lat: 16.9293, lng: 121.7686 },
      { id: 'ILA', placeId: 'ilagan', name: 'Ilagan', kind: 'town', sequence: 8, km: 391, kmConfidence: 'estimate', lat: 17.1486, lng: 121.8895 },
      { id: 'TUG', placeId: 'tuguegarao', name: 'Tuguegarao City', kind: 'terminal', sequence: 9, km: 471, kmConfidence: 'anchor', lat: 17.6132, lng: 121.727 },
    ],
  },
  {
    id: 'CORDILLERA',
    name: 'Metro Manila - Baguio (NLEX / SCTEX / TPLEX)',
    forwardLabel: 'Northbound to Baguio',
    reverseLabel: 'Southbound to Metro Manila',
    avgKmh: 50,
    confidence: 'estimated',
    note: 'Total 246 km matches the LTFRB worked example (Manila-Baguio, P542 ordinary).',
    stops: [
      { id: 'MNL', placeId: 'metro-manila', name: 'Metro Manila', kind: 'terminal', sequence: 0, km: 0, kmConfidence: 'anchor', lat: 14.6205, lng: 121.0522 },
      { id: 'DAU', placeId: 'dau', name: 'Dau (Mabalacat)', kind: 'terminal', sequence: 1, km: 68, kmConfidence: 'estimate', lat: 15.172, lng: 120.577 },
      { id: 'TRC', placeId: 'tarlac-city', name: 'Tarlac City', kind: 'town', sequence: 2, km: 121, kmConfidence: 'estimate', lat: 15.4755, lng: 120.5963 },
      { id: 'URD', placeId: 'urdaneta', name: 'Urdaneta', kind: 'town', sequence: 3, km: 161, kmConfidence: 'estimate', lat: 15.9761, lng: 120.5711 },
      { id: 'RSL', placeId: 'rosario-lu', name: 'Rosario (La Union)', kind: 'roadside', sequence: 4, km: 209, kmConfidence: 'estimate', lat: 16.2333, lng: 120.4833 },
      { id: 'BAG', placeId: 'baguio', name: 'Baguio City', kind: 'terminal', sequence: 5, km: 246, kmConfidence: 'anchor', lat: 16.4023, lng: 120.596 },
    ],
  },
  {
    id: 'ILOCOS',
    name: 'Metro Manila - Laoag (NLEX / SCTEX / TPLEX, Ilocos Highway)',
    forwardLabel: 'Northbound to Laoag',
    reverseLabel: 'Southbound to Metro Manila',
    avgKmh: 50,
    confidence: 'estimated',
    note:
      'Anchors: San Fernando LU ~270, Vigan ~400, Laoag ~485 km from Manila. ' +
      'Intermediate kms are estimates.',
    stops: [
      { id: 'MNL', placeId: 'metro-manila', name: 'Metro Manila', kind: 'terminal', sequence: 0, km: 0, kmConfidence: 'anchor', lat: 14.6205, lng: 121.0522 },
      { id: 'DAU', placeId: 'dau', name: 'Dau (Mabalacat)', kind: 'terminal', sequence: 1, km: 68, kmConfidence: 'estimate', lat: 15.172, lng: 120.577 },
      { id: 'TRC', placeId: 'tarlac-city', name: 'Tarlac City', kind: 'town', sequence: 2, km: 121, kmConfidence: 'estimate', lat: 15.4755, lng: 120.5963 },
      { id: 'URD', placeId: 'urdaneta', name: 'Urdaneta', kind: 'town', sequence: 3, km: 161, kmConfidence: 'estimate', lat: 15.9761, lng: 120.5711 },
      { id: 'SNL', placeId: 'san-fernando-lu', name: 'San Fernando (La Union)', kind: 'town', sequence: 4, km: 270, kmConfidence: 'estimate', lat: 16.6159, lng: 120.3166 },
      { id: 'VIG', placeId: 'vigan', name: 'Vigan City', kind: 'terminal', sequence: 5, km: 400, kmConfidence: 'estimate', lat: 17.5747, lng: 120.3869 },
      { id: 'LAO', placeId: 'laoag', name: 'Laoag City', kind: 'terminal', sequence: 6, km: 485, kmConfidence: 'estimate', lat: 18.196, lng: 120.5936 },
    ],
  },
];

// --------------------------------------------------------------- services

export interface Service {
  id: string;
  operatorId: string;
  corridorId: string;
  classId: ServiceClassId;
  /** Vehicles that can run this service. */
  vehicleIds: string[];
  /** 'all' or an explicit list of corridor stop ids the bus serves. */
  stopsServed: 'all' | string[];
  note?: string;
  confidence: Confidence;
}

export const SERVICES: Service[] = [
  { id: 'vl-cag-ac', operatorId: 'victory-liner', corridorId: 'CAGAYAN', classId: 'aircon', vehicleIds: ['vl-ac-01', 'vl-ac-02'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'vl-cag-dlx', operatorId: 'victory-liner', corridorId: 'CAGAYAN', classId: 'deluxe', vehicleIds: ['vl-dlx-01', 'vl-dlx-02'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'fl-cag-dlx', operatorId: 'florida', corridorId: 'CAGAYAN', classId: 'deluxe', vehicleIds: ['fl-dlx-01', 'fl-dlx-02'], stopsServed: 'all', note: 'Route via Ilagan (19 daily trips reported).', confidence: 'sourced' },
  { id: 'fl-cag-slp', operatorId: 'florida', corridorId: 'CAGAYAN', classId: 'luxury', vehicleIds: ['fl-slp-01'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'fs-cag-ac', operatorId: 'five-star', corridorId: 'CAGAYAN', classId: 'aircon', vehicleIds: ['fs-ac-01', 'fs-ac-02'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'vl-cor-ac', operatorId: 'victory-liner', corridorId: 'CORDILLERA', classId: 'aircon', vehicleIds: ['vl-ac-01', 'vl-ac-02'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'vl-cor-dlx', operatorId: 'victory-liner', corridorId: 'CORDILLERA', classId: 'deluxe', vehicleIds: ['vl-dlx-01', 'vl-dlx-02'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'pt-cag-dlx', operatorId: 'partas', corridorId: 'CAGAYAN', classId: 'deluxe', vehicleIds: ['pt-dlx-01'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'pt-cag-ac', operatorId: 'partas', corridorId: 'CAGAYAN', classId: 'aircon', vehicleIds: ['pt-ac-01'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'pt-cor-dlx', operatorId: 'partas', corridorId: 'CORDILLERA', classId: 'deluxe', vehicleIds: ['pt-dlx-01'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'bl-cag-ord', operatorId: 'baliwag', corridorId: 'CAGAYAN', classId: 'ordinary', vehicleIds: ['bl-ord-01'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'bl-cag-ac', operatorId: 'baliwag', corridorId: 'CAGAYAN', classId: 'aircon', vehicleIds: ['bl-ac-01'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'gn-cor-dlx', operatorId: 'genesis', corridorId: 'CORDILLERA', classId: 'deluxe', vehicleIds: ['gn-dlx-01'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'gn-cag-ac', operatorId: 'genesis', corridorId: 'CAGAYAN', classId: 'aircon', vehicleIds: ['gn-ac-01'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'oh-cor-dlx', operatorId: 'ohayami', corridorId: 'CORDILLERA', classId: 'deluxe', vehicleIds: ['oh-dlx-01'], stopsServed: 'all', confidence: 'demo', note: 'Corridor assignment is a demo placeholder.' },
  { id: 'gl-cag-ac', operatorId: 'gl-trans', corridorId: 'CAGAYAN', classId: 'aircon', vehicleIds: ['gl-ac-01'], stopsServed: 'all', confidence: 'demo', note: 'Corridor assignment is a demo placeholder.' },
  { id: 'su-cag-uv', operatorId: 'solano-uv', corridorId: 'CAGAYAN', classId: 'uv-express', vehicleIds: ['su-uv-01'], stopsServed: ['SOL', 'BYB', 'STG'], confidence: 'demo', note: 'Short-hop Nueva Vizcaya UV shuttle.' },
  { id: 'cy-cag-uv', operatorId: 'cagayan-uv', corridorId: 'CAGAYAN', classId: 'uv-express', vehicleIds: ['cy-uv-01'], stopsServed: ['TUG', 'ILA', 'CAU'], confidence: 'demo', note: 'Short-hop Cagayan Valley UV shuttle.' },
  { id: 'pt-ilo-dlx', operatorId: 'partas', corridorId: 'ILOCOS', classId: 'deluxe', vehicleIds: ['pt-dlx-01'], stopsServed: 'all', confidence: 'sourced' },
  { id: 'pt-ilo-ac', operatorId: 'partas', corridorId: 'ILOCOS', classId: 'aircon', vehicleIds: ['pt-ac-01'], stopsServed: 'all', confidence: 'sourced' },
];

// ------------------------------------------------------------------ trips

export interface Trip {
  tripId: string;
  serviceId: string;
  direction: 'forward' | 'reverse';
  /** Terminal the bus leaves from (departure time applies at this terminal). */
  originTerminalId: string;
  departureTime: string; // 12h clock
  vehicleId: string;
  confidence: Confidence;
  note?: string;
}

/**
 * Departure times: the Victory Liner Kamias 10:35 PM is a published 2026
 * listing; the Florida window (first 11:30 AM, last 9:45 PM, 19 trips/day)
 * is published but individual slots here are demo. Everything else is demo.
 */
export const TRIPS: Trip[] = [
  // Victory Liner - Kamias (published 2026 listing: Kamias to Ilagan)
  { tripId: 'T-VL-CAG-DLX-N1', serviceId: 'vl-cag-dlx', direction: 'forward', originTerminalId: 'vl-kamias', departureTime: '10:35 PM', vehicleId: 'vl-dlx-01', confidence: 'sourced', note: 'Published as Deluxe - Inner Cities to Ilagan.' },
  { tripId: 'T-VL-CAG-AC-N1', serviceId: 'vl-cag-ac', direction: 'forward', originTerminalId: 'vl-caloocan', departureTime: '8:15 PM', vehicleId: 'vl-ac-01', confidence: 'demo' },
  { tripId: 'T-VL-CAG-AC-N2', serviceId: 'vl-cag-ac', direction: 'forward', originTerminalId: 'vl-sampaloc', departureTime: '9:30 PM', vehicleId: 'vl-ac-02', confidence: 'demo' },
  { tripId: 'T-VL-CAG-DLX-S1', serviceId: 'vl-cag-dlx', direction: 'reverse', originTerminalId: 'vl-tuguegarao', departureTime: '7:30 PM', vehicleId: 'vl-dlx-02', confidence: 'demo' },
  { tripId: 'T-VL-CAG-AC-S1', serviceId: 'vl-cag-ac', direction: 'reverse', originTerminalId: 'vl-tuguegarao', departureTime: '6:30 PM', vehicleId: 'vl-ac-01', confidence: 'demo' },
  // Florida - Sampaloc (window 11:30 AM - 9:45 PM is published; slots are demo)
  { tripId: 'T-FL-CAG-DLX-N1', serviceId: 'fl-cag-dlx', direction: 'forward', originTerminalId: 'fl-sampaloc', departureTime: '11:30 AM', vehicleId: 'fl-dlx-01', confidence: 'demo' },
  { tripId: 'T-FL-CAG-DLX-N2', serviceId: 'fl-cag-dlx', direction: 'forward', originTerminalId: 'fl-sampaloc', departureTime: '6:00 PM', vehicleId: 'fl-dlx-02', confidence: 'demo' },
  { tripId: 'T-FL-CAG-DLX-N3', serviceId: 'fl-cag-dlx', direction: 'forward', originTerminalId: 'fl-sampaloc', departureTime: '9:45 PM', vehicleId: 'fl-dlx-01', confidence: 'demo' },
  { tripId: 'T-FL-CAG-SLP-N1', serviceId: 'fl-cag-slp', direction: 'forward', originTerminalId: 'fl-sampaloc', departureTime: '7:00 PM', vehicleId: 'fl-slp-01', confidence: 'demo' },
  { tripId: 'T-FL-CAG-DLX-S1', serviceId: 'fl-cag-dlx', direction: 'reverse', originTerminalId: 'fl-tuguegarao', departureTime: '8:00 PM', vehicleId: 'fl-dlx-02', confidence: 'demo' },
  { tripId: 'T-FL-CAG-SLP-S1', serviceId: 'fl-cag-slp', direction: 'reverse', originTerminalId: 'fl-tuguegarao', departureTime: '6:00 PM', vehicleId: 'fl-slp-01', confidence: 'demo' },
  // Five Star
  { tripId: 'T-FS-CAG-AC-N1', serviceId: 'fs-cag-ac', direction: 'forward', originTerminalId: 'fs-cubao', departureTime: '8:30 PM', vehicleId: 'fs-ac-01', confidence: 'demo' },
  { tripId: 'T-FS-CAG-AC-N2', serviceId: 'fs-cag-ac', direction: 'forward', originTerminalId: 'fs-pasay', departureTime: '9:00 PM', vehicleId: 'fs-ac-02', confidence: 'demo' },
  { tripId: 'T-FS-CAG-AC-S1', serviceId: 'fs-cag-ac', direction: 'reverse', originTerminalId: 'fs-tuguegarao', departureTime: '7:00 PM', vehicleId: 'fs-ac-01', confidence: 'demo' },
  // Victory Liner - Baguio
  { tripId: 'T-VL-COR-AC-N1', serviceId: 'vl-cor-ac', direction: 'forward', originTerminalId: 'vl-cubao', departureTime: '6:00 AM', vehicleId: 'vl-ac-01', confidence: 'demo' },
  { tripId: 'T-VL-COR-AC-N2', serviceId: 'vl-cor-ac', direction: 'forward', originTerminalId: 'vl-caloocan', departureTime: '1:00 PM', vehicleId: 'vl-ac-02', confidence: 'demo' },
  { tripId: 'T-VL-COR-DLX-N1', serviceId: 'vl-cor-dlx', direction: 'forward', originTerminalId: 'vl-cubao', departureTime: '9:00 AM', vehicleId: 'vl-dlx-01', confidence: 'demo' },
  { tripId: 'T-VL-COR-AC-S1', serviceId: 'vl-cor-ac', direction: 'reverse', originTerminalId: 'vl-baguio', departureTime: '7:00 AM', vehicleId: 'vl-ac-02', confidence: 'demo' },
  { tripId: 'T-VL-COR-DLX-S1', serviceId: 'vl-cor-dlx', direction: 'reverse', originTerminalId: 'vl-baguio', departureTime: '3:00 PM', vehicleId: 'vl-dlx-02', confidence: 'demo' },
  // Partas (forward = northbound AM, reverse = southbound PM)
  { tripId: 'T-PT-CAG-DLX-N1', serviceId: 'pt-cag-dlx', direction: 'forward', originTerminalId: 'pt-cubao', departureTime: '9:00 AM', vehicleId: 'pt-dlx-01', confidence: 'demo' },
  { tripId: 'T-PT-CAG-DLX-S1', serviceId: 'pt-cag-dlx', direction: 'reverse', originTerminalId: 'pt-tuguegarao', departureTime: '8:30 PM', vehicleId: 'pt-dlx-01', confidence: 'demo' },
  { tripId: 'T-PT-CAG-AC-N1', serviceId: 'pt-cag-ac', direction: 'forward', originTerminalId: 'pt-cubao', departureTime: '10:00 AM', vehicleId: 'pt-ac-01', confidence: 'demo' },
  { tripId: 'T-PT-CAG-AC-S1', serviceId: 'pt-cag-ac', direction: 'reverse', originTerminalId: 'pt-tuguegarao', departureTime: '9:00 PM', vehicleId: 'pt-ac-01', confidence: 'demo' },
  { tripId: 'T-PT-COR-DLX-N1', serviceId: 'pt-cor-dlx', direction: 'forward', originTerminalId: 'pt-cubao', departureTime: '7:30 AM', vehicleId: 'pt-dlx-01', confidence: 'demo' },
  { tripId: 'T-PT-COR-DLX-S1', serviceId: 'pt-cor-dlx', direction: 'reverse', originTerminalId: 'vl-baguio', departureTime: '4:30 PM', vehicleId: 'pt-dlx-01', confidence: 'demo', note: 'Origin terminal is a demo placeholder.' },
  // Baliwag Transit (Nueva Ecija / Cagayan corridor)
  { tripId: 'T-BL-CAG-AC-N1', serviceId: 'bl-cag-ac', direction: 'forward', originTerminalId: 'bl-sampaloc', departureTime: '7:00 AM', vehicleId: 'bl-ac-01', confidence: 'demo' },
  { tripId: 'T-BL-CAG-AC-S1', serviceId: 'bl-cag-ac', direction: 'reverse', originTerminalId: 'vl-tuguegarao', departureTime: '6:00 PM', vehicleId: 'bl-ac-01', confidence: 'demo', note: 'Origin terminal is a demo placeholder.' },
  { tripId: 'T-BL-CAG-ORD-N1', serviceId: 'bl-cag-ord', direction: 'forward', originTerminalId: 'bl-sampaloc', departureTime: '5:30 AM', vehicleId: 'bl-ord-01', confidence: 'demo' },
  { tripId: 'T-BL-CAG-ORD-S1', serviceId: 'bl-cag-ord', direction: 'reverse', originTerminalId: 'fs-tuguegarao', departureTime: '4:30 PM', vehicleId: 'bl-ord-01', confidence: 'demo', note: 'Origin terminal is a demo placeholder.' },
  // Genesis / JoyBus
  { tripId: 'T-GN-COR-DLX-N1', serviceId: 'gn-cor-dlx', direction: 'forward', originTerminalId: 'gn-cubao', departureTime: '8:00 AM', vehicleId: 'gn-dlx-01', confidence: 'demo' },
  { tripId: 'T-GN-COR-DLX-S1', serviceId: 'gn-cor-dlx', direction: 'reverse', originTerminalId: 'gn-baguio', departureTime: '5:00 PM', vehicleId: 'gn-dlx-01', confidence: 'demo' },
  { tripId: 'T-GN-CAG-AC-N1', serviceId: 'gn-cag-ac', direction: 'forward', originTerminalId: 'gn-cubao', departureTime: '8:00 PM', vehicleId: 'gn-ac-01', confidence: 'demo' },
  { tripId: 'T-GN-CAG-AC-S1', serviceId: 'gn-cag-ac', direction: 'reverse', originTerminalId: 'vl-tuguegarao', departureTime: '7:00 PM', vehicleId: 'gn-ac-01', confidence: 'demo', note: 'Origin terminal is a demo placeholder.' },
  // Ohayami Trans (corridor assignment is a demo placeholder)
  { tripId: 'T-OH-COR-DLX-N1', serviceId: 'oh-cor-dlx', direction: 'forward', originTerminalId: 'vl-cubao', departureTime: '10:00 PM', vehicleId: 'oh-dlx-01', confidence: 'demo', note: 'Origin terminal is a demo placeholder.' },
  { tripId: 'T-OH-COR-DLX-S1', serviceId: 'oh-cor-dlx', direction: 'reverse', originTerminalId: 'vl-baguio', departureTime: '8:00 PM', vehicleId: 'oh-dlx-01', confidence: 'demo', note: 'Origin terminal is a demo placeholder.' },
  // GL Trans (corridor assignment is a demo placeholder)
  { tripId: 'T-GL-CAG-AC-N1', serviceId: 'gl-cag-ac', direction: 'forward', originTerminalId: 'fl-sampaloc', departureTime: '1:00 PM', vehicleId: 'gl-ac-01', confidence: 'demo', note: 'Origin terminal is a demo placeholder.' },
  { tripId: 'T-GL-CAG-AC-S1', serviceId: 'gl-cag-ac', direction: 'reverse', originTerminalId: 'fs-tuguegarao', departureTime: '10:00 PM', vehicleId: 'gl-ac-01', confidence: 'demo', note: 'Origin terminal is a demo placeholder.' },
  // Short-hop UV shuttles (forward = outbound AM, reverse = return PM)
  { tripId: 'T-SU-CAG-UV-N1', serviceId: 'su-cag-uv', direction: 'forward', originTerminalId: 'su-solano', departureTime: '6:30 AM', vehicleId: 'su-uv-01', confidence: 'demo' },
  { tripId: 'T-SU-CAG-UV-S1', serviceId: 'su-cag-uv', direction: 'reverse', originTerminalId: 'vl-santiago', departureTime: '5:00 PM', vehicleId: 'su-uv-01', confidence: 'demo', note: 'Origin terminal is a demo placeholder.' },
  { tripId: 'T-CY-CAG-UV-N1', serviceId: 'cy-cag-uv', direction: 'forward', originTerminalId: 'cy-cauayan', departureTime: '7:00 AM', vehicleId: 'cy-uv-01', confidence: 'demo' },
  { tripId: 'T-CY-CAG-UV-S1', serviceId: 'cy-cag-uv', direction: 'reverse', originTerminalId: 'cy-tuguegarao', departureTime: '6:00 PM', vehicleId: 'cy-uv-01', confidence: 'demo' },
  // Partas - Ilocos (forward = northbound AM/PM, reverse = southbound back)
  { tripId: 'T-PT-ILO-DLX-N1', serviceId: 'pt-ilo-dlx', direction: 'forward', originTerminalId: 'pt-cubao', departureTime: '6:00 PM', vehicleId: 'pt-dlx-01', confidence: 'demo' },
  { tripId: 'T-PT-ILO-DLX-S1', serviceId: 'pt-ilo-dlx', direction: 'reverse', originTerminalId: 'pt-laoag', departureTime: '7:00 PM', vehicleId: 'pt-dlx-01', confidence: 'demo' },
  { tripId: 'T-PT-ILO-AC-N1', serviceId: 'pt-ilo-ac', direction: 'forward', originTerminalId: 'pt-cubao', departureTime: '9:00 AM', vehicleId: 'pt-ac-01', confidence: 'demo' },
  { tripId: 'T-PT-ILO-AC-S1', serviceId: 'pt-ilo-ac', direction: 'reverse', originTerminalId: 'pt-laoag', departureTime: '8:00 AM', vehicleId: 'pt-ac-01', confidence: 'demo' },
];

// ---------------------------------------------------- fare benchmarks

export interface FareBenchmark {
  id: string;
  label: string;
  corridorId: string;
  boardStopId?: string;
  alightStopId?: string;
  classId: ServiceClassId;
  fare: number;
  /** Allowed relative difference between computed and observed fare. */
  tolerance: number;
  source: string;
  observedAt: string;
  note?: string;
}

/** Real published fares the computed fares must stay close to. */
export const FARE_BENCHMARKS: FareBenchmark[] = [
  {
    id: 'ltfrb-manila-baguio', label: 'LTFRB worked example: Manila-Baguio 246 km, ordinary',
    corridorId: 'CORDILLERA', boardStopId: 'MNL', alightStopId: 'BAG', classId: 'ordinary',
    fare: 542, tolerance: 0, source: SOURCES.ltfrbBaguioExample, observedAt: '2026-03',
    note: 'Official example. 12 + (246-5) x 2.20 = 542.2, rounded.',
  },
  {
    id: 'vl-caloocan-tuguegarao-aircon', label: 'Victory Liner Caloocan-Tuguegarao, regular aircon',
    corridorId: 'CAGAYAN', boardStopId: 'MNL', alightStopId: 'TUG', classId: 'aircon',
    fare: 1128, tolerance: 0.05, source: SOURCES.victoryLinerFares, observedAt: '2026-04',
  },
  {
    id: 'vl-caloocan-tuguegarao-deluxe', label: 'Victory Liner Caloocan-Tuguegarao, deluxe',
    corridorId: 'CAGAYAN', boardStopId: 'MNL', alightStopId: 'TUG', classId: 'deluxe',
    fare: 1224, tolerance: 0.05, source: SOURCES.victoryLinerFares, observedAt: '2026-04',
  },
  {
    id: 'vl-caloocan-santiago', label: 'Victory Liner Caloocan-Santiago (class assumed deluxe)',
    corridorId: 'CAGAYAN', boardStopId: 'MNL', alightStopId: 'STG', classId: 'deluxe',
    fare: 820, tolerance: 0.05, source: SOURCES.victoryLinerFares, observedAt: '2026-04',
  },
  {
    id: 'vl-kamias-ilagan-deluxe', label: 'Victory Liner Kamias-Ilagan, deluxe inner cities',
    corridorId: 'CAGAYAN', boardStopId: 'MNL', alightStopId: 'ILA', classId: 'deluxe',
    fare: 980, tolerance: 0.06, source: SOURCES.victoryLinerSchedules, observedAt: '2026-08',
    note: 'Ilagan km is an estimate, so the wider tolerance.',
  },
  {
    id: 'vl-caloocan-baguio', label: 'Victory Liner Caloocan-Baguio (class assumed deluxe)',
    corridorId: 'CORDILLERA', boardStopId: 'MNL', alightStopId: 'BAG', classId: 'deluxe',
    fare: 633, tolerance: 0.05, source: SOURCES.victoryLinerFares, observedAt: '2026-04',
  },
];
