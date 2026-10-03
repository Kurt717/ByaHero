import { TestBed } from '@angular/core/testing';
import {
  NetworkService,
  normalizeOperatorId,
  operatorById,
  seatIdsForLayout,
  layoutCapacity,
  vehicleById,
  tripById,
  VEHICLES,
  PROTOTYPE_FARE_NOTE,
} from './network.service';

describe('NetworkService (provincial corridor model)', () => {
  let svc: NetworkService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(NetworkService);
  });

  it('creates the service with two demo corridors', () => {
    expect(svc).toBeTruthy();
    expect(svc.corridors.map((c) => c.id)).toEqual(['CAGAYAN', 'CORDILLERA']);
    expect(svc.corridors[0].stops.length).toBeGreaterThanOrEqual(8);
  });

  it('normalizes legacy operator names to operator ids', () => {
    expect(normalizeOperatorId('Victory Liner')).toBe('victory-liner');
    expect(normalizeOperatorId('GV Florida')).toBe('florida');
    expect(normalizeOperatorId('GV Florida UV Express')).toBe('florida');
    expect(normalizeOperatorId('Genesis JoyBus')).toBe('genesis');
    expect(normalizeOperatorId('Mystery Lines')).toBeNull();
    expect(operatorById('partas')?.name).toBe('Partas');
  });

  it('resolves a catalog pair onto a corridor trip + sequences', () => {
    const south = svc.resolveTrip('Victory Liner', 'Ilagan', 'Santiago City');
    expect(south).not.toBeNull();
    expect(south!.trip.tripId).toBe('T-CAG-S1');
    expect([south!.boardSeq, south!.alightSeq]).toEqual([1, 3]);

    const north = svc.resolveTrip('Victory Liner', 'Santiago City', 'Ilagan');
    expect(north!.trip.tripId).toBe('T-CAG-N1');
    expect([north!.boardSeq, north!.alightSeq]).toEqual([3, 1]);
  });

  it('returns null for places on no corridor', () => {
    expect(svc.resolveTrip('Victory Liner', 'Ilagan', 'Vigan City')).toBeNull();
  });

  it('prices segments: pair differs, aircon beats ordinary, matrix is symmetric', () => {
    const shortAircon = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'victory-liner',
      serviceClassId: 'aircon',
      boardStopId: 'ILA',
      alightStopId: 'STG',
    });
    const longAircon = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'victory-liner',
      serviceClassId: 'aircon',
      boardStopId: 'TUG',
      alightStopId: 'PITX',
    });
    expect(longAircon).toBeGreaterThan(shortAircon);

    const shortOrdinary = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'victory-liner',
      serviceClassId: 'ordinary',
      boardStopId: 'ILA',
      alightStopId: 'STG',
    });
    expect(shortAircon).toBeGreaterThan(shortOrdinary);

    // Explicit matrix fare is symmetric by direction.
    const there = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'florida',
      serviceClassId: 'aircon',
      boardStopId: 'TUG',
      alightStopId: 'PITX',
    });
    const back = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'florida',
      serviceClassId: 'aircon',
      boardStopId: 'PITX',
      alightStopId: 'TUG',
    });
    expect(there).toBe(620);
    expect(back).toBe(620);
  });

  it('roadside stops inherit their fare zone', () => {
    const viaZone = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'victory-liner',
      serviceClassId: 'ordinary',
      boardStopId: 'BYB',
      alightStopId: 'STG',
    });
    const viaRoadside = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'victory-liner',
      serviceClassId: 'ordinary',
      boardStopId: 'BBM', // Bambang Crossing, zone BYB
      alightStopId: 'STG',
    });
    expect(viaRoadside).toBe(viaZone);
  });

  it('rejects same-stop and unknown-stop fares', () => {
    const base = {
      corridorId: 'CAGAYAN',
      operatorId: 'victory-liner',
      serviceClassId: 'aircon' as const,
      boardStopId: 'ILA',
      alightStopId: 'ILA',
    };
    expect(svc.fareFor(base)).toBe(0);
    expect(
      svc.fareFor({ ...base, alightStopId: 'NOPE', boardStopId: 'ILA' }),
    ).toBe(0);
  });

  it('lists downstream stops only, in travel order', () => {
    const forward = svc.downstreamStops('CAGAYAN', 'forward', 3);
    expect(forward.map((s) => s.sequence)).toEqual([4, 5, 6, 7, 8, 9, 10, 11]);
    const reverse = svc.downstreamStops('CAGAYAN', 'reverse', 3);
    expect(reverse.map((s) => s.sequence)).toEqual([2, 1, 0]);
  });

  it('finds the nearest downstream stop for hail pickups', () => {
    // Near Santiago, bus at Cauayan (seq 2): Santiago (seq 3) wins.
    const stop = svc.nearestDownstreamStop('CAGAYAN', 'forward', 16.69, 121.55, 2);
    expect(stop?.id).toBe('STG');
    // Nothing ahead of the last stop.
    const none = svc.nearestDownstreamStop('CAGAYAN', 'forward', 14.5, 121.0, 11);
    expect(none?.id).toBe('PITX');
  });

  it('computes segment km symmetrically', () => {
    expect(svc.segmentKm('CAGAYAN', 1, 3)).toBe(64);
    expect(svc.segmentKm('CAGAYAN', 3, 1)).toBe(64);
  });

  it('renders every vehicle layout with matching capacity', () => {
    const expected: Record<string, number> = {
      'V-AC44': 44,
      'V-ORD50': 50,
      'V-DLX30': 30,
      'V-UV15': 15,
      'V-SHR16': 16,
    };
    for (const v of VEHICLES) {
      const ids = seatIdsForLayout(v.layout);
      expect(ids.length).toBe(layoutCapacity(v.layout));
      if (expected[v.id] != null) expect(ids.length).toBe(expected[v.id]);
      expect(vehicleById(v.id)?.plate).toBeTruthy();
    }
    expect(tripById('T-CAG-S1')?.direction).toBe('forward');
    expect(tripById('T-CAG-N1')?.direction).toBe('reverse');
  });

  it('labels demo data as prototype, never official', () => {
    expect(PROTOTYPE_FARE_NOTE.toLowerCase()).toContain('prototype');
    expect(PROTOTYPE_FARE_NOTE).toContain('LTFRB');
  });
});
