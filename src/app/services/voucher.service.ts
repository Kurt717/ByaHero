import { Injectable } from '@angular/core';

export interface Voucher {
  code: string;
  title: string;
  detail: string;
  kind: 'percent' | 'fixed';
  value: number; // percent value or peso amount
  minSpend: number;
  cap?: number; // max peso discount
  operators?: string[]; // restricted to these operators (empty = any route)
  used: boolean;
  /** Claimed to the Promo Wallet. Optional so older stored records
   *  (which only carry code + used) keep working — absent means unsaved. */
  saved?: boolean;
}

const CATALOG: Voucher[] = [
  {
    code: 'BAGUIO20',
    title: '20% Off Baguio Trips',
    detail: "Opened by Leo in the Alerts tab — 20% off any Victory Liner trip bound for Baguio.",
    kind: 'percent',
    value: 20,
    minSpend: 400,
    operators: ['Victory Liner'],
    used: false,
  },
  {
    code: 'NEWRIDER',
    title: '₱50 Off Your First Trip',
    detail: 'Welcome aboard. Fixed ₱50 off any route, one rider per trip.',
    kind: 'fixed',
    value: 50,
    minSpend: 150,
    used: false,
  },
  {
    code: 'ESCAPE20',
    title: '20% Off Any Route',
    detail: 'Peak-hour prices? Not today. 20% off any trip this load.',
    kind: 'percent',
    value: 20,
    minSpend: 300,
    used: true,
  },
  {
    code: 'WEEKEND50',
    title: '₱50 Off Local Runs',
    detail: 'Slippers + camera energy. Fixed ₱50 off Pamana and Florida routes.',
    kind: 'fixed',
    value: 50,
    minSpend: 250,
    operators: ['Pamana Transport', 'Florida Bus Line'],
    cap: 50,
    used: true,
  },
  {
    code: 'DAGUPAN20',
    title: '20% Off Dagupan Routes',
    detail: 'Roast pork stops are 20% cheaper. Only on Dagupan Bus Co. trips.',
    kind: 'percent',
    value: 20,
    minSpend: 400,
    operators: ['Dagupan Bus Co.'],
    used: true,
  },
];

const MANUAL_CODES: Record<string, Omit<Voucher, 'used'>> = {
  SAVE10: {
    code: 'SAVE10',
    title: '₱10 Mystery Off',
    detail: 'Entered manually — fixed ₱10 off any route.',
    kind: 'fixed',
    value: 10,
    minSpend: 0,
  },
  SEATS20: {
    code: 'SEATS20',
    title: '20% Off Your Seat',
    detail: 'Entered manually — 20% off any route.',
    kind: 'percent',
    value: 20,
    minSpend: 200,
    cap: 250,
  },
};

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly storageKey = 'byahero.vouchers.v1';
  private readonly manualKey = 'byahero.voucher-manual-used.v1';

  private get list(): Voucher[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return CATALOG.map((v) => ({ ...v }));
      const saved = JSON.parse(raw) as Voucher[];
      return CATALOG.map((c) => {
        const s = saved.find((x) => x.code === c.code);
        return s ? { ...c, used: s.used, saved: s.saved ?? false } : { ...c };
      });
    } catch {
      return CATALOG.map((v) => ({ ...v }));
    }
  }

  private persist(list: Voucher[]) {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(
          list.map(({ code, used, saved }) => ({ code, used, saved: !!saved })),
        ),
      );
    } catch {
      return;
    }
  }

  private usedManual(): string[] {
    try {
      const raw = localStorage.getItem(this.manualKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private persistManual(codes: string[]) {
    try {
      localStorage.setItem(this.manualKey, JSON.stringify(codes));
    } catch {
      return;
    }
  }

  getVouchers(): Voucher[] {
    return this.list;
  }

  /** Promo the rider picked in the Promo Wallet before a trip existed.
   *  Memory-only intent: the booking voucher step consumes it once a trip
   *  is in progress, then clears it. Never marks anything used by itself. */
  pendingCode: string | null = null;

  /** Takes and clears the pending promo code, if any. */
  consumePending(): string | null {
    const code = this.pendingCode;
    this.pendingCode = null;
    return code;
  }

  isSaved(code: string): boolean {
    return !!this.list.find((v) => v.code === code)?.saved;
  }

  /** Claims a promo into the wallet. Never touches used state. */
  save(code: string) {
    const next = this.list.map((v) =>
      v.code === code ? { ...v, saved: true } : v,
    );
    this.persist(next);
  }

  /** Removes a promo from the wallet. Never touches used state. */
  unsave(code: string) {
    const next = this.list.map((v) =>
      v.code === code ? { ...v, saved: false } : v,
    );
    this.persist(next);
  }

  operatorMatches(v: Voucher, operator: string): boolean {
    return !v.operators || v.operators.includes(operator);
  }

  eligibleAmount(v: Voucher, spend: number, operator: string): number {
    if (v.used || !this.operatorMatches(v, operator)) return 0;
    if (spend < v.minSpend) return 0;
    const base = v.kind === 'percent' ? Math.round((spend * v.value) / 100) : v.value;
    const capped = typeof v.cap === 'number' ? Math.min(base, v.cap) : base;
    return Math.min(capped, spend);
  }

  eligibles(spend: number, operator: string): Voucher[] {
    return this.list.filter((v) => this.eligibleAmount(v, spend, operator) > 0);
  }

  bestDiscountFor(spend: number, operator: string): number {
    return this.eligibles(spend, operator).reduce(
      (best, v) => Math.max(best, this.eligibleAmount(v, spend, operator)),
      0,
    );
  }

  /** Try to apply a voucher by code. Catalog vouchers must be unused and
   *  eligible for this trip; manual codes are honoured once per rider. */
  apply(
    code: string,
    spend: number,
    operator: string,
  ): { ok: true; voucher: Voucher } | { ok: false; error: string } {
    const clean = code.trim().toUpperCase();
    if (!clean) return { ok: false, error: 'Enter a voucher or promo code.' };

    for (const v of this.list) {
      if (v.code !== clean) continue;
      if (v.used) return { ok: false, error: `${v.code} has already been used.` };
      if (!this.operatorMatches(v, operator)) {
        return { ok: false, error: `${v.code} only works on ${v.operators?.join(' / ')} trips.` };
      }
      if (spend < v.minSpend) {
        return { ok: false, error: `Spend ${'₱ ' + v.minSpend.toLocaleString('en-PH')}+ more to use ${v.code}.` };
      }
      v.used = true;
      this.persist(this.list);
      return { ok: true, voucher: { ...v } };
    }

    const manual = MANUAL_CODES[clean];
    if (manual) {
      if (this.usedManual().includes(clean)) {
        return { ok: false, error: `${clean} has already been used.` };
      }
      if (spend < manual.minSpend) {
        return { ok: false, error: `Spend ${'₱ ' + manual.minSpend.toLocaleString('en-PH')}+ to use ${clean}.` };
      }
      this.persistManual([...this.usedManual(), clean]);
      return { ok: true, voucher: { ...manual, used: true } };
    }

    return { ok: false, error: `We couldn't find a voucher for “${clean}”. Check your code and try again.` };
  }

  /** Un-flag a used voucher so the rider can restore it. */
  release(voucher: Voucher) {
    const inCatalog = this.list.some((v) => v.code === voucher.code);
    if (inCatalog) {
      const next = this.list.map((v) =>
        v.code === voucher.code ? { ...v, used: false } : v,
      );
      this.persist(next);
    } else {
      this.persistManual(this.usedManual().filter((c) => c !== voucher.code));
    }
  }
}