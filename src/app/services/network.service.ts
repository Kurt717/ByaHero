import { Injectable } from '@angular/core';
import {
  OPERATORS as DATA_OPERATORS,
  SERVICE_CLASSES as DATA_SERVICE_CLASSES,
  SEAT_LAYOUTS,
  VEHICLES as DATA_VEHICLES,
  CORRIDORS as DATA_CORRIDORS,
  SERVICES as DATA_SERVICES,
  TRIPS as DATA_TRIPS,
  FARE_RULES,
  PLACES,
  TERMINALS,
  SERVICES,
  DISCOUNTS,
  FARE_BENCHMARKS,
  DATA_META,
  SOURCES,
  type Confidence,
  type Place,
  type Terminal,
  type Service as NetworkServiceDef,
  type FareRule,
  type DiscountRule,
  type FareBenchmark,
  type Trip as DataTrip,
  type Vehicle as DataVehicle,
  type CorridorStop as DataStop,
  type Corridor as DataCorridor,
} from './network-data';

// Re-export the centralized data so the whole app reads from one place.
export {
  PLACES,
  TERMINALS,
  SERVICES,
  DISCOUNTS,
  FARE_BENCHMARKS,
  DATA_META,
  SOURCES,
};
export type {
  Confidence,
  Place,
  Terminal,
  FareRule,
  DiscountRule,
  FareBenchmark,
};

/**
 * Provincial-bus network model — single source of truth for the real
 * Philippine operating model: fixed corridors, any-stop boarding/alighting,
 * segment fares and segment seat inventory.
 *
 * Raw data lives in network-data.ts (places, operators, terminals, service
 * classes, LTFRB fare rules, discounts, seat layouts, vehicles, corridors +
 * stops, services, trips, fare benchmarks). This file derives everything the
 * app needs from it: lookups, fuzzy trip resolution, LTFRB per-km segment
 * fares and stop ETAs. Pure and deterministic: no Math.random, no Date.now
 * inside derivations.
 *
 * Fare accuracy is pinned by real published fares — see FARE_BENCHMARKS and
 * the fare-accuracy tests. Fares shown in-app remain labelled prototype
 * demo data (see PROTOTYPE_FARE_NOTE, shown on payment + ticket screens).
 */

export const PROTOTYPE_FARE_NOTE =
  'Prototype demo fares for testing only — not official LTFRB rates.';

/** Fallback corridor speed (km/h) when a corridor has no avgKmh. */
export const CORRIDOR_KMH = 45;

/** @deprecated Legacy fallback fare-curve constants (kept for compatibility). */
export const FARE_BASE = 80;
/** @deprecated Legacy fallback fare-curve constants (kept for compatibility). */
export const FARE_PER_KM = 1.1;
/** @deprecated Legacy fallback fare-curve constants (kept for compatibility). */
export const FARE_MIN = 60;

// ------------------------------------------------------------- operators

export interface Operator {
  id: string;
  name: string;
  shortName: string;
  /** Legacy free-text names that normalize to this operator. */
  legacyNames: string[];
}

export const OPERATORS: Operator[] = DATA_OPERATORS.map((o) => ({
  id: o.id,
  name: o.name,
  shortName: o.shortName,
  legacyNames: o.legacyNames,
}));

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

export function placeById(id: string | null | undefined): Place | null {
  return PLACES.find((p) => p.id === id) ?? null;
}

export function terminalById(id: string | null | undefined): Terminal | null {
  return TERMINALS.find((t) => t.id === id) ?? null;
}

export function serviceById(id: string | null | undefined): NetworkServiceDef | null {
  return DATA_SERVICES.find((s) => s.id === id) ?? null;
}

// -------------------------------------------------------- service classes

export type ServiceClassId =
  | 'ordinary'
  | 'aircon'
  | 'deluxe'
  | 'super-deluxe'
  | 'luxury'
  | 'uv-express'
  | 'shared';

export interface ServiceClass {
  id: ServiceClassId;
  label: string;
  amenities: string[];
}

export const SERVICE_CLASSES: ServiceClass[] = DATA_SERVICE_CLASSES.map((c) => ({
  id: c.id as ServiceClassId,
  label: c.label,
  amenities: c.amenities,
}));

export function serviceClassById(id: string | null | undefined): ServiceClass {
  return SERVICE_CLASSES.find((c) => c.id === id) ?? SERVICE_CLASSES[1];
}

/** LTFRB per-km rule for a class. Legacy van classes fall back to the
 *  closest regulated equivalents (uv-express → aircon, shared → ordinary). */
export function fareRuleFor(classId: string | null | undefined): FareRule {
  const direct = FARE_RULES.find((r) => r.classId === classId);
  if (direct) return direct;
  if (classId === 'uv-express')
    return FARE_RULES.find((r) => r.classId === 'aircon')!;
  return FARE_RULES.find((r) => r.classId === 'ordinary')!;
}

// --------------------------------------------------------------- vehicles

