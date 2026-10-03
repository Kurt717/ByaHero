import { Injectable } from '@angular/core';

/**
 * Provincial-bus network model — single source of truth for the real
 * Philippine operating model: fixed corridors, any-stop boarding/alighting,
 * segment fares and segment seat inventory.
 *
 * ALL fares, stops and schedules here are PROTOTYPE DEMO data for UI
 * testing. They are NOT official LTFRB rates and must never be presented
 * as such (see PROTOTYPE_FARE_NOTE, shown on payment + ticket screens).
 *
 * Pure and deterministic: no Math.random, no Date.now inside derivations.
 */

export const PROTOTYPE_FARE_NOTE =
  'Prototype demo fares for testing only — not official LTFRB rates.';

/** Average corridor speed used for stop ETAs (km/h). */
export const CORRIDOR_KMH = 45;

/** Fallback fare curve (pesos) when a pair has no explicit matrix fare. */
export const FARE_BASE = 80;
export const FARE_PER_KM = 1.1;
export const FARE_MIN = 60;

// ------------------------------------------------------------- operators

export interface Operator {
  id: string;
  name: string;
  shortName: string;
  /** Legacy free-text names that normalize to this operator. */
  legacyNames: string[];
}

export const OPERATORS: Operator[] = [
  { id: 'victory-liner', name: 'Victory Liner', shortName: 'Victory', legacyNames: ['victory liner', 'victory', 'vl'] },
  { id: 'florida', name: 'Florida Bus Line', shortName: 'Florida', legacyNames: ['florida bus line', 'gv florida', 'fbl'] },
  { id: 'partas', name: 'Partas', shortName: 'Partas', legacyNames: ['partas'] },
  { id: 'baliwag', name: 'Baliwag Transit', shortName: 'Baliwag', legacyNames: ['baliwag'] },
  { id: 'genesis', name: 'Genesis', shortName: 'Genesis', legacyNames: ['genesis joybus', 'genesis'] },
  { id: 'five-star', name: 'Five Star', shortName: 'Five Star', legacyNames: ['five star'] },
  { id: 'ohayami', name: 'Ohayami Trans', shortName: 'Ohayami', legacyNames: ['ohayami'] },
  { id: 'gl-trans', name: 'GL Trans', shortName: 'GL', legacyNames: ['gl trans'] },
  { id: 'sagada-shared', name: 'Sagada Shared Van', shortName: 'Sagada Van', legacyNames: ['sagada shared van', 'sagada'] },
  { id: 'dagupan-shared', name: 'Dagupan Shared Van', shortName: 'Dagupan Van', legacyNames: ['dagupan shared van'] },
  { id: 'bontoc-shared', name: 'Bontoc Shared Van', shortName: 'Bontoc Van', legacyNames: ['bontoc shared van', 'bontoc'] },
  { id: 'tabuk-uv', name: 'Tabuk UV Express', shortName: 'Tabuk UV', legacyNames: ['tabuk uv express', 'tabuk uv', 'tabuk'] },
  { id: 'cagayan-uv', name: 'Cagayan UV', shortName: 'Cagayan UV', legacyNames: ['cagayan uv'] },
  { id: 'solano-uv', name: 'Solano UV', shortName: 'Solano UV', legacyNames: ['solano uv'] },
];

/** Longest legacy name wins, so 'GV Florida UV Express' beats 'GV Florida'. */
export function normalizeOperatorId(name: string | null | undefined): string | null {
  const q = (name ?? '').trim().toLowerCase();
  if (!q) return null;
  let best: Operator | null = null;
  let bestLen = 0;
  for (const op of OPERATORS) {
    for (const legacy of op.legacyNames) {
      if ((q.includes(legacy) || legacy.includes(q)) && legacy.length > bestLen) {
        best = op;
        bestLen = legacy.length;
      }
    }
  }
  return best ? best.id : null;
}

