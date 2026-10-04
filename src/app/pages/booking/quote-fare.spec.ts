import { TestBed } from '@angular/core/testing';
import { BookingService, parseFareText } from './booking.service';

/** The yellow sticker price must survive to checkout: a locked quote is
 *  honored on the quoted stretch, ignored on fallback, and dropped when
 *  the stops change (recomputed for the new segment instead). */
describe('Quoted card fare lock', () => {
  let booking: BookingService;

  const TRIP = {
    operator: 'Victory Liner',
    from: 'Tuguegarao',
    to: 'Manila (PITX)',
    eta: '',
    fare: '₱ 650',
    seatsLeft: '',
    status: 'on-time',
  };

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    booking = TestBed.inject(BookingService);
  });

  it('honors the tapped price on the quoted stretch (sticker → checkout)', () => {
    booking.startBooking(TRIP, {
      boardStopId: 'ILA',
      alightStopId: 'STG',
      quotedSeatFare: 190,
    });
    expect([booking.boardStopId, booking.alightStopId]).toEqual([
      'ILA',
      'STG',
    ]);
    // Computed Ilagan→Santiago deluxe is 195 — the 190 sticker wins.
    expect(booking.seatFare).toBe(190);
    expect(booking.subtotal).toBe(190);
  });

  it('ignores the quote when the pair is rejected (full-route fallback)', () => {
    // CAU→TUG runs against this southbound trip: fallback to TUG→MNL.
    booking.startBooking(TRIP, {
      boardStopId: 'CAU',
      alightStopId: 'TUG',
      quotedSeatFare: 190,
    });
    expect([booking.boardStopId, booking.alightStopId]).toEqual([
      'TUG',
      'MNL',
    ]);
    expect(booking.seatFare).not.toBe(190);
    expect(booking.seatFare).toBeGreaterThan(0);
  });

  it('drops the lock when stops change (recomputes for the new segment)', () => {
    booking.startBooking(TRIP, {
      boardStopId: 'ILA',
      alightStopId: 'STG',
      quotedSeatFare: 190,
    });
    expect(booking.seatFare).toBe(190);
    const err = booking.setBoardAlight('CAU', 'SJC');
    expect(err).toBeNull();
    // Cauayan→San Jose deluxe (200 km) reprices — never the stale 190.
    expect(booking.seatFare).toBe(520);
  });

  it('parses sticker text ("₱ 315" → 315)', () => {
    expect(parseFareText('₱ 315')).toBe(315);
    expect(parseFareText('₱1,200')).toBe(1200);
    expect(parseFareText('')).toBe(0);
  });
});
