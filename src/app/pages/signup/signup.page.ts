<<<<<<< HEAD
import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonInput,
  IonCheckbox,
  AlertController,
  ToastController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
=======
import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonInput,
  IonCheckbox,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  personOutline,
  mailOutline,
  callOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  logoGoogle,
  logoApple,
  logoFacebook,
} from 'ionicons/icons';

addIcons({
  'chevron-back-outline': chevronBackOutline,
  'person-outline': personOutline,
  'mail-outline': mailOutline,
  'call-outline': callOutline,
  'lock-closed-outline': lockClosedOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'logo-google': logoGoogle,
  'logo-apple': logoApple,
  'logo-facebook': logoFacebook,
});

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
<<<<<<< HEAD
    FormsModule,
    IonContent,
    IonIcon,
    IonInput,
    IonCheckbox,
    RouterLink
],
=======
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonCheckbox,
    RouterLink,
  ],
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
})
export class SignupPage {
<<<<<<< HEAD
  private router = inject(Router);
  private location = inject(Location);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private auth = inject(AuthService);

=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  fullName = '';
  email = '';
  mobile = '';
  password = '';
  agreedToTerms = false;
  showPassword = false;

<<<<<<< HEAD
  constructor() {
=======
  constructor(
    private router: Router,
    private location: Location,
  ) {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    addIcons({
      personOutline,
      mailOutline,
      callOutline,
      lockClosedOutline,
      logoGoogle,
      logoApple,
      logoFacebook,
    });
  }

<<<<<<< HEAD
  get canCreateAccount(): boolean {
    return (
      this.fullName.trim().length >= 2 &&
      this.isValidEmail(this.email) &&
      this.mobile.replace(/\D/g, '').length >= 10 &&
      this.password.length >= 6 &&
      this.agreedToTerms
    );
  }

  async createAccount() {
    if (!this.canCreateAccount) {
      await this.showToast(
        'Complete every field, use a valid email, and accept the terms.',
      );
      return;
    }
    const result = this.auth.signup({
      name: this.fullName.trim(),
      email: this.email.trim(),
      phone: this.mobile.trim(),
      password: this.password,
    });
    if (!result.ok) {
      await this.showToast(result.error || 'Could not create your account.');
      return;
    }
    await this.showToast('Account created. Welcome aboard!');
    this.router.navigateByUrl('/home');
  }

  async continueWith(provider: string) {
    const result = this.auth.loginWith(provider);
    if (!result.ok) {
      await this.showToast(result.error || 'Could not sign up with provider.');
      return;
    }
    await this.showToast(`Account created with ${provider}.`);
=======
  createAccount() {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    this.router.navigateByUrl('/home');
  }

  goBack() {
    this.location.back();
  }
<<<<<<< HEAD

  async showPolicy(title: string) {
    const alert = await this.alertController.create({
      header: title,
      message:
        'Your name, email and phone are stored on this device only. Booking details, favorites and preferences are also kept locally.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
=======
}
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