export function operatorById(id: string | null | undefined): Operator | null {
  return OPERATORS.find((o) => o.id === id) ?? null;
}

// -------------------------------------------------------- service classes

export type ServiceClassId = 'ordinary' | 'aircon' | 'deluxe' | 'uv-express' | 'shared';

export interface ServiceClass {
  id: ServiceClassId;
  label: string;
  /** Multiplier applied to the ordinary/base fare. */
  fareMultiplier: number;
  amenities: string[];
}

export const SERVICE_CLASSES: ServiceClass[] = [
  { id: 'ordinary', label: 'Ordinary', fareMultiplier: 1, amenities: ['Non-aircon', '2+3 seating'] },
  { id: 'aircon', label: 'Aircon', fareMultiplier: 1.25, amenities: ['Aircon', '2+2 seating', 'Reclining seats'] },
  { id: 'deluxe', label: 'Deluxe', fareMultiplier: 1.6, amenities: ['Aircon', '2+1 seating', 'Extra legroom', 'Onboard restroom'] },
  { id: 'uv-express', label: 'UV Express', fareMultiplier: 1.1, amenities: ['Aircon van', 'Point-to-point'] },
  { id: 'shared', label: 'Shared Van', fareMultiplier: 0.9, amenities: ['Shared van', 'Flexible pickup'] },
];

export function serviceClassById(id: string | null | undefined): ServiceClass {
  return SERVICE_CLASSES.find((c) => c.id === id) ?? SERVICE_CLASSES[1];
}

// --------------------------------------------------------------- vehicles

export interface SeatLayout {
  rows: number;
  /** Seat letters left→right; '|' marks the aisle gap (no seat). */
  columns: string[];
}

export interface Vehicle {
  id: string;
  operatorId: string;
  serviceClassId: ServiceClassId;
  plate: string;
  layout: SeatLayout;
}

export function seatIdsForLayout(layout: SeatLayout): string[] {
  const out: string[] = [];
  for (let r = 1; r <= layout.rows; r++) {
    for (const c of layout.columns) {
      if (c === '|') continue;
      out.push(`${r}${c}`);
    }
  }
  return out;
}

export function layoutCapacity(layout: SeatLayout): number {
  return seatIdsForLayout(layout).length;
}

export const VEHICLES: Vehicle[] = [
  { id: 'V-AC44', operatorId: 'victory-liner', serviceClassId: 'aircon', plate: 'NBC 1932', layout: { rows: 11, columns: ['A', 'B', '|', 'C', 'D'] } },
  { id: 'V-AC44-B', operatorId: 'florida', serviceClassId: 'aircon', plate: 'DDE 4821', layout: { rows: 11, columns: ['A', 'B', '|', 'C', 'D'] } },
  { id: 'V-ORD50', operatorId: 'florida', serviceClassId: 'ordinary', plate: 'NEE 4108', layout: { rows: 10, columns: ['A', 'B', '|', 'C', 'D', 'E'] } },
  { id: 'V-ORD50-B', operatorId: 'five-star', serviceClassId: 'ordinary', plate: 'CXJ 2210', layout: { rows: 10, columns: ['A', 'B', '|', 'C', 'D', 'E'] } },
  { id: 'V-DLX30', operatorId: 'partas', serviceClassId: 'deluxe', plate: 'GDH 7205', layout: { rows: 10, columns: ['A', 'B', '|', 'C'] } },
  { id: 'V-DLX30-B', operatorId: 'genesis', serviceClassId: 'deluxe', plate: 'ABH 5531', layout: { rows: 10, columns: ['A', 'B', '|', 'C'] } },
  { id: 'V-UV15', operatorId: 'tabuk-uv', serviceClassId: 'uv-express', plate: 'DAV 8834', layout: { rows: 5, columns: ['A', 'B', 'C'] } },
  { id: 'V-UV15-B', operatorId: 'cagayan-uv', serviceClassId: 'uv-express', plate: 'YBK 1190', layout: { rows: 5, columns: ['A', 'B', 'C'] } },
  { id: 'V-SHR16', operatorId: 'sagada-shared', serviceClassId: 'shared', plate: 'KAE 4472', layout: { rows: 4, columns: ['A', 'B', 'C', 'D'] } },
  { id: 'V-SHR16-B', operatorId: 'bontoc-shared', serviceClassId: 'shared', plate: 'WQI 9025', layout: { rows: 4, columns: ['A', 'B', 'C', 'D'] } },
];

