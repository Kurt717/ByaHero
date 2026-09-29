import { Injectable, inject } from '@angular/core';
import { TicketService, type Booking } from '../pages/bookings/ticket.service';
import { LuggageService } from '../pages/bookings/luggage.service';

export type ReportStatus = 'submitted';

export interface AttachmentMeta {
  /** Local file name only — files are never uploaded anywhere. */
  name: string;
  size: number;
  type: string;
}

export interface RideSnapshot {
  bookingRef: string;
  from: string;
  to: string;
  date: string;
  time: string;
  operator: string;
  seat: string;
  fare: string;
  status: string;
}

export interface ProblemReport {
  id: string;
  bookingRef: string;
  ride: RideSnapshot;
  categoryId: string;
  categoryLabel: string;
  sub: string;
  /** Follow-up answers keyed by field key (seat, amount, …). */
  answers: Record<string, string>;
  description: string;
  attachments: AttachmentMeta[];
  createdAt: number;
  status: ReportStatus;
}

export interface ReportInput {
  booking: Booking;
  categoryId: string;
  sub: string;
  answers: Record<string, string>;
  description: string;
  attachments: AttachmentMeta[];
}

export type FieldKind = 'select' | 'text' | 'amount';

export interface ReportField {
  key: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

export interface ReportCategory {
  id: string;
  label: string;
  tagline: string;
  icon: string;
  /** Safety stays visually calm: no playful copy or decoration. */
  serious?: boolean;
  subs: string[];
}

/**
 * Frontend-only prototype store for ride problem reports.
 * Persisted under `byahero.reports.v1` as an array, newest first.
 * Reports are local records: they reference bookings by canonical
 * bookingRef but never mutate bookings, tickets, reviews, wallet or
 * vouchers. A deleted ride leaves its snapshot behind so history
 * never crashes.
 */
@Injectable({ providedIn: 'root' })
export class ProblemReportService {
  private readonly storageKey = 'byahero.reports.v1';
  readonly maxDescription = 500;
  readonly minDescription = 10;
  readonly maxAttachments = 3;
  /** 5 MB per file — metadata only is stored, but huge picks are refused. */
  readonly maxFileBytes = 5 * 1024 * 1024;

  private ticketService = inject(TicketService);
  private luggageService = inject(LuggageService);

  readonly categories: ReportCategory[] = [
    {
      id: 'vehicle',
      label: 'Vehicle',
      tagline: 'Something off with the bus.',
      icon: 'bus',
      subs: ['Vehicle condition', 'Wrong vehicle', 'Info was incorrect'],
    },
    {
      id: 'driver',
      label: 'Driver & staff',
      tagline: 'An issue with the crew.',
      icon: 'person-outline',
      subs: ['Conduct concern', 'Reckless driving', 'Info was incorrect'],
    },
    {
      id: 'booking',
      label: 'Booking & fare',
      tagline: 'Ticket, payment, or voucher.',
      icon: 'ticket-outline',
      subs: ['Booking issue', 'Payment & fare', 'Voucher issue'],
    },
    {
      id: 'seat-luggage',
      label: 'Seat & luggage',
      tagline: 'Something happened to your seat or bag.',
      icon: 'briefcase-outline',
      subs: ['Seat issue', 'Luggage missing', 'Luggage damaged', 'Luggage delayed'],
    },
    {
      id: 'trip',
      label: 'Delays & route',
      tagline: 'Late, rerouted, or pickup trouble.',
      icon: 'time-outline',
      subs: ['Delay', 'Route issue', 'Pickup / drop-off'],
    },
    {
      id: 'safety',
      label: 'Safety',
      tagline: 'Tell us plainly what happened.',
      icon: 'warning-outline',
      serious: true,
      subs: ['Unsafe driving', 'Harassment', 'Accident', 'Threat', 'Other safety issue'],
    },
    {
      id: 'other',
      label: 'Something else',
      tagline: 'None of the above fits.',
      icon: 'help-buoy-outline',
      subs: ['General concern'],
    },
  ];

