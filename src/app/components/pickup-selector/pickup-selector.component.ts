import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  locateOutline,
  checkmarkCircle,
  locationOutline,
  mapOutline,
} from 'ionicons/icons';
import {
  LocatedPoint,
  PickupService,
  PickupSpot,
} from '../../services/pickup.service';

addIcons({
  'search-outline': searchOutline,
  'locate-outline': locateOutline,
  'checkmark-circle': checkmarkCircle,
  'location-outline': locationOutline,
  'map-outline': mapOutline,
});

/**
 * Shared pickup-point picker (hail sheet + booking flow).
 * Options: current location, text search over saved places, suggested
 * spots, and — where the parent shows a map — pinning on the map.
 * Selection is emitted; the parent owns what "selected" means.
 */
@Component({
  selector: 'app-pickup-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './pickup-selector.component.html',
  styleUrls: ['./pickup-selector.component.scss'],
})
export class PickupSelectorComponent {
  private pickupService = inject(PickupService);

  /** Origin city label — seeds the city-center suggestion + GPS fallback. */
  @Input() originLabel = '';
  /** Currently chosen pickup (highlighted). */
  @Input() selected: LocatedPoint | null = null;
  /** Show the "pin on map" row (parent must own a map). */
  @Input() showMapPick = false;
  @Input() mapPickActive = false;

  @Output() selectedChange = new EventEmitter<LocatedPoint>();
  @Output() mapPick = new EventEmitter<void>();

  query = '';
  locating = false;

  get current(): LocatedPoint | null {
    return this.pickupService.getActive().current;
  }

  get spots(): PickupSpot[] {
    const q = this.query.trim().toLowerCase();
    const all = this.pickupService.suggestedSpots(this.originLabel || 'Baguio City');
    if (!q) return all;
    return all.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.sub.toLowerCase().includes(q),
    );
  }

  distanceFor(spot: PickupSpot): string | null {
    const current = this.current;
    if (!current) return null;
    return this.pickupService.formatDistance(
      this.pickupService.haversineM(current.lat, current.lng, spot.lat, spot.lng),
    );
  }

  isSelectedSpot(spot: PickupSpot): boolean {
    return (
      !!this.selected &&
      this.selected.label === spot.label &&
      Math.abs(this.selected.lat - spot.lat) < 1e-9 &&
      Math.abs(this.selected.lng - spot.lng) < 1e-9
    );
  }

  isCurrentSelected(): boolean {
    return !!this.selected && (this.selected.source === 'current' || this.selected.source === 'gps');
  }

  async useCurrentLocation() {
    if (this.locating) return;
    this.locating = true;
    try {
      const [fallbackLat, fallbackLng] = this.pickupService.coordsFor(
        this.originLabel || 'Baguio City',
      );
      const point = await this.pickupService.locateCurrent(
        this.originLabel || 'Baguio City',
        fallbackLat,
        fallbackLng,
      );
      this.pickupService.setCurrent(point);
      const pickup: LocatedPoint =
        point.source === 'gps'
          ? { ...point, label: 'Your current location', source: 'current' }
          : point;
      this.selectedChange.emit(pickup);
    } finally {
      this.locating = false;
    }
  }

  chooseSpot(spot: PickupSpot) {
    this.selectedChange.emit({
      label: spot.label,
      lat: spot.lat,
      lng: spot.lng,
      source: this.query.trim() ? 'search' : 'suggested',
      simulated: false,
    });
  }
}
