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
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonCheckbox,
    RouterLink,
  ],
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
})
export class SignupPage {
  fullName = '';
  email = '';
  mobile = '';
  password = '';
  agreedToTerms = false;
  showPassword = false;

  constructor(
    private router: Router,
    private location: Location,
  ) {
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

  createAccount() {
    this.router.navigateByUrl('/home');
  }

  goBack() {
    this.location.back();
  }
}