import { TestBed } from '@angular/core/testing';
import {
  NetworkService,
  normalizeOperatorId,
  operatorById,
  seatIdsForLayout,
  layoutCapacity,
  layoutById,
  vehicleById,
  tripById,
  VEHICLES,
  PROTOTYPE_FARE_NOTE,
  FARE_BENCHMARKS,
} from './network.service';

describe('NetworkService (provincial corridor model)', () => {
  let svc: NetworkService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(NetworkService);
  });

  it('creates the service with three corridors from the centralized data', () => {
    expect(svc).toBeTruthy();
    expect(svc.corridors.map((c) => c.id)).toEqual(['CAGAYAN', 'CORDILLERA', 'ILOCOS']);
    expect(svc.corridors[0].stops.length).toBe(10);
    expect(svc.corridors[1].stops.length).toBe(6);
    expect(svc.corridors[2].stops.length).toBe(7);
  });

  it('normalizes legacy operator names to operator ids', () => {
    expect(normalizeOperatorId('Victory Liner')).toBe('victory-liner');
    expect(normalizeOperatorId('GV Florida')).toBe('florida');
    expect(normalizeOperatorId('GV Florida UV Express')).toBe('florida');
    expect(normalizeOperatorId('Five Star')).toBe('five-star');
    expect(normalizeOperatorId('Genesis JoyBus')).toBe('genesis');
    expect(normalizeOperatorId('Solano UV')).toBe('solano-uv');
    expect(normalizeOperatorId('Mystery Lines')).toBeNull();
    expect(operatorById('victory-liner')?.name).toBe('Victory Liner');
    expect(operatorById('partas')?.name).toBe('Partas');
  });

  it('resolves same-operator trips for the added bus network', () => {
    // Partas runs its own deluxe trip southbound (reverse).
    const partas = svc.resolveTrip('Partas', 'Tuguegarao', 'Manila (PITX)');
    expect(partas).not.toBeNull();
    expect(partas!.trip.tripId).toBe('T-PT-CAG-DLX-S1');
    expect([partas!.boardSeq, partas!.alightSeq]).toEqual([9, 0]);

    // Genesis runs its own deluxe trip to Baguio (forward).
    const genesis = svc.resolveTrip('Genesis', 'Manila (Cubao)', 'Baguio City');
    expect(genesis).not.toBeNull();
    expect(genesis!.trip.tripId).toBe('T-GN-COR-DLX-N1');

    // Baliwag ordinary on the Cagayan corridor.
    const baliwag = svc.resolveTrip('Baliwag Transit', 'Cabanatuan', 'Santiago City');
    expect(baliwag).not.toBeNull();
    expect(baliwag!.trip.operatorId).toBe('baliwag');
  });

  it('gives vans real layouts, capacities and fares', () => {
    expect(seatIdsForLayout(layoutById('uv-van-5x3')!).length).toBe(15);
    expect(seatIdsForLayout(layoutById('shared-van-4x4')!).length).toBe(16);
    expect(vehicleById('su-uv-01')?.plate).toBeTruthy();

    const uvFare = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'solano-uv',
      serviceClassId: 'uv-express',
      boardStopId: 'SOL',
      alightStopId: 'STG',
    });
    const sharedFare = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'sagada-shared',
      serviceClassId: 'shared',
      boardStopId: 'SOL',
      alightStopId: 'STG',
    });
    expect(uvFare).toBeGreaterThan(0);
    expect(sharedFare).toBeGreaterThan(0);
  });

  it('resolves a catalog pair onto a corridor trip + sequences', () => {
    // Ilagan (seq 8) → Santiago City (seq 6): reverse, first Victory reverse.
    const south = svc.resolveTrip('Victory Liner', 'Ilagan', 'Santiago City');
    expect(south).not.toBeNull();
    expect(south!.trip.tripId).toBe('T-VL-CAG-DLX-S1');
    expect([south!.boardSeq, south!.alightSeq]).toEqual([8, 6]);

    const north = svc.resolveTrip('Victory Liner', 'Santiago City', 'Ilagan');
    expect(north!.trip.tripId).toBe('T-VL-CAG-DLX-N1');
    expect([north!.boardSeq, north!.alightSeq]).toEqual([6, 8]);
  });

  it('resolves hub spellings (PITX, Cubao) onto the Metro Manila stop', () => {
    const pitx = svc.resolveTrip('Victory Liner', 'Tuguegarao', 'Manila (PITX)');
    expect(pitx).not.toBeNull();
    expect([pitx!.boardSeq, pitx!.alightSeq]).toEqual([9, 0]);

    const cubao = svc.resolveTrip('Victory Liner', 'Manila (Cubao)', 'Baguio City');
    expect(cubao).not.toBeNull();
    expect(cubao!.corridor.id).toBe('CORDILLERA');
    expect([cubao!.boardSeq, cubao!.alightSeq]).toEqual([0, 5]);
  });

  it('resolves Ilocos pairs onto the Ilocos corridor', () => {
    const north = svc.resolveTrip('Partas', 'Manila (PITX)', 'Vigan City');
    expect(north).not.toBeNull();
    expect(north!.corridor.id).toBe('ILOCOS');
    expect(north!.trip.tripId).toBe('T-PT-ILO-DLX-N1');
    expect([north!.boardSeq, north!.alightSeq]).toEqual([0, 5]);

    const laoag = svc.resolveTrip('Partas', 'Laoag City', 'Manila (Cubao)');
    expect(laoag).not.toBeNull();
    expect([laoag!.boardSeq, laoag!.alightSeq]).toEqual([6, 0]);
  });

  it('returns null for places on no corridor', () => {
    expect(svc.resolveTrip('Victory Liner', 'Ilagan', 'Sagada')).toBeNull();
  });

  it('prices segments from the LTFRB per-km rules', () => {
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
      alightStopId: 'MNL',
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

    // LTFRB formula is symmetric by direction: 75 km aircon.
    const there = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'florida',
      serviceClassId: 'aircon',
      boardStopId: 'TUG',
      alightStopId: 'MNL',
    });
    const back = svc.fareFor({
      corridorId: 'CAGAYAN',
      operatorId: 'florida',
      serviceClassId: 'aircon',
      boardStopId: 'MNL',
      alightStopId: 'TUG',
    });
    expect(there).toBe(back);
    expect(there).toBeGreaterThan(0);
  });

  it('stays within tolerance of every published fare benchmark', () => {
    expect(FARE_BENCHMARKS.length).toBeGreaterThan(0);
    for (const b of FARE_BENCHMARKS) {
      const computed = svc.fareFor({
        corridorId: b.corridorId,
        operatorId: 'victory-liner',
        serviceClassId: b.classId,
        boardStopId: b.boardStopId!,
        alightStopId: b.alightStopId!,
      });
      const drift = Math.abs(computed - b.fare) / b.fare;
      if (drift > b.tolerance) {
        throw new Error(
          `${b.id}: computed ${computed} vs observed ${b.fare} (drift ${drift} > tolerance ${b.tolerance})`,
        );
      }
      expect(drift).toBeLessThanOrEqual(b.tolerance);
    }
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
    expect(forward.map((s) => s.sequence)).toEqual([4, 5, 6, 7, 8, 9]);
    const reverse = svc.downstreamStops('CAGAYAN', 'reverse', 3);
    expect(reverse.map((s) => s.sequence)).toEqual([2, 1, 0]);
  });

  it('finds the nearest downstream stop for hail pickups', () => {
    // Near Santiago, bus at San Jose City (seq 2): Santiago (seq 6) wins.
    const stop = svc.nearestDownstreamStop('CAGAYAN', 'forward', 16.69, 121.55, 2);
    expect(stop?.id).toBe('STG');
    // Nothing ahead of the last stop.
    const none = svc.nearestDownstreamStop('CAGAYAN', 'forward', 14.5, 121.0, 9);
    expect(none?.id).toBe('TUG');
  });

  it('computes segment km symmetrically', () => {
    expect(svc.segmentKm('CAGAYAN', 1, 3)).toBe(142);
    expect(svc.segmentKm('CAGAYAN', 3, 1)).toBe(142);
  });

  it('renders every vehicle layout with matching capacity', () => {
    const expected: Record<string, number> = {
      'vl-ac-01': 48,
      'fl-dlx-01': 29, // 30-grid minus blocked restroom seat 10C
      'fl-slp-01': 32, // 33 berths minus blocked 11B
    };
    for (const v of VEHICLES) {
      const ids = seatIdsForLayout(v.layout);
      expect(ids.length).toBe(layoutCapacity(v.layout));
      if (expected[v.id] != null) expect(ids.length).toBe(expected[v.id]);
      expect(vehicleById(v.id)?.plate).toBeTruthy();
    }
    expect(tripById('T-VL-CAG-DLX-N1')?.direction).toBe('forward');
    expect(tripById('T-VL-CAG-DLX-S1')?.direction).toBe('reverse');
  });

  it('labels demo data as prototype, never official', () => {
    expect(PROTOTYPE_FARE_NOTE.toLowerCase()).toContain('prototype');
    expect(PROTOTYPE_FARE_NOTE).toContain('LTFRB');
  });
});
