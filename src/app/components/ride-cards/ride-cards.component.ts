import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bus,
  callOutline,
  chatbubbleEllipsesOutline,
  chevronForwardOutline,
  navigateOutline,
  shieldCheckmarkOutline,
  star,
  timeOutline,
} from 'ionicons/icons';
import type { Booking } from '../../pages/bookings/ticket.service';
import type { HailRequest } from '../../services/hail.service';
import {
  RideIdentityService,
  RideIdentity,
  FALLBACK_IDENTITY,
} from '../../services/ride-identity.service';

addIcons({
  bus: bus,
  'call-outline': callOutline,
  'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'navigate-outline': navigateOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  star: star,
  'time-outline': timeOutline,
});

/** Shared transportation-identity composition: comic vehicle panel + driver
 *  crew credential. Used by Active Trip and Emergency Mode so both always
 *  agree (same booking → same vehicle/driver). */
@Component({
  selector: 'app-ride-cards',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './ride-cards.component.html',
  styleUrls: ['./ride-cards.component.scss'],
})
export class RideCardsComponent {
  private router = inject(Router);
  private identity = inject(RideIdentityService);

  /** Scheduled reservation context. Null + no hail → legacy defaults. */
  @Input() booking: Booking | null = null;
  /** Live hail context (no travel date, bus already operating). */
  @Input() hail: HailRequest | null = null;
  /** Existing 4.8-style rating shown on Active Trip (project data). */
  @Input() driverRating = '4.8';

  get ride(): RideIdentity {
    if (this.booking) return this.identity.identityForBooking(this.booking);
    if (this.hail) return this.identity.identityForHail(this.hail);
    return FALLBACK_IDENTITY;
  }

  /** Route endpoints for the stripe (hail uses the hailed route). */
  get from(): string {
    if (this.booking) return this.booking.from;
    if (this.hail) return this.hail.route.from;
    return 'Baguio City';
  }

  get to(): string {
    if (this.booking) return this.booking.to;
    if (this.hail) return this.hail.route.to;
    return 'Tuguegarao City';
  }

  get initials(): string {
    const name = (this.ride.driver ?? '').trim();
    if (!name) return '?';
    const parts = name.split(/\s+/);
    return (parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '');
  }

  get firstName(): string {
    return (this.ride.driver ?? '').trim().split(/\s+/)[0] ?? '';
  }

  get restName(): string {
    const parts = (this.ride.driver ?? '').trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  hailDistanceLabel(): string {
    const m = this.ride.hailPickupM;
    if (m == null) return 'ON THE WAY';
    if (m < 1000) return `${Math.round(m)} M AWAY`;
    return `${(m / 1000).toFixed(1)} KM AWAY`;
  }

  messageDriver() {
    if (!this.ride.assigned) return;
    const ref = this.booking?.bookingRef;
    this.router.navigate(['/chat', ref ? `cd-${ref}` : 'c3']);
  }

  callDriver() {
    if (!this.ride.assigned) return;
    window.open('tel:+639171234567');
  }
}