export interface SeatLayout {
  id?: string;
  rows: number;
  /** Seat letters left→right; '|' marks an aisle gap (may appear more than once). */
  columns: string[];
  /** Seats that exist in the grid but cannot be sold (restroom, driver bay...). */
  blockedSeats?: string[];
}

export interface Vehicle {
  id: string;
  operatorId: string;
  serviceClassId: ServiceClassId;
  plate: string;
  layout: SeatLayout;
  /** Raw layout reference in network-data.ts. */
  layoutId?: string;
}

export function layoutById(id: string | null | undefined): SeatLayout | null {
  const found = SEAT_LAYOUTS.find((l) => l.id === id);
  return found
    ? {
        id: found.id,
        rows: found.rows,
        columns: [...found.columns],
        blockedSeats: [...found.blockedSeats],
      }
    : null;
}

/** Sellable seat ids for a layout (blocked seats excluded). */
export function seatIdsForLayout(layout: SeatLayout): string[] {
  const out: string[] = [];
  const blocked = new Set(layout.blockedSeats ?? []);
  for (let r = 1; r <= layout.rows; r++) {
    for (const c of layout.columns) {
      if (c === '|') continue;
      const id = `${r}${c}`;
      if (!blocked.has(id)) out.push(id);
    }
  }
  return out;
}

export function layoutCapacity(layout: SeatLayout): number {
  return seatIdsForLayout(layout).length;
}

export const VEHICLES: Vehicle[] = DATA_VEHICLES.map((v: DataVehicle) => ({
  id: v.id,
  operatorId: v.operatorId,
  serviceClassId: v.classId,
  plate: v.plate,
  layout: layoutById(v.layoutId) ?? { rows: 10, columns: ['A', 'B', '|', 'C', 'D'] },
  layoutId: v.layoutId,
}));

export function vehicleById(id: string | null | undefined): Vehicle | null {
  return VEHICLES.find((v) => v.id === id) ?? null;
}

// --------------------------------------------------------------- corridors

export type StopKind = 'terminal' | 'town' | 'roadside';
export type Direction = 'forward' | 'reverse';

export interface CorridorStop {
  id: string;
  placeId?: string;
  name: string;
  kind: StopKind;
  /** 0-based order in the forward direction. */
  sequence: number;
  /** Km from the corridor start (symmetric in both directions). */
  km: number;
  lat: number;
  lng: number;
}

export interface Corridor {
  id: string;
  name: string;
  /** Average operating speed incl. stops, used for ETAs (km/h). */
  avgKmh?: number;
  stops: CorridorStop[];
}

export const CORRIDORS: Corridor[] = DATA_CORRIDORS.map((c: DataCorridor) => ({
  id: c.id,
  name: c.name,
  avgKmh: c.avgKmh,
  stops: c.stops.map((s: DataStop) => ({
    id: s.id,
    placeId: s.placeId,
    name: s.name,
    kind: s.kind,
    sequence: s.sequence,
    km: s.km,
    lat: s.lat,
    lng: s.lng,
  })),
}));

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
  /** Raw service reference in network-data.ts. */
  serviceId?: string;
  /** Terminal the bus leaves from (departure time applies at this terminal). */
  originTerminalId?: string;
}

export const TRIPS: Trip[] = DATA_TRIPS.map((t: DataTrip) => {
  const service = serviceById(t.serviceId);
  return {
    tripId: t.tripId,
    corridorId: service?.corridorId ?? '',
    direction: t.direction,
    operatorId: service?.operatorId ?? '',
    vehicleId: t.vehicleId,
    departureTime: t.departureTime,
    serviceId: t.serviceId,
    originTerminalId: t.originTerminalId,
  };
});

export function tripById(tripId: string | null | undefined): Trip | null {
  return TRIPS.find((t) => t.tripId === tripId) ?? null;
}

// -------------------------------------------------------------- fare table

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('>');
}

/** Rider's chosen boarding/alighting stops as corridor stop ids. */
export interface RiderPair {
  boardStopId: string;
  alightStopId: string;
}

/** Validate a rider pair against a resolved route span. Same corridor, same
 *  travel direction, and the rider's stretch inside the route's span —
 *  otherwise the booking keeps the full-route behavior. Pure. */
export function riderPairForRoute(
  pairCorridorId: string,
  pairBoardSeq: number,
  pairAlightSeq: number,
  pairStops: CorridorStop[],
  routeCorridorId: string,
  routeBoardSeq: number,
  routeAlightSeq: number,
): RiderPair | undefined {
  if (pairCorridorId !== routeCorridorId) return undefined;
  if (pairBoardSeq === pairAlightSeq) return undefined;
  const riderForward = pairAlightSeq > pairBoardSeq;
  const routeForward = routeAlightSeq > routeBoardSeq;
  if (riderForward !== routeForward) return undefined;
  const riderLo = Math.min(pairBoardSeq, pairAlightSeq);
  const riderHi = Math.max(pairBoardSeq, pairAlightSeq);
  const routeLo = Math.min(routeBoardSeq, routeAlightSeq);
  const routeHi = Math.max(routeBoardSeq, routeAlightSeq);
  if (riderLo < routeLo || riderHi > routeHi) return undefined;
  const board = pairStops[pairBoardSeq];
  const alight = pairStops[pairAlightSeq];
  if (!board || !alight || board.id === alight.id) return undefined;
  return { boardStopId: board.id, alightStopId: alight.id };
}

