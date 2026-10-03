import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  attachOutline,
  briefcaseOutline,
  bus,
  calendarOutline,
  checkmarkCircle,
  chevronForwardOutline,
  closeOutline,
  documentTextOutline,
  helpBuoyOutline,
  informationCircleOutline,
  locationOutline,
  megaphoneOutline,
  personOutline,
  ticketOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';
import { TicketService, type Booking } from '../bookings/ticket.service';
import { RideIdentityService } from '../../services/ride-identity.service';
import {
  ProblemReportService,
  type AttachmentMeta,
  type ProblemReport,
  type ReportCategory,
} from '../../services/problem-report.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'attach-outline': attachOutline,
  'briefcase-outline': briefcaseOutline,
  bus: bus,
  'calendar-outline': calendarOutline,
  'checkmark-circle': checkmarkCircle,
  'chevron-forward-outline': chevronForwardOutline,
  'close-outline': closeOutline,
  'document-text-outline': documentTextOutline,
  'help-buoy-outline': helpBuoyOutline,
  'information-circle-outline': informationCircleOutline,
  'location-outline': locationOutline,
  'megaphone-outline': megaphoneOutline,
  'person-outline': personOutline,
  'ticket-outline': ticketOutline,
  'time-outline': timeOutline,
  'warning-outline': warningOutline,
});

