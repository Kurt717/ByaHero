import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonAvatar, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  createOutline,
  callOutline,
  mailOutline,
  bookmarkOutline,
  cardOutline,
  timeOutline,
  notificationsOutline,
  languageOutline,
  moonOutline,
  helpCircleOutline,
  documentTextOutline,
  chevronForwardOutline,
  logOutOutline,
  chevronBackOutline,
  cameraOutline,
  star,
  busOutline,
  starOutline,
  walletOutline,
  addOutline,
  shareSocialOutline,
  shieldCheckmarkOutline,
  idCardOutline,
  giftOutline,
  peopleOutline,
  flashOutline,
  trendingUpOutline,
  locationOutline,
  personOutline,
} from 'ionicons/icons';

addIcons({
  'create-outline': createOutline,
  'call-outline': callOutline,
  'mail-outline': mailOutline,
  'bookmark-outline': bookmarkOutline,
  'card-outline': cardOutline,
  'time-outline': timeOutline,
  'notifications-outline': notificationsOutline,
  'language-outline': languageOutline,
  'moon-outline': moonOutline,
  'help-circle-outline': helpCircleOutline,
  'document-text-outline': documentTextOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'log-out-outline': logOutOutline,
  'chevron-back-outline': chevronBackOutline,
  'camera-outline': cameraOutline,
  star: star,
  'bus-outline': busOutline,
  'star-outline': starOutline,
  'wallet-outline': walletOutline,
  'add-outline': addOutline,
  'share-social-outline': shareSocialOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'id-card-outline': idCardOutline,
  'gift-outline': giftOutline,
  'people-outline': peopleOutline,
  'flash-outline': flashOutline,
  'trending-up-outline': trendingUpOutline,
  'location-outline': locationOutline,
  'person-outline': personOutline,
});

interface MenuItem {
  icon: string;
  label: string;
  value?: string;
  badge?: string;
  toggle?: boolean;
  on?: boolean;
  danger?: boolean;
  action?: () => void;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

interface QuickAction {
  icon: string;
  label: string;
  tint: 'navy' | 'red' | 'yellow' | 'green';
  action: () => void;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonContent, IonAvatar, IonIcon],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage {
  constructor(
    private router: Router,
    private location: Location,
  ) {
    addIcons({
      chevronBackOutline,
      createOutline,
      cameraOutline,
      personOutline,
      shieldCheckmarkOutline,
      star,
      callOutline,
      mailOutline,
      trendingUpOutline,
      busOutline,
      starOutline,
      flashOutline,
      walletOutline,
      addOutline,
      chevronForwardOutline,
      logOutOutline,
    });
  }

  user = {
    name: 'Nonie',
    tier: 'Gold',
    memberSince: '2024',
    heroId: 'BYH-KF-0482',
    phone: '+63 917 123 4567',
    email: 'keilah@email.com',
    avatar: 'https://ionicframework.com/docs/img/demos/avatar.svg',
    verified: true,
  };

  stats = { trips: 48, points: 1240, saved: 3820 };

  /** Rank progress toward the next tier. */
  rank = { current: 'Gold', next: 'Platinum', points: 1240, target: 2000 };

  wallet = { balance: '850.00', last4: '4021' };

  get rankPercent(): number {
    return Math.min(
      100,
      Math.round((this.rank.points / this.rank.target) * 100),
    );
  }

  get pointsToNext(): number {
    return Math.max(0, this.rank.target - this.rank.points);
  }

  quickActions: QuickAction[] = [
    {
      icon: 'add-outline',
      label: 'Top Up',
      tint: 'navy',
      action: () => console.log('Top up'),
    },
    {
      icon: 'bookmark-outline',
      label: 'Saved',
      tint: 'red',
      action: () => console.log('Saved routes'),
    },
    {
      icon: 'id-card-outline',
      label: 'Fare ID',
      tint: 'yellow',
      action: () => console.log('Discount ID'),
    },
    {
      icon: 'share-social-outline',
      label: 'Share Trip',
      tint: 'green',
      action: () => console.log('Share live trip'),
    },
  ];

  menuGroups: MenuGroup[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'wallet-outline',
          label: 'Byahero Wallet',
          value: '₱ 850.00',
          action: () => console.log('Wallet'),
        },
        {
          icon: 'card-outline',
          label: 'Payment Methods',
          value: '2 saved',
          action: () => console.log('Payment'),
        },
        {
          icon: 'id-card-outline',
          label: 'Discount Fare ID',
          badge: 'Verify',
          action: () => console.log('Fare ID'),
        },
        {
          icon: 'time-outline',
          label: 'Ride History',
          value: '48 trips',
          action: () => console.log('History'),
        },
      ],
    },
    {
      title: 'Safety',
      items: [
        {
          icon: 'people-outline',
          label: 'Trusted Contacts',
          value: '2 added',
          action: () => console.log('Contacts'),
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Auto Share Live Trip',
          toggle: true,
          on: true,
        },
        {
          icon: 'location-outline',
          label: 'Arrival Alerts',
          toggle: true,
          on: true,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          toggle: true,
          on: true,
        },
        {
          icon: 'language-outline',
          label: 'Language',
          value: 'English',
          action: () => console.log('Language'),
        },
        { icon: 'moon-outline', label: 'Dark Mode', toggle: true, on: false },
      ],
    },
    {
      title: 'More',
      items: [
        {
          icon: 'gift-outline',
          label: 'Invite a Kabyahe',
          badge: '₱50',
          action: () => console.log('Referral'),
        },
        {
          icon: 'help-circle-outline',
          label: 'Help Center',
          action: () => console.log('Help'),
        },
        {
          icon: 'document-text-outline',
          label: 'Terms & Privacy',
          action: () => console.log('Terms'),
        },
      ],
    },
  ];

  handleItem(item: MenuItem) {
    if (item.toggle) {
      item.on = !item.on;
      return;
    }
    item.action?.();
  }

  goBack() {
    this.location.back();
  }
  editProfile() {
    console.log('Edit Profile');
  }
  changePhoto() {
    console.log('Change Photo');
  }
  viewTrips() {
    console.log('View Trips');
  }
  viewRewards() {
    console.log('View Rewards');
  }
  openWallet() {
    console.log('Open Wallet');
  }
  logout() {
    this.router.navigateByUrl('/login');
  }
}