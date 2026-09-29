import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ProfileUser {
  name: string;
  tier: string;
  memberSince: string;
  heroId: string;
  phone: string;
  email: string;
  avatar: string;
  verified: boolean;
  avatarStyle?: number | null;
}

export interface WalletState {
  balance: string;
  last4: string;
}

export interface TrustedContact {
  name: string;
  phone: string;
}

export interface PaymentMethodCard {
  type: 'card';
  label: string;
  last4: string;
}

export interface EwalletMethod {
  type: 'gcash' | 'maya';
  account?: string;
}

export type StoredPaymentMethod = (
  | PaymentMethodCard
  | EwalletMethod
  | { type: 'cash' }
) & { default?: boolean };

export type WalletTxKind = 'topup' | 'ride' | 'sent' | 'refund';

export interface WalletTx {
  id: string;
  kind: WalletTxKind;
  title: string;
  subtitle: string;
  amount: number; // signed: positive = money in, negative = money out
  date: string; // display label, e.g. 'Sep 22, 2026'
  time: string; // display label, e.g. '10:42 AM'
  source: string; // payment method label
  status: 'success' | 'pending' | 'failed';
  ref: string;
  route?: string;
  vehicle?: string;
  recipient?: string;
  note?: string;
}

export interface StoredProfile {
  user?: Partial<ProfileUser>;
  wallet?: Partial<WalletState>;
  trustedContacts?: TrustedContact[];
  paymentMethods?: StoredPaymentMethod[];
  walletTransactions?: WalletTx[];
  [key: string]: unknown;
}

/** Keep in sync with DEFAULT_USER in edit-profile.page.ts and
 *  the default `user` object in profile.page.ts. */
export const DEFAULT_PROFILE_USER: ProfileUser = {
  name: 'Nonie',
  tier: 'Gold',
  memberSince: '2024',
  heroId: 'BYH-KF-0482',
  phone: '+63 917 123 4567',
  email: 'keilah@email.com',
  avatar: 'https://ionicframework.com/docs/img/demos/avatar.svg',
  verified: true,
  avatarStyle: null,
};

export const DEFAULT_WALLET: WalletState = {
  balance: '850.00',
  last4: '4821',
};

@Injectable({ providedIn: 'root' })
export class ProfileService {
  readonly storageKey = 'byahero.profile.v1';

  /** Centralized reactive store: every page subscribes to `user$`
   *  instead of only re-reading localStorage on view enter, so an
   *  edit on Edit Profile instantly reflects on Home, Profile,
   *  Wallet, tickets, etc. */
  private readonly userSubject = new BehaviorSubject<ProfileUser>(
    this.readStoredUser(),
  );
  readonly user$ = this.userSubject.asObservable();

  /** Current snapshot without subscribing (e.g. one-off ticket creation). */
  get currentUser(): ProfileUser {
    return this.userSubject.value;
  }

  /** Merge a patch into the stored user and push it to all subscribers. */
  updateUser(patch: Partial<ProfileUser>): ProfileUser {
    const next = { ...this.read(), ...patch };
    this.save({ user: next });
    return next;
  }

  /** Push the latest stored user to subscribers (e.g. after external writes). */
  refreshUser(): void {
    try {
      this.userSubject.next(this.read());
    } catch {
      return;
    }
  }