export function vehicleById(id: string | null | undefined): Vehicle | null {
  return VEHICLES.find((v) => v.id === id) ?? null;
}

// --------------------------------------------------------------- corridors

export type StopKind = 'terminal' | 'town' | 'roadside';
export type Direction = 'forward' | 'reverse';

export interface CorridorStop {
  id: string;
  name: string;
  kind: StopKind;
  /** 0-based order in the forward direction. */
  sequence: number;
  /** Km from the corridor start (symmetric in both directions). */
  km: number;
  lat: number;
  lng: number;
  /** Town id whose fare this stop shares (roadside stops inherit it). */
  fareZone: string;
}

export interface Corridor {
  id: string;
  name: string;
  stops: CorridorStop[];
}

export const CORRIDORS: Corridor[] = [
  {
    id: 'CAGAYAN',
    name: 'Cagayan Valley Corridor',
    stops: [
      { id: 'TUG', name: 'Tuguegarao City Terminal', kind: 'terminal', sequence: 0, km: 0, lat: 17.6132, lng: 121.727, fareZone: 'TUG' },
      { id: 'ILA', name: 'Ilagan', kind: 'town', sequence: 1, km: 66, lat: 17.1487, lng: 121.8895, fareZone: 'ILA' },
      { id: 'CAU', name: 'Cauayan Terminal', kind: 'terminal', sequence: 2, km: 95, lat: 16.9333, lng: 121.7667, fareZone: 'CAU' },
      { id: 'STG', name: 'Santiago City Terminal', kind: 'terminal', sequence: 3, km: 130, lat: 16.6864, lng: 121.549, fareZone: 'STG' },
      { id: 'BBM', name: 'Bambang Crossing', kind: 'roadside', sequence: 4, km: 172, lat: 16.39, lng: 121.11, fareZone: 'BYB' },
      { id: 'BYB', name: 'Bayombong', kind: 'town', sequence: 5, km: 185, lat: 16.487, lng: 121.15, fareZone: 'BYB' },
      { id: 'SOL', name: 'Solano', kind: 'town', sequence: 6, km: 200, lat: 16.5167, lng: 121.1833, fareZone: 'SOL' },
      { id: 'ARI', name: 'Aritao Junction', kind: 'roadside', sequence: 7, km: 212, lat: 16.48, lng: 121.2, fareZone: 'SOL' },
      { id: 'SJC', name: 'San Jose City', kind: 'town', sequence: 8, km: 245, lat: 15.79, lng: 121.0, fareZone: 'SJC' },
      { id: 'CAB', name: 'Cabanatuan', kind: 'town', sequence: 9, km: 280, lat: 15.4864, lng: 120.9679, fareZone: 'CAB' },
      { id: 'TAR', name: 'Tarlac City Terminal', kind: 'terminal', sequence: 10, km: 340, lat: 15.483, lng: 120.59, fareZone: 'TAR' },
      { id: 'PITX', name: 'Manila PITX Terminal', kind: 'terminal', sequence: 11, km: 485, lat: 14.493, lng: 120.986, fareZone: 'PITX' },
    ],
  },
  {
    id: 'CORDILLERA',
    name: 'Cordillera–Manila Corridor',
    stops: [
      { id: 'BAG', name: 'Baguio City Terminal', kind: 'terminal', sequence: 0, km: 0, lat: 16.412, lng: 120.596, fareZone: 'BAG' },
      { id: 'RSJ', name: 'Rosario Junction', kind: 'roadside', sequence: 1, km: 28, lat: 16.33, lng: 120.485, fareZone: 'URD' },
      { id: 'URD', name: 'Urdaneta', kind: 'town', sequence: 2, km: 85, lat: 15.976, lng: 120.567, fareZone: 'URD' },
      { id: 'VIL', name: 'Villasis Crossing', kind: 'roadside', sequence: 3, km: 102, lat: 15.9, lng: 120.47, fareZone: 'URD' },
      { id: 'TRC', name: 'Tarlac City Terminal', kind: 'terminal', sequence: 4, km: 135, lat: 15.483, lng: 120.59, fareZone: 'TRC' },
      { id: 'DAU', name: 'Dau Terminal', kind: 'terminal', sequence: 5, km: 185, lat: 15.17, lng: 120.58, fareZone: 'DAU' },
      { id: 'CUB', name: 'Manila Cubao Terminal', kind: 'terminal', sequence: 6, km: 255, lat: 14.6205, lng: 121.0522, fareZone: 'CUB' },
    ],
  },
];

