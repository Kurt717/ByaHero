import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alarmOutline,
  notificationsOffOutline,
  chevronForwardOutline,
  closeOutline,
  ticketOutline,
  checkmarkCircleOutline,
  calendarOutline,
  timeOutline,
} from 'ionicons/icons';
import { TicketService } from '../../pages/bookings/ticket.service';
import {
  TripReminderService,
  type DueReminder,
} from '../../services/trip-reminder.service';

addIcons({
  'alarm-outline': alarmOutline,
  'notifications-off-outline': notificationsOffOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'close-outline': closeOutline,
  'ticket-outline': ticketOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'calendar-outline': calendarOutline,
  'time-outline': timeOutline,
});

/** Shared Smart Trip Reminder card: a small boarding-notice callout for
 *  the due reminder stage (or a quiet countdown when nothing is due).
 *  Used on Home (nearest trip) and on Ticket / Trip Preparation (one
 *  booking). The host page gates with the same view-model, so an idle
 *  card takes zero space. */
@Component({
  selector: 'app-trip-reminder-card',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './trip-reminder-card.component.html',
  styleUrls: ['./trip-reminder-card.component.scss'],
})
export class TripReminderCardComponent {
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private reminders = inject(TripReminderService);
  private toastController = inject(ToastController);

  /** Null → nearest visible upcoming trip (Home). Set → that booking. */
  @Input() bookingRef: string | null = null;
  /** Slimmer chrome for embedding inside Ticket / Trip Preparation. */
  @Input() compact = false;

  constructor() {
    addIcons({
      alarmOutline,
      notificationsOffOutline,
      chevronForwardOutline,
      closeOutline,
      ticketOutline,
      checkmarkCircleOutline,
      calendarOutline,
      timeOutline,
    });
  }

  get view() {
    return this.reminders.resolve(this.bookingRef);
  }

  get due(): DueReminder | null {
    const view = this.view;
    return view?.kind === 'due' ? view.due : null;
  }

  copy() {
    const due = this.due;
    if (!due) return null;
    return this.reminders.stageCopy(due.stage, due.booking);
  }

  countdown(): string {
    const view = this.view;
    const target =
      view?.kind === 'due'
        ? view.due.departsAt
        : view?.kind === 'next'
          ? view.departsAt
          : null;
    return target ? this.reminders.countdown(target) : '';
  }

  openTicket(ref?: string) {
    const view = this.view;
    const bookingRef =
      ref ??
      (view?.kind === 'due'
        ? view.due.booking.bookingRef
        : view?.kind === 'next'
          ? view.booking.bookingRef
          : undefined);
    const found = bookingRef ? this.ticketService.findByRef(bookingRef) : null;
    if (!found) return;
    this.ticketService.open(found);
    this.router.navigateByUrl(`/e-ticket/${found.bookingRef}`);
  }

  openPrep() {
    const view = this.view;
    const bookingRef =
      view?.kind === 'due'
        ? view.due.booking.bookingRef
        : view?.kind === 'next'
          ? view.booking.bookingRef
          : undefined;
    const found = bookingRef ? this.ticketService.findByRef(bookingRef) : null;
    if (!found) return;
    this.ticketService.open(found);
    this.router.navigateByUrl(`/trip-preparation/${found.bookingRef}`);
  }

  primaryAction() {
    if (this.copy()?.cta === 'ticket') this.openTicket();
    else this.openPrep();
  }

  async dismiss(event: Event) {
    event.stopPropagation();
    const due = this.due;
    if (!due) return;
    this.reminders.dismiss(due.booking.bookingRef, due.stage);
    await this.showToast('Reminder dismissed.');
  }

  async toggle(event: Event) {
    event.stopPropagation();
    const view = this.view;
    const ref =
      this.bookingRef ??
      (view?.kind === 'due'
        ? view.due.booking.bookingRef
        : view?.kind === 'next'
          ? view.booking.bookingRef
          : view?.kind === 'muted'
            ? view.bookingRef
            : undefined);
    if (!ref) return;
    const next = !this.reminders.isEnabled(ref);
    this.reminders.setEnabled(ref, next);
    await this.showToast(next ? 'Trip reminders on.' : 'Trip reminders off for this trip.');
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1700,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
