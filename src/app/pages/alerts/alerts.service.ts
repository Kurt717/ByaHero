import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { TripSummary } from '../booking/booking.service';
import {
  PickupService,
  PickupZone,
} from '../../services/pickup.service';
import { TicketService } from '../bookings/ticket.service';
import { TripReminderService } from '../../services/trip-reminder.service';
import { ProfileService } from '../profile/profile.service';

export interface SosContact {
  name: string;
  phone: string;
}

export type AlertType =
  | 'delay'
  | 'boarding'
  | 'cancelled'
  | 'promo'
  | 'price'
  | 'system';
export type DayGroup = 'Today' | 'Yesterday' | 'Earlier';
export type ChatAvatarType = 'support' | 'driver' | 'system';
export type CtaKind =
  | 'ticket'
  | 'track'
  | 'search'
  | 'book'
  | 'chat'
  | 'bookings'
  | 'copy';

export interface AlertFact {
  label: string;
  value: string;
  wide?: boolean;
  hot?: boolean;
}

export interface AlertStep {
  title: string;
  note: string;
  state: 'done' | 'now' | 'next';
}

export interface AlertSpotlight {
  kind: 'board' | 'shift' | 'refund' | 'coupon' | 'fare' | 'feature';
  big?: string;
  bigLabel?: string;
  from?: string;
  to?: string;
  badge?: string;
  note?: string;
  code?: string;
  series?: number[];
}

export interface AlertCta {
  label: string;
  icon: string;
  kind: CtaKind;
  ref?: string;
  chatId?: string;
  trip?: TripSummary;
  text?: string;
}

export interface AlertDetail {
  sticker: string;
  lead: string;
  spotlight: AlertSpotlight;
  facts: AlertFact[];
  stepsTitle: string;
  steps: AlertStep[];
  primary: AlertCta;
  secondary?: AlertCta;
}

export interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  time: string;
  day: DayGroup;
  unread: boolean;
  detail: AlertDetail;
}

export interface ChatMessage {
  id: string;
  from: 'me' | 'them';
  text: string;
  time: string;
  day: string;
  read?: boolean;
}

export interface ChatContext {
  kind: 'ticket' | 'live' | 'bookings';
  ref?: string;
  title: string;
  sub: string;
  cta: string;
}

export interface ChatThread {
  id: string;
  name: string;
  presence: string;
  live: boolean;
  lastMessage: string;
  time: string;
  unread: number;
  avatarType: ChatAvatarType;
  context: ChatContext;
  quick: string[];
  messages: ChatMessage[];
}

interface SavedAlerts {
  unread?: Record<string, boolean>;
  deleted?: string[];
}

interface SavedChats {
  extra?: Record<string, ChatMessage[]>;
  unread?: Record<string, number>;
  order?: string[];
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly alertKey = 'byahero.alerts.v1';
  private readonly chatKey = 'byahero.chats.v1';
  private readonly ticketService = inject(TicketService);
  private readonly reminderService = inject(TripReminderService);
  private readonly profileService = inject(ProfileService);
  private readonly pickupService = inject(PickupService);

  /** Fires with a chat id whenever that thread gains a message or starts typing. */
  readonly messageAdded$ = new Subject<string>();

  /** Set by the open chat page so replies don't count as unread while you're looking at them. */
  activeChatId: string | null = null;

  alerts: AlertItem[] = [];
  chats: ChatThread[] = [];

  private deleted: string[] = [];
  private typing = new Set<string>();
  private timers = new Map<string, number>();
  private counter = 0;

