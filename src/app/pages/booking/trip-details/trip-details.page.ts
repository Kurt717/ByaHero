import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, calendarOutline, addOutline,
  busOutline, flashOutline, sparklesOutline, checkmarkCircle,
  timeOutline, chevronForwardOutline, closeOutline,
  idCardOutline, informationCircleOutline
} from 'ionicons/icons';
import { BookingService, PassengerType, PASSENGER_TYPE_META } from '../booking.service';

addIcons({
  'arrow-back-outline': arrowBackOutline, 'calendar-outline': calendarOutline,
  'add-outline': addOutline, 'bus-outline': busOutline, 'flash-outline': flashOutline,
  'sparkles-outline': sparklesOutline, 'checkmark-circle': checkmarkCircle,
  'time-outline': timeOutline, 'chevron-forward-outline': chevronForwardOutline,
  'close-outline': closeOutline, 'id-card-outline': idCardOutline,
  'information-circle-outline': informationCircleOutline
});

interface DayOption { iso: string; dow: string; day: string; }
interface TypeChip { id: PassengerType; short: string; discount: number; }

@Component({
  selector: 'app-trip-details',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './trip-details.page.html',
  styleUrls: ['./trip-details.page.scss']
})
export class TripDetailsPage implements OnInit {

  days: DayOption[] = [];

  readonly passengerTypes: TypeChip[] = (Object.keys(PASSENGER_TYPE_META) as PassengerType[]).map(id => ({
    id, short: PASSENGER_TYPE_META[id].short, discount: PASSENGER_TYPE_META[id].discount
  }));

  constructor(public booking: BookingService, private router: Router) {
      addIcons({arrowBackOutline,busOutline,closeOutline,idCardOutline,addOutline,informationCircleOutline,checkmarkCircle,chevronForwardOutline});}

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
    for (let i = 1; i <= 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({ iso: d.toDateString(), dow: names[d.getDay()], day: String(d.getDate()) });
    }
    this.days = out;
  }

  formatFcPrice(multiplier: number): string {
    return this.booking.formatCurrency(Math.round(this.booking.baseFare * multiplier));
  }

  requiresId(type: PassengerType): boolean {
    return PASSENGER_TYPE_META[type].requiresId;
  }

  idPlaceholder(type: PassengerType): string {
    return PASSENGER_TYPE_META[type].label;
  }

  selectFareClass(id: 'saver' | 'plus' | 'premium') {
    this.booking.fareClass = id;
  }

  goBack() { this.router.navigateByUrl('/home'); }

  continue() { this.router.navigateByUrl('/booking/seats'); }
}