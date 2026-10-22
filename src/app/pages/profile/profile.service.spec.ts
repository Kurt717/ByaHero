import { TestBed } from '@angular/core/testing';
import { ProfileService, DEFAULT_WALLET } from './profile.service';

describe('ProfileService - Reactive Wallet', () => {
  let svc: ProfileService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ProfileService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes wallet$ with DEFAULT_WALLET', () => {
    const current = svc.currentWallet;
    expect(current).toBeDefined();
    expect(current.balance).toBe(DEFAULT_WALLET.balance);
    expect(current.last4).toBe(DEFAULT_WALLET.last4);
  });

  it('updates wallet$ reactively when adding money', () => {
    let emittedBalance: string | undefined;
    const sub = svc.wallet$.subscribe((w) => {
      emittedBalance = w.balance;
    });

    const initialBal = svc.walletBalance();
    const newBal = svc.addWallet(500, 'GCash');

    expect(newBal).toBe(initialBal + 500);
    expect(emittedBalance).toBe(newBal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    expect(svc.currentWallet.balance).toBe(emittedBalance);

    sub.unsubscribe();
  });

  it('updates wallet$ reactively when sending money', () => {
    let emittedBalance: string | undefined;
    const sub = svc.wallet$.subscribe((w) => {
      emittedBalance = w.balance;
    });

    const initialBal = svc.walletBalance();
    const success = svc.sendMoney(200, 'Ana Cruz');

    expect(success).toBe(true);
    const expected = (initialBal - 200).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(emittedBalance).toBe(expected);
    expect(svc.currentWallet.balance).toBe(expected);

    sub.unsubscribe();
  });

  it('refuses to send money if insufficient balance', () => {
    const initialBal = svc.walletBalance();
    const success = svc.sendMoney(initialBal + 1000, 'Ana Cruz');

    expect(success).toBe(false);
    expect(svc.walletBalance()).toBe(initialBal);
  });

  it('preserves existing last4 and user fields when saving partial wallet updates', () => {
    svc.save({
      user: { name: 'Test User' },
      wallet: { balance: '1,234.56', last4: '9999' },
    });

    expect(svc.read().name).toBe('Test User');
    expect(svc.currentWallet.last4).toBe('9999');

    // Now update only the balance
    svc.save({ wallet: { balance: '2,000.00' } });

    expect(svc.currentWallet.balance).toBe('2,000.00');
    expect(svc.currentWallet.last4).toBe('9999'); // preserved!
    expect(svc.read().name).toBe('Test User'); // preserved!
  });
});
