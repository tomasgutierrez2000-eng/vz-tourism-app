-- Seed itineraries for the Itineraries Marketplace
-- References users and listings from seed.sql

DO $$
DECLARE
  -- Reuse seed user IDs
  tourist1_id UUID := '11111111-1111-1111-1111-111111111101';
  tourist2_id UUID := '11111111-1111-1111-1111-111111111102';
  provider1_id UUID := '11111111-1111-1111-1111-111111111103';

  -- Creator user IDs (new)
  creator1_id UUID := '22222222-2222-2222-2222-222222222201';
  creator2_id UUID := '22222222-2222-2222-2222-222222222202';
  creator3_id UUID := '22222222-2222-2222-2222-222222222203';

  -- Itinerary IDs
  itin1_id UUID := '33333333-3333-3333-3333-333333333301';
  itin2_id UUID := '33333333-3333-3333-3333-333333333302';
  itin3_id UUID := '33333333-3333-3333-3333-333333333303';
  itin4_id UUID := '33333333-3333-3333-3333-333333333304';
  itin5_id UUID := '33333333-3333-3333-3333-333333333305';
  itin6_id UUID := '33333333-3333-3333-3333-333333333306';
  itin7_id UUID := '33333333-3333-3333-3333-333333333307';
  itin8_id UUID := '33333333-3333-3333-3333-333333333308';
BEGIN

-- Creator users
INSERT INTO users (id, email, full_name, role, nationality, preferred_language) VALUES
  (creator1_id, 'venezolanaviajera@example.com', 'Valentina Rojas', 'creator', 'VE', 'es'),
  (creator2_id, 'backpackerben@example.com', 'Ben Thompson', 'creator', 'GB', 'en'),
  (creator3_id, 'luxelatam@example.com', 'Sofia Mendez', 'creator', 'US', 'en')
ON CONFLICT (id) DO NOTHING;

-- Creator profiles
INSERT INTO creator_profiles (user_id, username, bio, instagram_handle, youtube_handle, followers, is_verified) VALUES
  (creator1_id, 'venezolanaviajera', 'Venezuelan travel creator showing the world the beauty of my country. Born in Caracas, based everywhere.', '@venezolanaviajera', '@venezolanaviajera', 125000, TRUE),
  (creator2_id, 'backpackerben', 'Adventure traveler from London. South America specialist. Budget trips that feel like luxury.', '@backpackerben', NULL, 89000, TRUE),
  (creator3_id, 'luxelatam', 'Luxury travel curator for Latin America. Founder of LuxeLatam. Based in Miami.', '@luxelatam', '@luxelatam', 210000, TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- Itinerary 1: Los Roques Island Hopping (creator1, influencer pick)
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, is_influencer_pick, referral_code, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin1_id, creator1_id, 'Ultimate Los Roques Island Hopping',
   'Crystal-clear waters, secluded islands, and the best kitesurfing spots in the Caribbean. This 5-day itinerary takes you through the most stunning cays of the Los Roques archipelago with boutique posada stays and private boat transfers.',
   'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800',
   TRUE, TRUE, TRUE, 'venezolanaviajera-roques',
   5, 1200, ARRAY['Los Roques'], ARRAY['beach', 'snorkeling', 'luxury', 'island'], 312, 535, 4280)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours, transport_to_next) VALUES
  (itin1_id, 1, 0, 'Arrive at Gran Roque', 'Fly from Caracas to Los Roques. Check into boutique posada. Sunset welcome drinks on the rooftop.', 'Gran Roque', 11.9467, -66.6706, 280, 3, 'Boat transfer'),
  (itin1_id, 2, 0, 'Cayo de Agua', 'Full day at the most photographed cay in Los Roques. Pack a picnic, snorkel the reef, and explore the sandbar connecting two islands.', 'Cayo de Agua', 11.8333, -66.8833, 150, 8, 'Boat transfer'),
  (itin1_id, 3, 0, 'Francisquí & Madrisquí', 'Island hop between Francisquí and Madrisquí. Kitesurfing lesson in the afternoon. Fresh lobster lunch on the beach.', 'Francisquí', 11.9000, -66.7500, 200, 8, 'Boat transfer'),
  (itin1_id, 4, 0, 'Crasquí & Noronquí', 'Visit the remote western cays. Some of the best snorkeling in the archipelago. Completely untouched beaches.', 'Crasquí', 11.9833, -66.9167, 180, 8, 'Boat transfer'),
  (itin1_id, 5, 0, 'Final morning & departure', 'Sunrise paddle. Last swim at Gran Roque beach. Flight back to Caracas.', 'Gran Roque', 11.9467, -66.6706, 50, 4, NULL)