export function corridorById(id: string | null | undefined): Corridor | null {
  return CORRIDORS.find((c) => c.id === id) ?? null;
}

export function stopById(corridor: Corridor, stopId: string): CorridorStop | null {
  return corridor.stops.find((s) => s.id === stopId) ?? null;
}

// ------------------------------------------------------------------- trips

export interface Trip {
  tripId: string;
  corridorId: string;
  direction: Direction;
  operatorId: string;
  vehicleId: string;
  /** Daily departure, 12h clock (e.g. '6:00 AM'). */
  departureTime: string;
}

export const TRIPS: Trip[] = [
  { tripId: 'T-CAG-S1', corridorId: 'CAGAYAN', direction: 'forward', operatorId: 'victory-liner', vehicleId: 'V-AC44', departureTime: '6:00 AM' },
  { tripId: 'T-CAG-S2', corridorId: 'CAGAYAN', direction: 'forward', operatorId: 'florida', vehicleId: 'V-ORD50', departureTime: '2:30 PM' },
  { tripId: 'T-CAG-N1', corridorId: 'CAGAYAN', direction: 'reverse', operatorId: 'victory-liner', vehicleId: 'V-AC44', departureTime: '7:00 PM' },
  { tripId: 'T-CAG-N2', corridorId: 'CAGAYAN', direction: 'reverse', operatorId: 'partas', vehicleId: 'V-DLX30', departureTime: '8:00 AM' },
  { tripId: 'T-COR-S1', corridorId: 'CORDILLERA', direction: 'forward', operatorId: 'victory-liner', vehicleId: 'V-DLX30', departureTime: '7:30 AM' },
  { tripId: 'T-COR-S2', corridorId: 'CORDILLERA', direction: 'forward', operatorId: 'five-star', vehicleId: 'V-ORD50-B', departureTime: '1:00 PM' },
  { tripId: 'T-COR-N1', corridorId: 'CORDILLERA', direction: 'reverse', operatorId: 'victory-liner', vehicleId: 'V-AC44', departureTime: '6:30 PM' },
  { tripId: 'T-COR-N2', corridorId: 'CORDILLERA', direction: 'reverse', operatorId: 'florida', vehicleId: 'V-ORD50', departureTime: '9:00 AM' },
];

export function tripById(tripId: string | null | undefined): Trip | null {
  return TRIPS.find((t) => t.tripId === tripId) ?? null;
}

// -------------------------------------------------------------- fare table

