import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonAvatar } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router'; // 1. Import RouterLink
import { addIcons } from 'ionicons';
import { 
  navigateOutline, ticketOutline, notificationsOutline, timeOutline, mapOutline, 
  arrowForwardOutline, busOutline, peopleOutline, home, personOutline, radioButtonOn, 
  swapVerticalOutline, listOutline, alertCircle, checkmarkCircle, chevronForwardOutline, 
  carSportOutline, compassOutline, bus, search, locateOutline, starSharp 
} from 'ionicons/icons';

addIcons({
  'navigate-outline': navigateOutline, 'ticket-outline': ticketOutline,
  'notifications-outline': notificationsOutline, 'time-outline': timeOutline,
  'map-outline': mapOutline, 'arrow-forward-outline': arrowForwardOutline,
  'bus-outline': busOutline, 'people-outline': peopleOutline,
  'home': home, 'person-outline': personOutline,
  'radio-button-on': radioButtonOn, 'swap-vertical-outline': swapVerticalOutline,
  'list-outline': listOutline, 'alert-circle': alertCircle,
  'checkmark-circle': checkmarkCircle, 'chevron-forward-outline': chevronForwardOutline,
  'car-sport-outline': carSportOutline, 'compass-outline': compassOutline, 'bus': bus, 
  'search': search, 'locate-outline': locateOutline, 'star-sharp': starSharp
});

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonAvatar, RouterLink], // 2. Add RouterLink here
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage {
  selectedView: 'list' | 'map' = 'list';
  origin = 'Baguio City, Benguet';
  destination = 'Tuguegarao City, Cagayan';
  userName = 'Juan';

  liveTrip = { 
    operator: 'Victory Liner', 
    busNo: '402', 
    eta: '8 min', 
    route: 'Baguio → Tuguegarao' 
  };

  nearbyRoutes = [
    { operator: 'Florida Bus Line', from: 'Tuguegarao', to: 'Manila (PITX)', eta: '4 min away', fare: '₱ 620', seats: '18 seats left', status: 'on-time' },
    { operator: 'Victory Liner', from: 'Santiago City', to: 'Cubao, QC', eta: '11 min away', fare: '₱ 480', seats: '6 seats left', status: 'delayed' },
    { operator: 'GV Florida UV Express', from: 'Cauayan', to: 'Ilagan', eta: '2 min away', fare: '₱ 95', seats: '3 seats left', status: 'on-time' },
    { operator: 'Baliwag Transit', from: 'Solano', to: 'Cabanatuan', eta: '19 min away', fare: '₱ 210', seats: '22 seats left', status: 'on-time' },
  ];

  viewLiveTrip() {
    console.log('Viewing live trip:', this.liveTrip);
  }
}