  private readonly rules: Record<
    ChatAvatarType,
    { test: RegExp; reply: string }[]
  > = {
    support: [
      {
        test: /refund|money|bayad/i,
        reply:
          'Refunds reach your GCash within 1 to 3 banking days after approval. For BYH-46590 it is already on the way.',
      },
      {
        test: /seat|upuan/i,
        reply:
          'Seat changes are open until 2 hours before departure. Send us your booking ref and the seat you want, and we will check it.',
      },
      {
        test: /cancel/i,
        reply:
          'You can cancel from your e-ticket. Cancel 24 hours or more before departure for a full refund.',
      },
      {
        test: /thank|salamat/i,
        reply: 'Happy to help po! Safe travels, Kabyahe.',
      },
    ],
    system: [
      {
        test: /where|bus|asan|location/i,
        reply:
          'Your Victory Liner is 3 stops from Tuguegarao Terminal, about 12 minutes out. Tap Track live to watch it move.',
      },
      {
        test: /eta|arriv|when|kailan/i,
        reply:
          'Estimated arrival at Tuguegarao Terminal is in about 12 minutes, traffic permitting.',
      },
      {
        test: /share/i,
        reply:
          'Trip sharing is on. Your trusted contacts get a live link while you ride.',
      },
      { test: /thank|salamat/i, reply: 'Anytime. Safe travels!' },
    ],
    driver: [
      {
        test: /asan|nasaan|nasa|where/i,
        reply: 'Nandito po ako sa Bay 5, puting bus po, plate ending 4821.',
      },
      {
        test: /papunta|on my way|malapit|late|hintay|wait/i,
        reply: 'Sige po, hihintayin ko kayo. Aalis po tayo ng 2:00 PM.',
      },
      {
        test: /salamat|thank/i,
        reply: 'Walang anuman po! Ingat po sa biyahe.',
      },
    ],
  };

  private readonly fallback: Record<ChatAvatarType, string> = {
    support:
      'Thanks po, message received. An agent is on it and will reply here shortly.',
    system:
      'I can help with live bus location, arrival times, and trip sharing. Try asking "Where is my bus?"',
    driver: 'Sige po, copy. Message lang po kung may kailangan.',
  };

  constructor() {
    this.alerts = this.buildAlerts();
    this.chats = this.buildChats();
  }

  /** Rebuilds alerts and chat threads so new bookings show up immediately. */
  rebuild() {
    this.alerts = this.buildAlerts();
    this.chats = this.buildChats();
  }

  // ---------------------------------------------------------------- ALERTS

  get unreadAlerts(): number {
    return this.alerts.filter((a) => a.unread).length;
  }

  /** Trusted contacts used by the SOS flow on the live trip screen. */
  sosContacts(): SosContact[] {
    return this.profileService.readTrustedContacts().map((c) => ({
      name: c.name,
      phone: c.phone,
    }));
  }

  getAlert(id: string): AlertItem | undefined {
    return this.alerts.find((a) => a.id === id);
  }

  setAlertUnread(id: string, unread: boolean) {
    const alert = this.getAlert(id);
    if (!alert) return;
    alert.unread = unread;
    this.persistAlerts();
  }

  markAllAlertsRead() {
    this.alerts.forEach((a) => (a.unread = false));
    this.persistAlerts();
  }

  removeAlert(id: string) {
    this.alerts = this.alerts.filter((a) => a.id !== id);
    if (!this.deleted.includes(id)) this.deleted.push(id);
    this.persistAlerts();
  }

  // ----------------------------------------------------------------- CHATS

  get unreadChats(): number {
    return this.chats.reduce((sum, c) => sum + c.unread, 0);
  }

  getChat(id: string): ChatThread | undefined {
    return this.chats.find((c) => c.id === id);
  }

  openChat(id: string) {
    const chat = this.getChat(id);
    if (!chat || chat.unread === 0) return;
    chat.unread = 0;
    this.persistChats();
  }

  markAllChatsRead() {
    this.chats.forEach((c) => (c.unread = 0));
    this.persistChats();
  }

  isTyping(id: string): boolean {
    return this.typing.has(id);
  }

  send(chatId: string, raw: string) {
    const chat = this.getChat(chatId);
    const text = raw.trim();
    if (!chat || !text) return;
    this.push(chat, 'me', text);
    this.scheduleReply(chat, text);
  }

  // --------------------------------------------------------------- PRIVATE

  private scheduleReply(chat: ChatThread, text: string) {
    window.clearTimeout(this.timers.get(chat.id));
    this.typing.delete(chat.id);

    const think = 600 + Math.random() * 500;
    const typeFor = 1200 + Math.min(text.length * 30, 1500);

    this.timers.set(
      chat.id,
      window.setTimeout(() => {
        this.typing.add(chat.id);
        this.messageAdded$.next(chat.id);

        this.timers.set(
          chat.id,
          window.setTimeout(() => {
            this.typing.delete(chat.id);
            chat.messages.forEach((m) => {
              if (m.from === 'me') m.read = true;
            });
            this.push(chat, 'them', this.replyFor(chat, text));
          }, typeFor),
        );
      }, think),
    );
  }

