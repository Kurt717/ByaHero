import { Injectable, inject } from '@angular/core';
import { ProfileService } from '../pages/profile/profile.service';

export interface AuthUser {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface Session {
  email: string;
  name?: string;
  provider?: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usersKey = 'byahero.users.v1';
  private readonly sessionKey = 'byahero.session.v1';
  private readonly onboardingKey = 'byahero.onboarding.v1';

  private profileService = inject(ProfileService);

  // ------------------------------------------------------------- users

  /** All registered accounts, keyed by lowercased email. */
  readUsers(): Record<string, AuthUser> {
    try {
      const raw = localStorage.getItem(this.usersKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeUsers(users: Record<string, AuthUser>) {
    try {
      localStorage.setItem(this.usersKey, JSON.stringify(users));
    } catch {
      return;
    }
  }

  findByEmail(email: string): AuthUser | undefined {
    return this.readUsers()[email.trim().toLowerCase()];
  }

  signup(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): AuthResult {
    const email = data.email.trim().toLowerCase();
    if (!email || data.name.trim().length < 2) {
      return { ok: false, error: 'Please provide your name and a valid email.' };
    }
    if (data.password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const users = this.readUsers();
    if (users[email]) {
      return { ok: false, error: 'An account with that email already exists. Try logging in.' };
    }

    const name = data.name.trim();
    users[email] = {
      name,
      email,
      phone: data.phone.trim(),
      password: data.password,
    };
    this.writeUsers(users);
    this.writeSession({ email, name });
    this.profileService.save({
      user: { name, email, phone: data.phone.trim() },
    });
    return { ok: true };
  }

  login(email: string, password: string): AuthResult {
    const user = this.findByEmail(email);
    if (!user) {
      return { ok: false, error: 'No account found with that email. Please sign up first.' };
    }
    if (user.password !== password) {
      return { ok: false, error: 'That password does not match our records.' };
    }
    this.writeSession({ email: user.email, name: user.name });
    this.profileService.save({ user: { name: user.name, email: user.email, phone: user.phone } });
    return { ok: true };
  }

  /** Social login for the prototype: signs in (or creates) the demo user. */
  loginWith(provider: string): AuthResult {
    const name = `${provider} Rider`;
    const email = `${provider.toLowerCase().replace(/\s+/g, '')}@demo.byahero`;
    const users = this.readUsers();

    if (!users[email]) {
      users[email] = { name, email, phone: '+63 900 000 0000', password: 'demo123' };
      this.writeUsers(users);
    }

    this.writeSession({ email, name, provider });
    this.profileService.save({ user: { name, email, phone: '+63 900 000 0000' } });
    return { ok: true };
  }

  resetPassword(email: string, newPassword: string): AuthResult {
    const user = this.findByEmail(email);
    if (!user) {
      return { ok: false, error: 'No account found with that email.' };
    }
    if (newPassword.length < 6) {
      return { ok: false, error: 'New password must be at least 6 characters.' };
    }
    const users = this.readUsers();
    users[email.trim().toLowerCase()] = { ...user, password: newPassword };
    this.writeUsers(users);
    return { ok: true };
  }

  // ------------------------------------------------------------ session

  readSession(): Session | null {
    try {
      const raw = localStorage.getItem(this.sessionKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Session;
      return parsed && typeof parsed.email === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  writeSession(session: Session) {
    try {
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
    } catch {
      return;
    }
  }

  isAuthenticated(): boolean {
    return this.readSession() !== null;
  }

  logout() {
    try {
      localStorage.removeItem(this.sessionKey);
    } catch {
      return;
    }
  }

  // ---------------------------------------------------------- onboarding

  isOnboarded(): boolean {
    try {
      return localStorage.getItem(this.onboardingKey) === 'true';
    } catch {
      return false;
    }
  }

  setOnboarded() {
    try {
      localStorage.setItem(this.onboardingKey, 'true');
    } catch {
      return;
    }
  }
}