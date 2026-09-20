import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
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

type FavoriteMode = 'bus' | 'uv' | 'shared';
type FilterKey = 'all' | FavoriteMode;

interface FavoriteRoute {
  id: string;
  operator: string;
  from: string;
  to: string;
  fare: string;
  seats: string;
  status: string;
  mode: FavoriteMode;
  savedLabel: string;
  useCount: number;
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
})
export class FavoritesPage {
  activeFilter: FilterKey = 'all';

  filters: { key: FilterKey; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'compass-outline' },
    { key: 'bus', label: 'Bus', icon: 'bus-outline' },
    { key: 'uv', label: 'UV Exp', icon: 'car-sport-outline' },
    { key: 'shared', label: 'Shared', icon: 'people-outline' },
  ];

  favoriteRoutes: FavoriteRoute[] = [
    {
      id: 'f1',
      operator: 'Victory Liner',
      from: 'Baguio City',
      to: 'Vigan City',
      fare: '₱ 380',
      seats: '14 seats left',
      status: 'on-time',
      mode: 'bus',
      savedLabel: 'Saved 2 days ago',
      useCount: 12,
    },
    {
      id: 'f2',
      operator: 'GV Florida UV Express',
      from: 'Cauayan',
      to: 'Ilagan',
      fare: '₱ 95',
      seats: '3 seats left',
      status: 'on-time',
      mode: 'uv',
      savedLabel: 'Saved 1 week ago',
      useCount: 31,
    },
    {
      id: 'f3',
      operator: 'Florida Bus Line',
      from: 'Tuguegarao',
      to: 'Manila (PITX)',
      fare: '₱ 620',
      seats: '18 seats left',
      status: 'delayed',
      mode: 'bus',
      savedLabel: 'Saved 3 weeks ago',
      useCount: 4,
    },
    {
      id: 'f4',
      operator: 'Baliwag Transit',
      from: 'Solano',
      to: 'Cabanatuan',
      fare: '₱ 210',
      seats: '22 seats left',
      status: 'on-time',
      mode: 'bus',
      savedLabel: 'Saved 1 month ago',
      useCount: 2,
    },
    {
      id: 'f5',
      operator: 'Sagada Shared Van',
      from: 'Baguio City',
      to: 'Sagada',
      fare: '₱ 250',
      seats: '5 seats left',
      status: 'on-time',
      mode: 'shared',
      savedLabel: 'Saved 2 months ago',
      useCount: 6,
    },
  ];

  constructor(
    private router: Router,
    private bookingService: BookingService,
  ) {
      addIcons({arrowBackOutline,heart,busOutline,arrowForwardOutline,heartOutline});}

  get filteredFavorites(): FavoriteRoute[] {
    if (this.activeFilter === 'all') return this.favoriteRoutes;
    return this.favoriteRoutes.filter((r) => r.mode === this.activeFilter);
  }

  setFilter(key: FilterKey) {
    this.activeFilter = key;
  }

  removeFavorite(id: string, event: Event) {
    event.stopPropagation();
    this.favoriteRoutes = this.favoriteRoutes.filter((r) => r.id !== id);
  }

  bookAgain(route: FavoriteRoute) {
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
}