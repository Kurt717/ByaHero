import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SeatSelectionPage } from './seat-selection.page';
import { BookingService } from '../booking.service';

/** Tapping a seat must highlight it immediately (not only after leaving
 *  the page and coming back). */
describe('SeatSelectionPage tap-to-select', () => {
  let fixture: ComponentFixture<SeatSelectionPage>;
  let page: SeatSelectionPage;

  beforeEach(async () => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SeatSelectionPage],
      providers: [provideRouter([])],
    });
    TestBed.inject(BookingService).startBooking({
      operator: 'Victory Liner',
      from: 'Tuguegarao',
      to: 'Manila (PITX)',
      eta: '',
      fare: '₱ 650',
      seatsLeft: '',
      status: 'on-time',
    });
    fixture = TestBed.createComponent(SeatSelectionPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function enabledSeatButtons(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button.seat:not([disabled])'),
    );
  }

  it('renders every seat of the vehicle layout', () => {
    const all = fixture.nativeElement.querySelectorAll('button.seat');
    // Victory reverse resolves to the deluxe 2+1 (11 rows x 3 = 33).
    expect(all.length).toBe(page.seats.length);
    expect(all.length).toBeGreaterThan(0);
  });

  it('highlights a tapped seat immediately', async () => {
    const before = enabledSeatButtons();
    expect(before.length).toBeGreaterThan(0);
    before[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.booking.selectedSeats.length).toBe(1);
    const after = enabledSeatButtons();
    expect(after[0].classList.contains('selected')).toBe(true);
  });

  it('tapping a selected seat deselects it', async () => {
    enabledSeatButtons()[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.booking.selectedSeats.length).toBe(1);
    enabledSeatButtons()[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.booking.selectedSeats.length).toBe(0);
  });
});
