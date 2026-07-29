// Hotel catalog and landmark index.
//
// Hotels are real properties with real locations, star ratings and address
// context. `base` is an indicative nightly rate in EUR that the deal engine
// moves around; it is not a quoted price. Every card deep-links out to live
// search results, so the click-through always lands on real inventory.

let seq = 0

// name, area, stars, guestRating, reviews, base(EUR), lat, lng, amenities, blurb
function h(name, area, stars, rating, reviews, base, lat, lng, amenities, blurb) {
  return {
    id: `h${++seq}`,
    name,
    area,
    stars,
    rating,
    reviews,
    base,
    lat,
    lng,
    amenities: amenities.split(' '),
    blurb,
  }
}

export const DESTINATIONS = [
  {
    id: 'lake-como',
    city: 'Lake Como',
    country: 'Italy',
    currency: 'EUR',
    lat: 45.9852,
    lng: 9.2578,
    landmarks: [
      { name: 'Lake Como', aliases: ['como lake', 'lago di como', 'lario'], lat: 45.9852, lng: 9.2578 },
      { name: 'Bellagio', aliases: ['bellaggio'], lat: 45.9855, lng: 9.2611 },
      { name: 'Varenna', aliases: [], lat: 46.0106, lng: 9.2844 },
      { name: 'Villa del Balbianello', aliases: ['balbianello'], lat: 45.9705, lng: 9.2073 },
      { name: 'Villa Carlotta', aliases: [], lat: 45.9836, lng: 9.2244 },
      { name: 'Como Cathedral', aliases: ['duomo di como', 'como duomo'], lat: 45.8112, lng: 9.0838 },
      { name: 'Menaggio', aliases: [], lat: 46.0219, lng: 9.2394 },
      { name: 'Tremezzo', aliases: ['tremezzina'], lat: 45.9847, lng: 9.2214 },
    ],
    hotels: [
      h('Grand Hotel Tremezzo', 'Tremezzo', 5, 9.2, 1840, 780, 45.9847, 9.2214, 'pool spa lakeview restaurant bar wifi parking breakfast aircon', 'Belle Époque palace on the western shore with a floating pool on the lake.'),
      h('Villa d\'Este', 'Cernobbio', 5, 9.3, 1210, 940, 45.8419, 9.0836, 'pool spa lakeview restaurant bar wifi parking gym aircon', 'Renaissance villa and gardens, a Lake Como institution since 1873.'),
      h('Grand Hotel Villa Serbelloni', 'Bellagio', 5, 9.0, 1560, 690, 45.9873, 9.2597, 'pool spa lakeview restaurant bar wifi parking breakfast', 'Perched on the Bellagio headland where the lake splits in two.'),
      h('Hotel Belvedere Bellagio', 'Bellagio', 4, 8.9, 2140, 285, 45.9846, 9.2589, 'pool lakeview restaurant wifi parking breakfast aircon familyfriendly', 'Family-run since 1880, terraced gardens above the old town.'),
      h('Hotel Du Lac Bellagio', 'Bellagio', 3, 8.6, 1320, 175, 45.9862, 9.2617, 'lakeview restaurant bar wifi breakfast rooftop', 'Right on the waterfront promenade with a rooftop breakfast terrace.'),
      h('Albergo Milano Varenna', 'Varenna', 3, 9.4, 980, 195, 46.0103, 9.2846, 'lakeview wifi breakfast bar aircon', 'Tiny lakeside inn in Varenna with balconies over the water.'),
      h('Hotel Olivedo', 'Varenna', 3, 8.5, 760, 145, 46.0116, 9.2853, 'lakeview restaurant wifi breakfast', 'Opposite the ferry pier, unfussy rooms with the classic Varenna view.'),
      h('Grand Hotel Victoria', 'Menaggio', 5, 9.1, 890, 420, 46.0214, 9.2398, 'pool spa lakeview restaurant bar wifi gym parking', 'Recently restored grande dame with a large lakefront spa.'),
      h('Hotel Villa Flori', 'Como', 4, 8.8, 1430, 260, 45.8236, 9.0703, 'lakeview restaurant bar wifi parking breakfast aircon', 'Nineteenth-century villa on the road to Cernobbio, all rooms face the lake.'),
      h('Palace Hotel Como', 'Como', 4, 8.4, 1980, 210, 45.8104, 9.0752, 'lakeview restaurant bar wifi gym aircon parking', 'On the Como waterfront, two minutes from the funicular.'),
      h('Hotel Posta Design Como', 'Como', 4, 8.7, 1120, 165, 45.8109, 9.0819, 'wifi bar breakfast aircon petfriendly', 'Design hotel on a quiet square behind the cathedral.'),
      h('Filario Hotel & Residences', 'Lezzeno', 4, 9.2, 540, 340, 45.9569, 9.2478, 'lakeview restaurant bar wifi parking adultsonly beach', 'Glass-fronted modern build with private lake access.'),
    ],
  },
  {
    id: 'milan',
    city: 'Milan',
    country: 'Italy',
    currency: 'EUR',
    lat: 45.4642,
    lng: 9.19,
    landmarks: [
      { name: 'Duomo di Milano', aliases: ['milan cathedral', 'duomo', 'piazza del duomo'], lat: 45.4642, lng: 9.1919 },
      { name: 'Navigli', aliases: ['navigli canals'], lat: 45.4494, lng: 9.1725 },
      { name: 'Brera', aliases: ['brera district'], lat: 45.4719, lng: 9.1881 },
      { name: 'Sforza Castle', aliases: ['castello sforzesco'], lat: 45.4706, lng: 9.1794 },
      { name: 'Milano Centrale', aliases: ['central station', 'centrale'], lat: 45.4863, lng: 9.2043 },
      { name: 'San Siro', aliases: ['stadio giuseppe meazza'], lat: 45.4781, lng: 9.124 },
      { name: 'Porta Nuova', aliases: ['gae aulenti'], lat: 45.4842, lng: 9.1907 },
      { name: 'Malpensa Airport', aliases: ['mxp', 'malpensa'], lat: 45.6306, lng: 8.7281 },
    ],
    hotels: [
      h('Bulgari Hotel Milano', 'Brera', 5, 9.3, 980, 890, 45.4726, 9.1862, 'pool spa restaurant bar wifi gym aircon parking', 'Hidden garden hotel between Brera and the botanical gardens.'),
      h('Park Hyatt Milano', 'Duomo', 5, 9.2, 1640, 720, 45.4661, 9.1897, 'spa restaurant bar wifi gym aircon parking', 'Steps from the Galleria, with a domed rotunda lounge.'),
      h('Hotel Principe di Savoia', 'Repubblica', 5, 8.9, 3120, 480, 45.4805, 9.196, 'pool spa restaurant bar wifi gym parking aircon familyfriendly', 'Grand 1927 hotel on Piazza della Repubblica.'),
      h('Room Mate Giulia', 'Duomo', 4, 8.8, 2410, 245, 45.4655, 9.1899, 'wifi breakfast bar gym aircon', 'Colourful Patricia Urquiola interiors right beside the Galleria.'),
      h('NH Collection Milano President', 'San Babila', 4, 8.7, 2890, 220, 45.4665, 9.1975, 'wifi restaurant bar gym aircon parking', 'Business-friendly base a short walk from the Duomo.'),
      h('Hotel Milano Scala', 'Brera', 4, 9.0, 1470, 235, 45.4703, 9.1857, 'wifi breakfast bar rooftop aircon ev', 'Zero-emission hotel with a rooftop terrace facing La Scala.'),
      h('Ostello Bello Grande', 'Centrale', 2, 8.9, 4210, 65, 45.4846, 9.2001, 'wifi bar breakfast aircon familyfriendly', 'Sociable hostel-hotel hybrid opposite Centrale station.'),
      h('B&B Hotel Milano Navigli', 'Navigli', 3, 8.3, 1760, 95, 45.4487, 9.1712, 'wifi breakfast aircon parking petfriendly', 'Simple, well-kept rooms a block from the canals.'),
      h('Hotel Berna', 'Centrale', 4, 8.6, 3340, 155, 45.4837, 9.2028, 'wifi breakfast bar gym aircon spa', 'Long-standing favourite by the station with a small wellness floor.'),
      h('Melia Milano', 'City Life', 5, 8.8, 2260, 265, 45.4778, 9.1521, 'spa restaurant bar wifi gym aircon parking', 'Towards the new City Life towers, with a large spa.'),
    ],
  },
  {
    id: 'rome',
    city: 'Rome',
    country: 'Italy',
    currency: 'EUR',
    lat: 41.9028,
    lng: 12.4964,
    landmarks: [
      { name: 'Colosseum', aliases: ['colosseo'], lat: 41.8902, lng: 12.4922 },
      { name: 'Trevi Fountain', aliases: ['fontana di trevi', 'trevi'], lat: 41.9009, lng: 12.4833 },
      { name: 'Vatican', aliases: ['st peters', 'vatican city', 'sistine chapel'], lat: 41.9029, lng: 12.4534 },
      { name: 'Trastevere', aliases: [], lat: 41.8894, lng: 12.4695 },
      { name: 'Spanish Steps', aliases: ['piazza di spagna'], lat: 41.906, lng: 12.4823 },
      { name: 'Pantheon', aliases: [], lat: 41.8986, lng: 12.4769 },
    ],
    hotels: [
      h('Hotel de Russie', 'Piazza del Popolo', 5, 9.3, 1420, 810, 41.9109, 12.4763, 'spa restaurant bar wifi gym aircon petfriendly', 'Secret garden hotel between the Spanish Steps and Piazza del Popolo.'),
      h('Hotel Eden', 'Via Veneto', 5, 9.2, 1180, 760, 41.9066, 12.4884, 'spa restaurant bar wifi gym rooftop aircon', 'Rooftop restaurant with one of the best skyline views in Rome.'),
      h('Singer Palace Hotel', 'Trevi', 5, 9.4, 640, 430, 41.8974, 12.4823, 'restaurant bar wifi rooftop aircon', 'Small palazzo hotel with a rooftop bar near the Trevi Fountain.'),
      h('Hotel Artemide', 'Termini', 4, 9.0, 4820, 195, 41.9016, 12.4956, 'spa restaurant bar wifi gym breakfast aircon', 'Reliable four-star on Via Nazionale with a rooftop terrace.'),
      h('The Hive Hotel', 'Termini', 3, 8.7, 2140, 115, 41.9042, 12.5024, 'wifi bar breakfast aircon rooftop', 'Modern budget-conscious rooms with a leafy rooftop.'),
      h('Hotel Santa Maria', 'Trastevere', 3, 8.9, 1560, 165, 41.8896, 12.4676, 'wifi breakfast parking aircon familyfriendly petfriendly', 'Former cloister built around an orange-tree courtyard.'),
      h('Residenza Paolo VI', 'Vatican', 4, 9.1, 1930, 245, 41.9019, 12.4586, 'wifi breakfast bar rooftop aircon', 'Ex-monastery with a terrace looking straight into St Peter\'s Square.'),
      h('Generator Rome', 'Monti', 2, 8.4, 3210, 70, 41.8981, 12.5052, 'wifi bar breakfast aircon', 'Design hostel with private rooms in the Monti district.'),
    ],
  },
  {
    id: 'venice',
    city: 'Venice',
    country: 'Italy',
    currency: 'EUR',
    lat: 45.4408,
    lng: 12.3155,
    landmarks: [
      { name: "St Mark's Square", aliases: ['san marco', 'piazza san marco', 'st marks'], lat: 45.4341, lng: 12.3388 },
      { name: 'Rialto Bridge', aliases: ['rialto'], lat: 45.438, lng: 12.336 },
      { name: 'Grand Canal', aliases: ['canal grande'], lat: 45.4371, lng: 12.3326 },
      { name: 'Murano', aliases: [], lat: 45.4585, lng: 12.3536 },
      { name: 'Lido', aliases: ['venice lido'], lat: 45.4102, lng: 12.3663 },
    ],
    hotels: [
      h('The Gritti Palace', 'San Marco', 5, 9.3, 980, 920, 45.4322, 12.3334, 'restaurant bar wifi spa aircon', 'Fifteenth-century palazzo directly on the Grand Canal.'),
      h('Hotel Danieli', 'San Marco', 5, 8.9, 2140, 780, 45.4337, 12.3418, 'restaurant bar wifi rooftop aircon', 'Gothic palace by the Bridge of Sighs with a rooftop terrace.'),
      h('Ca\' Sagredo Hotel', 'Cannaregio', 5, 9.0, 1120, 420, 45.4408, 12.3336, 'restaurant bar wifi aircon', 'Frescoed noble residence facing the Grand Canal.'),
      h('Hotel Antiche Figure', 'Santa Croce', 4, 9.1, 2460, 215, 45.4409, 12.3218, 'wifi breakfast bar aircon', 'Opposite the train station, across the water from the crowds.'),
      h('Generator Venice', 'Giudecca', 2, 8.5, 2870, 75, 45.4283, 12.3245, 'wifi bar breakfast', 'Waterfront hostel on Giudecca looking back at San Marco.'),
      h('Hotel Al Ponte Mocenigo', 'Santa Croce', 3, 9.2, 1640, 145, 45.4404, 12.3283, 'wifi breakfast aircon petfriendly', 'Seventeenth-century palazzo with a private courtyard.'),
    ],
  },
  {
    id: 'florence',
    city: 'Florence',
    country: 'Italy',
    currency: 'EUR',
    lat: 43.7696,
    lng: 11.2558,
    landmarks: [
      { name: 'Florence Cathedral', aliases: ['duomo firenze', 'santa maria del fiore'], lat: 43.7731, lng: 11.2559 },
      { name: 'Ponte Vecchio', aliases: [], lat: 43.768, lng: 11.2531 },
      { name: 'Uffizi Gallery', aliases: ['uffizi'], lat: 43.7678, lng: 11.2553 },
      { name: 'Piazzale Michelangelo', aliases: [], lat: 43.7629, lng: 11.265 },
    ],
    hotels: [
      h('Portrait Firenze', 'Ponte Vecchio', 5, 9.4, 720, 690, 43.7684, 11.2521, 'restaurant bar wifi gym aircon petfriendly', 'Every suite looks onto the Ponte Vecchio.'),
      h('Hotel Savoy', 'Duomo', 5, 9.1, 1180, 560, 43.7719, 11.2542, 'restaurant bar wifi gym aircon', 'On Piazza della Repubblica, a minute from the Duomo.'),
      h('Palazzo Guadagni', 'Santo Spirito', 3, 8.9, 940, 165, 43.7669, 11.2477, 'wifi breakfast bar rooftop aircon', 'Loggia terrace over the Santo Spirito square.'),
      h('Hotel Davanzati', 'Centro', 4, 9.3, 2140, 205, 43.7705, 11.2523, 'wifi breakfast bar aircon familyfriendly', 'Warm family-run four-star between the Duomo and the river.'),
      h('Plus Florence', 'San Marco', 3, 8.2, 3410, 85, 43.7793, 11.2554, 'pool wifi bar breakfast gym spa aircon', 'Budget rooms with an indoor pool and rooftop.'),
      h('Villa Cora', 'Oltrarno', 5, 9.2, 860, 520, 43.7595, 11.2438, 'pool spa restaurant bar wifi gym parking aircon', 'Nineteenth-century villa in a park above the Boboli Gardens.'),
    ],
  },
  {
    id: 'paris',
    city: 'Paris',
    country: 'France',
    currency: 'EUR',
    lat: 48.8566,
    lng: 2.3522,
    landmarks: [
      { name: 'Eiffel Tower', aliases: ['tour eiffel'], lat: 48.8584, lng: 2.2945 },
      { name: 'Louvre', aliases: ['louvre museum', 'musee du louvre'], lat: 48.8606, lng: 2.3376 },
      { name: 'Notre-Dame', aliases: ['notre dame'], lat: 48.853, lng: 2.3499 },
      { name: 'Montmartre', aliases: ['sacre coeur'], lat: 48.8867, lng: 2.3431 },
      { name: 'Champs-Élysées', aliases: ['champs elysees', 'arc de triomphe'], lat: 48.8698, lng: 2.3078 },
      { name: 'Le Marais', aliases: ['marais'], lat: 48.8575, lng: 2.3622 },
    ],
    hotels: [
      h('Le Meurice', 'Tuileries', 5, 9.2, 1420, 980, 48.8654, 2.3283, 'spa restaurant bar wifi gym aircon petfriendly', 'Facing the Tuileries, with Philippe Starck interiors.'),
      h('Hôtel Plaza Athénée', 'Montaigne', 5, 9.3, 1180, 1100, 48.8657, 2.3038, 'spa restaurant bar wifi gym aircon', 'Red-awning icon on Avenue Montaigne.'),
      h('Hôtel des Grands Boulevards', 'Bourse', 4, 8.8, 1640, 245, 48.8703, 2.3466, 'restaurant bar wifi aircon', 'Courtyard restaurant and pattern-heavy rooms near Grands Boulevards.'),
      h('Hôtel Fabric', 'Oberkampf', 4, 9.0, 1980, 215, 48.8646, 2.3763, 'wifi breakfast bar gym aircon', 'Converted textile factory in the Oberkampf nightlife quarter.'),
      h('Generator Paris', 'Belleville', 2, 8.3, 4120, 78, 48.8817, 2.3708, 'wifi bar breakfast rooftop', 'Rooftop bar with a Sacré-Cœur view, private and shared rooms.'),
      h('Hôtel Le Six', 'Montparnasse', 4, 8.9, 1210, 225, 48.8437, 2.3269, 'spa wifi breakfast bar aircon', 'Quiet Left Bank four-star with a small hammam.'),
      h('Citadines Tour Eiffel', 'Grenelle', 3, 8.4, 2870, 175, 48.8503, 2.2896, 'wifi gym aircon familyfriendly parking', 'Apartment-style rooms with kitchenettes near the Eiffel Tower.'),
    ],
  },
  {
    id: 'barcelona',
    city: 'Barcelona',
    country: 'Spain',
    currency: 'EUR',
    lat: 41.3874,
    lng: 2.1686,
    landmarks: [
      { name: 'Sagrada Família', aliases: ['sagrada familia'], lat: 41.4036, lng: 2.1744 },
      { name: 'Las Ramblas', aliases: ['la rambla', 'ramblas'], lat: 41.3809, lng: 2.1734 },
      { name: 'Park Güell', aliases: ['park guell'], lat: 41.4145, lng: 2.1527 },
      { name: 'Barceloneta Beach', aliases: ['barceloneta', 'the beach'], lat: 41.3784, lng: 2.1925 },
      { name: 'Gothic Quarter', aliases: ['barri gotic'], lat: 41.3833, lng: 2.1767 },
    ],
    hotels: [
      h('Hotel Arts Barcelona', 'Port Olímpic', 5, 9.1, 3240, 480, 41.3868, 2.1963, 'pool spa restaurant bar wifi gym beach seaview aircon parking', 'Beachfront tower with a two-Michelin-star restaurant.'),
      h('Mercer Hotel Barcelona', 'Gothic Quarter', 5, 9.3, 780, 520, 41.3833, 2.1782, 'pool restaurant bar wifi rooftop aircon adultsonly', 'Roman-wall townhouse with a rooftop plunge pool.'),
      h('Yurbban Trafalgar', 'Born', 4, 9.2, 2140, 195, 41.3888, 2.1772, 'pool wifi breakfast bar rooftop gym aircon', 'Rooftop pool looking towards the Sagrada Família.'),
      h('Hotel Brummell', 'Poble-sec', 3, 9.0, 1460, 155, 41.3722, 2.1657, 'pool wifi breakfast bar gym aircon petfriendly', 'Relaxed Poble-sec base with a small pool and yoga studio.'),
      h('Generator Barcelona', 'Gràcia', 2, 8.4, 3820, 68, 41.3971, 2.1637, 'wifi bar breakfast aircon', 'Sociable stay on the edge of Gràcia.'),
      h('W Barcelona', 'Barceloneta', 5, 8.9, 5120, 390, 41.3683, 2.1902, 'pool spa restaurant bar wifi gym beach seaview aircon', 'The sail-shaped tower at the end of Barceloneta beach.'),
    ],
  },
  {
    id: 'amsterdam',
    city: 'Amsterdam',
    country: 'Netherlands',
    currency: 'EUR',
    lat: 52.3676,
    lng: 4.9041,
    landmarks: [
      { name: 'Anne Frank House', aliases: ['anne frank'], lat: 52.3752, lng: 4.884 },
      { name: 'Rijksmuseum', aliases: ['museumplein'], lat: 52.36, lng: 4.8852 },
      { name: 'Jordaan', aliases: [], lat: 52.3747, lng: 4.8807 },
      { name: 'Vondelpark', aliases: [], lat: 52.3579, lng: 4.8686 },
      { name: 'Amsterdam Centraal', aliases: ['central station'], lat: 52.379, lng: 4.9003 },
    ],
    hotels: [
      h('Waldorf Astoria Amsterdam', 'Canal Belt', 5, 9.2, 940, 720, 52.3629, 4.8952, 'spa restaurant bar wifi gym aircon parking', 'Six canal palaces joined into one hotel on the Herengracht.'),
      h('Hotel Pulitzer Amsterdam', 'Jordaan', 5, 9.1, 2140, 420, 52.3743, 4.8846, 'restaurant bar wifi gym aircon petfriendly', 'Twenty-five canal houses knitted together beside the Anne Frank House.'),
      h('Conservatorium Hotel', 'Museumplein', 5, 9.4, 1320, 610, 52.359, 4.8797, 'pool spa restaurant bar wifi gym aircon', 'Former conservatory with a soaring glass atrium.'),
      h('Hotel V Nesplein', 'Centrum', 4, 8.9, 1870, 215, 52.3703, 4.8934, 'wifi breakfast bar gym aircon', 'Warm design four-star a few minutes from Dam Square.'),
      h('The Student Hotel Amsterdam City', 'Oost', 3, 8.6, 2960, 125, 52.3593, 4.9178, 'wifi bar breakfast gym aircon familyfriendly', 'Co-living style rooms with a big shared ground floor.'),
      h('ClinkNOORD', 'Noord', 2, 8.3, 4210, 62, 52.3841, 4.8994, 'wifi bar breakfast', 'Across the free ferry from Centraal, in a 1920s laboratory.'),
    ],
  },
  {
    id: 'london',
    city: 'London',
    country: 'United Kingdom',
    currency: 'GBP',
    lat: 51.5074,
    lng: -0.1278,
    landmarks: [
      { name: 'Big Ben', aliases: ['westminster', 'houses of parliament'], lat: 51.5007, lng: -0.1246 },
      { name: 'Tower Bridge', aliases: ['tower of london'], lat: 51.5055, lng: -0.0754 },
      { name: 'Hyde Park', aliases: [], lat: 51.5073, lng: -0.1657 },
      { name: 'Covent Garden', aliases: [], lat: 51.5117, lng: -0.1231 },
      { name: 'Shoreditch', aliases: [], lat: 51.5265, lng: -0.0784 },
      { name: 'Heathrow Airport', aliases: ['lhr', 'heathrow'], lat: 51.47, lng: -0.4543 },
    ],
    hotels: [
      h('The Savoy', 'Covent Garden', 5, 9.2, 3140, 720, 51.5101, -0.1204, 'spa restaurant bar wifi gym aircon petfriendly', 'Thames-side legend with the American Bar.'),
      h('The Ned', 'City', 5, 9.0, 2480, 480, 51.5138, -0.0885, 'pool spa restaurant bar wifi gym rooftop aircon', 'Former bank with nine restaurants under one banking hall.'),
      h('The Hoxton, Shoreditch', 'Shoreditch', 4, 8.8, 3620, 195, 51.5253, -0.0796, 'restaurant bar wifi aircon petfriendly', 'The original Hoxton, on Great Eastern Street.'),
      h('citizenM Tower of London', 'City', 4, 9.0, 4210, 175, 51.5108, -0.0782, 'wifi bar breakfast gym aircon', 'Compact tech-forward rooms staring at the Tower.'),
      h('The Z Hotel Piccadilly', 'Soho', 3, 8.6, 5120, 135, 51.5106, -0.1339, 'wifi breakfast bar aircon', 'Small, sharp rooms in the middle of Soho.'),
      h('Point A Hotel Kings Cross', 'Kings Cross', 3, 8.4, 3870, 95, 51.5303, -0.1226, 'wifi breakfast aircon', 'No-frills base beside St Pancras.'),
      h('The Berkeley', 'Knightsbridge', 5, 9.3, 1240, 690, 51.5024, -0.1524, 'pool spa restaurant bar wifi gym rooftop aircon', 'Rooftop pool overlooking Hyde Park.'),
    ],
  },
  {
    id: 'lisbon',
    city: 'Lisbon',
    country: 'Portugal',
    currency: 'EUR',
    lat: 38.7223,
    lng: -9.1393,
    landmarks: [
      { name: 'Belém Tower', aliases: ['belem', 'torre de belem'], lat: 38.6916, lng: -9.216 },
      { name: 'Alfama', aliases: [], lat: 38.7118, lng: -9.13 },
      { name: 'Bairro Alto', aliases: [], lat: 38.7132, lng: -9.1462 },
      { name: 'Praça do Comércio', aliases: ['praca do comercio', 'commerce square'], lat: 38.7076, lng: -9.1365 },
    ],
    hotels: [
      h('Four Seasons Ritz Lisbon', 'Avenida', 5, 9.3, 1240, 560, 38.7255, -9.1533, 'pool spa restaurant bar wifi gym parking aircon', 'Mid-century landmark above Eduardo VII Park.'),
      h('Memmo Alfama', 'Alfama', 4, 9.1, 1680, 245, 38.7113, -9.1305, 'pool wifi breakfast bar rooftop aircon adultsonly', 'Red plunge pool on a terrace over the Tagus.'),
      h('The Lumiares', 'Bairro Alto', 5, 9.2, 940, 285, 38.7143, -9.1449, 'restaurant bar wifi gym rooftop aircon', 'Apartment-style suites with a rooftop restaurant.'),
      h('Hotel Mundial', 'Baixa', 4, 8.5, 3120, 145, 38.7157, -9.1367, 'restaurant bar wifi gym rooftop aircon parking', 'Big central four-star with a well-known rooftop bar.'),
      h('Home Lisbon Hostel', 'Baixa', 2, 9.4, 2410, 55, 38.7113, -9.1385, 'wifi breakfast bar', 'Consistently top-rated hostel with home-cooked dinners.'),
      h('Palácio Ludovice', 'Bairro Alto', 5, 9.4, 620, 380, 38.7139, -9.1443, 'pool spa restaurant bar wifi aircon', 'Eighteenth-century palace turned wine hotel.'),
    ],
  },
  {
    id: 'santorini',
    city: 'Santorini',
    country: 'Greece',
    currency: 'EUR',
    lat: 36.3932,
    lng: 25.4615,
    landmarks: [
      { name: 'Oia', aliases: ['oia village'], lat: 36.4618, lng: 25.3753 },
      { name: 'Fira', aliases: ['thira'], lat: 36.4167, lng: 25.4322 },
      { name: 'Red Beach', aliases: [], lat: 36.3486, lng: 25.3936 },
      { name: 'Imerovigli', aliases: [], lat: 36.4331, lng: 25.4211 },
    ],
    hotels: [
      h('Canaves Oia Suites', 'Oia', 5, 9.5, 840, 720, 36.4624, 25.3745, 'pool spa restaurant bar wifi seaview aircon adultsonly', 'Cave suites with private plunge pools over the caldera.'),
      h('Grace Hotel Santorini', 'Imerovigli', 5, 9.4, 620, 640, 36.4334, 25.4204, 'pool spa restaurant bar wifi seaview aircon', 'Infinity pool on the caldera edge at Imerovigli.'),
      h('Astra Suites', 'Imerovigli', 5, 9.6, 780, 480, 36.4322, 25.4218, 'pool spa restaurant bar wifi seaview aircon', 'Whitewashed terraces stacked down the cliff.'),
      h('Aressana Spa Hotel', 'Fira', 4, 9.1, 1120, 285, 36.4152, 25.4308, 'pool spa restaurant bar wifi breakfast aircon', 'Quiet pool garden a short walk from Fira centre.'),
      h('Villa Manos', 'Karterados', 3, 8.7, 940, 105, 36.4067, 25.4483, 'pool wifi breakfast parking aircon familyfriendly', 'Simple pool hotel inland, ten minutes from Fira.'),
      h('Caldera View Resort', 'Akrotiri', 4, 8.9, 680, 175, 36.3556, 25.4014, 'pool wifi breakfast seaview parking aircon', 'Sunset-facing rooms on the quieter southern rim.'),
    ],
  },
  {
    id: 'dubai',
    city: 'Dubai',
    country: 'United Arab Emirates',
    currency: 'AED',
    lat: 25.2048,
    lng: 55.2708,
    landmarks: [
      { name: 'Burj Khalifa', aliases: ['downtown dubai', 'dubai mall'], lat: 25.1972, lng: 55.2744 },
      { name: 'Palm Jumeirah', aliases: ['the palm'], lat: 25.1124, lng: 55.139 },
      { name: 'Dubai Marina', aliases: ['jbr', 'marina'], lat: 25.0805, lng: 55.1403 },
      { name: 'Dubai Creek', aliases: ['deira', 'old dubai'], lat: 25.2653, lng: 55.3095 },
    ],
    hotels: [
      h('Atlantis The Royal', 'Palm Jumeirah', 5, 9.2, 3240, 720, 25.1318, 55.1189, 'pool spa restaurant bar wifi gym beach seaview aircon parking familyfriendly', 'Sky pools and a huge restaurant roster on the Palm.'),
      h('Burj Al Arab Jumeirah', 'Umm Suqeim', 5, 9.3, 2140, 1180, 25.1412, 55.1853, 'pool spa restaurant bar wifi gym beach seaview aircon parking', 'The sail. All-suite, with private beach access.'),
      h('Address Downtown', 'Downtown', 5, 9.0, 4120, 380, 25.1953, 55.2721, 'pool spa restaurant bar wifi gym aircon parking', 'Directly beside the Burj Khalifa and the fountain.'),
      h('Rove Downtown', 'Downtown', 3, 8.8, 6210, 95, 25.1932, 55.2836, 'pool wifi bar gym breakfast aircon parking familyfriendly', 'Sharp budget rooms with a rooftop pool and Burj view.'),
      h('Rixos Premium Dubai JBR', 'Marina', 5, 8.9, 3860, 265, 25.0793, 55.1341, 'pool spa restaurant bar wifi gym beach seaview aircon', 'All-inclusive option right on the JBR beachfront.'),
      h('Premier Inn Dubai Investments Park', 'IMPZ', 3, 8.5, 2410, 55, 24.9865, 55.1789, 'pool wifi gym breakfast parking aircon familyfriendly', 'Cheapest reliable bed in the city, if you have a car.'),
    ],
  },
]