ON CONFLICT DO NOTHING;

-- Itinerary 2: Merida Andes Adventure (creator2, influencer pick)
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, is_influencer_pick, referral_code, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin2_id, creator2_id, 'Andes Adventure: Mérida to Mucuchíes',
   'Cloud forests, páramo hikes, and colonial villages. A week exploring Venezuela''s mountain heart on a backpacker budget. This is the trip that made me fall in love with the Andes.',
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
   TRUE, TRUE, TRUE, 'backpackerben-merida',
   7, 680, ARRAY['Mérida'], ARRAY['hiking', 'adventure', 'budget', 'mountains'], 198, 423, 3150)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours, transport_to_next) VALUES
  (itin2_id, 1, 0, 'Arrive in Mérida', 'Settle into your posada in the city center. Walk the Plaza Bolívar, try a mandoca at the street market.', 'Mérida Centro', 8.5897, -71.1561, 45, 4, 'Local bus'),
  (itin2_id, 2, 0, 'Sierra Nevada Trek', 'Full-day guided trek through cloud forest. Waterfalls, bird-watching, and views of Pico Bolívar.', 'Sierra Nevada', 8.5400, -71.0500, 65, 8, 'Jeep'),
  (itin2_id, 3, 0, 'Los Nevados Village', 'Hike to the colonial mountain village of Los Nevados. Overnight in a family-run posada. No internet, no cars, just mountains.', 'Los Nevados', 8.4667, -71.0333, 80, 6, 'Mule trail'),
  (itin2_id, 4, 0, 'Páramo Exploration', 'Trek through the páramo ecosystem. See frailejones (unique to the Andes). Visit Laguna Negra.', 'Páramo de Mérida', 8.5000, -71.0800, 70, 7, 'Local bus'),
  (itin2_id, 5, 0, 'Mucuchíes & Hot Springs', 'Visit the charming village of Mucuchíes. Natural hot springs in the afternoon. Local trout for dinner.', 'Mucuchíes', 8.7333, -70.9167, 60, 6, 'Bus'),
  (itin2_id, 6, 0, 'Jají Colonial Town', 'Day trip to Jají, a perfectly preserved colonial town. Coffee plantation visit. Artisan chocolate tasting.', 'Jají', 8.4500, -71.3667, 55, 6, 'Bus'),
  (itin2_id, 7, 0, 'Market Day & Departure', 'Morning at the Mérida market. Stock up on local coffee and chocolate. Depart.', 'Mérida Centro', 8.5897, -71.1561, 30, 3, NULL)
ON CONFLICT DO NOTHING;

-- Itinerary 3: Angel Falls & Gran Sabana (creator1, influencer pick)
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, is_influencer_pick, referral_code, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin3_id, creator1_id, 'Angel Falls & Gran Sabana Explorer',
   'See the world''s tallest waterfall and explore the ancient tepui formations of the Gran Sabana. A fly-in adventure with indigenous Pemón guides through one of Earth''s most surreal landscapes.',
   'https://images.unsplash.com/photo-1580767733747-e17c7c72de44?w=800',
   TRUE, TRUE, TRUE, 'venezolanaviajera-canaima',
   4, 950, ARRAY['Canaima', 'Gran Sabana'], ARRAY['adventure', 'nature', 'waterfall', 'indigenous'], 487, 802, 6100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours, transport_to_next) VALUES
  (itin3_id, 1, 0, 'Fly to Canaima', 'Flight from Caracas to Canaima. Afternoon canoe ride across the lagoon. Visit Sapo and Sapito waterfalls (walk behind them).', 'Canaima Lagoon', 6.2386, -62.8433, 300, 5, 'Canoe'),
  (itin3_id, 2, 0, 'River Journey to Angel Falls', 'Full day upriver in a curiara (dugout canoe) with Pemón guides. Camp at the base of Angel Falls.', 'Angel Falls', 5.9701, -62.5362, 250, 10, 'Canoe'),
  (itin3_id, 3, 0, 'Angel Falls & Hike', 'Early morning hike to the base of Angel Falls (979m). Feel the mist. Return downriver to Canaima in the afternoon.', 'Angel Falls Base', 5.9701, -62.5362, 200, 8, 'Flight'),
  (itin3_id, 4, 0, 'Gran Sabana Drive & Departure', 'If time permits, scenic drive through the Gran Sabana. See Quebrada de Jaspe (jasper creek). Flight back to Caracas.', 'Gran Sabana', 5.5000, -61.5000, 150, 6, NULL)