export interface FareQuery {
  corridorId: string;
  operatorId: string;
  serviceClassId: ServiceClassId;
  boardStopId: string;
  alightStopId: string;
}

/** LTFRB per-km segment fare in pesos, rounded to the peso:
 *  baseFare + max(0, km − baseKm) × perKm. Verified against published
 *  operator fares — see FARE_BENCHMARKS. */
export function computeLTFRBFare(km: number, rule: FareRule): number {
  const extra = Math.max(0, km - rule.baseKm);
  return Math.round(rule.baseFare + extra * rule.perKm);
}

@Injectable({ providedIn: 'root' })
export class NetworkService {
  corridors = CORRIDORS;
  operators = OPERATORS;
  vehicles = VEHICLES;
  trips = TRIPS;
  places = PLACES;
  terminals = TERMINALS;

  corridor(id: string | null | undefined): Corridor | null {
    return corridorById(id);
  }

  trip(tripId: string | null | undefined): Trip | null {
    return tripById(tripId);
  }

  vehicle(vehicleId: string | null | undefined): Vehicle | null {
    return vehicleById(vehicleId);
  }

  place(placeId: string | null | undefined): Place | null {
    return placeById(placeId);
  }

  terminal(terminalId: string | null | undefined): Terminal | null {
    return terminalById(terminalId);
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

  /** Segment fare in pesos from the LTFRB per-km rules over stop distances. */
  fareFor(q: FareQuery): number {
    const corridor = corridorById(q.corridorId);
    if (!corridor) return 0;
    const board = stopById(corridor, q.boardStopId);
    const alight = stopById(corridor, q.alightStopId);
    if (!board || !alight || board.id === alight.id) return 0;
    const km = Math.abs(alight.km - board.km);
    if (km <= 0) return 0;
    return computeLTFRBFare(km, fareRuleFor(q.serviceClassId));
  }

  /** ETA clock time at a stop sequence for a trip on a date string.
   *  Measured from the trip's origin terminal (departure time applies
   *  there), so reverse trips count down from the far end correctly. */
  stopEta(tripId: string, seq: number, dateStr: string): string {
    const trip = tripById(tripId);
    const corridor = trip ? corridorById(trip.corridorId) : null;
    const stop = corridor?.stops[seq];
    if (!trip || !stop) return '';
    const dep = stopDateTime(dateStr, trip.departureTime);
    if (!dep) return '';
    const originKm = this.originKmForTrip(trip, corridor!);
    const speed = corridor!.avgKmh ?? CORRIDOR_KMH;
    const mins = Math.round((Math.abs(stop.km - originKm) / speed) * 60);
    const at = new Date(dep.getTime() + mins * 60000);
    return at.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  }

  /** Road km of the stop a trip departs from (its origin terminal's place). */
  private originKmForTrip(trip: Trip, corridor: Corridor): number {
    const terminal = terminalById(trip.originTerminalId);
    if (terminal) {
      const at = corridor.stops.find((s) => s.placeId === terminal.placeId);
      if (at) return at.km;
    }
    return trip.direction === 'forward'
      ? corridor.stops[0].km
      : corridor.stops[corridor.stops.length - 1].km;
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

  /** Best stop match by shared significant tokens. A stop matches on its
   *  own name AND on its place's aliases, so hub spellings users actually
   *  type ("Manila (PITX)", "Cubao, QC", "Santiago City") land on the
   *  right stop. Name matches win ties over alias matches. */
  private bestStop(
    corridor: Corridor,
    text: string,
  ): { stop: CorridorStop; score: number } | null {
    const tokens = significantTokens(text);
    if (!tokens.length) return null;
    let best: { stop: CorridorStop; score: number } | null = null;
    for (const stop of corridor.stops) {
      const nameScore = matchScore(tokens, significantTokens(stop.name));
      let aliasScore = 0;
      const place = stop.placeId ? placeById(stop.placeId) : null;
      if (place) {
        for (const alias of place.aliases) {
          aliasScore = Math.max(aliasScore, matchScore(tokens, significantTokens(alias)));
        }
      }
      // Name match, slightly preferred; otherwise the best alias match.
      const score = nameScore > 0 ? nameScore + 1 : aliasScore;
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

/** Sum of matched token lengths — longer (more specific) matches win. */
function matchScore(tokens: string[], candidates: string[]): number {
  let score = 0;
  for (const tok of tokens) {
    if (candidates.includes(tok)) score += tok.length;
  }
  return score;
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