  private readStoredUser(): ProfileUser {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const saved = raw ? (JSON.parse(raw) as StoredProfile) : {};
      return { ...DEFAULT_PROFILE_USER, ...saved.user };
    } catch {
      return { ...DEFAULT_PROFILE_USER };
    }
  }

  // ------------------------------------------------------- generic I/O

  readStored(): StoredProfile {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as StoredProfile) : {};
    } catch {
      return {};
    }
  }

  save(profile: StoredProfile): void {
    try {
      const merged = { ...this.readStored(), ...profile };
      localStorage.setItem(this.storageKey, JSON.stringify(merged));
    } catch {
      return;
    }
    // Centralized push: any save carrying a user (or anything else)
    // re-emits the latest snapshot so subscribers stay in sync.
    this.refreshUser();
  }

  /** Reads the stored profile, merged over defaults so every page
   *  renders the same data without drifting. */
  read(): ProfileUser {
    const saved = this.readStored();
    return { ...DEFAULT_PROFILE_USER, ...saved.user };
  }

  // ------------------------------------------------------------- wallet

  readWallet(): WalletState {
    const saved = this.readStored();
    return { ...DEFAULT_WALLET, ...saved.wallet };
  }

  walletBalance(): number {
    const raw = this.readWallet().balance.replace(/[^0-9.]/g, '');
    const n = Number(raw);
    return isNaN(n) ? 0 : n;
  }

  addWallet(amount: number, source?: string): number {
    const next = Math.round((this.walletBalance() + amount) * 100) / 100;
    this.setWalletBalance(next);
    const label = source ?? `Card •••• ${this.readWallet().last4}`;
    const ref = `TOP-${this.randRef()}`;
    this.recordWalletTx({
      id: `T-${this.randRef()}`,
      kind: 'topup',
      title: 'Wallet Top-up',
      subtitle: label,
      amount,
      date: this.todayLabel(),
      time: this.nowLabel(),
      source: label,
      status: 'success',
      ref,
    });
    return next;
  }

  /** Deducts from the wallet; returns false when the balance is short. */
  deductWallet(amount: number): boolean {
    const balance = this.walletBalance();
    if (amount > balance) return false;
    this.setWalletBalance(Math.round((balance - amount) * 100) / 100);
    return true;
  }

  /** Sends money to a contact; returns false when the balance is short. */
  sendMoney(amount: number, recipient: string, note?: string): boolean {
    if (!this.deductWallet(amount)) return false;
    const ref = `SD-${this.randRef()}`;
    this.recordWalletTx({
      id: `T-${this.randRef()}`,
      kind: 'sent',
      title: 'Send Money',
      subtitle: recipient,
      amount: -amount,
      date: this.todayLabel(),
      time: this.nowLabel(),
      source: 'ByaHero Wallet',
      status: 'success',
      ref,
      recipient,
      note,
    });
    return true;
  }

  /** Credits a cancelled-trip fare straight back to the wallet. */
  refundWallet(
    amount: number,
    title: string,
    subtitle: string,
    ref: string,
    note?: string,
  ): number {
    const next = Math.round((this.walletBalance() + amount) * 100) / 100;
    this.setWalletBalance(next);
    this.recordWalletTx({
      id: `T-${this.randRef()}`,
      kind: 'refund',
      title,
      subtitle,
      amount,
      date: this.todayLabel(),
      time: this.nowLabel(),
      source: 'ByaHero Wallet',
      status: 'success',
      ref,
      note,
    });
    return next;
  }

  private setWalletBalance(balance: number) {
    this.save({
      wallet: {
        balance: balance.toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      },
    });
  }

  // ------------------------------------------------------ trusted contacts

  readTrustedContacts(): TrustedContact[] {
    const saved = this.readStored();
    return Array.isArray(saved.trustedContacts)
      ? saved.trustedContacts
      : [
          { name: 'Ana Cruz', phone: '+63 917 555 0101' },
          { name: 'Marco Santos', phone: '+63 917 555 0102' },
        ];
  }

  saveTrustedContacts(contacts: TrustedContact[]) {
    this.save({ trustedContacts: contacts });
  }

  // ----------------------------------------------------- payment methods

  readPaymentMethods(): StoredPaymentMethod[] {
    const saved = this.readStored();
    if (Array.isArray(saved.paymentMethods)) return saved.paymentMethods;
    return [
      { type: 'card', label: 'Visa •••• 4821', last4: '4821', default: true },
      { type: 'gcash', account: '09174567890' },
      { type: 'cash' },
      { type: 'maya', account: '09281234567' },
    ];
  }

  savePaymentMethods(methods: StoredPaymentMethod[]) {
    this.save({ paymentMethods: methods });
  }

  // ----------------------------------------------------- wallet transactions

  readWalletTransactions(): WalletTx[] {
    const saved = this.readStored();
    if (Array.isArray(saved.walletTransactions)) return saved.walletTransactions;
    return [
      {
        id: 'T-10084',
        kind: 'topup',
        title: 'Wallet Top-up',
        subtitle: 'GCash',
        amount: 500,
        date: 'Sep 22, 2026',
        time: '9:15 AM',
        source: 'GCash',
        status: 'success',
        ref: 'TOP-10084',
      },
      {
        id: 'T-79241',
        kind: 'refund',
        title: 'Refund',
        subtitle: 'Florida Bus Line · Manila (PITX) → Vigan City',
        amount: 750,
        date: 'Sep 12, 2026',
        time: '2:20 PM',
        source: 'ByaHero Wallet',
        status: 'success',
        ref: 'REF-79241',
        route: 'Manila (PITX) → Vigan City',
        vehicle: 'Florida Bus Line · Seat 03A',
      },
      {
        id: 'T-09720',
        kind: 'topup',
        title: 'Wallet Top-up',
        subtitle: 'Maya',
        amount: 800,
        date: 'Sep 08, 2026',
        time: '6:12 PM',
        source: 'Maya',
        status: 'success',
        ref: 'TOP-09720',
      },
    ];
  }

  recordWalletTx(txn: WalletTx) {
    const list = [txn, ...this.readWalletTransactions()].slice(0, 24);
    this.save({ walletTransactions: list });
  }

  private randRef(): string {
    return `${Math.floor(1000 + Math.random() * 9000)}${Math.floor(
      10 + Math.random() * 89,
    )}`;
  }

  private todayLabel(): string {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private nowLabel(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}