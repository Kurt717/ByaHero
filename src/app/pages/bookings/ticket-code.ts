import QRCode from 'qrcode';
import type { Booking } from './ticket.service';

/**
 * Single shared source for scannable ticket codes.
 *
 * Canonical identifier = the existing stable `booking.bookingRef`
 * (e.g. `BYH-48291`). E-Ticket and Boarding Pass both render their QR
 * and barcode from this one value, so all four codes identify the
 * same ticket. Everything is generated locally (offline-safe) with no
 * randomness: same booking always yields the same codes.
 */

export function canonicalTicketCode(booking: Pick<Booking, 'bookingRef'>): string {
  return (booking.bookingRef ?? '').trim();
}

/** QR payload — the canonical identifier, nothing else. */
export function qrValueForBooking(booking: Pick<Booking, 'bookingRef'>): string {
  return canonicalTicketCode(booking);
}

export interface QrGrid {
  size: number;
  matrix: boolean[][];
}

/** Real QR matrix via the project's existing `qrcode` dependency. */
export function qrGridForValue(value: string): QrGrid {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const data = qr.modules.data as ArrayLike<number>;
  const matrix: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c++) row.push(Boolean(data[r * n + c]));
    matrix.push(row);
  }
  return { size: n, matrix };
}

/* ------------------------------------------------------------------ */
/* Code 128-B barcode (alphanumeric refs like `BYH-48291`).            */
/* Patterns are bar/space widths; stop has 7 elements (13 modules).    */
/* ------------------------------------------------------------------ */

const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213',
  '122312', '132212', '221213', '221312', '231212', '112232', '122132',
  '122231', '113222', '123122', '123221', '223211', '221132', '221231',
  '213212', '223112', '312131', '311222', '321122', '321221', '312212',
  '322112', '322211', '212123', '212321', '232121', '111323', '131123',
  '131321', '112313', '132113', '132311', '211313', '231113', '231311',
  '112133', '112331', '132131', '113123', '113321', '133121', '313121',
  '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111',
  '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114',
  '413111', '241112', '134111', '111242', '121142', '121241', '114212',
  '124112', '124211', '411212', '421112', '421211', '212141', '214121',
  '412121', '111143', '111341', '131141', '114113', '114311', '411113',
  '411311', '113141', '114131', '311141', '411131',
];

const CODE128_START_B = '211214';
const CODE128_STOP = '2331112';
const CODE128_QUIET = 10; // modules of quiet zone on each side

export interface BarcodeBars {
  bars: { x: number; w: number }[];
  total: number;
}

/** Standards-compliant Code 128-B bars for the canonical identifier. */
export function code128BarsForValue(value: string): BarcodeBars {
  const clean = (value ?? '').trim();
  if (!clean || clean.length > 48) return { bars: [], total: 0 };
  const codes: number[] = [];
  for (const ch of clean) {
    const code = ch.charCodeAt(0) - 32;
    if (code < 0 || code > 94) return { bars: [], total: 0 };
    codes.push(code);
  }

  let checksum = 104; // Start B value
  codes.forEach((code, i) => {
    checksum += (i + 1) * code;
  });
  checksum %= 103;

  let modules = '0'.repeat(CODE128_QUIET);
  const append = (pattern: string) => {
    let bar = true;
    for (const ch of pattern) {
      const w = Number(ch);
      modules += bar ? '1'.repeat(w) : '0'.repeat(w);
      bar = !bar;
    }
  };
  append(CODE128_START_B);
  codes.forEach((code) => append(CODE128_PATTERNS[code]));
  append(CODE128_PATTERNS[checksum]);
  append(CODE128_STOP);
  modules += '0'.repeat(CODE128_QUIET);

  const bars: { x: number; w: number }[] = [];
  let x = 0;
  let run = 0;
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === '1') {
      run++;
    } else if (run) {
      bars.push({ x: x - run, w: run });
      run = 0;
    }
    x++;
  }
  if (run) bars.push({ x: x - run, w: run });
  return { bars, total: modules.length };
}