export const HOTELS = DESTINATIONS.flatMap((d) =>
  d.hotels.map((hotel) => ({
    ...hotel,
    destinationId: d.id,
    city: d.city,
    country: d.country,
  }))
)

export const LANDMARKS = DESTINATIONS.flatMap((d) =>
  d.landmarks.map((l) => ({ ...l, destinationId: d.id, city: d.city }))
)

export const CITIES = DESTINATIONS.map((d) => ({
  id: d.id,
  city: d.city,
  country: d.country,
  lat: d.lat,
  lng: d.lng,
}))

export const AMENITIES = [
  { id: 'pool', label: 'Pool', icon: '🏊' },
  { id: 'spa', label: 'Spa', icon: '🧖' },
  { id: 'lakeview', label: 'Lake view', icon: '🏔️' },
  { id: 'seaview', label: 'Sea view', icon: '🌊' },
  { id: 'beach', label: 'Beach access', icon: '🏖️' },
  { id: 'breakfast', label: 'Breakfast', icon: '🥐' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { id: 'bar', label: 'Bar', icon: '🍸' },
  { id: 'rooftop', label: 'Rooftop', icon: '🌇' },
  { id: 'gym', label: 'Gym', icon: '🏋️' },
  { id: 'parking', label: 'Parking', icon: '🅿️' },
  { id: 'wifi', label: 'Wi-Fi', icon: '📶' },
  { id: 'aircon', label: 'Air con', icon: '❄️' },
  { id: 'petfriendly', label: 'Pet friendly', icon: '🐕' },
  { id: 'familyfriendly', label: 'Family friendly', icon: '👨‍👩‍👧' },
  { id: 'adultsonly', label: 'Adults only', icon: '🥂' },
  { id: 'ev', label: 'EV charging', icon: '🔌' },
]

export const AMENITY_LABEL = Object.fromEntries(AMENITIES.map((a) => [a.id, a.label]))
export const AMENITY_ICON = Object.fromEntries(AMENITIES.map((a) => [a.id, a.icon]))

export function hotelById(id) {
  return HOTELS.find((h) => h.id === id)
}

/** Great-circle distance in km. */
export function distanceKm(a, b) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(x))
}