@Component({
  selector: 'app-report-problem',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './report-problem.page.html',
  styleUrls: ['./report-problem.page.scss'],
})
export class ReportProblemPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private toastController = inject(ToastController);
  private ticketService = inject(TicketService);
  private rideIdentity = inject(RideIdentityService);
  private reports = inject(ProblemReportService);

  ride: Booking | null = null;
  categoryId: string | null = null;
  sub: string | null = null;
  answers: Record<string, string> = {};
  description = '';
  attachments: AttachmentMeta[] = [];

  phase: 'form' | 'done' = 'form';
  lastReport: ProblemReport | null = null;
  submitting = false;
  error: string | null = null;
  expandedReportId: string | null = null;
  private fallbackUrl = '/bookings';

  constructor() {
    addIcons({
      arrowBackOutline,
      attachOutline,
      briefcaseOutline,
      bus,
      calendarOutline,
      checkmarkCircle,
      chevronForwardOutline,
      closeOutline,
      documentTextOutline,
      helpBuoyOutline,
      informationCircleOutline,
      locationOutline,
      megaphoneOutline,
      personOutline,
      ticketOutline,
      timeOutline,
      warningOutline,
    });
  }

  ionViewWillEnter() {
    const ref = this.route.snapshot.paramMap.get('ref');
    const from = this.route.snapshot.queryParamMap.get('from');
    this.fallbackUrl =
      from === 'help'
        ? '/help-center'
        : from === 'review' && ref
          ? `/review-ride/${ref}`
          : '/bookings';
    // Fresh entry, not a stale form — unless we just submitted. An
    // in-progress report survives view re-entries (e.g. back from
    // Emergency) as long as the ride reference did not change.
    if (this.phase === 'done') return;
    if (ref !== (this.ride?.bookingRef ?? null)) {
      this.resetForm();
      if (ref) {
        const found = this.ticketService.findByRef(ref);
        if (found) this.selectRide(found, true);
      }
    }
  }

  // --- Ride data (canonical services only) ---

  get eligibleRides(): Booking[] {
    return this.reports.eligibleRides();
  }

  get reportsForRide(): ProblemReport[] {
    return this.ride ? this.reports.forRide(this.ride.bookingRef) : [];
  }

  get history(): ProblemReport[] {
    return this.reports.all();
  }

  get categories(): ReportCategory[] {
    return this.reports.categories;
  }

  get activeCategory(): ReportCategory | undefined {
    return this.categoryId ? this.reports.categoryFor(this.categoryId) : undefined;
  }

  get maxDescription(): number {
    return this.reports.maxDescription;
  }

  get isSafety(): boolean {
    return this.categoryId === 'safety';
  }

  /** Compact assigned-ride line from the shared identity service. */
  busLine(b: Booking): string {
    const id = this.rideIdentity.identityForBooking(b);
    if (!id.assigned) return b.operator;
    return `BUS ${id.busNo} · ${id.plate}`;
  }

  statusLabel(status: string): string {
    return (
      { confirmed: 'Confirmed', boarding: 'Boarding', completed: 'Completed', cancelled: 'Cancelled' }[
        status
      ] ?? status
    );
  }

  selectRide(b: Booking, silent = false) {
    this.ride = b;
    this.error = null;
    if (!silent) this.clearCategory();
  }

  changeRide() {
    this.ride = null;
    this.clearCategory();
  }

  // --- Category + progressive follow-ups ---

  selectCategory(id: string) {
    if (this.categoryId !== id) {
      this.categoryId = id;
      this.sub = null;
      this.answers = {};
      this.error = null;
      // Sensible default sub so follow-ups appear immediately.
      const cat = this.reports.categoryFor(id);
      if (cat && cat.subs.length === 1) this.selectSub(cat.subs[0]);
    }
  }

  selectSub(sub: string) {
    this.sub = sub;
    this.answers = {};
    this.error = null;
    this.applyPrefills();
  }

  get fields() {
    if (!this.categoryId || !this.sub) return [];
    return this.reports.fieldsFor(this.categoryId, this.sub, this.ride);
  }

  /** Prefill from the ticket — the rider fixes it only if it is wrong. */
  private applyPrefills() {
    if (!this.ride) return;
    if (this.fields.some((f) => f.key === 'seat') && !this.answers['seat']) {
      this.answers['seat'] = this.ride.seat;
    }
    if (this.fields.some((f) => f.key === 'bus') && !this.answers['bus']) {
      this.answers['bus'] = this.rideIdentity.busNoForRef(this.ride.bookingRef);
    }
    if (
      this.fields.some((f) => f.key === 'code') &&
      !this.answers['code'] &&
      this.ride.voucherCode
    ) {
      this.answers['code'] = this.ride.voucherCode;
    }
  }

  private clearCategory() {
    this.categoryId = null;
    this.sub = null;
    this.answers = {};
  }

  // --- Attachments (prototype-safe: metadata only, never uploaded) ---

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      if (this.attachments.length >= this.reports.maxAttachments) {
        void this.showToast(`Up to ${this.reports.maxAttachments} photos per report.`, 'danger');
        return;
      }
      if (!file.type.startsWith('image/')) {
        void this.showToast('Photos only — pick an image file.', 'danger');
        continue;
      }
      if (file.size > this.reports.maxFileBytes) {
        void this.showToast(`${file.name} is too large (5 MB max).`, 'danger');
        continue;
      }
      this.attachments.push({ name: file.name, size: file.size, type: file.type });
    }
  }

  removeAttachment(index: number) {
    this.attachments.splice(index, 1);
  }

  // --- Validation + submit ---

  get canSubmit(): boolean {
    return (
      !!this.ride &&
      !!this.categoryId &&
      !!this.sub &&
      this.description.trim().length >= this.reports.minDescription &&
      this.description.trim().length <= this.reports.maxDescription &&
      !this.submitting
    );
  }

  submit() {
    if (!this.ride || this.submitting) return;
    this.submitting = true;
    this.error = null;
    // Let the pressed state paint before the (synchronous) save.
    setTimeout(() => {
      if (!this.ride) {
        this.submitting = false;
        return;
      }
      const result = this.reports.submit({
        booking: this.ride,
        categoryId: this.categoryId ?? '',
        sub: this.sub ?? '',
        answers: { ...this.answers },
        description: this.description,
        attachments: [...this.attachments],
      });
      this.submitting = false;
      if (!result.ok) {
        this.error = result.error;
        return;
      }
      this.lastReport = result.report;
      this.phase = 'done';
    }, 350);
  }

  // --- Confirmation + history ---

  viewRide() {
    const ref = this.lastReport?.bookingRef ?? this.ride?.bookingRef;
    const found = ref ? this.ticketService.findByRef(ref) : null;
    if (found) {
      this.ticketService.open(found);
      this.router.navigateByUrl(`/e-ticket/${found.bookingRef}`);
    } else {
      this.router.navigateByUrl('/bookings');
    }
  }

  backToBookings() {
    this.router.navigateByUrl('/bookings');
  }

  viewReports() {
    this.phase = 'form';
    this.resetForm();
    this.lastReport = null;
  }

  toggleReport(id: string) {
    this.expandedReportId = this.expandedReportId === id ? null : id;
  }

  reportDate(r: ProblemReport): string {
    return new Date(r.createdAt).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
    });
  }

  categoryIcon(r: ProblemReport): string {
    return this.reports.categoryFor(r.categoryId)?.icon ?? 'document-text-outline';
  }

  openEmergency() {
    const ref = this.ride?.bookingRef;
    this.router.navigate(['/emergency'], ref ? { queryParams: { ref } } : undefined);
  }

  goBack() {
    if (this.phase === 'done') {
      this.backToBookings();
      return;
    }
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        this.location.back();
        return;
      }
    } catch {
      // Fall through to the explicit fallback below.
    }
    this.router.navigateByUrl(this.fallbackUrl);
  }

  private resetForm() {
    this.ride = null;
    this.categoryId = null;
    this.sub = null;
    this.answers = {};
    this.description = '';
    this.attachments = [];
    this.error = null;
    this.expandedReportId = null;
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
