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
    path: 'booking/compare',
    loadComponent: () =>
      import('./pages/booking/compare/compare.page').then(
        (m) => m.ComparePage,
      ),
  },
  {
    path: 'booking/rebook/:ref',
    loadComponent: () =>
      import('./pages/booking/rebook/rebook.page').then(
        (m) => m.RebookPage,
      ),
  },
  {
    path: 'booking/seat-preference',
    loadComponent: () =>
      import('./pages/booking/seat-preference/seat-preference.page').then(
        (m) => m.SeatPreferencePage,
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
    path: 'booking/voucher',
    loadComponent: () =>
      import('./pages/booking/voucher/voucher.page').then((m) => m.VoucherPage),
  },
  {
    path: 'booking/confirmation',
    loadComponent: () =>
      import('./pages/booking/confirmation/confirmation.page').then(
        (m) => m.ConfirmationPage,
      ),
  },
  {
    path: 'e-ticket/:bookingRef',
    loadComponent: () =>
      import('./pages/bookings/ticket/ticket.page').then((m) => m.TicketPage),
  },
  {
    path: 'boarding-pass/:bookingRef',
    loadComponent: () =>
      import('./pages/bookings/boarding-pass/boarding-pass.page').then(
        (m) => m.BoardingPassPage,
      ),
  },
  {
    path: 'trip-preparation/:bookingRef',
    loadComponent: () =>
      import('./pages/bookings/trip-preparation/trip-preparation.page').then(
        (m) => m.TripPreparationPage,
      ),
  },
  {
    path: 'luggage/:bookingRef',
    loadComponent: () =>
      import('./pages/bookings/luggage/luggage.page').then(
        (m) => m.LuggagePage,
      ),
  },
  {
    path: 'terminal/:id/schedule',
    loadComponent: () =>
      import('./pages/terminal/schedule/terminal-schedule.page').then(
        (m) => m.TerminalSchedulePage,
      ),
  },
  {
    path: 'terminal/:id',
    loadComponent: () =>
      import('./pages/terminal/terminal-details.page').then(
        (m) => m.TerminalDetailsPage,
      ),
  },
  {
    path: 'review-ride/:bookingRef',
    loadComponent: () =>
      import('./pages/bookings/review-ride/review-ride.page').then(
        (m) => m.ReviewRidePage,
      ),
  },
  {
    path: 'ride-insights',
    loadComponent: () =>
      import('./pages/bookings/ride-insights/ride-insights.page').then(
        (m) => m.RideInsightsPage,
      ),
  },
  {
    path: 'travel-conditions',
    loadComponent: () =>
      import('./pages/travel-conditions/travel-conditions.page').then(
        (m) => m.TravelConditionsPage,
      ),
  },
  {
    path: 'promo-wallet',
    loadComponent: () =>
      import('./pages/promo-wallet/promo-wallet.page').then(
        (m) => m.PromoWalletPage,
      ),
  },
  {
    path: 'report-problem',
    loadComponent: () =>
      import('./pages/report-problem/report-problem.page').then(
        (m) => m.ReportProblemPage,
      ),
  },
  {
    path: 'report-problem/:ref',
    loadComponent: () =>
      import('./pages/report-problem/report-problem.page').then(
        (m) => m.ReportProblemPage,
      ),
  },
  {
    path: 'active-trip',
    loadComponent: () =>
      import('./pages/active-trip/active-trip.page').then(
        (m) => m.ActiveTripPage,
      ),
  },
  {
    path: 'emergency',
    loadComponent: () =>
      import('./pages/active-trip/emergency/emergency.page').then(
        (m) => m.EmergencyPage,
      ),
  },
  {
    path: 'favorites',
    loadComponent: () =>
      import('./pages/favorites/favorites.page').then((m) => m.FavoritesPage),
  },
  // --- ALERT + CHAT DETAIL (full-screen, outside the tab bar) ---
  {
    path: 'alert/:id',
    loadComponent: () =>
      import('./pages/alerts/alert-detail/alert-detail.page').then(
        (m) => m.AlertDetailPage,
      ),
  },
  {
    path: 'chat/:id',
    loadComponent: () =>
      import('./pages/alerts/chat/chat.page').then((m) => m.ChatPage),
  },
  // --- PROFILE SUB-PAGES ---
  {
    path: 'edit-profile',
    loadComponent: () =>
      import('./pages/profile/edit-profile/edit-profile.page').then(
        (m) => m.EditProfilePage,
      ),
  },
  {
    path: 'payment-methods',
    loadComponent: () =>
      import('./pages/profile/payment-methods/payment-methods.page').then(
        (m) => m.PaymentMethodsPage,
      ),
  },
  {
    path: 'wallet',
    loadComponent: () =>
      import('./pages/profile/wallet/wallet.page').then((m) => m.WalletPage),
  },
  {
    path: 'fare-id',
    loadComponent: () =>
      import('./pages/profile/fare-id/fare-id.page').then((m) => m.FareIdPage),
  },
  {
    path: 'trusted-contacts',
    loadComponent: () =>
      import('./pages/profile/trusted-contacts/trusted-contacts.page').then(
        (m) => m.TrustedContactsPage,
      ),
  },
  {
    path: 'auto-share',
    loadComponent: () =>
      import('./pages/profile/auto-share/auto-share.page').then(
        (m) => m.AutoSharePage,
      ),
  },
  {
    path: 'arrival-alerts',
    loadComponent: () =>
      import('./pages/profile/arrival-alerts/arrival-alerts.page').then(
        (m) => m.ArrivalAlertsPage,
      ),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/profile/notifications/notifications.page').then(
        (m) => m.NotificationsPage,
      ),
  },
  {
    path: 'language',
    loadComponent: () =>
      import('./pages/profile/language/language.page').then(
        (m) => m.LanguagePage,
      ),
  },
  {
    path: 'dark-mode',
    loadComponent: () =>
      import('./pages/profile/dark-mode/dark-mode.page').then(
        (m) => m.DarkModePage,
      ),
  },
  {
    path: 'invite',
    loadComponent: () =>
      import('./pages/profile/invite/invite.page').then((m) => m.InvitePage),
  },
  {
    path: 'help-center',
    loadComponent: () =>
      import('./pages/profile/help-center/help-center.page').then(
        (m) => m.HelpCenterPage,
      ),
  },
  {
    path: 'terms-privacy',
    loadComponent: () =>
      import('./pages/profile/terms-privacy/terms-privacy.page').then(
        (m) => m.TermsPrivacyPage,
      ),
  },
  {
    path: 'rewards',
    loadComponent: () =>
      import('./pages/profile/rewards/rewards.page').then(
        (m) => m.RewardsPage,
      ),
  },
  // --- ByaHero WALLET SUB-PAGES ---
  {
    path: 'wallet/add-money',
    loadComponent: () =>
      import('./pages/wallet/add-money/add-money.page').then((m) => m.AddMoneyPage),
  },
  {
    path: 'wallet/transactions',
    loadComponent: () =>
      import('./pages/wallet/transactions/transactions.page').then((m) => m.TransactionsPage),
  },
  {
    path: 'wallet/transactions/:ref',
    loadComponent: () =>
      import('./pages/wallet/transaction-detail/transaction-detail.page').then(
        (m) => m.TransactionDetailPage,
      ),
  },
  {
    path: 'wallet/send',
    loadComponent: () =>
      import('./pages/wallet/send/send.page').then((m) => m.SendMoneyPage),
  },
  {
    path: 'wallet/send/review',
    loadComponent: () =>
      import('./pages/wallet/send-review/send-review.page').then((m) => m.SendReviewPage),
  },
  {
    path: 'wallet/scan',
    loadComponent: () =>
      import('./pages/wallet/scan/scan.page').then((m) => m.ScanPayPage),
  },
  {
    path: 'wallet/settings',
    loadComponent: () =>
      import('./pages/wallet/settings/settings.page').then((m) => m.WalletSettingsPage),
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
  // --- FALLBACK: unknown URLs land on the app Shell (Home) ------------
  {
    path: '**',
    redirectTo: 'home',
  },
];
