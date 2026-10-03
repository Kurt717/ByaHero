import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  calendarOutline,
  addOutline,
  busOutline,
  checkmarkCircle,
  timeOutline,
  chevronForwardOutline,
  closeOutline,
  idCardOutline,
  cloudUploadOutline,
  documentTextOutline,
  trashOutline,
  informationCircleOutline,
  locationOutline,
  sunnyOutline,
  cloudyOutline,
  rainyOutline,
  thunderstormOutline,
  flagOutline,
} from 'ionicons/icons';
import {
  BookingService,
  PassengerEntry,
  PassengerType,
  PASSENGER_TYPE_META,
  MAX_ID_UPLOAD_BYTES,
} from '../booking.service';
import {
  LocatedPoint,
  PickupService,
} from '../../../services/pickup.service';
import { TravelConditionsService } from '../../../services/travel-conditions.service';
import { PickupSelectorComponent } from '../../../components/pickup-selector/pickup-selector.component';
import {
  NetworkService,
} from '../../../services/network.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'calendar-outline': calendarOutline,
  'add-outline': addOutline,
  'bus-outline': busOutline,
  'checkmark-circle': checkmarkCircle,
  'time-outline': timeOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'close-outline': closeOutline,
  'id-card-outline': idCardOutline,
  'cloud-upload-outline': cloudUploadOutline,
  'document-text-outline': documentTextOutline,
  'trash-outline': trashOutline,
  'information-circle-outline': informationCircleOutline,
  'location-outline': locationOutline,
  'sunny-outline': sunnyOutline,
  'cloudy-outline': cloudyOutline,
  'rainy-outline': rainyOutline,
  'thunderstorm-outline': thunderstormOutline,
  'flag-outline': flagOutline,
});

interface DayOption {
  iso: string;
  dow: string;
  day: string;
}
interface TypeChip {
  id: PassengerType;
  short: string;
  discount: number;
}

@Component({
  selector: 'app-trip-details',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, PickupSelectorComponent],
  templateUrl: './trip-details.page.html',
  styleUrls: ['./trip-details.page.scss'],
})
export class TripDetailsPage implements OnInit {
  booking = inject(BookingService);
  private router = inject(Router);
  private location = inject(Location);
  private toastController = inject(ToastController);
  private pickupService = inject(PickupService);
  private conditionsService = inject(TravelConditionsService);
  private network = inject(NetworkService);

  days: DayOption[] = [];
  showPickupPicker = false;

  readonly passengerTypes: TypeChip[] = (
    Object.keys(PASSENGER_TYPE_META) as PassengerType[]
  ).map((id) => ({
    id,
    short: PASSENGER_TYPE_META[id].short,
    discount: PASSENGER_TYPE_META[id].discount,
  }));

  constructor() {
    addIcons({
      arrowBackOutline,
      busOutline,
      closeOutline,
      idCardOutline,
      cloudUploadOutline,
      documentTextOutline,
      trashOutline,
      addOutline,
      informationCircleOutline,
      checkmarkCircle,
      chevronForwardOutline,
      locationOutline,
      sunnyOutline,
      cloudyOutline,
      rainyOutline,
      thunderstormOutline,
      flagOutline,
    });
  }

  ngOnInit() {
    if (!this.booking.trip) {
      this.router.navigateByUrl('/home');
      return;
    }
    this.buildDays();
    if (!this.booking.travelDate) {
      this.booking.travelDate = this.days[0].iso;
    }
  }

  buildDays() {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const out: DayOption[] = [];
    // Today + next 6 days: reservations made for today (from a terminal
    // board) must remain visible and selected here. Hailing sessions hide
    // this picker entirely via hailMode instead.
    for (let i = 0; i <= 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({
        iso: d.toDateString(),
        dow: i === 0 ? 'Today' : names[d.getDay()],
        day: String(d.getDate()),
      });
    }
    this.days = out;
  }

  requiresId(type: PassengerType): boolean {
    return PASSENGER_TYPE_META[type].requiresId;
  }  idPlaceholder(type: PassengerType): string {
    return PASSENGER_TYPE_META[type].label;
  }

