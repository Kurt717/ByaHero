import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  closeOutline,
  searchOutline,
  micOutline,
  busOutline,
  carSportOutline,
  peopleOutline,
  compassOutline,
  timeOutline,
  closeCircleOutline,
  chevronForwardOutline,
  chevronDownOutline,
  mapOutline,
  locationOutline,
  bus,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'close-outline': closeOutline,
  'search-outline': searchOutline,
  'mic-outline': micOutline,
  'bus-outline': busOutline,
  'car-sport-outline': carSportOutline,
  'people-outline': peopleOutline,
  'compass-outline': compassOutline,
  'time-outline': timeOutline,
  'close-circle-outline': closeCircleOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'chevron-down-outline': chevronDownOutline,
  'map-outline': mapOutline,
  'location-outline': locationOutline,
  bus: bus,
});

type Category = 'bus' | 'uv' | 'shared' | 'all';
type SortOption = 'Fastest' | 'Cheapest' | 'Rated';

interface CategoryOption {
  id: Category;
  label: string;
  icon: string;
}
interface RecentSearch {
  from: string;
  to: string;
}
interface Destination {
  name: string;
  tag: string;
}
interface RouteCard {
  operator: string;
  from: string;
  to: string;
  fare: string;
  duration: string;
}
interface Terminal {
  name: string;
  distance: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
})
export class SearchPage {
  query = '';
  activeCategory: Category = 'all';
  sortBy: SortOption = 'Fastest';
  showSortMenu = false;
  sortOptions: SortOption[] = ['Fastest', 'Cheapest', 'Rated'];

  categories: CategoryOption[] = [
    { id: 'bus', label: 'Bus', icon: 'bus-outline' },
    { id: 'uv', label: 'UV Exp', icon: 'car-sport-outline' },
    { id: 'shared', label: 'Shared', icon: 'people-outline' },
    { id: 'all', label: 'All', icon: 'compass-outline' },
  ];

  recentSearches: RecentSearch[] = [
    { from: 'Baguio City', to: 'Tuguegarao City' },
    { from: 'Santiago City', to: 'Cubao, QC' },
  ];

  mostVisited: Destination[] = [
    { name: 'Baguio City', tag: 'Summer Capital' },
    { name: 'Vigan City', tag: 'Heritage Town' },
    { name: 'Sagada', tag: 'Mountain Province' },
    { name: 'Laoag City', tag: 'Ilocos Norte' },
    { name: 'Tuguegarao City', tag: 'Cagayan' },
    { name: 'Banaue', tag: 'Rice Terraces' },
  ];

  popularRoutes: RouteCard[] = [
    {
      operator: 'Victory Liner',
      from: 'Manila (Cubao)',
      to: 'Baguio City',
      fare: '₱ 480',
      duration: '5h 30m',
    },
    {
      operator: 'Partas',
      from: 'Manila (Cubao)',
      to: 'Laoag City',
      fare: '₱ 850',
      duration: '9h',
    },
    {
      operator: 'Florida Bus Line',
      from: 'Manila (PITX)',
      to: 'Vigan City',
      fare: '₱ 750',
      duration: '8h',
    },
    {
      operator: 'GV Florida',
      from: 'Cauayan',
      to: 'Tuguegarao',
      fare: '₱ 150',
      duration: '1h 30m',
    },
  ];

  nearbyTerminals: Terminal[] = [
    { name: 'Baguio Terminal', distance: '0.4 km' },
    { name: 'Victory Liner Cubao', distance: '2.1 km' },
  ];

  constructor(private router: Router) {
    addIcons({
      arrowBackOutline,
      closeOutline,
      searchOutline,
      closeCircleOutline,
      micOutline,
      timeOutline,
      chevronForwardOutline,
      locationOutline,
      chevronDownOutline,
      bus,
      mapOutline,
    });
  }

  goBack() {
    this.router.navigateByUrl('/home');
  }
  clearQuery() {
    this.query = '';
  }
  selectCategory(id: Category) {
    this.activeCategory = id;
  }
  useRecentSearch(item: RecentSearch) {
    this.query = `${item.from} to ${item.to}`;
  }
  clearRecentSearches() {
    this.recentSearches = [];
  }
  toggleSortMenu() {
    this.showSortMenu = !this.showSortMenu;
  }
  setSort(option: SortOption) {
    this.sortBy = option;
    this.showSortMenu = false;
  }
  selectDestination(dest: Destination) {
    this.query = dest.name;
  }
}