/** Explicit demo pair fares: corridor → operator → class → 'STOPA>STOPB'. */
type PairFares = Record<string, number>;
const FARE_TABLE: Record<string, Partial<Record<string, Partial<Record<ServiceClassId, PairFares>>>>> = {
  CAGAYAN: {
    florida: {
      aircon: { 'PITX>TUG': 620 },
      ordinary: { 'PITX>TUG': 550 },
    },
    'victory-liner': {
      aircon: { 'PITX>TUG': 650 },
      ordinary: { 'PITX>TUG': 560 },
    },
    partas: {
      deluxe: { 'PITX>TUG': 880 },
    },
  },
  CORDILLERA: {
    'victory-liner': {
      deluxe: { 'BAG>CUB': 720 },
      aircon: { 'BAG>CUB': 560 },
    },
    'five-star': {
      ordinary: { 'BAG>CUB': 450 },
    },
  },
};

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('>');
}

export interface FareQuery {
  corridorId: string;
  operatorId: string;
  serviceClassId: ServiceClassId;
  boardStopId: string;
  alightStopId: string;
}

@Injectable({ providedIn: 'root' })
export class NetworkService {
  corridors = CORRIDORS;
  operators = OPERATORS;
  vehicles = VEHICLES;
  trips = TRIPS;

  corridor(id: string | null | undefined): Corridor | null {
    return corridorById(id);
  }

  trip(tripId: string | null | undefined): Trip | null {
    return tripById(tripId);
  }

  vehicle(vehicleId: string | null | undefined): Vehicle | null {
    return vehicleById(vehicleId);
  }

  operatorName(operatorId: string | null | undefined): string {
    return operatorById(operatorId)?.name ?? operatorId ?? 'Unknown operator';
  }

  classLabel(classId: string | null | undefined): string {
    return serviceClassById(classId).label;
  }

  /** Stops after a boarding sequence in a direction (error prevention:
   *  alighting before boarding is never offered). */
  downstreamStops(corridorId: string, direction: Direction, boardSeq: number): CorridorStop[] {
    const corridor = corridorById(corridorId);
    if (!corridor) return [];
    return direction === 'forward'
      ? corridor.stops.filter((s) => s.sequence > boardSeq)
      : corridor.stops.filter((s) => s.sequence < boardSeq).reverse();
  }

  /** Nearest stop at or after a sequence (hail pickup → fare/seat anchor). */
  nearestDownstreamStop(
    corridorId: string,
    direction: Direction,
    lat: number,
    lng: number,
    busSeq: number,
  ): CorridorStop | null {
    const corridor = corridorById(corridorId);
    if (!corridor) return null;
    const eligible =
      direction === 'forward'
        ? corridor.stops.filter((s) => s.sequence >= busSeq)
        : corridor.stops.filter((s) => s.sequence <= busSeq);
    let best: CorridorStop | null = null;
    let bestM = Number.POSITIVE_INFINITY;
    for (const s of eligible) {
      const m = this.haversineM(lat, lng, s.lat, s.lng);
      if (m < bestM) {
        bestM = m;
        best = s;
      }
    }
    return best;
  }

  segmentKm(corridorId: string, boardSeq: number, alightSeq: number): number {
    const corridor = corridorById(corridorId);
    if (!corridor) return 0;
    const a = corridor.stops[boardSeq];
    const b = corridor.stops[alightSeq];
    if (!a || !b) return 0;
    return Math.abs(b.km - a.km);
  }

  /** Segment fare in pesos. Roadside stops inherit their fareZone for
   *  both matrix lookup and km measurement; otherwise the fallback curve
   *  applies by km. */
  fareFor(q: FareQuery): number {
    const corridor = corridorById(q.corridorId);
    if (!corridor) return 0;
    const board = stopById(corridor, q.boardStopId);
    const alight = stopById(corridor, q.alightStopId);
    if (!board || !alight || board.id === alight.id) return 0;
    const cls = serviceClassById(q.serviceClassId);
    // Roadside → its fare zone (inheritance, per spec).
    const zoneStop = (s: CorridorStop) =>
      s.kind === 'roadside'
        ? (stopById(corridor, s.fareZone) ?? s)
        : s;
    const zb = zoneStop(board);
    const za = zoneStop(alight);
    if (zb.id === za.id) {
      // Same zone (e.g. a roadside point and its own town): minimum fare.
      return Math.round(FARE_MIN * cls.fareMultiplier);
    }
    const key = pairKey(zb.id, za.id);
    const explicit =
      FARE_TABLE[q.corridorId]?.[q.operatorId]?.[cls.id]?.[key];
    if (typeof explicit === 'number') return explicit;
    const km = Math.abs(za.km - zb.km);
    const base = Math.max(FARE_MIN, Math.round(FARE_BASE + FARE_PER_KM * km));
    return Math.round(base * cls.fareMultiplier);
  }

