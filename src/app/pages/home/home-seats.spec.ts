import { TestBed } from '@angular/core/testing';
import { RouteCatalogService } from '../../services/route-catalog.service';
import {
  NetworkService,
  seatIdsForLayout,
  vehicleById,
} from '../../services/network.service';
import {
  SeatService,
  departureKeyForTrip,
} from '../../services/seat.service';

const SEATS_V2 = 'byahero.seats.v2';
const SEATS_MIGRATED = 'byahero.seats.v2.migrated';
const SEATS_V1 = 'byahero.seats.v1';
const BOOKINGS_V1 = 'byahero.bookings.v1';

/**
 * Home cards must show live inventory: booking a seat the way the payment
 * screen does (segment hold for corridor trips, legacy hold otherwise, both
 * keyed on the travel date) has to drop the exact number Home renders.
 */
describe('Home seats-left reflects bookings', () => {
  beforeEach(() => {
    for (const k of [SEATS_V1, SEATS_V2, SEATS_MIGRATED, BOOKINGS_V1]) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  /** The number Home renders for a card (mirrors seatsLabelFor's count). */
  function homeCount(
    seats: SeatService,
    network: NetworkService,
    route: { operator: string; from: string; to: string; seats: string },
    today: string,
  ): number | null {
    const r = network.resolveTrip(route.operator, route.from, route.to);
    if (!r) {
      return seats.availabilityFor(
        route.seats,
        [route.operator, route.from, route.to, today].join('|'),
      ).available;
    }
    const vehicle = vehicleById(r.trip.vehicleId);
    const ids = vehicle ? seatIdsForLayout(vehicle.layout) : [];
    if (!ids.length) return null;
    return seats.availabilityForSegment(
      departureKeyForTrip(r.trip.tripId, today),
      ids,
      Math.min(r.boardSeq, r.alightSeq),
      Math.max(r.boardSeq, r.alightSeq),
      r.corridor.stops.length - 1,
    ).available;
  }

  it('every catalog route drops by 1 after a same-day booking', () => {
    const catalog = TestBed.inject(RouteCatalogService);
    const network = TestBed.inject(NetworkService);
    const seats = TestBed.inject(SeatService);
    const today = new Date().toDateString();

    expect(catalog.routes.length).toBeGreaterThan(0);
    for (const route of catalog.routes) {
      const before = homeCount(seats, network, route, today);
      expect(before).not.toBeNull();

      const r = network.resolveTrip(route.operator, route.from, route.to);
      if (r) {
        const vehicle = vehicleById(r.trip.vehicleId);
        const ids = vehicle ? seatIdsForLayout(vehicle.layout) : [];
        const lo = Math.min(r.boardSeq, r.alightSeq);
        const hi = Math.max(r.boardSeq, r.alightSeq);
        const depKey = departureKeyForTrip(r.trip.tripId, today);
        const seat = ids.find((id) =>
          seats.isSeatFree(depKey, id, lo, hi, r.corridor.stops.length - 1, ids),
        )!;
        // Same call the payment screen makes.
        seats.bookSegment(depKey, [seat], lo, hi, 'BYH-HOME-TEST');
        expect(homeCount(seats, network, route, today)).toBe(before! - 1);
        seats.freeSeatsByRef(depKey, 'BYH-HOME-TEST');
      } else {
        const key = [route.operator, route.from, route.to, today].join('|');
        // Same call the payment screen makes for off-corridor trips.
        const fresh = seats.availabilityFor(route.seats, key);
        const freeId = ['1A', '1B', '1C', '1D', '2A'].find(
          (id) => !fresh.bookedSet.has(id),
        )!;
        seats.bookSeats(key, [freeId]);
        expect(homeCount(seats, network, route, today)).toBe(before! - 1);
        seats.freeSeats(key, [freeId]);
      }
      expect(homeCount(seats, network, route, today)).toBe(before);
    }
  });
});