  categoryFor(id: string): ReportCategory | undefined {
    return this.categories.find((c) => c.id === id);
  }

  /** Rides eligible for reporting: completed first, then active
   *  (boarding/confirmed), then cancelled. Uses live booking data —
   *  never fabricated. */
  eligibleRides(): Booking[] {
    const rank = (b: Booking) =>
      b.status === 'completed'
        ? 0
        : b.status === 'boarding'
          ? 1
          : b.status === 'confirmed'
            ? 2
            : 3;
    return [...this.ticketService.bookings].sort(
      (a, b) => rank(a) - rank(b),
    );
  }

  /** Follow-up fields for a category + subcategory. Only relevant
   *  fields are returned — progressive disclosure, not a wall of inputs. */
  fieldsFor(categoryId: string, sub: string, booking: Booking | null): ReportField[] {
    switch (categoryId) {
      case 'seat-luggage':
        if (sub === 'Seat issue') {
          return [
            {
              key: 'seat',
              label: 'Seat number',
              kind: 'text',
              placeholder: booking?.seat ?? 'e.g. Seat 14A',
              hint: 'Prefilled from your ticket — fix it if it is wrong.',
            },
            {
              key: 'what',
              label: 'What was wrong?',
              kind: 'select',
              options: ['Taken by someone else', 'Broken or damaged', 'Dirty', 'Wrong seat assigned', 'Other'],
              required: true,
            },
          ];
        }
        return [
          {
            key: 'item',
            label: 'Which luggage item?',
            kind: 'select',
            options: this.luggageOptions(booking),
            required: true,
          },
          {
            key: 'state',
            label: 'What happened to it?',
            kind: 'select',
            options:
              sub === 'Luggage missing'
                ? ['Missing', 'Possibly left on the bus', 'Other']
                : sub === 'Luggage damaged'
                  ? ['Damaged', 'Opened or tampered', 'Other']
                  : ['Delayed', 'Delivered to wrong stop', 'Other'],
            required: true,
          },
        ];
      case 'booking':
        if (sub === 'Payment & fare') {
          return [
            {
              key: 'what',
              label: 'What was incorrect?',
              kind: 'select',
              options: ['Overcharged', 'Double charge', 'Wrong fare type', 'Missing discount', 'Refund issue', 'Other'],
              required: true,
            },
            {
              key: 'amount',
              label: 'Amount involved (optional)',
              kind: 'amount',
              placeholder: '₱ 0',
              hint: booking ? `Ticket fare was ${booking.fare}.` : undefined,
            },
          ];
        }
        if (sub === 'Voucher issue') {
          return [
            {
              key: 'code',
              label: 'Voucher code',
              kind: 'text',
              placeholder: 'e.g. BAGUIO20',
              hint: booking?.voucherCode ? `This trip used ${booking.voucherCode}.` : undefined,
            },
          ];
        }
        return [
          {
            key: 'what',
            label: 'What went wrong?',
            kind: 'select',
            options: ['Could not board', 'Wrong details on ticket', 'Duplicate booking', 'Cancellation trouble', 'Other'],
            required: true,
          },
        ];
      case 'trip':
        return [
          ...(sub === 'Delay'
            ? [
                {
                  key: 'delay',
                  label: 'How long was the delay? (optional)',
                  kind: 'text' as const,
                  placeholder: 'e.g. About 40 minutes',
                },
              ]
            : []),
          {
            key: 'where',
            label: 'Where did it happen? (optional)',
            kind: 'text',
            placeholder: 'Terminal, stop, or road section',
          },
        ];
      case 'vehicle':
        return [
          {
            key: 'bus',
            label: 'Bus number',
            kind: 'text',
            placeholder: 'e.g. 402',
            hint: 'Prefilled when known — fix it if it is wrong.',
          },
          {
            key: 'what',
            label: 'What was the problem?',
            kind: 'select',
            options: ['Cleanliness', 'Aircon', 'Broken seats or fixtures', 'Wrong bus at the gate', 'Other'],
            required: true,
          },
        ];
      case 'driver':
        return [
          {
            key: 'what',
            label: 'What happened?',
            kind: 'select',
            options: ['Rude behavior', 'Reckless driving', 'Wrong information given', 'Refused boarding', 'Other'],
            required: true,
          },
        ];
      case 'safety':
        return [
          {
            key: 'where',
            label: 'Where did it happen? (optional)',
            kind: 'text',
            placeholder: 'Terminal, stop, or road section',
          },
        ];
      default:
        return [];
    }
  }

