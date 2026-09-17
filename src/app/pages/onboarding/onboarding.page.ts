import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  arrowForwardOutline,
  locationOutline,
  navigateCircleOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-forward-outline': arrowForwardOutline,
  'location-outline': locationOutline,
  'navigate-circle-outline': navigateCircleOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
});

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, RouterLink],
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
})
export class OnboardingPage {
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
  direction: 'next' | 'prev' = 'next';

  constructor(private router: Router) {
    addIcons({ arrowForward });
  }

  get isLastSlide(): boolean {
    return this.activeIndex === this.slides.length - 1;
  }

  goToDot(index: number) {
    this.direction = index > this.activeIndex ? 'next' : 'prev';
    this.activeIndex = index;
  }

  onPrimaryAction() {
    if (this.isLastSlide) {
      this.router.navigateByUrl('/signup');
    } else {
      this.direction = 'next';
      this.activeIndex++;
    }
  }

  skip() {
    this.router.navigateByUrl('/login');
  }
}
