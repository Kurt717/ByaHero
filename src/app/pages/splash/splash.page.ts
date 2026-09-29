<<<<<<< HEAD
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular';
import { Router } from '@angular/router';
import { BURST_SPIN_MS, DONE, END, burstAngleAt, createIntro } from './splash-intro';

/** How long the finished logo + "byaHero" stay on screen before moving on. */
const HOLD_MS = 1400;
=======
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular';
import { Router } from '@angular/router';
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule, IonContent],
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
})
<<<<<<< HEAD
export class SplashPage implements AfterViewInit, OnDestroy {
  @ViewChild('intro', { static: true }) introRef!: ElementRef<SVGSVGElement>;
  ready = false;
  private raf = 0;
  private timer: any;

  constructor(
    private router: Router,
    private zone: NgZone,
  ) {}

  ngAfterViewInit() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.showLogo(END);
      return;
    }
    let intro: ReturnType<typeof createIntro>;
    try {
      intro = createIntro(this.introRef.nativeElement);
    } catch {
      this.showLogo(END);
      return;
    }
    let last = 0;
    let t = 0;
    let shown = false;
    this.zone.runOutsideAngular(() => {
      const tick = (now: number) => {
        if (!last) last = now;
        t += Math.min(now - last, 50); // a slow frame can never skip a whole part of the animation
        last = now;
        intro.render(t);
        if (t >= END && !shown) {
          shown = true;
          this.zone.run(() => this.showLogo(t)); // logo + text take over
        }
        if (t < DONE) this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  /** Navigation is timed from the moment the logo is visible, so it always gets its full hold.
   *  `t` is the intro-clock time of the frame that hands over to the real logo. */
  private showLogo(t: number) {
    this.ready = true;
    // Single-copy split: SVG owns the logo graphic (stitched morph),
    // HTML owns the brand text. Hide the HTML logo so bursts don't double-draw.
    try {
      const container = this.introRef.nativeElement.closest(
        '.splash-container',
      ) as HTMLElement | null;
      container?.classList.add('ready');
      const htmlLogo = container?.querySelector('.logo-wrapper') as HTMLElement | null;
      if (htmlLogo) {
        htmlLogo.style.opacity = '0';
        htmlLogo.style.visibility = 'hidden';
      }
    } catch {
      // Angular binding still carries `ready` when CD runs.
    }
    this.syncBurstPhase(t);
    this.timer = setTimeout(() => this.router.navigateByUrl('/onboarding'), HOLD_MS);
  }

  /**
   * Background hand-off. On that same frame the intro draws its end-state burst at burstAngleAt(t)
   * (spinning at the real spin's speed), so restart the real `.logo-burst` spin already `burstAngleAt(t)`
   * into its turn (negative delay) and it carries on from exactly that angle.
   *
   * Order matters: the `animation` SHORTHAND resets every animation longhand, so the delay has to be
   * written AFTER the restart. (Setting animationDelay first and then `style.animation = 'none' / ''`
   * silently wiped the delay, so the rays snapped back to 0deg at the swap.)
   */
  private syncBurstPhase(t: number) {
    try {
      const burst = this.introRef.nativeElement
        .closest('.logo-slot')
        ?.querySelector('.logo-burst') as HTMLElement | null;
      if (!burst) return;
      const delayS = -((burstAngleAt(t) % 360) / 360) * (BURST_SPIN_MS / 1000);
      burst.style.animationName = 'none'; // stop the spin (it has been running unseen since load)
      void burst.offsetWidth; // flush, so the next line starts a NEW animation
      burst.style.animationName = ''; // back to burstSlowSpin from the stylesheet
      burst.style.animationDelay = `${delayS.toFixed(4)}s`; // start mid-turn
    } catch {
      // Keep the default spin phase — the rays are faint either way.
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
  }
}
=======
export class SplashPage implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    setTimeout(() => {
      this.router.navigateByUrl('/onboarding');
    }, 2200);
  }
}
>>>>>>> e08cf0f11cf5ef2696ff66d9364b0c434f27c5f2
