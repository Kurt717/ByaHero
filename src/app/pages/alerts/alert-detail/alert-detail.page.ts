import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonContent,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  mailUnreadOutline,
  trashOutline,
  timeOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  pricetagOutline,
  trendingDownOutline,
  informationCircleOutline,
  ticketOutline,
  navigateOutline,
  searchOutline,
  chatbubbleEllipsesOutline,
  copyOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { BookingService, parseFareText } from '../../booking/booking.service';
import { AlertsService, AlertItem, AlertCta, AlertType } from '../alerts.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'arrow-forward-outline': arrowForwardOutline,
  'mail-unread-outline': mailUnreadOutline,
  'trash-outline': trashOutline,
  'time-outline': timeOutline,
  'alert-circle-outline': alertCircleOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'close-circle-outline': closeCircleOutline,
  'pricetag-outline': pricetagOutline,
  'trending-down-outline': trendingDownOutline,
  'information-circle-outline': informationCircleOutline,
  'ticket-outline': ticketOutline,
  'navigate-outline': navigateOutline,
  'search-outline': searchOutline,
  'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
  'copy-outline': copyOutline,
  'checkmark-outline': checkmarkOutline,
});

interface SeatDot {
  id: number;
  x: number;
  y: number;
  taken: boolean;
  pick: boolean;
}

@Component({
  selector: 'app-alert-detail',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './alert-detail.page.html',
  styleUrls: ['./alert-detail.page.scss'],
})
export class AlertDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private data = inject(AlertsService);
  private booking = inject(BookingService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  alert: AlertItem | undefined;

  readonly meta: Record<AlertType, { label: string; icon: string }> = {
    boarding: { label: 'Boarding call', icon: 'checkmark-circle-outline' },
    delay: { label: 'Trip delay', icon: 'alert-circle-outline' },
    cancelled: { label: 'Cancellation', icon: 'close-circle-outline' },
    promo: { label: 'Offer', icon: 'pricetag-outline' },
    price: { label: 'Fare alert', icon: 'trending-down-outline' },
    system: { label: "What's new", icon: 'information-circle-outline' },
  };

  readonly seatMap: SeatDot[] = this.buildSeatMap();

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const found = this.data.getAlert(params.get('id') ?? '');
      if (!found) {
        this.router.navigateByUrl('/alerts', { replaceUrl: true });
        return;
      }
      this.alert = found;
      this.data.setAlertUnread(found.id, false);
    });
  }

  goBack() {
    const isFirstNavigation = (window.history.state?.navigationId ?? 2) <= 1;
    if (isFirstNavigation) {
      this.router.navigateByUrl('/alerts', { replaceUrl: true });
    } else {
      this.location.back();
    }
  }

  markUnread() {
    if (!this.alert) return;
    this.data.setAlertUnread(this.alert.id, true);
    this.showToast('Marked as unread.');
    this.goBack();
  }

  async remove() {
    const alert = this.alert;
    if (!alert) return;
    const sheet = await this.alertController.create({
      header: 'Delete this alert?',
      message: 'It will be removed from your alerts list.',
      buttons: [
        { text: 'Keep', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.data.removeAlert(alert.id);
            this.goBack();
          },
        },
      ],
    });
    await sheet.present();
  }

  async run(cta: AlertCta) {
    switch (cta.kind) {
      case 'ticket':
        this.router.navigateByUrl(`/e-ticket/${cta.ref}`);
        break;
      case 'track':
        this.router.navigateByUrl('/active-trip');
        break;
      case 'search':
        this.router.navigateByUrl('/search');
        break;
      case 'bookings':
        this.router.navigateByUrl('/bookings');
        break;
      case 'chat':
        this.router.navigate(['/chat', cta.chatId]);
        break;
      case 'book':
        if (cta.trip) {
          const quote = parseFareText(cta.trip.fare);
          this.booking.startBooking(cta.trip, {
            ...(quote > 0 ? { quotedSeatFare: quote } : {}),
          });
          this.router.navigateByUrl('/booking/trip');
        }
        break;
      case 'copy':
        await this.copy(cta.text ?? '');
        break;
    }
  }

  // ---------- fare sparkline (viewBox 0 0 240 56) ----------
  get sparkPoints(): string {
    return this.sparkCoords()
      .map((p) => `${p.x},${p.y}`)
      .join(' ');
  }

  get sparkArea(): string {
    const c = this.sparkCoords();
    const first = c[0];
    const last = c[c.length - 1];
    if (!first || !last) return '';
    return `${first.x},56 ${this.sparkPoints} ${last.x},56`;
  }

  get sparkEnd(): { x: number; y: number } {
    const c = this.sparkCoords();
    return c[c.length - 1] ?? { x: 0, y: 0 };
  }

  private sparkCoords(): { x: number; y: number }[] {
    const s = this.alert?.detail.spotlight.series ?? [];
    if (s.length < 2) return [];
    const min = Math.min(...s);
    const max = Math.max(...s);
    const span = max - min || 1;
    const step = 228 / (s.length - 1);
    return s.map((v, i) => ({
      x: +(6 + i * step).toFixed(1),
      y: +(8 + ((max - v) / span) * 40).toFixed(1),
    }));
  }

  private buildSeatMap(): SeatDot[] {
    const xs = [8, 34, 70, 96];
    const ys = [8, 30, 52, 74];
    const taken = new Set([0, 3, 5, 9, 10, 12, 15]);
    const pick = 6;
    const out: SeatDot[] = [];
    ys.forEach((y, r) =>
      xs.forEach((x, c) => {
        const id = r * 4 + c;
        out.push({ id, x, y, taken: taken.has(id), pick: id === pick });
      }),
    );
    return out;
  }

  private async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(`Code ${text} copied.`);
    } catch {
      this.showToast(`Your code: ${text}`);
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