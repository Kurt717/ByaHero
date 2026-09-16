import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonInput } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
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
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonInput,
    RouterLink,
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email = '';
  password = '';
  showPassword = false;

  constructor(private router: Router) {
    addIcons({
      mailOutline,
      lockClosedOutline,
      logoGoogle,
      logoApple,
      logoFacebook,
    });
  }
  login() {
    this.router.navigateByUrl('/home');
  }
}