  private replyFor(chat: ChatThread, text: string): string {
    const hit = this.rules[chat.avatarType].find((r) => r.test.test(text));
    return hit ? hit.reply : this.fallback[chat.avatarType];
  }

  private push(chat: ChatThread, from: 'me' | 'them', text: string) {
    chat.messages.push({
      id: `n-${Date.now()}-${++this.counter}`,
      from,
      text,
      time: this.clock(),
      day: 'Today',
      read: from === 'me' ? false : undefined,
    });
    if (from === 'them' && this.activeChatId !== chat.id) chat.unread++;
    this.refresh(chat);

    const i = this.chats.indexOf(chat);
    if (i > 0) {
      this.chats.splice(i, 1);
      this.chats.unshift(chat);
    }

    this.persistChats();
    this.messageAdded$.next(chat.id);
  }

  private refresh(chat: ChatThread) {
    const last = chat.messages[chat.messages.length - 1];
    if (!last) return;
    chat.lastMessage = last.text;
    chat.time = last.day === 'Today' ? last.time : last.day;
  }

  private clock(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Memory-only if storage is unavailable.
    }
  }

  private buildAlerts(): AlertItem[] {
    const saved = this.read<SavedAlerts>(this.alertKey);
    this.deleted = saved?.deleted ?? [];
    return [...this.bookingAlerts(), ...this.pickupAlerts(), ...this.reminderAlerts(), ...this.seedAlerts()]
      .filter((a) => !this.deleted.includes(a.id))
      .map((a) => ({ ...a, unread: saved?.unread?.[a.id] ?? a.unread }));
  }

  private persistAlerts() {
    const unread: Record<string, boolean> = {};
    this.alerts.forEach((a) => (unread[a.id] = a.unread));
    this.write(this.alertKey, { unread, deleted: this.deleted });
  }

  private buildChats(): ChatThread[] {
    const saved = this.read<SavedChats>(this.chatKey);
    const chats = [...this.bookingChats(), ...this.seedChats()].map((c) => {
      const extra = saved?.extra?.[c.id] ?? [];
      const chat: ChatThread = {
        ...c,
        messages: [...c.messages, ...extra],
        unread: saved?.unread?.[c.id] ?? c.unread,
      };
      this.refresh(chat);
      return chat;
    });

    const order = saved?.order ?? [];
    if (order.length) {
      const rank = (id: string) => {
        const i = order.indexOf(id);
        return i === -1 ? order.length : i;
      };
      chats.sort((a, b) => rank(a.id) - rank(b.id));
    }
    return chats;
  }

  private persistChats() {
    const extra: Record<string, ChatMessage[]> = {};
    const unread: Record<string, number> = {};
    this.chats.forEach((c) => {
      extra[c.id] = c.messages.filter((m) => m.id.startsWith('n-'));
      unread[c.id] = c.unread;
    });
    this.write(this.chatKey, {
      extra,
      unread,
      order: this.chats.map((c) => c.id),
    });
  }

  // ------------------------------------------------------------- BOOKINGS

  /** Status alerts derived from the user's actual bookings. */
  private bookingAlerts(): AlertItem[] {
    const active = this.ticketService.bookings.filter(
      (b) => b.status !== 'completed' && b.status !== 'cancelled',
    );
    return active.slice(0, 4).map((b): AlertItem => {
      const boarding = b.status === 'boarding';
      return {
        id: `bk-${b.bookingRef}`,
        type: boarding ? 'boarding' : 'system',
        title: boarding
          ? `${b.operator} is boarding now`
          : `Trip to ${b.to} confirmed`,
        body: `${b.operator} · ${b.from} → ${b.to} · ${b.time} · ${b.date}`,
        time: boarding ? b.time : b.date,
        day: this.bookingDay(b.date),
        unread: true,
        detail: {
          sticker: boarding ? 'ON\nBOARD' : 'BOOKED',
          lead: boarding
            ? `Your ${b.operator} trip to ${b.to} is boarding now. Keep your e-ticket QR ready and head to the gate.`
            : `Your ${b.operator} trip to ${b.to} is confirmed. The conductor scans the QR on your e-ticket when you board.`,
          spotlight: {
            kind: boarding ? 'board' : 'feature',
            big: boarding ? b.seat.replace('Seat ', '') : '1',
            bigLabel: boarding ? 'Seat' : 'Passenger',
            note: boarding ? `${b.time} departure` : b.date,
            badge: b.bookingRef,
          },
          facts: [
            { label: 'Route', value: `${b.from} → ${b.to}`, wide: true },
            { label: 'Operator', value: b.operator },
            { label: 'Departure', value: `${b.date} · ${b.time}`, hot: true },
            { label: 'Fare', value: b.fare },
          ],
          stepsTitle: 'Your trip',
          steps: [
            {
              title: 'E-ticket saved',
              note: `Reference ${b.bookingRef}`,
              state: 'done',
            },
            {
              title: boarding ? 'Board the bus' : 'Show QR at the gate',
              note: b.time,
              state: boarding ? 'now' : 'next',
            },
            {
              title: `Arrive in ${b.to}`,
              note: 'Safe travels, Kabyahe!',
              state: 'next',
            },
          ],
          primary: {
            label: 'Open e-ticket',
            icon: 'ticket-outline',
            kind: 'ticket',
            ref: b.bookingRef,
          },
          secondary: boarding
            ? { label: 'Track bus', icon: 'navigate-outline', kind: 'track' }
            : { label: 'Ask driver', icon: 'chatbubble-ellipses-outline', kind: 'chat', chatId: `cd-${b.bookingRef}` },
        },
      };
    });
  }

  /**
   * Pickup-distance alerts for active bookings with a chosen boarding point.
   * One alert per booking reflecting the CURRENT zone (id includes the zone,
   * so escalating far → approaching → near → arrived surfaces a fresh item
   * while the notified lifecycle in PickupService prevents repeat spam).
   * Only built when current + pickup coordinates are actually known.
   */
  private pickupAlerts(): AlertItem[] {
    const active = this.ticketService.bookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'boarding',
    );
    const out: AlertItem[] = [];
    for (const b of active.slice(0, 4)) {
      const state = this.pickupService.stateForBooking(b.bookingRef, {
        label: b.pickup ?? '',
        lat: b.pickupLat,
        lng: b.pickupLng,
      });
      if (!state?.pickup || !state.current) continue;
      const evaluated = this.pickupService.evaluate(state);
      if (evaluated.zone === 'unknown' || evaluated.distanceM == null) continue;
      const zone: Exclude<PickupZone, 'unknown'> = evaluated.zone;
      if (evaluated.isNew) {
        this.pickupService.markNotifiedForBooking(b.bookingRef, zone);
      }
      const dist =
        this.pickupService.formatDistance(evaluated.distanceM) ?? '';
      const copy = this.pickupAlertCopy(zone, b.pickup ?? b.from, dist);
      out.push({
        id: `pickup-${b.bookingRef}-${zone}`,
        type: 'system',
        title: copy.title,
        body: copy.body,
        time: b.time,
        day: this.bookingDay(b.date),
        unread: true,
        detail: {
          sticker: copy.sticker,
          lead: copy.body,
          spotlight: {
            kind: 'feature',
            big: dist.replace(' away', ''),
            bigLabel: 'away',
            note: b.pickup ?? b.from,
            badge: b.bookingRef,
          },
          facts: [
            { label: 'Pickup point', value: b.pickup ?? b.from, wide: true },
            { label: 'Distance', value: dist || 'Unknown', hot: true },
            { label: 'Route', value: `${b.from} → ${b.to}`, wide: true },
            { label: 'Departure', value: `${b.date} · ${b.time}` },
          ],
          stepsTitle: 'Get to your pickup',
          steps: [
            {
              title: zone === 'arrived' ? 'Wait at the pickup point' : `Head to ${b.pickup ?? b.from}`,
              note: dist || 'Distance unknown',
              state: 'now',
            },
            {
              title: 'Show e-ticket when boarding',
              note: b.bookingRef,
              state: 'next',
            },
            {
              title: `Arrive in ${b.to}`,
              note: 'Safe travels, Kabyahe!',
              state: 'next',
            },
          ],
          primary: {
            label: 'View Live Trip',
            icon: 'navigate-outline',
            kind: 'track',
          },
          secondary: {
            label: 'Open e-ticket',
            icon: 'ticket-outline',
            kind: 'ticket',
            ref: b.bookingRef,
          },
        },
      });
    }
    return out;
  }

  private pickupAlertCopy(
    zone: Exclude<PickupZone, 'unknown'>,
    pickupLabel: string,
    dist: string,
  ): { title: string; body: string; sticker: string } {
    switch (zone) {
      case 'far':
        return {
          title: `Pickup point is ${dist}`,
          body: `Your pickup point ${pickupLabel} is ${dist} from your current location. Make your way there so you don't miss your trip.`,
          sticker: 'HEAD\nOUT',
        };
      case 'approaching':
        return {
          title: 'Approaching your pickup point',
          body: `You are ${dist} from ${pickupLabel}. Head there now and keep your e-ticket ready.`,
          sticker: 'ON THE\nWAY',
        };
      case 'near':
        return {
          title: "You're near your pickup point",
          body: `Only ${dist} to ${pickupLabel}. Stay where the driver can see you.`,
          sticker: 'CLOSE!',
        };
      case 'arrived':
        return {
          title: "You've arrived at your pickup point",
          body: `Wait at ${pickupLabel}. Your driver will stop for you — have your e-ticket QR ready.`,
          sticker: 'HERE!',
        };
    }
  }

  /** One in-app reminder alert for the currently due trip stage, if
   *  any. Bounded (a single alert, superseded by the next stage) and
   *  honest: it opens the ticket, never claims a push was sent. */
  private reminderAlerts(): AlertItem[] {
    const due = this.reminderService.due();
    if (!due) return [];
    const b = due.booking;
    const copy = this.reminderService.stageCopy(due.stage, b);
    const window =
      due.stage === 'day' ? '24H' : due.stage === 'hours' ? '3H' : '30M';
    return [
      {
        id: `reminder-${b.bookingRef}-${due.stage}`,
        type: 'system',
        title: `${copy.title} — trip to ${b.to}`,
        body: copy.body,
        time: b.time,
        day: this.bookingDay(b.date),
        unread: true,
        detail: {
          sticker: 'REMIND\nME!',
          lead: `${copy.body} This is an in-app reminder — open your ticket to get ready.`,
          spotlight: {
            kind: 'feature',
            big: window,
            bigLabel: 'before departure',
            note: `${b.date} · ${b.time}`,
            badge: b.bookingRef,
          },
          facts: [
            { label: 'Route', value: `${b.from} → ${b.to}`, wide: true },
            { label: 'Operator', value: b.operator },
            { label: 'Departure', value: `${b.date} · ${b.time}`, hot: true },
            { label: 'Seat', value: b.seat },
          ],
          stepsTitle: 'Get ready',
          steps: [
            {
              title: 'E-ticket saved',
              note: `Reference ${b.bookingRef}`,
              state: 'done',
            },
            {
              title: 'Run the travel checklist',
              note: 'Luggage, ID, fare',
              state: 'now',
            },
            {
              title: `Arrive in ${b.to}`,
              note: 'Safe travels, Kabyahe!',
              state: 'next',
            },
          ],
          primary: {
            label: 'Open e-ticket',
            icon: 'ticket-outline',
            kind: 'ticket',
            ref: b.bookingRef,
          },
          secondary: { label: 'Track bus', icon: 'navigate-outline', kind: 'track' },
        },
      },
    ];
  }

  /** A driver thread for the user's next trip so "message driver" always works. */  private bookingChats(): ChatThread[] {
    const active = this.ticketService.activeBooking;
    if (!active) return [];
    const id = `cd-${active.bookingRef}`;
    const driver = this.ticketService.driverNameFor(active.operator);
    return [
      {
        id,
        name: `${active.operator} Driver`,
        presence: 'On the road · replies quickly',
        live: true,
        avatarType: 'driver',
        lastMessage: '',
        time: '',
        unread: 1,
        context: {
          kind: 'ticket',
          ref: active.bookingRef,
          title: `${active.from} → ${active.to}`,
          sub: `${active.operator} · ${active.bookingRef}`,
          cta: 'Ticket',
        },
        quick: ['Papunta na po ako', 'Asan po kayo?', 'Salamat po!'],
        messages: [
          {
            id: `${id}-1`,
            from: 'them',
            text: `Hello po, ${driver} po ito. Departs po tayo ng ${active.time}. Message lang po kung may kailangan.`,
            time: active.time,
            day: this.bookingDay(active.date),
          },
        ],
      },
    ];
  }

  private bookingDay(date: string): DayGroup {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    return date.startsWith(`${month} ${now.getDate()},`) ? 'Today' : 'Earlier';
  }

  // ------------------------------------------------------------------ SEED

  private seedAlerts(): AlertItem[] {
    return [
      {
        id: 'a1',
        type: 'boarding',
        title: 'Boarding in 15 minutes',
        body: 'Victory Liner to Tuguegarao City is now boarding at Gate 3.',
        time: '6:15 AM',
        day: 'Today',
        unread: true,
        detail: {
          sticker: 'ALL\nABOARD!',
          lead: 'Your Victory Liner bus is loading at Gate 3. Doors close at 6:30 AM sharp, so head over now and keep your e-ticket handy.',
          spotlight: {
            kind: 'board',
            big: '3',
            bigLabel: 'Gate',
            note: 'Boards in',
            badge: '15 min',
          },
          facts: [
            { label: 'Route', value: 'Baguio City → Tuguegarao City', wide: true },
            { label: 'Departs', value: '6:30 AM', hot: true },
            { label: 'Seat', value: '14A' },
            { label: 'Operator', value: 'Victory Liner' },
            { label: 'Booking', value: 'BYH-48291' },
          ],
          stepsTitle: 'Before you board',
          steps: [
            { title: 'Head to Gate 3', note: 'Look for the Victory Liner sign', state: 'now' },
            { title: 'Show your e-ticket', note: 'The conductor scans the QR at the door', state: 'next' },
            { title: 'Find seat 14A', note: 'Stow bags overhead or under your seat', state: 'next' },
          ],
          primary: { label: 'Open e-ticket', icon: 'ticket-outline', kind: 'ticket', ref: 'BYH-48291' },
          secondary: { label: 'Track bus', icon: 'navigate-outline', kind: 'track' },
        },
      },
      {
        id: 'a2',
        type: 'delay',
        title: 'Trip delayed by 20 min',
        body: 'GV Florida (Cauayan to Ilagan) is running behind due to traffic.',
        time: '5:52 AM',
        day: 'Today',
        unread: true,
        detail: {
          sticker: 'HOLD\nUP!',
          lead: 'Heavy traffic on the Cauayan to Ilagan road is slowing the GV Florida bus. It is still coming, just about 20 minutes later than planned.',
          spotlight: {
            kind: 'shift',
            from: '7:00 AM',
            to: '7:20 AM',
            badge: '+20 min',
          },
          facts: [
            { label: 'Route', value: 'Cauayan → Ilagan', wide: true },
            { label: 'Operator', value: 'GV Florida' },
            { label: 'New departure', value: '7:20 AM', hot: true },
            { label: 'Reason', value: 'Heavy road traffic', wide: true },
          ],
          stepsTitle: 'Where things stand',
          steps: [
            { title: 'Bus left its last stop', note: '5:38 AM', state: 'done' },
            { title: 'Crawling through traffic', note: 'Road ahead is clearing slowly', state: 'now' },
            { title: 'Arrives at Cauayan terminal', note: 'Around 7:20 AM', state: 'next' },
          ],
          primary: { label: 'Track live', icon: 'navigate-outline', kind: 'track' },
          secondary: { label: 'Ask driver', icon: 'chatbubble-ellipses-outline', kind: 'chat', chatId: 'c3' },
        },
      },
      {
        id: 'a3',
        type: 'promo',
        title: '20% off Baguio routes',
        body: 'Book any Victory Liner trip to Baguio this week and save.',
        time: 'Yesterday, 9:00 AM',
        day: 'Yesterday',
        unread: false,
        detail: {
          sticker: 'BIG\nDEAL!',
          lead: 'Book any Victory Liner trip to Baguio this week and take 20% off the base fare. Enter the code at payment and the discount applies on the spot.',
          spotlight: {
            kind: 'coupon',
            big: '20%',
            bigLabel: 'OFF',
            code: 'BAGUIO20',
            note: 'Book by Sun, Sep 27',
          },
          facts: [
            { label: 'Applies to', value: 'Victory Liner trips to Baguio', wide: true },
            { label: 'Discount', value: '20% off', hot: true },
            { label: 'Max saving', value: '₱200' },
            { label: 'Book by', value: 'Sep 27' },
            { label: 'Travel by', value: 'Oct 4' },
          ],
          stepsTitle: 'How to redeem',
          steps: [
            { title: 'Pick a Baguio trip', note: 'Any Victory Liner departure counts', state: 'next' },
            { title: 'Enter BAGUIO20 at payment', note: 'Tap "Have a promo code?"', state: 'next' },
            { title: 'See the drop in your receipt', note: 'The discount shows before you pay', state: 'next' },
          ],
          primary: { label: 'Find Baguio trips', icon: 'search-outline', kind: 'search' },
          secondary: { label: 'Copy code', icon: 'copy-outline', kind: 'copy', text: 'BAGUIO20' },
        },
      },
      {
        id: 'a4',
        type: 'price',
        title: 'Fare dropped on a saved route',
        body: 'Manila to Vigan City is now 680 pesos, down from 750.',
        time: 'Yesterday, 7:40 AM',
        day: 'Yesterday',
        unread: false,
        detail: {
          sticker: 'PRICE\nDROP!',
          lead: 'A route you saved just got cheaper. Fares move with demand, so grab it while seats are still open.',
          spotlight: {
            kind: 'fare',
            from: '₱750',
            to: '₱680',
            badge: 'Save ₱70',
            series: [750, 750, 740, 720, 720, 700, 680],
          },
          facts: [
            { label: 'Route', value: 'Manila (PITX) → Vigan City', wide: true },
            { label: 'Operator', value: 'Florida Bus Line' },
            { label: 'Change', value: '−₱70 (9%)', hot: true },
            { label: 'Seats left', value: '14' },
            { label: 'Lowest in', value: '7 days' },
          ],
          stepsTitle: 'Why it dropped',
          steps: [
            { title: 'Fewer bookings midweek', note: 'Operators lower fares to fill seats', state: 'done' },
            { title: 'Your saved route was flagged', note: 'You get first look at drops', state: 'done' },
            { title: 'Fare can climb back', note: 'Prices rise as seats sell out', state: 'now' },
          ],
          primary: {
            label: 'Book at ₱680',
            icon: 'arrow-forward-outline',
            kind: 'book',
            trip: {
              operator: 'Florida Bus Line',
              from: 'Manila (PITX)',
              to: 'Vigan City',
              eta: '45 min',
              fare: '₱ 680',
              seatsLeft: '14 seats left',
              status: 'on-time',
            },
          },
        },
      },
      {
        id: 'a5',
        type: 'cancelled',
        title: 'Trip cancelled',
        body: 'Partas (Manila to Laoag City), Aug 29 departure, was cancelled by the operator. Refund issued.',
        time: 'Aug 29, 8:10 PM',
        day: 'Earlier',
        unread: false,
        detail: {
          sticker: 'CALLED\nOFF',
          lead: 'Partas cancelled the Manila to Laoag City trip on your Aug 29 departure. Your full fare was refunded, so there is nothing you need to do.',
          spotlight: {
            kind: 'refund',
            big: '₱850',
            bigLabel: 'You got back',
            note: 'to your GCash',
            badge: 'Refunded',
          },
          facts: [
            { label: 'Route', value: 'Manila (Cubao) → Laoag City', wide: true },
            { label: 'Operator', value: 'Partas' },
            { label: 'Departure', value: 'Aug 29, 9:00 PM' },
            { label: 'Booking', value: 'BYH-47118' },
            { label: 'Refund to', value: 'GCash', hot: true },
          ],
          stepsTitle: 'Refund trail',
          steps: [
            { title: 'Operator cancelled the trip', note: 'Aug 29, 8:10 PM', state: 'done' },
            { title: 'Refund approved', note: 'Aug 29, 8:12 PM', state: 'done' },
            { title: 'Credited to your GCash', note: 'Aug 30, morning', state: 'done' },
          ],
          primary: { label: 'Ask support', icon: 'chatbubble-ellipses-outline', kind: 'chat', chatId: 'c1' },
          secondary: { label: 'My bookings', icon: 'ticket-outline', kind: 'bookings' },
        },
      },
      {
        id: 'a6',
        type: 'system',
        title: 'New feature: live seat maps',
        body: 'You can now pick your exact seat when booking select routes.',
        time: 'Aug 24, 11:00 AM',
        day: 'Earlier',
        unread: false,
        detail: {
          sticker: 'NEW!',
          lead: 'Pick your exact seat on select routes. Window, aisle, or right next to a friend, straight from the booking flow.',
          spotlight: {
            kind: 'feature',
            note: 'Tap any open seat to claim it. The yellow one is yours.',
            badge: 'Live now',
          },
          facts: [
            { label: 'Where', value: 'Booking → Choose seat', wide: true },
            { label: 'Available on', value: 'Select routes' },
            { label: 'Cost', value: 'Free', hot: true },
          ],
          stepsTitle: 'Try it',
          steps: [
            { title: 'Search a route', note: 'Look for the seat icon on the trip card', state: 'next' },
            { title: 'Open Choose seat', note: 'Grey seats are already taken', state: 'next' },
            { title: 'Lock in your pick', note: 'It shows on your e-ticket', state: 'next' },
          ],
          primary: { label: 'Try a route', icon: 'search-outline', kind: 'search' },
        },
      },
    ];
  }

  private seedChats(): ChatThread[] {
    return [
      {
        id: 'c1',
        name: 'Victory Liner Support',
        presence: 'Usually replies in a few minutes',
        live: true,
        avatarType: 'support',
        lastMessage: '',
        time: '',
        unread: 1,
        context: {
          kind: 'bookings',
          title: 'Refund for BYH-46590',
          sub: 'Processed · 1 to 3 banking days',
          cta: 'Bookings',
        },
        quick: ['Where is my refund?', 'Change my seat', 'Thank you!'],
        messages: [
          { id: 'c1-1', from: 'me', text: 'Hi! I cancelled BYH-46590 last week. Any update on the refund?', time: '3:12 PM', day: 'Yesterday', read: true },
          { id: 'c1-2', from: 'them', text: 'Hello po! Thanks for waiting. We are checking BYH-46590 with the operator now.', time: '3:20 PM', day: 'Yesterday' },
          { id: 'c1-3', from: 'them', text: 'Good news: the operator approved the full ₱750 fare.', time: '10:40 AM', day: 'Today' },
          { id: 'c1-4', from: 'them', text: 'Your refund for BYH-46590 has been processed.', time: '10:42 AM', day: 'Today' },
        ],
      },
      {
        id: 'c2',
        name: 'Trip Assistant',
        presence: 'Auto-updates at every stop',
        live: true,
        avatarType: 'system',
        lastMessage: '',
        time: '',
        unread: 0,
        context: {
          kind: 'live',
          title: 'Baguio City → Tuguegarao City',
          sub: 'Victory Liner · live trip',
          cta: 'Track live',
        },
        quick: ['Where is my bus?', 'What is my ETA?', 'Share my trip'],
        messages: [
          { id: 'c2-1', from: 'them', text: 'Trip started. Your bus left Baguio at 6:30 AM. I will ping you at each milestone.', time: '6:31 AM', day: 'Yesterday' },
          { id: 'c2-2', from: 'them', text: 'Your bus is 3 stops away from Tuguegarao Terminal.', time: '11:48 AM', day: 'Yesterday' },
        ],
      },
      {
        id: 'c3',
        name: 'GV Florida Driver',
        presence: 'On the road',
        live: false,
        avatarType: 'driver',
        lastMessage: '',
        time: '',
        unread: 0,
        context: {
          kind: 'ticket',
          ref: 'BYH-48304',
          title: 'Cauayan → Ilagan',
          sub: 'GV Florida · BYH-48304',
          cta: 'Ticket',
        },
        quick: ['Papunta na po ako', 'Asan po kayo?', 'Salamat po!'],
        messages: [
          { id: 'c3-1', from: 'them', text: 'Magandang hapon po. GV Florida, plate ending 4821, Bay 5. Aalis po tayo ng 2:00 PM.', time: '1:41 PM', day: 'Aug 29' },
          { id: 'c3-2', from: 'them', text: 'Nasa terminal na po kayo?', time: '1:52 PM', day: 'Aug 29' },
        ],
      },
    ];
  }
}