  all(): ProblemReport[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ProblemReport[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  forRide(bookingRef: string): ProblemReport[] {
    return this.all().filter((r) => r.bookingRef === bookingRef);
  }

  get(id: string): ProblemReport | null {
    return this.all().find((r) => r.id === id) ?? null;
  }

  /** Validates + saves a report. Returns the saved report, or an error
   *  string when required information is missing. */
  submit(input: ReportInput): { ok: true; report: ProblemReport } | { ok: false; error: string } {
    const category = this.categoryFor(input.categoryId);
    if (!category) return { ok: false, error: 'Choose a problem category.' };
    if (!input.sub || !category.subs.includes(input.sub)) {
      return { ok: false, error: 'Choose what best matches the issue.' };
    }
    const description = (input.description ?? '').trim();
    if (description.length < this.minDescription) {
      return { ok: false, error: `Tell us what happened in at least ${this.minDescription} characters.` };
    }
    if (description.length > this.maxDescription) {
      return { ok: false, error: `Keep the description under ${this.maxDescription} characters.` };
    }
    const fields = this.fieldsFor(input.categoryId, input.sub, input.booking);
    const answers: Record<string, string> = {};
    for (const f of fields) {
      const value = (input.answers[f.key] ?? '').trim();
      if (f.required && !value) {
        return { ok: false, error: `“${f.label}” needs an answer.` };
      }
      if (f.kind === 'amount' && value && !this.validAmount(value)) {
        return { ok: false, error: 'The amount should be a plain number, e.g. 250.' };
      }
      if (value) answers[f.key] = value.slice(0, 120);
    }
    const report: ProblemReport = {
      id: this.newId(),
      bookingRef: input.booking.bookingRef,
      ride: {
        bookingRef: input.booking.bookingRef,
        from: input.booking.from,
        to: input.booking.to,
        date: input.booking.date,
        time: input.booking.time,
        operator: input.booking.operator,
        seat: input.booking.seat,
        fare: input.booking.fare,
        status: input.booking.status,
      },
      categoryId: category.id,
      categoryLabel: category.label,
      sub: input.sub,
      answers,
      description,
      attachments: input.attachments.slice(0, this.maxAttachments).map((a) => ({
        name: a.name.slice(0, 80),
        size: Math.max(0, Math.floor(a.size)),
        type: a.type.slice(0, 60),
      })),
      createdAt: Date.now(),
      status: 'submitted',
    };
    const all = this.all();
    all.unshift(report);
    this.writeAll(all);
    return { ok: true, report };
  }

  private luggageOptions(booking: Booking | null): string[] {
    const options: string[] = [];
    if (booking) {
      const counts = this.luggageService.read(booking.bookingRef);
      if (counts.carryOn) options.push(`Carry-on (×${counts.carryOn})`);
      if (counts.checked) options.push(`Stored luggage (×${counts.checked})`);
      if (counts.other) options.push(`Other items (×${counts.other})`);
    }
    options.push('No luggage recorded — I will describe it below');
    return options;
  }

  private validAmount(value: string): boolean {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    return value.trim().length > 0 && Number.isFinite(n) && n >= 0 && n <= 1000000;
  }

  private newId(): string {
    const stamp = Date.now().toString(36).toUpperCase().slice(-4);
    const rand = Math.floor(Math.random() * 1296)
      .toString(36)
      .toUpperCase()
      .padStart(2, '0');
    return `RPT-${stamp}${rand}`;
  }

  private writeAll(all: ProblemReport[]) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      // Memory-only if storage is unavailable.
    }
  }
}
