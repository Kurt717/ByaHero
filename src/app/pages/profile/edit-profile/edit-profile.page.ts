import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import {
  AlertController,
  IonContent,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cameraOutline,
  checkmarkOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { DEFAULT_PROFILE_USER, ProfileService, ProfileUser } from '../profile.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'camera-outline': cameraOutline,
  'checkmark-outline': checkmarkOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
});

/** Keep in sync with the defaults in ProfilePage. */
const DEFAULT_USER = DEFAULT_PROFILE_USER;

type UserShape = ProfileUser;
type AvatarChoice = 'default' | 'upload' | number;

interface StoredProfile {
  user?: Partial<UserShape>;
  wallet?: { balance?: string; last4?: string };
  [key: string]: unknown;
}

const AVATAR_STYLES = [
  { bg: '#151d48', fg: '#ffe066', dot: 'rgba(255,255,255,0.16)' },
  { bg: '#d32f2f', fg: '#ffffff', dot: 'rgba(255,255,255,0.22)' },
  { bg: '#ffe066', fg: '#151d48', dot: 'rgba(21,29,72,0.2)' },
  { bg: '#16a34a', fg: '#ffffff', dot: 'rgba(255,255,255,0.22)' },
  { bg: '#8FA3FF', fg: '#151d48', dot: 'rgba(21,29,72,0.18)' },
  { bg: '#ffffff', fg: '#d32f2f', dot: 'rgba(211,47,47,0.2)' },
];

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
})
export class EditProfilePage {
  private router = inject(Router);
  private location = inject(Location);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private profileService = inject(ProfileService);

  readonly defaultAvatar = DEFAULT_USER.avatar;

  user: UserShape;
  draft: { name: string; phone: string; email: string };
  touched = { name: false, phone: false, email: false };

  avatarChoice: AvatarChoice = 'default';
  options: string[] = [];

  private uploaded: string | null = null;
  private uploadVersion = 0;
  private initial = '';

  constructor() {
    const stored = this.readStored();
    this.user = { ...DEFAULT_USER, ...stored.user };
    this.draft = {
      name: this.user.name,
      phone: this.user.phone,
      email: this.user.email,
    };

    if (typeof this.user.avatarStyle === 'number') {
      this.avatarChoice = this.user.avatarStyle;
    } else if (this.user.avatar.startsWith('data:image/jpeg')) {
      this.avatarChoice = 'upload';
      this.uploaded = this.user.avatar;
    }

    this.refreshOptions();
    this.initial = this.snapshot();
  }

  // ------------------------------------------------------------- avatar

  get avatarSrc(): string {
    if (typeof this.avatarChoice === 'number') {
      return this.options[this.avatarChoice] ?? this.defaultAvatar;
    }
    if (this.avatarChoice === 'upload' && this.uploaded) return this.uploaded;
    return this.defaultAvatar;
  }

  choose(choice: 'default' | number) {
    this.avatarChoice = choice;
  }

