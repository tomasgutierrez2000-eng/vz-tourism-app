# Changelog

All notable changes to this project will be documented in this file.

## [0.2.1.0] - 2026-04-07

### Fixed
- All 15 `/api/admin/*` routes now require admin token authentication via root middleware (were previously open to the public)
- `/api/bookings/[id]` now requires authenticated user or admin token, preventing unauthenticated booking enumeration
- Non-admin users can only view their own bookings (IDOR prevention)
- `/api/profile` uses explicit column selection instead of `select('*')` to prevent sensitive column leakage

### Added
- Root `middleware.ts` enforcing admin auth on `/api/admin/*` and session auth on `/api/bookings/:id`
- 71 security integration tests covering: auth enforcement, IDOR, admin tokens, SQL injection, password leakage, expired tokens, and input validation edge cases

## [0.2.0.0] - 2026-04-07

### Added
- Itineraries marketplace page at `/itineraries` with hero section, filter chips (region, duration, budget), sort tabs, and responsive card grid
- Influencer Itineraries section showing creator-branded cards with follower counts and verified badges
- "Book This Trip" CTA with booking interest modal (email capture for launch notification)
- "Customize" button that clones an itinerary for authenticated users to edit
- Referral tracking system for influencer commission attribution (`?ref=` URL params with IP dedup)
- Admin itineraries management page with influencer pick toggle
- 8 curated seed itineraries across Los Roques, Merida, Canaima, Margarita, and Caracas
- 3 simulated creator profiles (venezolanaviajera, backpackerben, luxelatam) with referral codes
- DESIGN.md design system documenting OKLCH color palette, typography, spacing, motion, and component patterns
- Shaped loading skeletons that mirror card layout during data fetching
- ARIA tablist/tab roles on sort controls and focus-visible rings on all interactive elements
- Full test suite: API integration tests, component unit tests, E2E marketplace flow test

### Changed
- Extended ItineraryFeedCard with `showActions` prop for marketplace CTAs and recommendation badges
- Extended itinerary detail page with referral tracking and Book/Customize actions
- Updated GET /api/itineraries with filter query parameters and influencer picks support
