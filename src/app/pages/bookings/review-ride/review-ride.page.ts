import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  bus,
  calendarOutline,
  timeOutline,
  star,
  starOutline,
  checkmarkCircle,
} from 'ionicons/icons';
import { TicketService, Booking } from '../ticket.service';
import { TripReviewService, TripReview } from '../trip-review.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'time-outline': timeOutline,
  star: star,
  'star-outline': starOutline,
  'checkmark-circle': checkmarkCircle,
});

@Component({
  selector: 'app-review-ride',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './review-ride.page.html',
  styleUrls: ['./review-ride.page.scss'],
})
export class ReviewRidePage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private toastController = inject(ToastController);
  private ticketService = inject(TicketService);
  private reviewService = inject(TripReviewService);

  booking: Booking | null = null;
  existing: TripReview | null = null;
  rating = 0;
  comment = '';
  readonly maxComment = 500;
  readonly stars = [1, 2, 3, 4, 5];

  ngOnInit() {
    const ref = this.route.snapshot.paramMap.get('bookingRef');
    this.booking = ref ? this.ticketService.findByRef(ref) : null;
    if (!this.booking) {
      // No completed trip to review — back to the existing history page.
      this.router.navigateByUrl('/bookings');
      return;
    }
    this.existing = this.reviewService.getFor(this.booking.bookingRef);
  }

  get isCompleted(): boolean {
    return this.booking?.status === 'completed';
  }

  get canSave(): boolean {
    return (
      !!this.booking &&
      this.isCompleted &&
      !this.existing &&
      this.rating >= 1 &&
      this.rating <= 5
    );
  }

  ratingText(): string {
    return (
      {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Great',
        5: 'Excellent — salamat!',
      }[this.rating] ?? 'Tap a star to rate'
    );
  }

  setRating(n: number) {
    if (this.existing) return;
    this.rating = n;
  }

  save() {
    if (!this.booking || !this.canSave) return;
    const saved = this.reviewService.save({
      booking: this.booking,
      rating: this.rating,
      comment: this.comment,
    });
    if (!saved) {
      void this.showToast('Please choose a 1–5 star rating first.');
      return;
    }
    void this.showToast('Thanks for rating your ride!');
    this.router.navigateByUrl('/bookings');
  }

  skip() {
    this.router.navigateByUrl('/bookings');
  }

  openReport() {
    if (!this.booking) return;
    this.ticketService.open(this.booking);
    this.router.navigateByUrl(
      `/report-problem/${this.booking.bookingRef}?from=review`,
    );
  }

  goBack() {
    this.location.back();
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
