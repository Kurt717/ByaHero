import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full',
  },
  {
    path: 'splash',
    loadComponent: () =>
      import('./pages/splash/splash.page').then((m) => m.SplashPage),
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./pages/onboarding/onboarding.page').then(
        (m) => m.OnboardingPage,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup.page').then((m) => m.SignupPage),
  },
  // --- BOOKING FLOW (outside the tab bar, full-screen wizard) ---
  {
    path: 'booking/trip',
    loadComponent: () =>
      import('./pages/booking/trip-details/trip-details.page').then(
        (m) => m.TripDetailsPage,
      ),
  },
  {
    path: 'booking/seats',
    loadComponent: () =>
      import('./pages/booking/seat-selection/seat-selection.page').then(
        (m) => m.SeatSelectionPage,
      ),
  },
  {
    path: 'booking/payment',
    loadComponent: () =>
      import('./pages/booking/payment/payment.page').then((m) => m.PaymentPage),
  },
  {
    path: 'booking/confirmation',
    loadComponent: () =>
      import('./pages/booking/confirmation/confirmation.page').then(
        (m) => m.ConfirmationPage,
      ),
  },
  {
    path: 'e-ticket',
    loadComponent: () =>
      import('./pages/bookings/ticket/ticket.page').then((m) => m.TicketPage),
  },
  {
    path: '',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search/search.page').then((m) => m.SearchPage),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/bookings/bookings.page').then((m) => m.BookingsPage),
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./pages/alerts/alerts.page').then((m) => m.AlertsPage),
      },
    ],
  },
];
