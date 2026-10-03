import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  notificationsOutline,
  chatboxEllipsesOutline,
  mailOutline,
  callOutline,
  alarmOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'notifications-outline': notificationsOutline,
  'chatbox-ellipses-outline': chatboxEllipsesOutline,
  'mail-outline': mailOutline,
  'call-outline': callOutline,
  'alarm-outline': alarmOutline,
});

interface Channel {
  key: string;
  icon: string;
  name: string;
  desc: string;
  on: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage {
  private location = inject(Location);
  private toastController = inject(ToastController);

  private readonly prefsKey = 'byahero.profile-preferences.v1';
  private readonly label = 'Notifications';
  private readonly tripLabel = 'Trip Reminders';

  on = true;
  tripReminders = true;
  channels: Channel[] = [
    { key: 'Notifications push', icon: 'notifications-outline', name: 'Push', desc: 'On-device alerts', on: true },
    { key: 'Notifications sms', icon: 'chatbox-ellipses-outline', name: 'SMS', desc: 'Text message alerts', on: true },
    { key: 'Notifications email', icon: 'mail-outline', name: 'Email', desc: 'E-mail summaries', on: false },
  ];

  constructor() {
    try {
      const prefs = JSON.parse(
        localStorage.getItem(this.prefsKey) ?? '{}',
      ) as Record<string, unknown>;
      if (typeof prefs[this.label] === 'boolean') {
        this.on = prefs[this.label] as boolean;
      }
      if (typeof prefs[this.tripLabel] === 'boolean') {
        this.tripReminders = prefs[this.tripLabel] as boolean;
      }
      for (const c of this.channels) {
        if (typeof prefs[c.key] === 'boolean') {
          c.on = prefs[c.key] as boolean;
        }
      }
    } catch {
      return;
    }
  }

  goBack() {
    this.location.back();
  }

  toggle(value: boolean) {
    this.on = value;
    this.persist();
    this.showToast(`Notifications ${value ? 'enabled' : 'disabled'}.`);
  }

  toggleChannel(channel: Channel) {
    channel.on = !channel.on;
    this.persist();
    this.showToast(`${channel.name} ${channel.on ? 'enabled' : 'disabled'}.`);
  }

  toggleTripReminders() {
    this.tripReminders = !this.tripReminders;
    this.persist();
    this.showToast(`Trip reminders ${this.tripReminders ? 'enabled' : 'disabled'}.`);
  }

  private persist() {
    try {
      const prefs = JSON.parse(
        localStorage.getItem(this.prefsKey) ?? '{}',
      ) as Record<string, unknown>;
      prefs[this.label] = this.on;
      prefs[this.tripLabel] = this.tripReminders;
      for (const c of this.channels) {
        prefs[c.key] = c.on;
      }
      localStorage.setItem(this.prefsKey, JSON.stringify(prefs));
    } catch {
      return;
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1700,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}