import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  shieldCheckmarkOutline,
  cardOutline,
  cameraOutline,
  checkmarkOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { ProfileService } from '../profile.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'card-outline': cardOutline,
  'camera-outline': cameraOutline,
  'checkmark-outline': checkmarkOutline,
  'alert-circle-outline': alertCircleOutline,
});

@Component({
  selector: 'app-fare-id',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './fare-id.page.html',
  styleUrls: ['./fare-id.page.scss'],
})
export class FareIdPage {
  private location = inject(Location);
  private toastController = inject(ToastController);
  private profileService = inject(ProfileService);

  readonly types = [
    'Student ID',
    'Senior Citizen ID',
    'PWD ID',
    'DepEd / OSY Card',
  ];

  get verified(): boolean {
    return this.profileService.read()?.verified ?? false;
  }

  get badge(): string {
    return this.verified ? 'VERIFIED' : 'NOT VERIFIED';
  }

  goBack() {
    this.location.back();
  }

  async verify() {
    if (this.verified) {
      await this.showToast('Your Fare ID is already verified.');
      return;
    }
    await this.showToast('Visit a terminal to upload a valid ID for review.');
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}