  /** Session pickup (null until the commuter chooses one). */
  get pickup(): LocatedPoint | null {
    return this.booking.pickup;
  }

  /** Contextual sample conditions for the selected corridor — secondary
   *  to the booking facts, never a substitute for them. */
  get tripConditions() {
    const trip = this.booking.trip;
    if (!trip) return null;
    const sample = this.conditionsService.forTrip(trip.from, trip.to);
    if (sample.kind === 'unknown') return null;
    return {
      icon: sample.icon,
      headline: this.conditionsService.tripSummary(trip.from, trip.to).headline,
    };
  }

  openConditions() {
    this.router.navigateByUrl('/travel-conditions?from=trip');
  }

  private pickupState() {
    return {
      current: this.pickupService.getActive().current,
      pickup: this.booking.pickup,
      notified: {},
      updatedAt: Date.now(),
    };
  }

  get pickupDistance(): string | null {
    if (!this.booking.pickup) return null;
    return this.pickupService.formatDistance(
      this.pickupService.distanceM(this.pickupState()),
    );
  }

  get pickupZoneMessage(): string | null {
    if (!this.booking.pickup) return null;
    const distance = this.pickupService.distanceM(this.pickupState());
    return this.pickupService.zoneMessage(
      this.pickupService.zoneFor(distance),
      this.pickupService.formatDistance(distance),
    );
  }

  /** Corridor recap for the chosen trip (read-only — Home owns the choice). */
  get segmentSummary(): {
    km: number;
    boardEta: string;
    alightEta: string;
    fare: string;
  } | null {
    if (!this.booking.hasNetworkSegment) return null;
    const km = this.booking.segmentKm;
    const boardEta = this.network.stopEta(
      this.booking.tripId!,
      Math.min(this.booking.boardSeq!, this.booking.alightSeq!),
      this.booking.travelDate,
    );
    const alightEta = this.network.stopEta(
      this.booking.tripId!,
      Math.max(this.booking.boardSeq!, this.booking.alightSeq!),
      this.booking.travelDate,
    );
    return {
      km,
      boardEta,
      alightEta,
      fare: this.booking.formatCurrency(this.booking.seatFare),
    };
  }

  /** Back to Home: pickup + destination can only change there. */
  changeOnHome() {
    this.router.navigateByUrl('/home');
  }

  togglePickupPicker() {
    this.showPickupPicker = !this.showPickupPicker;
  }

  onPickupSelected(point: LocatedPoint) {
    this.booking.pickup = point;
    // Keep the staging area in sync so payment snapshots the same point.
    this.pickupService.setPickup(point);
  }

  triggerIdUpload(input: HTMLInputElement) {
    input.click();
  }

  /** Front-ID upload: JPG/PNG preview rendered, PDF stored by name, 5MB cap. */
  onIdFile(p: PassengerEntry, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    const okType =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      ['jpg', 'jpeg', 'png', 'pdf'].includes(ext);
    if (!okType) {
      void this.idToast('Only JPG, PNG or PDF files are accepted.');
      return;
    }
    if (file.size > MAX_ID_UPLOAD_BYTES) {
      void this.idToast('File too large — max 5MB.');
      return;
    }
    if (file.type === 'application/pdf' || ext === 'pdf') {
      this.booking.setPassengerIdDoc(p.id, { idImage: file.name, idImageKind: 'pdf' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.booking.setPassengerIdDoc(p.id, {
        idImage: String(reader.result ?? ''),
        idImageKind: 'image',
      });
    };
    reader.readAsDataURL(file);
  }

  private async idToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
  }

  goBack() {
    // Preserve the entry point: Schedule → Trip → Back → Schedule,
    // Terminal → Trip → Back → Terminal, Home (hail) → Back → Home.
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl('/home');
  }

  continue() {
    // Reservations pass through the seat-preference step; hailing goes
    // straight to the seat map exactly as before (no date, no preference).
    if (this.booking.hailMode) {
      this.router.navigateByUrl('/booking/seats');
      return;
    }
    this.router.navigateByUrl('/booking/seat-preference');
  }

  changePreference() {
    this.router.navigateByUrl('/booking/seat-preference');
  }
}