ON CONFLICT DO NOTHING;

-- Itinerary 4: Margarita Beach Week (regular user)
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin4_id, tourist1_id, 'Margarita Island: Sun & Culture Week',
   'A perfect week balancing beach days with cultural exploration on the Pearl of the Caribbean. From the bustling markets of Porlamar to the quiet coves of Macanao.',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
   TRUE, FALSE,
   7, 890, ARRAY['Margarita'], ARRAY['beach', 'culture', 'relaxation', 'food'], 145, 267, 2100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours) VALUES
  (itin4_id, 1, 0, 'Arrive & Playa El Agua', 'Check into hotel. Afternoon at Playa El Agua, the island''s most famous beach. Sunset cocktails.', 'Playa El Agua', 11.1167, -63.8667, 120, 5),
  (itin4_id, 2, 0, 'Porlamar Market & La Asunción', 'Morning at the Porlamar market. Visit La Asunción castle and colonial center. Lunch of fresh empanadas.', 'Porlamar', 11.0000, -63.8500, 80, 7),
  (itin4_id, 3, 0, 'Playa Parguito & Surf', 'Surf lesson at Playa Parguito. Beach BBQ lunch. Evening at a beachside bar.', 'Playa Parguito', 11.0833, -63.8333, 100, 8),
  (itin4_id, 4, 0, 'Macanao Peninsula', 'Day trip to the wild Macanao peninsula. Deserted beaches, flamingos at La Restinga lagoon.', 'Macanao', 11.0000, -64.1000, 90, 8),
  (itin4_id, 5, 0, 'Spa & Relaxation Day', 'Morning at the hotel spa. Afternoon at a quiet beach. Fine dining in the evening.', 'Juan Griego', 11.0833, -63.9667, 150, 8),
  (itin4_id, 6, 0, 'Island Hopping', 'Boat trip to Coche Island. Snorkeling, beach lunch, and kite surfing.', 'Isla de Coche', 10.9833, -63.9667, 120, 8),
  (itin4_id, 7, 0, 'Final Beach Day & Departure', 'Last morning at the beach. Shopping for local crafts. Departure.', 'Playa El Agua', 11.1167, -63.8667, 50, 4)
ON CONFLICT DO NOTHING;

-- Itinerary 5: Caracas Culture & Coast (regular user)
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin5_id, tourist2_id, 'Caracas: Culture, Food & Coast',
   'Five days discovering the vibrant capital and its nearby coastline. Street art in Chacao, arepas in every neighborhood, and secret beaches just 30 minutes from the city.',
   'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
   TRUE, FALSE,
   5, 750, ARRAY['Caracas'], ARRAY['city', 'food', 'culture', 'art', 'beach'], 98, 187, 1650)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours) VALUES
  (itin5_id, 1, 0, 'Arrive & Altamira', 'Check into hotel in Altamira. Walk the boulevard. Dinner at a traditional Venezuelan restaurant.', 'Altamira', 10.4961, -66.8541, 130, 5),
  (itin5_id, 2, 0, 'Ávila Mountain & Street Art', 'Morning hike on El Ávila (Waraira Repano). Afternoon street art tour in Chacao and Los Palos Grandes.', 'El Ávila', 10.5333, -66.8667, 80, 8),
  (itin5_id, 3, 0, 'Food Tour & Markets', 'Full-day food tour: arepa crawl, Mercado de Chacao, cachapas in El Hatillo, craft beer in Las Mercedes.', 'Chacao', 10.4944, -66.8567, 120, 8),
  (itin5_id, 4, 0, 'Coast Day: Choroní', 'Day trip to Choroní and Playa Grande. Drive through Henri Pittier National Park. Cacao plantation visit.', 'Choroní', 10.4933, -67.5933, 140, 10),
  (itin5_id, 5, 0, 'Museums & Departure', 'Morning at MACSI (contemporary art museum). Plaza Bolívar. Last arepas. Departure.', 'Centro', 10.5065, -66.9146, 60, 4)
