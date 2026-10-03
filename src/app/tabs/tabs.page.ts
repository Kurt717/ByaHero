import { Component } from '@angular/core';

import { IonRouterOutlet, IonIcon } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  home,
  homeOutline,
  ticket,
  ticketOutline,
  search,
  notifications,
  notificationsOutline,
  personOutline,
  person,
} from 'ionicons/icons';

addIcons({
  home: home,
  'home-outline': homeOutline,
  ticket: ticket,
  'ticket-outline': ticketOutline,
  search: search,
  notifications: notifications,
  'notifications-outline': notificationsOutline,
  'person-outline': personOutline,
  person: person,
});

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [
    IonRouterOutlet,
    IonIcon,
    RouterLink,
    RouterLinkActive
],
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage {}