  /** ETA clock time at a stop sequence for a trip on a date string. */
  stopEta(tripId: string, seq: number, dateStr: string): string {
    const trip = tripById(tripId);
    const corridor = trip ? corridorById(trip.corridorId) : null;
    const stop = corridor?.stops[seq];
    if (!trip || !stop) return '';
    const dep = stopDateTime(dateStr, trip.departureTime);
    if (!dep) return '';
    const mins = Math.round((stop.km / CORRIDOR_KMH) * 60);
    const at = new Date(dep.getTime() + mins * 60000);
    return at.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  }

  /** Resolve free-text operator/from/to (old catalog + tickets) onto a
   *  corridor trip + stop sequences. Null when nothing matches (caller
   *  keeps the legacy full-trip path). */
  resolveTrip(
    operatorName: string | null | undefined,
    fromText: string,
    toText: string,
  ): {
    trip: Trip;
    corridor: Corridor;
    boardSeq: number;
    alightSeq: number;
    operatorId: string | null;
  } | null {
    const operatorId = normalizeOperatorId(operatorName);
    let best: {
      corridor: Corridor;
      board: CorridorStop;
      alight: CorridorStop;
      score: number;
    } | null = null;
    for (const corridor of CORRIDORS) {
      const board = this.bestStop(corridor, fromText);
      const alight = this.bestStop(corridor, toText);
      if (!board || !alight || board.stop.id === alight.stop.id) continue;
      const score = board.score + alight.score;
      if (!best || score > best.score) {
        best = { corridor, board: board.stop, alight: alight.stop, score };
      }
    }
    if (!best) return null;
    const forward = best.board.sequence < best.alight.sequence;
    const direction: Direction = forward ? 'forward' : 'reverse';
    const boardSeq = best.board.sequence;
    const alightSeq = best.alight.sequence;
    const sameOp = TRIPS.find(
      (t) =>
        t.corridorId === best!.corridor.id &&
        t.direction === direction &&
        t.operatorId === operatorId,
    );
    const trip =
      sameOp ??
      TRIPS.find(
        (t) => t.corridorId === best!.corridor.id && t.direction === direction,
      );
    if (!trip) return null;
    return { trip, corridor: best.corridor, boardSeq, alightSeq, operatorId };
  }

  /** Best stop match by shared significant tokens (city/terminal names). */
  private bestStop(
    corridor: Corridor,
    text: string,
  ): { stop: CorridorStop; score: number } | null {
    const tokens = significantTokens(text);
    if (!tokens.length) return null;
    let best: { stop: CorridorStop; score: number } | null = null;
    for (const stop of corridor.stops) {
      const stopTokens = significantTokens(stop.name);
      let score = 0;
      for (const tok of tokens) {
        if (stopTokens.includes(tok)) score += tok.length;
      }
      if (score > 0 && (!best || score > best.score)) best = { stop, score };
    }
    return best;
  }

  private haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
}

const STOP_WORDS = new Set(['city', 'terminal', 'crossing', 'junction', 'manila']);

function significantTokens(text: string): string[] {
  return (text ?? '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length > 3 && !STOP_WORDS.has(t));
}

/** 'Sat Oct 04 2026' + '6:00 AM' → Date (null when unparseable). */
export function stopDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const d = new Date(`${dateStr} ${timeStr}`);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
