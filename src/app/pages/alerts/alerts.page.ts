<<<<<<< HEAD
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
=======
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  notificationsOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  pricetagOutline,
  trendingDownOutline,
  informationCircleOutline,
  checkmarkDoneOutline,
  chatbubbleEllipsesOutline,
  headsetOutline,
  personCircleOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
<<<<<<< HEAD
import {
  AlertsService,
  AlertItem,
  AlertType,
  ChatAvatarType,
  ChatThread,
  DayGroup,
} from './alerts.service';
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

addIcons({
  'notifications-outline': notificationsOutline,
  'alert-circle-outline': alertCircleOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'close-circle-outline': closeCircleOutline,
  'pricetag-outline': pricetagOutline,
  'trending-down-outline': trendingDownOutline,
  'information-circle-outline': informationCircleOutline,
  'checkmark-done-outline': checkmarkDoneOutline,
  'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
  'headset-outline': headsetOutline,
  'person-circle-outline': personCircleOutline,
  'chevron-forward-outline': chevronForwardOutline,
});

<<<<<<< HEAD
type FilterKey = 'all' | 'trip' | 'promo';
type TopTab = 'alerts' | 'chats';
=======
type AlertType =
  | 'delay'
  | 'boarding'
  | 'cancelled'
  | 'promo'
  | 'price'
  | 'system';
type FilterKey = 'all' | 'trip' | 'promo';
type DayGroup = 'Today' | 'Yesterday' | 'Earlier';
type TopTab = 'alerts' | 'chats';
type ChatAvatarType = 'support' | 'driver' | 'system';

interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  time: string;
  day: DayGroup;
  unread: boolean;
}

interface ChatThread {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatarType: ChatAvatarType;
}
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
})
export class AlertsPage {
<<<<<<< HEAD
  private router = inject(Router);
  private data = inject(AlertsService);

  topTab: TopTab = 'alerts';
  activeFilter: FilterKey = 'all';

  ionViewWillEnter() {
    this.data.rebuild();
  }

  get alerts(): AlertItem[] {
    return this.data.alerts;
  }

  get chats(): ChatThread[] {
    return this.data.chats;
  }

  get unreadAlertsCount(): number {
    return this.data.unreadAlerts;
  }

  get unreadChatsCount(): number {
    return this.data.unreadChats;
=======
  topTab: TopTab = 'alerts';
  activeFilter: FilterKey = 'all';

  alerts: AlertItem[] = [
    {
      id: 'a1',
      type: 'boarding',
      title: 'Boarding in 15 minutes',
      body: 'Victory Liner to Tuguegarao City is now boarding at Gate 3.',
      time: '6:15 AM',
      day: 'Today',
      unread: true,
    },
    {
      id: 'a2',
      type: 'delay',
      title: 'Trip delayed by 20 min',
      body: 'GV Florida (Cauayan to Ilagan) is running behind due to traffic.',
      time: '5:52 AM',
      day: 'Today',
      unread: true,
    },
    {
      id: 'a3',
      type: 'promo',
      title: '20% off Baguio routes',
      body: 'Book any Victory Liner trip to Baguio this week and save.',
      time: 'Yesterday, 9:00 AM',
      day: 'Yesterday',
      unread: false,
    },
    {
      id: 'a4',
      type: 'price',
      title: 'Fare dropped on a saved route',
      body: 'Manila to Vigan City is now 680 pesos, down from 750.',
      time: 'Yesterday, 7:40 AM',
      day: 'Yesterday',
      unread: false,
    },
    {
      id: 'a5',
      type: 'cancelled',
      title: 'Trip cancelled',
      body: 'Partas (Manila to Laoag City), Aug 29 departure, was cancelled by the operator. Refund issued.',
      time: 'Aug 29, 8:10 PM',
      day: 'Earlier',
      unread: false,
    },
    {
      id: 'a6',
      type: 'system',
      title: 'New feature: live seat maps',
      body: 'You can now pick your exact seat when booking select routes.',
      time: 'Aug 24, 11:00 AM',
      day: 'Earlier',
      unread: false,
    },
  ];

  chats: ChatThread[] = [
    {
      id: 'c1',
      name: 'Victory Liner Support',
      lastMessage: 'Your refund for BYH-46590 has been processed.',
      time: '10:42 AM',
      unread: 1,
      avatarType: 'support',
    },
    {
      id: 'c2',
      name: 'Trip Assistant',
      lastMessage: 'Your bus is 3 stops away from Tuguegarao Terminal.',
      time: 'Yesterday',
      unread: 0,
      avatarType: 'system',
    },
    {
      id: 'c3',
      name: 'GV Florida Driver',
      lastMessage: 'Nasa terminal na po kayo?',
      time: 'Aug 29',
      unread: 0,
      avatarType: 'driver',
    },
  ];

  get unreadAlertsCount(): number {
    return this.alerts.filter((a) => a.unread).length;
  }

  get unreadChatsCount(): number {
    return this.chats.reduce((sum, c) => sum + c.unread, 0);
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }

  get filteredAlerts(): AlertItem[] {
    if (this.activeFilter === 'all') return this.alerts;
    if (this.activeFilter === 'trip')
      return this.alerts.filter(
        (a) =>
          a.type === 'delay' || a.type === 'boarding' || a.type === 'cancelled',
      );
    return this.alerts.filter((a) => a.type === 'promo' || a.type === 'price');
  }

  get groupedAlerts(): { day: DayGroup; items: AlertItem[] }[] {
    const days: DayGroup[] = ['Today', 'Yesterday', 'Earlier'];
    return days
      .map((day) => ({
        day,
        items: this.filteredAlerts.filter((a) => a.day === day),
      }))
      .filter((group) => group.items.length > 0);
  }

  setTopTab(tab: TopTab) {
    this.topTab = tab;
  }
<<<<<<< HEAD

=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  setFilter(filter: FilterKey) {
    this.activeFilter = filter;
  }

  markAllRead() {
<<<<<<< HEAD
    if (this.topTab === 'alerts') this.data.markAllAlertsRead();
    else this.data.markAllChatsRead();
  }

  openAlert(alert: AlertItem) {
    this.data.setAlertUnread(alert.id, false);
    this.router.navigate(['/alert', alert.id]);
  }

  openChat(chat: ChatThread) {
    this.router.navigate(['/chat', chat.id]);
=======
    if (this.topTab === 'alerts') {
      this.alerts.forEach((a) => (a.unread = false));
    } else {
      this.chats.forEach((c) => (c.unread = 0));
    }
  }

  markAlertRead(alert: AlertItem) {
    alert.unread = false;
  }
  openChat(chat: ChatThread) {
    chat.unread = 0;
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }

  iconFor(type: AlertType): string {
    const map: Record<AlertType, string> = {
      delay: 'alert-circle-outline',
      boarding: 'checkmark-circle-outline',
      cancelled: 'close-circle-outline',
      promo: 'pricetag-outline',
      price: 'trending-down-outline',
      system: 'information-circle-outline',
    };
    return map[type];
  }

  avatarIconFor(type: ChatAvatarType): string {
    const map: Record<ChatAvatarType, string> = {
      support: 'headset-outline',
      driver: 'person-circle-outline',
      system: 'information-circle-outline',
    };
    return map[type];
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
