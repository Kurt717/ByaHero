import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonRouterOutlet, IonIcon } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';
import { home, homeOutline, ticketOutline, search, notificationsOutline, personOutline, person } from 'ionicons/icons';

addIcons({
  'home': home, 'home-outline': homeOutline, 'ticket-outline': ticketOutline,
  'search': search, 'notifications-outline': notificationsOutline,
  'person-outline': personOutline, 'person': person
});

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, IonRouterOutlet, IonIcon, RouterLink, RouterLinkActive],
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss']
})
export class TabsPage {}