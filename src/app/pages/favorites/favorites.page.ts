import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonContent, IonIcon, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  heartOutline,
  heart,
  arrowForwardOutline,
  busOutline,
  carSportOutline,
  peopleOutline,
  compassOutline,
} from 'ionicons/icons';
import { BookingService, TripSummary } from '../booking/booking.service';
import {
  FavoriteRoute,
  RouteCatalogService,
  RouteMode,
} from '../../services/route-catalog.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'heart-outline': heartOutline,
  heart: heart,
  'arrow-forward-outline': arrowForwardOutline,
  'bus-outline': busOutline,
  'car-sport-outline': carSportOutline,
  'people-outline': peopleOutline,
  'compass-outline': compassOutline,
});

type FilterKey = 'all' | RouteMode;

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
})
export class FavoritesPage {
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private catalog = inject(RouteCatalogService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  activeFilter: FilterKey = 'all';

  filters: { key: FilterKey; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'compass-outline' },
    { key: 'bus', label: 'Bus', icon: 'bus-outline' },
    { key: 'uv', label: 'UV Exp', icon: 'car-sport-outline' },
    { key: 'shared', label: 'Shared', icon: 'people-outline' },
  ];

  favoriteRoutes: FavoriteRoute[] = [];

  constructor() {
    addIcons({ arrowBackOutline, heart, busOutline, arrowForwardOutline, heartOutline });
    this.reload();
  }

  ionViewWillEnter() {
    this.reload();
  }

  get filteredFavorites(): FavoriteRoute[] {
    if (this.activeFilter === 'all') return this.favoriteRoutes;
    return this.favoriteRoutes.filter((r) => r.mode === this.activeFilter);
  }

  setFilter(key: FilterKey) {
    this.activeFilter = key;
  }

  async removeFavorite(id: string, event: Event) {
    event.stopPropagation();
    const route = this.favoriteRoutes.find((r) => r.id === id);
    if (!route) return;

    const alert = await this.alertController.create({
      header: 'Remove favorite?',
      message: `${route.from} to ${route.to} will be removed from saved routes.`,
      buttons: [
        { text: 'Keep', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.catalog.removeFavorite(id);
            this.reload();
            this.showToast('Favorite removed.');
          },
        },
      ],
    });
    await alert.present();
  }

  bookAgain(route: FavoriteRoute) {
    this.catalog.bumpFavoriteUse(route.id);
    const trip: TripSummary = {
      operator: route.operator,
      from: route.from,
      to: route.to,
      eta: route.savedLabel,
      fare: route.fare,
      seatsLeft: route.seats,
      status: route.status,
    };
    this.bookingService.startBooking(trip);
    this.router.navigateByUrl('/booking/trip');
  }

  goBack() {
    this.router.navigateByUrl('/home');
  }

  goToSearch() {
    this.router.navigateByUrl('/search');
  }

  private reload() {
    this.favoriteRoutes = [...this.catalog.readFavorites()];
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1600,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
