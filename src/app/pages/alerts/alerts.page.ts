import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import {
  AlertsService,
  AlertItem,
  AlertType,
  ChatAvatarType,
  ChatThread,
  DayGroup,
} from './alerts.service';

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

type FilterKey = 'all' | 'trip' | 'promo';
type TopTab = 'alerts' | 'chats';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
})
export class AlertsPage {
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

  setFilter(filter: FilterKey) {
    this.activeFilter = filter;
  }

  markAllRead() {
    if (this.topTab === 'alerts') this.data.markAllAlertsRead();
    else this.data.markAllChatsRead();
  }

  openAlert(alert: AlertItem) {
    this.data.setAlertUnread(alert.id, false);
    this.router.navigate(['/alert', alert.id]);
  }

  openChat(chat: ChatThread) {
    this.router.navigate(['/chat', chat.id]);
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
}