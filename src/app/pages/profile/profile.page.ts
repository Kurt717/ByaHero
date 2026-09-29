import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  AlertController,
  AlertOptions,
  IonContent,
  IonAvatar,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { DEFAULT_PROFILE_USER, ProfileService } from './profile.service';
import { AuthService } from '../../services/auth.service';
import { TicketService } from '../bookings/ticket.service';
import { VoucherService } from '../../services/voucher.service';
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
  pricetagOutline,
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
  'pricetag-outline': pricetagOutline,
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
export class ProfilePage implements OnDestroy {
  private router = inject(Router);
  private location = inject(Location);
  private alertController = inject(AlertController);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private ticketService = inject(TicketService);
  private voucherService = inject(VoucherService);
  private profileSub = this.profileService.user$.subscribe((profile) => {
    this.user = { ...DEFAULT_PROFILE_USER, ...profile };
    this.syncMenuValues();
  });

  private readonly preferencesStorageKey = 'byahero.profile-preferences.v1';

  constructor() {
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
      pricetagOutline,
    });
    this.loadProfile();
    this.loadPreferences();
    this.syncMenuValues();
  }

  /** Ionic keeps tab pages alive, so re-read the saved profile every time we come back. */
  ionViewWillEnter() {
    this.loadProfile();
    this.syncMenuValues();
  }

  ngOnDestroy() {
    this.profileSub.unsubscribe();
  }

  user = { ...DEFAULT_PROFILE_USER };

  /** Trips / points / savings are derived from the user's actual bookings. */
  get stats() {
    const bookings = this.ticketService.bookings;
    const savings = bookings.reduce((sum, b) => sum + (b.savings ?? 0), 0);
    const points =
      bookings.reduce(
        (sum, b) => sum + (b.status === 'completed' ? 50 : 25),
        0,
      ) + Math.round(savings);
    return { trips: bookings.length, points, saved: Math.round(savings) };
  }

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
      action: () => this.router.navigateByUrl('/wallet'),
    },
    {
      icon: 'bookmark-outline',
      label: 'Saved',
      tint: 'red',
      action: () => this.router.navigateByUrl('/favorites'),
    },
    {
      icon: 'id-card-outline',
      label: 'Fare ID',
      tint: 'yellow',
      action: () => this.router.navigateByUrl('/fare-id'),
    },
    {
      icon: 'share-social-outline',
      label: 'Share Trip',
      tint: 'green',
      action: () => this.router.navigateByUrl('/active-trip'),
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
          action: () => this.openWallet(),
        },
        {
          icon: 'card-outline',
          label: 'Payment Methods',
          value: '2 saved',
          action: () => this.openPaymentMethods(),
        },
        {
          icon: 'id-card-outline',
          label: 'Discount Fare ID',
          badge: 'Verify',
          action: () => this.router.navigateByUrl('/fare-id'),
        },
        {
          icon: 'time-outline',
          label: 'Ride History',
          value: 'trips',
          action: () => this.viewTrips(),
        },
        {
          icon: 'pricetag-outline',
          label: 'Promo Wallet',
          value: 'promos',
          action: () => this.router.navigateByUrl('/promo-wallet?from=profile'),
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
          action: () => this.router.navigateByUrl('/trusted-contacts'),
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Auto Share Live Trip',
          value: 'On',
          action: () => this.router.navigateByUrl('/auto-share'),
        },
        {
          icon: 'location-outline',
          label: 'Arrival Alerts',
          value: 'On',
          action: () => this.router.navigateByUrl('/arrival-alerts'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          value: 'On',
          action: () => this.router.navigateByUrl('/notifications'),
        },
        {
          icon: 'language-outline',
          label: 'Language',
          value: 'English',
          action: () => this.router.navigateByUrl('/language'),
        },
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          value: 'Off',
          action: () => this.router.navigateByUrl('/dark-mode'),
        },
      ],
    },
    {
      title: 'More',
      items: [
        {
          icon: 'gift-outline',
          label: 'Invite a Kabyahe',
          badge: '₱50',
          action: () => this.router.navigateByUrl('/invite'),
        },
        {
          icon: 'help-circle-outline',
          label: 'Help Center',
          action: () => this.router.navigateByUrl('/help-center'),
        },
        {
          icon: 'document-text-outline',
          label: 'Terms & Privacy',
          action: () => this.router.navigateByUrl('/terms-privacy'),
        },
      ],
    },
  ];

  handleItem(item: MenuItem) {
    item.action?.();
  }

  goBack() {
    this.location.back();
  }

  editProfile() {
    this.router.navigateByUrl('/edit-profile');
  }

  changePhoto() {
    this.router.navigateByUrl('/edit-profile');
  }

  viewTrips() {
    this.router.navigateByUrl('/ride-insights?from=profile');
  }

  /** Present an alert with a top-right × close and balanced action
      buttons (matched by the global overlay styles). */
  private async presentAlert(options: AlertOptions) {
    const alert = await this.alertController.create(options);
    await alert.present();
    const head = alert.querySelector('.alert-head') as HTMLElement | null;
    if (head && !head.querySelector('.alert-close-x')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'alert-close-x';
      closeBtn.setAttribute('aria-label', 'Close dialog');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => void alert.dismiss());
      head.appendChild(closeBtn);
    }
    return alert;
  }

  viewRewards() {
    this.router.navigateByUrl('/rewards');
  }

  async openWallet() {
    this.router.navigateByUrl('/wallet');
  }

  async logout() {
    return this.presentAlert({
      header: 'Log out?',
      message: 'You can log back in with your email and password.',
      buttons: [
        { text: 'Stay', role: 'cancel' },
        {
          text: 'Log Out',
          role: 'destructive',
          handler: () => {
            this.authService.logout();
            this.router.navigateByUrl('/login', { replaceUrl: true });
          },
        },
      ],
    });
  }

  private openPaymentMethods() {
    this.router.navigateByUrl('/payment-methods');
  }

  private setMenuValue(label: string, value: string) {
    for (const group of this.menuGroups) {
      const item = group.items.find((entry) => entry.label === label);
      if (item) item.value = value;
    }
  }

  private syncMenuValues() {
    this.setMenuValue('Byahero Wallet', `₱ ${this.wallet.balance}`);
    const completed = this.ticketService.bookings.filter(
      (b) => b.status === 'completed',
    ).length;
    this.setMenuValue('Ride History', `${completed} trips`);
    const promos = this.voucherService
      .getVouchers()
      .filter((v) => !v.used).length;
    this.setMenuValue('Promo Wallet', `${promos} available`);
    this.setMenuValue(
      'Payment Methods',
      `${this.profileService.readPaymentMethods().length} saved`,
    );
    this.setMenuValue(
      'Trusted Contacts',
      `${this.profileService.readTrustedContacts().length} added`,
    );
    try {
      const prefs = JSON.parse(
        localStorage.getItem(this.preferencesStorageKey) ?? '{}',
      ) as Record<string, boolean | string>;
      this.setMenuValue(
        'Auto Share Live Trip',
        prefs['Auto Share Live Trip'] === false ? 'Off' : 'On',
      );
      this.setMenuValue(
        'Arrival Alerts',
        prefs['Arrival Alerts'] === false ? 'Off' : 'On',
      );
      this.setMenuValue(
        'Notifications',
        prefs['Notifications'] === false ? 'Off' : 'On',
      );
      this.setMenuValue(
        'Dark Mode',
        prefs['Dark Mode'] === true ? 'On' : 'Off',
      );
      if (typeof prefs['Language'] === 'string') {
        this.setMenuValue('Language', prefs['Language'] as string);
      }
    } catch {
      return;
    }
  }

  private loadProfile() {
    try {
      const parsed = this.profileService.read();
      this.user = { ...DEFAULT_PROFILE_USER, ...parsed };
      this.loadWallet();
      this.rank.points = this.stats.points;
      this.rank.current = this.stats.trips >= 50 ? 'Platinum' : this.stats.trips >= 25 ? 'Gold' : 'Silver';
      this.rank.next = this.stats.trips >= 50 ? 'Diamond' : this.rank.current === 'Gold' ? 'Platinum' : 'Gold';
      this.syncMenuValues();
    } catch {
      return;
    }
  }

  private loadWallet() {
    const saved = this.profileService.readWallet();
    this.wallet = {
      balance: saved.balance ?? this.wallet.balance,
      last4: saved.last4 ?? this.wallet.last4,
    };
  }

  private persistProfile() {
    try {
      this.profileService.save({ user: this.user });
      this.loadWallet();
    } catch {
      return;
    }
  }

  private loadPreferences() {
    try {
      const saved = localStorage.getItem(this.preferencesStorageKey);
      if (!saved) return;
      const prefs = JSON.parse(saved) as Record<string, boolean | string>;
      for (const group of this.menuGroups) {
        for (const item of group.items) {
          if (item.toggle && typeof prefs[item.label] === 'boolean') {
            item.on = prefs[item.label] as boolean;
          }
          if (item.label === 'Language' && typeof prefs['Language'] === 'string') {
            item.value = prefs['Language'] as string;
          }
        }
      }
    } catch {
      return;
    }
  }
}