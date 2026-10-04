import { TestBed } from '@angular/core/testing';
import { SeatService } from './seat.service';
import { BookingService } from '../pages/booking/booking.service';
import { TicketService } from '../pages/bookings/ticket.service';

const SEATS_V1 = 'byahero.seats.v1';
const SEATS_V2 = 'byahero.seats.v2';
const SEATS_MIGRATED = 'byahero.seats.v2.migrated';
const BOOKINGS_V1 = 'byahero.bookings.v1';

function full40(): string[] {
  const ids: string[] = [];
  for (let r = 1; r <= 10; r++) {
    for (const c of ['A', 'B', 'C', 'D']) ids.push(`${r}${c}`);
  }
  return ids;
}

describe('SeatService (segment inventory)', () => {
  let svc: SeatService;

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
    svc = TestBed.inject(SeatService);
  });

  /** A seat with no demo overlap on this departure (deterministic seeds). */
  function cleanSeat(depKey: string, ids: string[], board: number, alight: number): string {
    const booked = svc.availabilityForSegment(depKey, ids, board, alight, 11).bookedSet;
    const found = ids.find((id) => !booked.has(id));
    expect(found).toBeTruthy();
    return found!;
  }

  const DEP = 'T-CAG-S1|Tue Oct 06 2026';

  it('(a) shares a seat across consecutive segments on one trip', () => {
    const ids = full40();
    const seat = cleanSeat(DEP, ids, 1, 11);
    // Ilagan(1) → Santiago(3).
    svc.bookSegment(DEP, [seat], 1, 3, 'BYH-A');
    expect(svc.isSeatFree(DEP, seat, 1, 3, 11, ids)).toBe(false);
    // Santiago(3) → Manila PITX(11): free, then booked too. Both succeed.
    expect(svc.isSeatFree(DEP, seat, 3, 11, 11, ids)).toBe(true);
    svc.bookSegment(DEP, [seat], 3, 11, 'BYH-B');
    const avail = svc.availabilityForSegment(DEP, ids, 1, 11, 11);
    expect(avail.bookedSet.has(seat)).toBe(true);
    // Half-open: alighting at 3 frees the seat for boarding at 3.
    const store = JSON.parse(localStorage.getItem(SEATS_V2) as string);
    const refs = (store[DEP][seat] as { bookingRef: string }[]).map((s) => s.bookingRef);
    expect([...refs].sort()).toEqual(['BYH-A', 'BYH-B']);
  });

  it('(b) rejects a segment inside a full-route booking', () => {
    const ids = full40();
    const seat = cleanSeat(DEP, ids, 0, 11);
    svc.bookSegment(DEP, [seat], 0, 11, 'BYH-C');
    expect(svc.isSeatFree(DEP, seat, 1, 3, 11, ids)).toBe(false);
    expect(
      svc.availabilityForSegment(DEP, ids, 1, 3, 11).bookedSet.has(seat),
    ).toBe(true);
  });

  it('(c) holds the same rules in reverse (northbound trip)', () => {
    const dep = 'T-CAG-N1|Tue Oct 06 2026';
    const ids = full40();
    const seat = cleanSeat(dep, ids, 0, 11);
    // Rider boards at 8 (San Jose), alights at 3 (Santiago): stored [3, 8).
    svc.bookSegment(dep, [seat], 3, 8, 'BYH-D');
    expect(svc.isSeatFree(dep, seat, 5, 7, 11, ids)).toBe(false);
    expect(svc.isSeatFree(dep, seat, 0, 2, 11, ids)).toBe(true);
    // Adjacent segment shares the seat.
    svc.bookSegment(dep, [seat], 8, 11, 'BYH-E');
    expect(svc.isSeatFree(dep, seat, 8, 11, 11, ids)).toBe(false);
  });

  it('(g) cancelling frees only that booking’s interval', () => {
    const ids = full40();
    const seat = cleanSeat(DEP, ids, 0, 11);
    svc.bookSegment(DEP, [seat], 1, 3, 'BYH-X');
    svc.bookSegment(DEP, [seat], 5, 8, 'BYH-Y');
    svc.freeSeatsByRef(DEP, 'BYH-X');
    expect(svc.isSeatFree(DEP, seat, 1, 3, 11, ids)).toBe(true);
    expect(svc.isSeatFree(DEP, seat, 5, 8, 11, ids)).toBe(false);
  });

  it('(h) migrates v1 whole-trip records to full-route intervals; old tickets still open', () => {
    const date = 'Tue Oct 06 2026';
    const key = `Victory Liner|Ilagan|Santiago City|${date}`;
    localStorage.setItem(SEATS_V1, JSON.stringify({ [key]: ['5A'] }));
    localStorage.setItem(
      BOOKINGS_V1,
      JSON.stringify([
        {
          operator: 'Victory Liner',
          from: 'Ilagan',
          to: 'Santiago City',
          date,
          time: '6:00 AM',
          seat: 'Seat 5A',
          fare: '₱ 188',
          status: 'confirmed',
          bookingRef: 'BYH-1',
          seatIds: ['5A'],
        },
      ]),
    );
    const depKey = `T-VL-CAG-DLX-S1|${date}`;
    const booked = svc.availabilityForSegment(depKey, full40(), 6, 8, 9).bookedSet;
    expect(booked.has('5A')).toBe(true);

    const tickets = TestBed.inject(TicketService);
    const old = tickets.findByRef('BYH-1');
    expect(old).not.toBeNull();
    expect(old!.from).toBe('Ilagan');
    // v1 record renders as a full-route trip (no segment fields).
    expect(tickets.segmentFor(old!)).toBeNull();
  });

  it('(i) layout-aware geometry: window/aisle + thirds zones', () => {
    expect(svc.seatPosition('1A')).toBe('window');
    expect(svc.seatPosition('1D')).toBe('window');
    expect(svc.seatPosition('1B')).toBe('aisle');
    expect(svc.seatPosition('1C')).toBe('aisle');
    expect(svc.seatZone('1A')).toBe('front');
    expect(svc.seatZone('5A')).toBe('middle');
    expect(svc.seatZone('9A')).toBe('back');
    // UV van layout (5 rows × ABC, no aisle): outers window, inner middle.
    const van = { rows: 5, columns: ['A', 'B', 'C'] };
    expect(svc.seatPosition('3A', van)).toBe('window');
    expect(svc.seatPosition('3B', van)).toBe('middle');
    expect(svc.seatPosition('3C', van)).toBe('window');
    expect(svc.seatZone('2A', van)).toBe('front');
    expect(svc.seatZone('5A', van)).toBe('back');
  });

  it('(e/f) booking validation blocks bad stops; discounts apply to the segment fare', () => {
    const booking = TestBed.inject(BookingService);
    booking.startBooking({
      operator: 'Victory Liner',
      from: 'Ilagan',
      to: 'Santiago City',
      eta: '',
      fare: '₱ 0',
      seatsLeft: '',
      status: 'on-time',
    });
    expect(booking.hasNetworkSegment).toBe(true);
    expect(booking.tripId).toBe('T-VL-CAG-DLX-S1');
    expect([booking.boardSeq, booking.alightSeq]).toEqual([8, 6]);

    // (e) alighting before boarding on a northbound trip is blocked.
    const backwards = booking.setBoardAlight('STG', 'ILA');
    expect(backwards).toContain('northbound');
    // (e) same stop is blocked.
    expect(booking.setBoardAlight('ILA', 'ILA')).toContain('different stop');
    // (e) a stop the bus passed is blocked.
    booking.busSeq = 2;
    expect(booking.setBoardAlight('ILA', 'STG')).toContain('already passed');
    booking.busSeq = null;

    // (f) 20% student discount applies to the segment fare.
    const segment = booking.seatFare;
    expect(segment).toBeGreaterThan(0);
    booking.setPassengerType('p1', 'student');
    expect(booking.fareForPassenger(booking.passengers[0])).toBe(
      Math.round(segment * 0.8),
    );
    // (f) vouchers honor minSpend and cap.
    booking.voucher = {
      code: 'BIG',
      title: 'Big',
      kind: 'percent',
      value: 50,
      minSpend: 100000,
    };
    expect(booking.voucherDiscount).toBe(0);
    booking.voucher = {
      code: 'HALF',
      title: 'Half',
      kind: 'percent',
      value: 50,
      minSpend: 0,
      cap: 40,
    };
    const subtotal = booking.subtotal;
    expect(booking.voucherDiscount).toBe(Math.min(40, Math.round((subtotal * 50) / 100)));
  });
});
