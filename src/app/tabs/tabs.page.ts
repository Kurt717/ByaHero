import { Component } from '@angular/core';
<<<<<<< HEAD

=======
import { CommonModule } from '@angular/common';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
import { IonRouterOutlet, IonIcon } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  home,
  homeOutline,
<<<<<<< HEAD
  ticket,
  ticketOutline,
  search,
  notifications,
=======
  ticketOutline,
  search,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  notificationsOutline,
  personOutline,
  person,
} from 'ionicons/icons';

addIcons({
  home: home,
  'home-outline': homeOutline,
<<<<<<< HEAD
  ticket: ticket,
  'ticket-outline': ticketOutline,
  search: search,
  notifications: notifications,
=======
  'ticket-outline': ticketOutline,
  search: search,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  'notifications-outline': notificationsOutline,
  'person-outline': personOutline,
  person: person,
});

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [
<<<<<<< HEAD
    IonRouterOutlet,
    IonIcon,
    RouterLink,
    RouterLinkActive
],
=======
    CommonModule,
    IonRouterOutlet,
    IonIcon,
    RouterLink,
    RouterLinkActive,
  ],
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage {}
