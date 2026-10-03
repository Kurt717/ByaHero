import { Injectable } from '@angular/core';
import type { Booking } from './ticket.service';

export interface TripReview {
  /** Booking this review belongs to — one review per booking ref. */
  bookingRef: string;
  from: string;
  to: string;
  operator: string;
  tripDate: string;
  /** Overall ride rating, integer 1–5. */
  rating: number;
  /** Optional free-text comment (may be empty). */
  comment: string;
  /** Epoch ms when the review was saved. */
  createdAt: number;
}

export interface TripReviewInput {
  booking: Booking;
  rating: number;
  comment?: string;
}

/**
 * Frontend-only prototype store for post-ride reviews.
 * Persisted under `byahero.trip-reviews.v1` as bookingRef → TripReview.
 * Reviews never leave the device: they are NOT sent to the operator,
 * the driver, or any server, and other users cannot see them.
 * The Booking object itself is never modified — reviews live beside it.
 */
@Injectable({ providedIn: 'root' })
export class TripReviewService {
  private readonly storageKey = 'byahero.trip-reviews.v1';
  private readonly maxCommentLength = 500;

  /** Saved review for a booking, or null when not yet reviewed. */
  getFor(bookingRef: string): TripReview | null {
    if (!bookingRef) return null;
    return this.readAll()[bookingRef.trim()] ?? null;
  }

  has(bookingRef: string): boolean {
    return this.getFor(bookingRef) !== null;
  }

  /**
   * Saves the (single) review for a booking. Returns the saved review,
   * or null when the input is invalid (bad ref, non 1–5 rating) or a
   * review already exists — duplicates are never overwritten here.
   */
  save(input: TripReviewInput): TripReview | null {
    const ref = input.booking?.bookingRef?.trim();
    const rating = Math.floor(Number(input.rating));
    if (!ref) return null;
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;

    const all = this.readAll();
    if (all[ref]) return null; // one review per trip — show the saved one

    const comment = (input.comment ?? '').trim().slice(0, this.maxCommentLength);
    const review: TripReview = {
      bookingRef: ref,
      from: input.booking.from,
      to: input.booking.to,
      operator: input.booking.operator,
      tripDate: `${input.booking.date} · ${input.booking.time}`,
      rating,
      comment,
      createdAt: Date.now(),
    };
    all[ref] = review;
    this.writeAll(all);
    return review;
  }

  private readAll(): Record<string, TripReview> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, TripReview>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeAll(all: Record<string, TripReview>) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      // Memory-only if storage is unavailable.
    }
  }
}