ON CONFLICT DO NOTHING;

-- Itinerary 6: Budget Backpacking Venezuela
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin6_id, creator2_id, 'Budget Backpacking Venezuela: 10 Days',
   'The complete budget guide to Venezuela. Caracas to Mérida to Gran Sabana. Hostels, street food, local buses, and the most incredible landscapes you''ve ever seen for under $50/day.',
   'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800',
   TRUE, TRUE,
   10, 450, ARRAY['Caracas', 'Mérida', 'Gran Sabana'], ARRAY['budget', 'backpacking', 'adventure'], 276, 512, 3800)
ON CONFLICT (id) DO NOTHING;

-- Itinerary 7: Roraima Tepui Expedition
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin7_id, tourist1_id, 'Roraima Tepui: Edge of the World',
   'The ultimate Venezuelan adventure. A 6-day trek to the summit of Mount Roraima, the flat-topped mountain that inspired Conan Doyle''s Lost World. Ancient rock formations, alien landscapes, and a night camping on top of a 2-billion-year-old table mountain.',
   'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800',
   TRUE, FALSE,
   6, 850, ARRAY['Gran Sabana'], ARRAY['trekking', 'adventure', 'extreme', 'camping'], 334, 589, 4500)
ON CONFLICT (id) DO NOTHING;

-- Itinerary 8: Venezuelan Gastronomy Trail (creator3)
INSERT INTO itineraries (id, user_id, title, description, cover_image_url, is_public, is_template, is_influencer_pick, referral_code, total_days, estimated_cost_usd, regions, tags, likes, saves, views) VALUES
  (itin8_id, creator3_id, 'The Venezuelan Gastronomy Trail',
   'From cacao plantations to Caribbean seafood, this 5-day culinary journey takes you through Venezuela''s diverse food regions. Cooking classes, market tours, and meals at the country''s best restaurants.',
   'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
   TRUE, TRUE, TRUE, 'luxelatam-food',
   5, 1800, ARRAY['Caracas', 'Margarita', 'Mérida'], ARRAY['food', 'luxury', 'culture', 'gastronomy'], 189, 341, 2800)
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_stops (itinerary_id, day, "order", title, description, location_name, latitude, longitude, cost_usd, duration_hours) VALUES
  (itin8_id, 1, 0, 'Caracas: Arepa Masterclass', 'Check into boutique hotel. Evening cooking class: arepas, tequeños, and pabellón criollo with a private chef.', 'Las Mercedes', 10.4861, -66.8667, 350, 5),
  (itin8_id, 2, 0, 'Cacao Country: Choroní', 'Visit a working cacao plantation. Learn the bean-to-bar process. Tasting of single-origin Venezuelan chocolate.', 'Choroní', 10.4933, -67.5933, 280, 8),
  (itin8_id, 3, 0, 'Margarita: Seafood & Markets', 'Fly to Margarita. Lunch at the freshest seafood restaurant on the island. Evening at Porlamar''s fish market.', 'Porlamar', 11.0000, -63.8500, 320, 7),
  (itin8_id, 4, 0, 'Mérida: Andean Flavors', 'Fly to Mérida. Trout farm visit. Traditional Andean lunch. Evening rum tasting with local spirits.', 'Mérida', 8.5897, -71.1561, 290, 7),
  (itin8_id, 5, 0, 'Market Tour & Farewell Dinner', 'Morning market tour: buy spices, coffee, chocolate. Farewell dinner at Mérida''s top restaurant.', 'Mérida Centro', 8.5897, -71.1561, 260, 5)
ON CONFLICT DO NOTHING;

END $$;