  async onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('Pick an image file.');
      return;
    }
    try {
      this.uploaded = await this.shrink(file, 320);
      this.uploadVersion++;
      this.avatarChoice = 'upload';
    } catch {
      this.showToast('Could not read that image.');
    }
  }

  private shrink(file: File, size: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          size,
          size,
        );
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Bad image'));
      };
      img.src = url;
    });
  }

  private refreshOptions() {
    const letter = (Array.from(this.draft.name.trim())[0] ?? 'B')
      .toUpperCase()
      .replace(/[<>&"']/g, 'B');
    this.options = AVATAR_STYLES.map((s) => this.buildAvatar(s, letter));
  }

  private buildAvatar(
    s: { bg: string; fg: string; dot: string },
    letter: string,
  ): string {
    const glyph = (fill: string, dx: number, opacity: number) =>
      `<text x='${60 + dx}' y='84' text-anchor='middle' font-family='Arial Black,Arial,sans-serif' font-size='70' font-weight='900' fill='${fill}' opacity='${opacity}'>${letter}</text>`;
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>` +
      `<defs><pattern id='d' width='8' height='8' patternUnits='userSpaceOnUse'><circle cx='4' cy='4' r='1.4' fill='${s.dot}'/></pattern></defs>` +
      `<rect width='120' height='120' fill='${s.bg}'/><rect width='120' height='120' fill='url(#d)'/>` +
      glyph('#00c8ff', -3, 0.55) +
      glyph('#ff006e', 3, 0.45) +
      glyph(s.fg, 0, 1) +
      `</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // ------------------------------------------------------------- fields

  onName(event: Event) {
    this.draft.name = (event.target as HTMLInputElement).value;
    this.refreshOptions();
  }

  onPhone(event: Event) {
    this.draft.phone = (event.target as HTMLInputElement).value;
  }

  onEmail(event: Event) {
    this.draft.email = (event.target as HTMLInputElement).value;
  }

  formatPhone() {
    this.touched.phone = true;
    const pretty = this.normalizePhone(this.draft.phone);
    if (pretty) this.draft.phone = pretty;
  }

  get nameError(): string {
    const v = this.draft.name.trim();
    if (v.length < 2) return 'Tell us what to call you.';
    if (v.length > 40) return 'Keep it under 40 characters.';
    return '';
  }

  get phoneError(): string {
    return this.normalizePhone(this.draft.phone)
      ? ''
      : 'Use a PH mobile number, like 0917 123 4567.';
  }

  get emailError(): string {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.draft.email.trim())
      ? ''
      : "That email doesn't look right.";
  }

  private normalizePhone(value: string): string | null {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('63')) d = d.slice(2);
    else if (d.startsWith('0')) d = d.slice(1);
    if (!/^9\d{9}$/.test(d)) return null;
    return `+63 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }

  // -------------------------------------------------------- save / leave

  get dirty(): boolean {
    return this.snapshot() !== this.initial;
  }

  private snapshot(): string {
    const avatarKey =
      typeof this.avatarChoice === 'number'
        ? `s${this.avatarChoice}`
        : this.avatarChoice === 'upload'
          ? `u${this.uploadVersion}`
          : 'default';
    return JSON.stringify([
      this.draft.name.trim(),
      this.normalizePhone(this.draft.phone) ?? this.draft.phone.trim(),
      this.draft.email.trim(),
      avatarKey,
    ]);
  }

  async save() {
    this.touched = { name: true, phone: true, email: true };
    const phone = this.normalizePhone(this.draft.phone);
    if (this.nameError || !phone || this.emailError) {
      this.showToast('Fix the highlighted fields first.');
      return;
    }

    const stored = this.readStored();
    const user = {
      ...DEFAULT_USER,
      ...stored.user,
      name: this.draft.name.trim(),
      phone,
      email: this.draft.email.trim(),
      avatar: this.avatarSrc,
      avatarStyle: typeof this.avatarChoice === 'number' ? this.avatarChoice : null,
    };

    try {
      this.profileService.save({ ...stored, user });
    } catch {
      this.showToast('Could not save on this device.');
      return;
    }

    this.initial = this.snapshot();
    this.showToast('Profile updated.');
    this.leave();
  }

  async goBack() {
    if (!this.dirty) {
      this.leave();
      return;
    }
    const sheet = await this.alertController.create({
      header: 'Discard changes?',
      message: "Your edits won't be saved.",
      buttons: [
        { text: 'Keep editing', role: 'cancel' },
        { text: 'Discard', role: 'destructive', handler: () => this.leave() },
      ],
    });
    await sheet.present();
  }

  private leave() {
    const isFirstNavigation = (window.history.state?.navigationId ?? 2) <= 1;
    if (isFirstNavigation) {
      this.router.navigateByUrl('/profile', { replaceUrl: true });
    } else {
      this.location.back();
    }
  }

  private readStored(): StoredProfile {
    // Centralized storage: the service owns the storage key.
    return this.profileService.readStored();
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1700,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}