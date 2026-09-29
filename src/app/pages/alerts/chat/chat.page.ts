import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  ticketOutline,
  navigateOutline,
  send,
  headsetOutline,
  personCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { TicketService } from '../../bookings/ticket.service';
import {
  AlertsService,
  ChatAvatarType,
  ChatMessage,
  ChatThread,
} from '../alerts.service';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'arrow-forward-outline': arrowForwardOutline,
  'ticket-outline': ticketOutline,
  'navigate-outline': navigateOutline,
  send: send,
  'headset-outline': headsetOutline,
  'person-circle-outline': personCircleOutline,
  'information-circle-outline': informationCircleOutline,
});

interface ChatBubble extends ChatMessage {
  tail: boolean;
}

interface ChatGroup {
  day: string;
  items: ChatBubble[];
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonIcon],
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private data = inject(AlertsService);
  private tickets = inject(TicketService);

  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('field') field?: ElementRef<HTMLTextAreaElement>;

  chat?: ChatThread;
  groups: ChatGroup[] = [];
  draft = '';

  private sub?: Subscription;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const found = this.data.getChat(id);
    if (!found) {
      this.router.navigateByUrl('/alerts', { replaceUrl: true });
      return;
    }
    this.chat = found;
    this.rebuild();

    this.sub = this.data.messageAdded$.subscribe((chatId) => {
      if (chatId !== found.id) return;
      this.rebuild();
      this.scrollDown(280);
    });
  }

  ionViewWillEnter() {
    if (!this.chat) return;
    this.data.activeChatId = this.chat.id;
    this.data.openChat(this.chat.id);
  }

  ionViewDidEnter() {
    this.scrollDown(0);
  }

  ionViewWillLeave() {
    this.data.activeChatId = null;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.data.activeChatId === this.chat?.id) this.data.activeChatId = null;
  }

  get typing(): boolean {
    return !!this.chat && this.data.isTyping(this.chat.id);
  }

  private get booking() {
    const ref = this.chat?.context.ref;
    return ref ? this.tickets.findByRef(ref) : null;
  }

  get contextTitle(): string {
    const b = this.booking;
    return b ? `${b.from} → ${b.to}` : (this.chat?.context.title ?? '');
  }

  get contextSub(): string {
    const b = this.booking;
    return b
      ? `${b.operator} · ${b.seat} · ${b.bookingRef}`
      : (this.chat?.context.sub ?? '');
  }

  goBack() {
    const isFirstNavigation = (window.history.state?.navigationId ?? 2) <= 1;
    if (isFirstNavigation) {
      this.router.navigateByUrl('/alerts', { replaceUrl: true });
    } else {
      this.location.back();
    }
  }

  openContext() {
    const ctx = this.chat?.context;
    if (!ctx) return;
    if (ctx.kind === 'live') this.router.navigateByUrl('/active-trip');
    else if (ctx.kind === 'bookings') this.router.navigateByUrl('/bookings');
    else if (ctx.ref) this.router.navigateByUrl(`/e-ticket/${ctx.ref}`);
  }

  onInput(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    this.draft = el.value;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 112) + 'px';
  }

  onEnter(event: Event) {
    const key = event as KeyboardEvent;
    if (key.shiftKey) return;
    key.preventDefault();
    this.send();
  }

  send() {
    const text = this.draft.trim();
    if (!this.chat || !text) return;
    this.data.send(this.chat.id, text);
    this.clearDraft();
  }

  useQuick(text: string) {
    if (!this.chat) return;
    this.data.send(this.chat.id, text);
  }

  avatarIcon(type: ChatAvatarType): string {
    const map: Record<ChatAvatarType, string> = {
      support: 'headset-outline',
      driver: 'person-circle-outline',
      system: 'information-circle-outline',
    };
    return map[type];
  }

  private clearDraft() {
    this.draft = '';
    const el = this.field?.nativeElement;
    if (el) {
      el.value = '';
      el.style.height = 'auto';
    }
  }

  private rebuild() {
    const msgs = this.chat?.messages ?? [];
    const out: ChatGroup[] = [];
    msgs.forEach((m, i) => {
      const next = msgs[i + 1];
      const tail = !next || next.from !== m.from || next.day !== m.day;
      let group = out[out.length - 1];
      if (!group || group.day !== m.day) {
        group = { day: m.day, items: [] };
        out.push(group);
      }
      group.items.push({ ...m, tail });
    });
    this.groups = out;
  }

  private scrollDown(duration: number) {
    window.setTimeout(() => this.content?.scrollToBottom(duration), 40);
  }
}