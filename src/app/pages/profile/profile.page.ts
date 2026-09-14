import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonAvatar, IonIcon } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { 
  createOutline, callOutline, mailOutline, bookmarkOutline, cardOutline, timeOutline, 
  notificationsOutline, languageOutline, moonOutline, helpCircleOutline, documentTextOutline, 
  chevronForwardOutline, logOutOutline, homeOutline, mapOutline, person, chevronBackOutline,
  cameraOutline, star, busOutline, starOutline, search
} from 'ionicons/icons';

addIcons({
  'create-outline': createOutline, 'call-outline': callOutline, 'mail-outline': mailOutline,
  'bookmark-outline': bookmarkOutline, 'card-outline': cardOutline, 'time-outline': timeOutline,
  'notifications-outline': notificationsOutline, 'language-outline': languageOutline, 'moon-outline': moonOutline,
  'help-circle-outline': helpCircleOutline, 'document-text-outline': documentTextOutline, 'chevron-forward-outline': chevronForwardOutline,
  'log-out-outline': logOutOutline, 'home-outline': homeOutline, 'map-outline': mapOutline, 'person': person,
  'chevron-back-outline': chevronBackOutline, 'camera-outline': cameraOutline, 'star': star,
  'bus-outline': busOutline, 'star-outline': starOutline, 'search': search
});

interface MenuItem {
  icon: string;
  label: string;
  value?: string;
  danger?: boolean;
  action?: () => void;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonContent, IonAvatar, IonIcon, RouterLink],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss']
})
export class ProfilePage {
  constructor(private router: Router, private location: Location) {}

  user = {
    name: 'Keilah Fye',
    tier: 'Gold Member',
    phone: '+63 917 123 4567',
    email: 'keilah@email.com',
    avatar: 'https://ionicframework.com/docs/img/demos/avatar.svg',
  };

  stats = { trips: 48, points: '1,240' };
  
  wallet = { balance: '850.00', last4: '4021' };

  menuGroups: MenuGroup[] = [
    {
      title: 'Account',
      items: [
        { icon: 'bookmark-outline', label: 'Saved Routes', action: () => console.log('Saved Routes') },
        { icon: 'card-outline', label: 'Payment Methods', action: () => console.log('Payment Methods') },
        { icon: 'time-outline', label: 'Ride History', action: () => console.log('Ride History') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications-outline', label: 'Notifications', value: 'On', action: () => console.log('Notifications') },
        { icon: 'language-outline', label: 'Language', value: 'English', action: () => console.log('Language') },
        { icon: 'moon-outline', label: 'Dark Mode', action: () => console.log('Dark Mode') },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', action: () => console.log('Help Center') },
        { icon: 'document-text-outline', label: 'Terms & Privacy', action: () => console.log('Terms') },
      ],
    },
  ];

  goBack() { this.location.back(); }
  editProfile() { console.log('Edit Profile'); }
  changePhoto() { console.log('Change Photo'); }
  viewTrips() { console.log('View Trips'); }
  viewRewards() { console.log('View Rewards'); }
  openWallet() { console.log('Open Wallet'); }
  logout() { this.router.navigateByUrl('/login'); }
}