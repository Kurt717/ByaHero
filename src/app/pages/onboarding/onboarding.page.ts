<<<<<<< HEAD
import { Component, inject } from '@angular/core';

import { IonContent, IonIcon } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
=======
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
import { addIcons } from 'ionicons';
import {
  arrowForward,
  arrowForwardOutline,
  locationOutline,
  navigateCircleOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

addIcons({
<<<<<<< HEAD
  'arrow-forward': arrowForward,
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  'arrow-forward-outline': arrowForwardOutline,
  'location-outline': locationOutline,
  'navigate-circle-outline': navigateCircleOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
});

@Component({
  selector: 'app-onboarding',
  standalone: true,
<<<<<<< HEAD
  imports: [IonContent, IonIcon, RouterLink],
=======
  imports: [CommonModule, IonContent, IonIcon, RouterLink],
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
})
export class OnboardingPage {
<<<<<<< HEAD
  private router = inject(Router);
  private auth = inject(AuthService);

=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  slides = [
    {
      icon: 'location-outline',
      title: 'Find your route instantly',
      body: 'Search any North Luzon route — Tuguegarao, Cauayan, Santiago, Ilagan — and see buses & UV Express near you.',
    },
    {
      icon: 'navigate-circle-outline',
      title: 'Track your ride live',
      body: 'Watch your bus move on the map in real time and get an accurate ETA before you even leave the house.',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Fixed, fair fares',
      body: 'No surge pricing. Every trip follows the regulated fare — book with confidence, every single time.',
    },
  ];
  activeIndex = 0;
<<<<<<< HEAD
  prevIndex: number | null = null;
  direction: 'next' | 'prev' = 'next';
  private wipeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
=======
  direction: 'next' | 'prev' = 'next';

  constructor(private router: Router) {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    addIcons({ arrowForward });
  }

  get isLastSlide(): boolean {
    return this.activeIndex === this.slides.length - 1;
  }

  goToDot(index: number) {
<<<<<<< HEAD
    this.goTo(index);
  }

  private goTo(index: number) {
    if (index === this.activeIndex) return;
    this.direction = index > this.activeIndex ? 'next' : 'prev';
    // Keep the outgoing slide mounted underneath so the incoming
    // slide can iris-wipe over it instead of popping over blank space.
    this.prevIndex = this.activeIndex;
    this.activeIndex = index;
    clearTimeout(this.wipeTimer);
    this.wipeTimer = setTimeout(() => (this.prevIndex = null), 700);
=======
    this.direction = index > this.activeIndex ? 'next' : 'prev';
    this.activeIndex = index;
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  }

  onPrimaryAction() {
    if (this.isLastSlide) {
<<<<<<< HEAD
      this.auth.setOnboarded();
      this.router.navigateByUrl(
        this.auth.isAuthenticated() ? '/home' : '/signup',
      );
    } else {
      this.direction = 'next';
      this.goTo(this.activeIndex + 1);
=======
      this.router.navigateByUrl('/signup');
    } else {
      this.direction = 'next';
      this.activeIndex++;
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    }
  }

  skip() {
<<<<<<< HEAD
    this.auth.setOnboarded();
=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    this.router.navigateByUrl('/login');
  }
}
