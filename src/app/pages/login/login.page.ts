<<<<<<< HEAD
import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonContent,
  IonIcon,
  IonInput,
  ToastController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
=======
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonInput } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
import { addIcons } from 'ionicons';
import {
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  logoGoogle,
  logoFacebook,
  logoApple,
} from 'ionicons/icons';

addIcons({
  'mail-outline': mailOutline,
  'lock-closed-outline': lockClosedOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'logo-google': logoGoogle,
  'logo-facebook': logoFacebook,
  'logo-apple': logoApple,
});

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
<<<<<<< HEAD
=======
    CommonModule,
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    FormsModule,
    IonContent,
    IonIcon,
    IonInput,
<<<<<<< HEAD
    RouterLink
],
=======
    RouterLink,
  ],
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
<<<<<<< HEAD
  private router = inject(Router);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private auth = inject(AuthService);

=======
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
  email = '';
  password = '';
  showPassword = false;

<<<<<<< HEAD
  constructor() {
=======
  constructor(private router: Router) {
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
    addIcons({
      mailOutline,
      lockClosedOutline,
      logoGoogle,
      logoApple,
      logoFacebook,
    });
  }
<<<<<<< HEAD
  get canLogin(): boolean {
    return this.isValidEmail(this.email) && this.password.length >= 6;
  }

  async login() {
    if (!this.canLogin) {
      await this.showToast('Enter a valid email and at least 6 characters.');
      return;
    }
    const result = this.auth.login(this.email, this.password);
    if (!result.ok) {
      await this.showToast(result.error || 'Unable to log in.');
      return;
    }
    await this.showToast(`Welcome back, ${this.email.split('@')[0]}!`);
    this.router.navigateByUrl('/home');
  }

  async forgotPassword() {
    const noUser = this.auth.findByEmail(this.email.trim());
    if (!this.isValidEmail(this.email) || !noUser) {
      await this.showToast('Enter an email with an existing account first.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Reset password',
      message: `Set a new password for ${this.email.trim()}.`,
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'New password (min 6 characters)',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reset',
          handler: (values) => {
            const next = String(values.password || '').trim();
            const result = this.auth.resetPassword(this.email, next);
            if (result.ok) {
              this.showToast('Password updated. Log in with your new password.');
            } else {
              this.showToast(result.error || 'Could not reset password.');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async continueWith(provider: string) {
    this.auth.loginWith(provider);
    await this.showToast(`Signed in with ${provider}.`);
    this.router.navigateByUrl('/home');
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
=======
  login() {
    this.router.navigateByUrl('/home');
  }
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
}
