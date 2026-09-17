import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  heartOutline,
  arrowForwardOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'heart-outline': heartOutline,
  'arrow-forward-outline': arrowForwardOutline,
});

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
})
export class FavoritesPage {
  /** Wire this up to real saved-route data once that feature exists. */
  favoriteRoutes: any[] = [];

  constructor(private router: Router) {
    addIcons({
      arrowBackOutline,
      heartOutline,
      arrowForwardOutline,
    });
  }

  goBack() {
    this.router.navigateByUrl('/home');
  }

  goToSearch() {
    this.router.navigateByUrl('/search');
  }
}