// Additional destinations beyond the original European core.
//
// Same shape as the entries in catalog.js; kept separate only so that file
// stays readable. Coordinates are approximate to a few hundred metres, which
// is enough for "near X" distance ranking.

export function makeWorld(h) {
  return [
    // ---------------------------------------------------------- Africa
    {
      id: 'cape-town', city: 'Cape Town', country: 'South Africa', currency: 'ZAR',
      lat: -33.9249, lng: 18.4241,
      landmarks: [
        { name: 'Table Mountain', aliases: [], lat: -33.9628, lng: 18.4098 },
        { name: 'V&A Waterfront', aliases: ['va waterfront', 'waterfront'], lat: -33.9036, lng: 18.4197 },
        { name: 'Camps Bay', aliases: [], lat: -33.9550, lng: 18.3776 },
        { name: 'Bo-Kaap', aliases: ['bokaap'], lat: -33.9210, lng: 18.4140 },
        { name: 'Cape Point', aliases: ['cape of good hope'], lat: -34.3568, lng: 18.4972 },
        { name: 'Kirstenbosch', aliases: ['botanical garden'], lat: -33.9880, lng: 18.4324 },
      ],
      hotels: [
        h('The Silo Hotel', 'V&A Waterfront', 5, 9.4, 890, 620, -33.9075, 18.4232, 'pool spa restaurant bar wifi gym seaview aircon parking', 'Built into a grain silo above the Zeitz museum, with vaulted glass windows.'),
        h('Belmond Mount Nelson Hotel', 'Gardens', 5, 9.2, 1640, 380, -33.9327, 18.4106, 'pool spa restaurant bar wifi gym parking aircon familyfriendly', 'Pink landmark under Table Mountain, set in nine acres of gardens.'),
        h('The Bay Hotel', 'Camps Bay', 4, 8.8, 1210, 240, -33.9550, 18.3776, 'pool spa restaurant bar wifi beach seaview aircon parking', 'Across the road from Camps Bay beach with four pools.'),
        h('Radisson Blu Hotel Waterfront', 'V&A Waterfront', 4, 8.6, 2870, 195, -33.9046, 18.4194, 'pool restaurant bar wifi gym seaview aircon parking', 'On the water at Granger Bay, walkable to the Waterfront.'),
        h('Once in Cape Town', 'Kloof Street', 2, 8.4, 1120, 55, -33.9268, 18.4147, 'wifi bar breakfast aircon', 'Sociable base on Kloof Street, close to the city bowl bars.'),
      ],
    },
    {
      id: 'marrakech', city: 'Marrakech', country: 'Morocco', currency: 'MAD',
      lat: 31.6295, lng: -7.9811,
      landmarks: [
        { name: 'Jemaa el-Fnaa', aliases: ['jemaa el fna', 'main square'], lat: 31.6258, lng: -7.9891 },
        { name: 'Majorelle Garden', aliases: ['jardin majorelle'], lat: 31.6417, lng: -8.0031 },
        { name: 'Marrakech Medina', aliases: ['the medina'], lat: 31.6295, lng: -7.9811 },
        { name: 'Koutoubia Mosque', aliases: ['koutoubia'], lat: 31.6236, lng: -7.9930 },
      ],
      hotels: [
        h('La Mamounia', 'Hivernage', 5, 9.4, 1980, 560, 31.6236, -7.9975, 'pool spa restaurant bar wifi gym parking aircon', 'Legendary gardens and riad courtyards inside the old walls.'),
        h('Royal Mansour Marrakech', 'Hivernage', 5, 9.6, 740, 980, 31.6262, -8.0003, 'pool spa restaurant bar wifi gym parking aircon adultsonly', 'Private three-storey riads, each with its own plunge pool.'),
        h('Riad Yasmine', 'Medina', 3, 9.1, 640, 130, 31.6318, -7.9865, 'pool wifi breakfast aircon rooftop', 'Small riad built around a green-tiled courtyard pool.'),
        h('Nobu Hotel Marrakech', 'Hivernage', 5, 9.0, 520, 340, 31.6295, -8.0139, 'pool spa restaurant bar wifi gym rooftop aircon', 'Rooftop pool and Nobu restaurant on the edge of the new town.'),
      ],
    },
    {
      id: 'cairo', city: 'Cairo', country: 'Egypt', currency: 'EGP',
      lat: 30.0444, lng: 31.2357,
      landmarks: [
        { name: 'Pyramids of Giza', aliases: ['giza', 'great pyramid', 'the pyramids'], lat: 29.9792, lng: 31.1342 },
        { name: 'Egyptian Museum', aliases: ['tahrir square'], lat: 30.0478, lng: 31.2336 },
        { name: 'Khan el-Khalili', aliases: ['khan el khalili', 'bazaar'], lat: 30.0477, lng: 31.2622 },
        { name: 'Nile Corniche', aliases: ['the nile', 'zamalek'], lat: 30.0444, lng: 31.2280 },
      ],
      hotels: [
        h('Marriott Mena House', 'Giza', 5, 9.0, 3210, 220, 29.9878, 31.1367, 'pool spa restaurant bar wifi gym parking aircon familyfriendly', 'Former royal lodge with pyramid views from the garden rooms.'),
        h('Four Seasons Cairo at Nile Plaza', 'Garden City', 5, 9.2, 2140, 290, 30.0369, 31.2296, 'pool spa restaurant bar wifi gym parking aircon', 'Nile-facing tower with a large terrace pool.'),
        h('Steigenberger Hotel El Tahrir', 'Downtown', 4, 8.5, 1640, 120, 30.0459, 31.2379, 'restaurant bar wifi gym aircon parking breakfast', 'Steps from the Egyptian Museum and Tahrir Square.'),
      ],
    },

    // ---------------------------------------------------------- Asia
    {
      id: 'bangkok', city: 'Bangkok', country: 'Thailand', currency: 'THB',
      lat: 13.7563, lng: 100.5018,
      landmarks: [
        { name: 'Grand Palace', aliases: ['wat phra kaew'], lat: 13.7500, lng: 100.4913 },
        { name: 'Wat Arun', aliases: ['temple of dawn'], lat: 13.7437, lng: 100.4889 },
        { name: 'Khao San Road', aliases: ['khaosan'], lat: 13.7590, lng: 100.4977 },
        { name: 'Sukhumvit', aliases: ['asok', 'thonglor'], lat: 13.7380, lng: 100.5600 },
        { name: 'Chatuchak Market', aliases: ['chatuchak'], lat: 13.7999, lng: 100.5502 },
      ],
      hotels: [
        h('Mandarin Oriental Bangkok', 'Riverside', 5, 9.4, 2410, 420, 13.7234, 100.5140, 'pool spa restaurant bar wifi gym parking aircon', 'On the Chao Phraya since 1876, with the Authors Wing.'),
        h('The Siam', 'Dusit', 5, 9.5, 620, 520, 13.7797, 100.5093, 'pool spa restaurant bar wifi gym aircon adultsonly', 'Art deco riverside retreat with private pool villas.'),
        h('Rosewood Bangkok', 'Ploenchit', 5, 9.3, 940, 340, 13.7430, 100.5470, 'pool spa restaurant bar wifi gym rooftop aircon', 'Sculptural tower off Ploenchit with a rooftop bar.'),
        h('Lub d Bangkok Siam', 'Siam', 2, 8.6, 2140, 40, 13.7460, 100.5340, 'wifi bar breakfast aircon', 'Bright hostel a few minutes from National Stadium BTS.'),
      ],
    },
    {
      id: 'tokyo', city: 'Tokyo', country: 'Japan', currency: 'JPY',
      lat: 35.6762, lng: 139.6503,
      landmarks: [
        { name: 'Shibuya Crossing', aliases: ['shibuya'], lat: 35.6595, lng: 139.7005 },
        { name: 'Senso-ji', aliases: ['sensoji', 'asakusa'], lat: 35.7148, lng: 139.7967 },
        { name: 'Shinjuku', aliases: ['shinjuku station'], lat: 35.6896, lng: 139.7006 },
        { name: 'Tokyo Station', aliases: ['marunouchi'], lat: 35.6812, lng: 139.7671 },
        { name: 'Ginza', aliases: [], lat: 35.6717, lng: 139.7650 },
      ],
      hotels: [
        h('Park Hyatt Tokyo', 'Shinjuku', 5, 9.3, 1840, 560, 35.6855, 139.6917, 'pool spa restaurant bar wifi gym aircon parking', 'The New York Bar on the 52nd floor, above west Shinjuku.'),
        h('Aman Tokyo', 'Otemachi', 5, 9.5, 640, 980, 35.6862, 139.7639, 'pool spa restaurant bar wifi gym aircon', 'Vast washi-lit lobby atop the Otemachi Tower.'),
        h('Hotel Gracery Shinjuku', 'Kabukicho', 4, 8.6, 4120, 165, 35.6955, 139.7005, 'restaurant bar wifi aircon', 'The one with the Godzilla head, in the middle of Kabukicho.'),
        h('UNPLAN Kagurazaka', 'Kagurazaka', 2, 9.0, 980, 55, 35.7020, 139.7380, 'wifi bar breakfast aircon', 'Design hostel on a quiet slope in Kagurazaka.'),
      ],
    },
    {
      id: 'singapore', city: 'Singapore', country: 'Singapore', currency: 'SGD',
      lat: 1.3521, lng: 103.8198,
      landmarks: [
        { name: 'Marina Bay Sands', aliases: ['marina bay'], lat: 1.2834, lng: 103.8607 },
        { name: 'Gardens by the Bay', aliases: ['gardens by the bay'], lat: 1.2816, lng: 103.8636 },
        { name: 'Sentosa', aliases: ['sentosa island'], lat: 1.2494, lng: 103.8303 },
        { name: 'Orchard Road', aliases: ['orchard'], lat: 1.3048, lng: 103.8318 },
        { name: 'Changi Airport', aliases: ['changi', 'sin'], lat: 1.3644, lng: 103.9915 },
      ],
      hotels: [
        h('Marina Bay Sands', 'Marina Bay', 5, 8.9, 8210, 480, 1.2834, 103.8607, 'pool spa restaurant bar wifi gym rooftop aircon parking familyfriendly', 'The infinity pool on the 57th-floor SkyPark.'),
        h('Raffles Singapore', 'City Hall', 5, 9.4, 1420, 780, 1.2949, 103.8543, 'pool spa restaurant bar wifi gym aircon', 'All-suite colonial landmark and the Long Bar.'),
        h('The Warehouse Hotel', 'Robertson Quay', 4, 9.1, 940, 250, 1.2884, 103.8404, 'pool restaurant bar wifi gym aircon', 'A converted 1895 godown on the Singapore River.'),
      ],
    },
    {
      id: 'bali', city: 'Bali', country: 'Indonesia', currency: 'IDR',
      lat: -8.4095, lng: 115.1889,
      landmarks: [
        { name: 'Ubud', aliases: ['ubud centre'], lat: -8.5069, lng: 115.2625 },
        { name: 'Seminyak', aliases: [], lat: -8.6900, lng: 115.1680 },
        { name: 'Uluwatu', aliases: ['uluwatu temple'], lat: -8.8291, lng: 115.0849 },
        { name: 'Canggu', aliases: [], lat: -8.6478, lng: 115.1385 },
      ],
      hotels: [
        h('Four Seasons Resort Bali at Sayan', 'Ubud', 5, 9.5, 890, 620, -8.4838, 115.2532, 'pool spa restaurant bar wifi gym aircon parking', 'Bridge into a rooftop lotus pond above the Ayung river.'),
        h('Potato Head Suites', 'Seminyak', 5, 9.1, 740, 290, -8.6795, 115.1580, 'pool spa restaurant bar wifi gym beach seaview aircon', 'Beach club suites with a sunset-facing pool.'),
        h('Bisma Eight', 'Ubud', 4, 9.2, 620, 165, -8.5069, 115.2625, 'pool spa restaurant bar wifi aircon adultsonly', 'Jungle-facing pool a short walk from Ubud centre.'),
        h('The Farm Hostel Canggu', 'Canggu', 2, 8.8, 1240, 30, -8.6478, 115.1385, 'pool wifi bar breakfast aircon', 'Pool hostel among the Canggu rice fields.'),
      ],
    },
    {
      id: 'hong-kong', city: 'Hong Kong', country: 'Hong Kong', currency: 'HKD',
      lat: 22.3193, lng: 114.1694,
      landmarks: [
        { name: 'Victoria Peak', aliases: ['the peak'], lat: 22.2759, lng: 114.1455 },
        { name: 'Tsim Sha Tsui', aliases: ['tst', 'kowloon'], lat: 22.2976, lng: 114.1722 },
        { name: 'Central, Hong Kong', aliases: ['central district'], lat: 22.2819, lng: 114.1582 },
        { name: 'Lantau Island', aliases: ['big buddha', 'lantau'], lat: 22.2540, lng: 113.9200 },
      ],
      hotels: [
        h('The Peninsula Hong Kong', 'Tsim Sha Tsui', 5, 9.4, 1840, 620, 22.2950, 114.1722, 'pool spa restaurant bar wifi gym seaview aircon parking', 'Harbour-facing grande dame with a fleet of green Rolls-Royces.'),
        h('The Upper House', 'Admiralty', 5, 9.5, 940, 560, 22.2779, 114.1656, 'spa restaurant bar wifi gym aircon adultsonly', 'Calm, timber-lined rooms above Pacific Place.'),
        h('Mini Hotel Central', 'Central', 3, 8.3, 2140, 110, 22.2836, 114.1546, 'wifi aircon', 'Compact, well-run rooms in the middle of Central.'),
      ],
    },
    {
      id: 'kuala-lumpur', city: 'Kuala Lumpur', country: 'Malaysia', currency: 'MYR',
      lat: 3.1390, lng: 101.6869,
      landmarks: [
        { name: 'Petronas Towers', aliases: ['klcc', 'twin towers'], lat: 3.1578, lng: 101.7117 },
        { name: 'Bukit Bintang', aliases: [], lat: 3.1465, lng: 101.7100 },
        { name: 'Batu Caves', aliases: [], lat: 3.2379, lng: 101.6840 },
      ],
      hotels: [
        h('Mandarin Oriental Kuala Lumpur', 'KLCC', 5, 9.1, 2410, 210, 3.1548, 101.7118, 'pool spa restaurant bar wifi gym aircon parking', 'Next to the Petronas Towers, overlooking KLCC park.'),
        h('The RuMa Hotel and Residences', 'KLCC', 5, 9.3, 940, 190, 3.1553, 101.7106, 'pool spa restaurant bar wifi gym rooftop aircon', 'Craft-led interiors and a long rooftop pool.'),
        h('Sunway Velocity Hotel', 'Cheras', 4, 8.7, 1640, 75, 3.1300, 101.7208, 'pool restaurant bar wifi gym aircon parking familyfriendly', 'Attached to a mall, on the MRT a few stops out.'),
      ],
    },
    {
      id: 'maldives', city: 'Maldives', country: 'Maldives', currency: 'MVR',
      lat: 3.2028, lng: 73.2207,
      landmarks: [
        { name: 'Male', aliases: ['male city', 'velana airport'], lat: 4.1755, lng: 73.5093 },
        { name: 'North Male Atoll', aliases: ['north male'], lat: 4.3000, lng: 73.5000 },
        { name: 'Baa Atoll', aliases: ['hanifaru bay'], lat: 5.1200, lng: 73.0700 },
      ],
      hotels: [
        h('Soneva Fushi', 'Baa Atoll', 5, 9.6, 640, 1180, 5.1200, 73.0700, 'pool spa restaurant bar wifi gym beach seaview aircon familyfriendly', 'Barefoot villas on a jungle island, with an observatory.'),
        h('Gili Lankanfushi', 'North Male Atoll', 5, 9.6, 720, 1240, 4.3050, 73.5400, 'pool spa restaurant bar wifi gym beach seaview aircon adultsonly', 'Overwater villas reached by a wooden jetty.'),
        h('Kurumba Maldives', 'North Male Atoll', 5, 8.9, 2140, 420, 4.2333, 73.5167, 'pool spa restaurant bar wifi gym beach seaview aircon familyfriendly', 'The original Maldives resort, ten minutes from the airport.'),
      ],
    },

    // ---------------------------------------------------------- South Asia
    {
      id: 'karachi', city: 'Karachi', country: 'Pakistan', currency: 'PKR',
      lat: 24.8607, lng: 67.0011,
      landmarks: [
        { name: 'Clifton Beach', aliases: ['clifton', 'seaview karachi'], lat: 24.8100, lng: 67.0300 },
        { name: 'Mazar-e-Quaid', aliases: ['jinnah mausoleum', 'quaid mausoleum'], lat: 24.8756, lng: 67.0407 },
        { name: 'Port Grand', aliases: [], lat: 24.8497, lng: 66.9880 },
        { name: 'Jinnah International Airport', aliases: ['khi', 'karachi airport'], lat: 24.9065, lng: 67.1608 },
        { name: 'Dolmen Mall Clifton', aliases: ['dolmen mall'], lat: 24.8010, lng: 67.0290 },
      ],
      hotels: [
        h('Movenpick Hotel Karachi', 'Saddar', 5, 8.6, 2140, 130, 24.8500, 67.0294, 'pool spa restaurant bar wifi gym parking aircon familyfriendly', 'Long-standing five-star on Club Road with a garden pool.'),
        h('Pearl Continental Karachi', 'Civil Lines', 5, 8.4, 3210, 120, 24.8478, 67.0308, 'pool restaurant wifi gym parking aircon familyfriendly', 'Big city hotel near the Sindh Assembly and Frere Hall.'),
        h('Beach Luxury Hotel', 'Moulvi Tamizuddin Road', 4, 8.2, 1420, 70, 24.8452, 67.0088, 'restaurant wifi parking aircon seaview', 'Creekside hotel with a well-known waterfront terrace.'),
        h('Regent Plaza Hotel', 'Shahrah-e-Faisal', 4, 7.9, 1840, 60, 24.8630, 67.0430, 'pool restaurant wifi gym parking aircon', 'Central, on the main road towards the airport.'),
      ],
    },
    {
      id: 'lahore', city: 'Lahore', country: 'Pakistan', currency: 'PKR',
      lat: 31.5204, lng: 74.3587,
      landmarks: [
        { name: 'Badshahi Mosque', aliases: ['badshahi'], lat: 31.5880, lng: 74.3100 },
        { name: 'Lahore Fort', aliases: ['shahi qila'], lat: 31.5883, lng: 74.3153 },
        { name: 'Gulberg', aliases: ['mm alam road'], lat: 31.5100, lng: 74.3500 },
        { name: 'Mall Road', aliases: ['the mall'], lat: 31.5580, lng: 74.3290 },
        { name: 'Allama Iqbal International Airport', aliases: ['lhe', 'lahore airport'], lat: 31.5216, lng: 74.4036 },
      ],
      hotels: [
        h('Pearl Continental Lahore', 'Mall Road', 5, 8.5, 2870, 125, 31.5560, 74.3300, 'pool spa restaurant bar wifi gym parking aircon familyfriendly', 'Large Mall Road landmark with gardens and several restaurants.'),
        h('Nishat Hotel Johar Town', 'Johar Town', 5, 8.8, 1240, 110, 31.4700, 74.2700, 'pool spa restaurant wifi gym parking aircon', 'Newer five-star towards Emporium Mall and Expo Centre.'),
        h('Avari Lahore', 'Mall Road', 5, 8.3, 1980, 105, 31.5560, 74.3320, 'pool restaurant bar wifi gym parking aircon', 'Opposite the Governor House, near the old city.'),
        h('Luxus Grand Hotel', 'Gulberg', 4, 8.4, 940, 75, 31.5150, 74.3480, 'restaurant wifi gym parking aircon breakfast', 'Business hotel a short drive from MM Alam Road.'),
      ],
    },
    {
      id: 'islamabad', city: 'Islamabad', country: 'Pakistan', currency: 'PKR',
      lat: 33.6844, lng: 73.0479,
      landmarks: [
        { name: 'Faisal Mosque', aliases: ['shah faisal masjid'], lat: 33.7295, lng: 73.0372 },
        { name: 'Margalla Hills', aliases: ['daman e koh', 'monal'], lat: 33.7480, lng: 73.0560 },
        { name: 'Blue Area', aliases: [], lat: 33.7080, lng: 73.0640 },
        { name: 'Islamabad International Airport', aliases: ['isb'], lat: 33.5490, lng: 72.8256 },
      ],
      hotels: [
        h('Serena Hotel Islamabad', 'Diplomatic Enclave', 5, 9.0, 1840, 160, 33.7060, 73.0630, 'pool spa restaurant bar wifi gym parking aircon familyfriendly', 'Gardens and a large pool near the diplomatic enclave.'),
        h('Islamabad Marriott Hotel', 'Blue Area', 5, 8.6, 2410, 145, 33.7100, 73.0550, 'pool restaurant bar wifi gym parking aircon familyfriendly', 'Central, walkable to the Blue Area offices.'),
        h('Ramada by Wyndham Islamabad', 'Blue Area', 4, 8.2, 940, 85, 33.7060, 73.0700, 'restaurant wifi gym parking aircon breakfast', 'Straightforward four-star close to the centre.'),
      ],
    },
    {
      id: 'delhi', city: 'Delhi', country: 'India', currency: 'INR',
      lat: 28.6139, lng: 77.2090,
      landmarks: [
        { name: 'India Gate', aliases: [], lat: 28.6129, lng: 77.2295 },
        { name: 'Red Fort', aliases: ['lal qila', 'old delhi'], lat: 28.6562, lng: 77.2410 },
        { name: 'Connaught Place', aliases: ['cp'], lat: 28.6315, lng: 77.2167 },
        { name: 'Qutub Minar', aliases: ['qutb minar'], lat: 28.5245, lng: 77.1855 },
        { name: 'Hauz Khas', aliases: [], lat: 28.5535, lng: 77.1945 },
      ],
      hotels: [
        h('The Imperial New Delhi', 'Janpath', 5, 9.2, 2140, 220, 28.6270, 77.2185, 'pool spa restaurant bar wifi gym parking aircon', 'Art deco landmark with a colonial art collection.'),
        h('The Oberoi New Delhi', 'Golf Links', 5, 9.4, 1420, 280, 28.5985, 77.2350, 'pool spa restaurant bar wifi gym parking aircon', 'Overlooking the Delhi Golf Club, fully rebuilt in 2018.'),
        h('Bloomrooms @ New Delhi Railway Station', 'Paharganj', 3, 8.4, 3210, 45, 28.6430, 77.2200, 'wifi breakfast aircon', 'Bright, clean budget rooms beside the station.'),
      ],
    },
    {
      id: 'mumbai', city: 'Mumbai', country: 'India', currency: 'INR',
      lat: 19.0760, lng: 72.8777,
      landmarks: [
        { name: 'Gateway of India', aliases: ['colaba'], lat: 18.9220, lng: 72.8347 },
        { name: 'Marine Drive', aliases: ['queens necklace'], lat: 18.9440, lng: 72.8230 },
        { name: 'Bandra', aliases: ['bandra west'], lat: 19.0596, lng: 72.8295 },
        { name: 'Chhatrapati Shivaji Airport', aliases: ['bom', 'mumbai airport'], lat: 19.0896, lng: 72.8656 },
      ],
      hotels: [
        h('The Taj Mahal Palace', 'Colaba', 5, 9.3, 4120, 260, 18.9220, 72.8332, 'pool spa restaurant bar wifi gym parking aircon familyfriendly', 'The 1903 palace wing facing the Gateway of India.'),
        h('The Oberoi Mumbai', 'Nariman Point', 5, 9.4, 1840, 290, 18.9270, 72.8200, 'pool spa restaurant bar wifi gym parking aircon seaview', 'Every room faces the Arabian Sea along Marine Drive.'),
        h('Abode Bombay', 'Colaba', 4, 9.1, 740, 95, 18.9230, 72.8320, 'wifi breakfast aircon', 'Small heritage boutique hotel behind the Taj.'),
      ],
    },

    // ---------------------------------------------------------- Middle East
    {
      id: 'istanbul', city: 'Istanbul', country: 'Turkey', currency: 'TRY',
      lat: 41.0082, lng: 28.9784,
      landmarks: [
        { name: 'Hagia Sophia', aliases: ['ayasofya', 'sultanahmet'], lat: 41.0086, lng: 28.9802 },
        { name: 'Blue Mosque', aliases: ['sultan ahmed mosque'], lat: 41.0054, lng: 28.9768 },
        { name: 'Galata Tower', aliases: ['galata', 'karakoy'], lat: 41.0256, lng: 28.9741 },
        { name: 'Grand Bazaar', aliases: ['kapali carsi'], lat: 41.0106, lng: 28.9680 },
        { name: 'Bosphorus', aliases: ['bosphorus strait', 'besiktas'], lat: 41.0450, lng: 29.0300 },
        { name: 'Taksim Square', aliases: ['taksim', 'beyoglu'], lat: 41.0370, lng: 28.9850 },
      ],
      hotels: [
        h('Four Seasons Istanbul at Sultanahmet', 'Sultanahmet', 5, 9.4, 1240, 480, 41.0055, 28.9800, 'restaurant bar wifi gym aircon parking', 'A converted neoclassical prison between the two great mosques.'),
        h('Ciragan Palace Kempinski', 'Besiktas', 5, 9.3, 1840, 620, 41.0430, 29.0140, 'pool spa restaurant bar wifi gym parking aircon seaview', 'Ottoman palace on the Bosphorus with an infinity pool.'),
        h('Sirkeci Mansion', 'Sirkeci', 4, 9.2, 2140, 130, 41.0140, 28.9780, 'pool spa restaurant wifi breakfast gym aircon familyfriendly', 'Family-run, opposite Gulhane Park.'),
        h('Cheers Lighthouse', 'Sultanahmet', 2, 8.7, 940, 35, 41.0090, 28.9760, 'wifi bar breakfast rooftop aircon', 'Hostel with a rooftop terrace looking at Hagia Sophia.'),
      ],
    },
    {
      id: 'doha', city: 'Doha', country: 'Qatar', currency: 'QAR',
      lat: 25.2854, lng: 51.5310,
      landmarks: [
        { name: 'Souq Waqif', aliases: ['souk waqif'], lat: 25.2875, lng: 51.5330 },
        { name: 'The Pearl', aliases: ['pearl qatar'], lat: 25.3690, lng: 51.5510 },
        { name: 'Museum of Islamic Art', aliases: ['mia'], lat: 25.2952, lng: 51.5393 },
        { name: 'Hamad International Airport', aliases: ['doh'], lat: 25.2731, lng: 51.6081 },
      ],
      hotels: [
        h('Mandarin Oriental Doha', 'Msheireb', 5, 9.3, 940, 340, 25.2900, 51.5320, 'pool spa restaurant bar wifi gym parking aircon', 'In the rebuilt Msheireb quarter, minutes from Souq Waqif.'),
        h('Souq Waqif Boutique Hotels', 'Souq Waqif', 4, 8.9, 1640, 180, 25.2870, 51.5330, 'restaurant bar wifi aircon parking', 'A cluster of small hotels inside the restored souq.'),
        h('Banana Island Resort Doha', 'Banana Island', 5, 9.0, 1240, 420, 25.3400, 51.6100, 'pool spa restaurant bar wifi gym beach seaview aircon familyfriendly', 'Crescent island resort reached by catamaran.'),
      ],
    },
    {
      id: 'abu-dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates', currency: 'AED',
      lat: 24.4539, lng: 54.3773,
      landmarks: [
        { name: 'Sheikh Zayed Grand Mosque', aliases: ['grand mosque', 'sheikh zayed mosque'], lat: 24.4128, lng: 54.4750 },
        { name: 'Louvre Abu Dhabi', aliases: ['saadiyat'], lat: 24.5339, lng: 54.3980 },
        { name: 'Corniche', aliases: ['abu dhabi corniche'], lat: 24.4750, lng: 54.3300 },
        { name: 'Yas Island', aliases: ['ferrari world', 'yas marina'], lat: 24.4672, lng: 54.6031 },
      ],
      hotels: [
        h('Emirates Palace Mandarin Oriental', 'Corniche', 5, 9.2, 3210, 420, 24.4614, 54.3170, 'pool spa restaurant bar wifi gym beach seaview aircon parking familyfriendly', 'Vast domed palace hotel with its own beach.'),
        h('Rosewood Abu Dhabi', 'Al Maryah Island', 5, 9.1, 1420, 260, 24.5000, 54.3800, 'pool spa restaurant bar wifi gym aircon parking', 'Glass tower on Al Maryah with a rooftop pool.'),
        h('Yas Island Rotana', 'Yas Island', 4, 8.6, 2140, 130, 24.4670, 54.6070, 'pool restaurant bar wifi gym aircon parking familyfriendly', 'Walking distance to Yas Mall and the theme parks.'),
      ],
    },

    // ---------------------------------------------------------- Europe
    {
      id: 'berlin', city: 'Berlin', country: 'Germany', currency: 'EUR',
      lat: 52.5200, lng: 13.4050,
      landmarks: [
        { name: 'Brandenburg Gate', aliases: ['brandenburger tor'], lat: 52.5163, lng: 13.3777 },
        { name: 'East Side Gallery', aliases: ['berlin wall'], lat: 52.5050, lng: 13.4390 },
        { name: 'Mitte', aliases: ['alexanderplatz'], lat: 52.5219, lng: 13.4132 },
        { name: 'Kreuzberg', aliases: [], lat: 52.4980, lng: 13.4180 },
        { name: 'Museum Island', aliases: ['museumsinsel'], lat: 52.5169, lng: 13.4019 },
      ],
      hotels: [
        h('Hotel Adlon Kempinski', 'Mitte', 5, 9.2, 2870, 380, 52.5163, 13.3800, 'pool spa restaurant bar wifi gym parking aircon', 'Beside the Brandenburg Gate, rebuilt in 1997.'),
        h('25hours Hotel Bikini Berlin', 'Charlottenburg', 4, 8.8, 3210, 175, 52.5050, 13.3330, 'restaurant bar wifi gym rooftop aircon petfriendly', 'Rooms overlooking the zoo monkey house, rooftop bar above.'),
        h('The Circus Hotel', 'Mitte', 3, 9.0, 2410, 115, 52.5290, 13.4010, 'wifi bar breakfast aircon', 'Well-run independent on Rosenthaler Platz.'),
      ],
    },
    {
      id: 'vienna', city: 'Vienna', country: 'Austria', currency: 'EUR',
      lat: 48.2082, lng: 16.3738,
      landmarks: [
        { name: 'Schonbrunn Palace', aliases: ['schonbrunn', 'schoenbrunn'], lat: 48.1845, lng: 16.3122 },
        { name: 'St Stephens Cathedral', aliases: ['stephansdom'], lat: 48.2085, lng: 16.3731 },
        { name: 'Ringstrasse', aliases: ['ring'], lat: 48.2100, lng: 16.3650 },
        { name: 'Prater', aliases: ['giant ferris wheel'], lat: 48.2168, lng: 16.3960 },
      ],
      hotels: [
        h('Hotel Sacher Wien', 'Innere Stadt', 5, 9.3, 1840, 480, 48.2036, 16.3690, 'spa restaurant bar wifi gym aircon parking', 'Behind the Opera, home of the Sachertorte.'),
        h('Park Hyatt Vienna', 'Innere Stadt', 5, 9.4, 1240, 420, 48.2110, 16.3690, 'pool spa restaurant bar wifi gym aircon parking', 'A former bank, with a pool in the old vault.'),
        h('Wombats City Hostel Vienna', 'Naschmarkt', 2, 8.7, 3210, 45, 48.2160, 16.3760, 'wifi bar breakfast aircon', 'Beside the Naschmarkt, straightforward and central.'),
      ],
    },
    {
      id: 'prague', city: 'Prague', country: 'Czechia', currency: 'CZK',
      lat: 50.0755, lng: 14.4378,
      landmarks: [
        { name: 'Charles Bridge', aliases: ['karluv most'], lat: 50.0865, lng: 14.4114 },
        { name: 'Prague Castle', aliases: ['hradcany'], lat: 50.0900, lng: 14.4003 },
        { name: 'Old Town Square', aliases: ['staromestske namesti', 'astronomical clock'], lat: 50.0870, lng: 14.4208 },
        { name: 'Wenceslas Square', aliases: ['vaclavske namesti'], lat: 50.0810, lng: 14.4270 },
      ],
      hotels: [
        h('Augustine Prague', 'Mala Strana', 5, 9.3, 940, 320, 50.0890, 14.4040, 'spa restaurant bar wifi gym aircon parking', 'A former Augustinian monastery below the castle.'),
        h('Hotel Kings Court', 'Old Town', 5, 9.1, 2140, 210, 50.0880, 14.4300, 'pool spa restaurant bar wifi gym aircon', 'Belle époque building by the Municipal House.'),
        h('Mosaic House Design Hotel', 'New Town', 3, 8.6, 3210, 85, 50.0760, 14.4160, 'wifi bar breakfast gym aircon', 'Hotel and hostel in one, near the Dancing House.'),
      ],
    },
    {
      id: 'madrid', city: 'Madrid', country: 'Spain', currency: 'EUR',
      lat: 40.4168, lng: -3.7038,
      landmarks: [
        { name: 'Puerta del Sol', aliases: ['sol'], lat: 40.4169, lng: -3.7035 },
        { name: 'Prado Museum', aliases: ['museo del prado'], lat: 40.4138, lng: -3.6921 },
        { name: 'Retiro Park', aliases: ['el retiro'], lat: 40.4153, lng: -3.6844 },
        { name: 'Gran Via', aliases: [], lat: 40.4200, lng: -3.7040 },
        { name: 'Santiago Bernabeu', aliases: ['bernabeu'], lat: 40.4531, lng: -3.6883 },
      ],
      hotels: [
        h('Mandarin Oriental Ritz Madrid', 'Retiro', 5, 9.4, 1240, 520, 40.4155, -3.6940, 'spa restaurant bar wifi gym aircon parking', 'The 1910 Ritz, reopened after a full restoration.'),
        h('Hotel Urban', 'Cortes', 5, 9.0, 1840, 260, 40.4160, -3.6990, 'pool restaurant bar wifi gym rooftop aircon', 'Rooftop pool and a Papua New Guinean art collection.'),
        h('Room007 Chueca Hostel', 'Chueca', 2, 8.5, 2140, 40, 40.4230, -3.6980, 'wifi bar breakfast aircon', 'Central hostel in the Chueca nightlife quarter.'),
      ],
    },
    {
      id: 'athens', city: 'Athens', country: 'Greece', currency: 'EUR',
      lat: 37.9838, lng: 23.7275,
      landmarks: [
        { name: 'Acropolis', aliases: ['parthenon'], lat: 37.9715, lng: 23.7267 },
        { name: 'Plaka', aliases: [], lat: 37.9720, lng: 23.7290 },
        { name: 'Syntagma Square', aliases: ['syntagma'], lat: 37.9755, lng: 23.7348 },
        { name: 'Monastiraki', aliases: [], lat: 37.9760, lng: 23.7250 },
      ],
      hotels: [
        h('Hotel Grande Bretagne', 'Syntagma', 5, 9.2, 2410, 380, 37.9760, 23.7350, 'pool spa restaurant bar wifi gym rooftop aircon parking', 'On Syntagma since 1874, with an Acropolis-facing roof garden.'),
        h('Electra Metropolis Athens', 'Syntagma', 5, 9.3, 1840, 240, 37.9760, 23.7300, 'pool spa restaurant bar wifi gym rooftop aircon', 'Rooftop pool looking straight at the Acropolis.'),
        h('City Circus Athens', 'Psyrri', 3, 9.0, 1240, 75, 37.9800, 23.7250, 'wifi bar breakfast aircon rooftop', 'Neoclassical building in Psyrri, bright and well kept.'),
      ],
    },
    {
      id: 'copenhagen', city: 'Copenhagen', country: 'Denmark', currency: 'DKK',
      lat: 55.6761, lng: 12.5683,
      landmarks: [
        { name: 'Nyhavn', aliases: [], lat: 55.6797, lng: 12.5910 },
        { name: 'Tivoli Gardens', aliases: ['tivoli'], lat: 55.6737, lng: 12.5681 },
        { name: 'Christiania', aliases: ['freetown christiania'], lat: 55.6736, lng: 12.5990 },
        { name: 'The Little Mermaid', aliases: ['little mermaid'], lat: 55.6929, lng: 12.5993 },
      ],
      hotels: [
        h('Hotel dAngleterre', 'Kongens Nytorv', 5, 9.3, 940, 520, 55.6800, 12.5850, 'pool spa restaurant bar wifi gym aircon parking', 'On Kongens Nytorv, a few steps from Nyhavn.'),
        h('Nimb Hotel', 'Tivoli', 5, 9.4, 640, 480, 55.6740, 12.5680, 'pool spa restaurant bar wifi gym aircon', 'Moorish palace inside the Tivoli Gardens.'),
        h('Steel House Copenhagen', 'Vesterbro', 3, 8.8, 3210, 65, 55.6790, 12.5560, 'pool wifi bar breakfast gym aircon', 'Design hostel with a pool, near the lakes.'),
      ],
    },
    {
      id: 'zurich', city: 'Zurich', country: 'Switzerland', currency: 'CHF',
      lat: 47.3769, lng: 8.5417,
      landmarks: [
        { name: 'Lake Zurich', aliases: ['zurichsee'], lat: 47.3400, lng: 8.5500 },
        { name: 'Bahnhofstrasse', aliases: [], lat: 47.3720, lng: 8.5390 },
        { name: 'Zurich Old Town', aliases: ['altstadt', 'niederdorf'], lat: 47.3710, lng: 8.5430 },
        { name: 'Zurich Airport', aliases: ['zrh'], lat: 47.4581, lng: 8.5555 },
      ],
      hotels: [
        h('Baur au Lac', 'Enge', 5, 9.4, 740, 780, 47.3670, 8.5380, 'restaurant bar wifi gym aircon parking', 'Family-owned since 1844, in its own park by the lake.'),
        h('Widder Hotel', 'Old Town', 5, 9.3, 640, 620, 47.3720, 8.5400, 'spa restaurant bar wifi gym aircon parking', 'Nine medieval houses knitted into one hotel.'),
        h('Hotel Rothaus', 'Langstrasse', 3, 8.5, 940, 210, 47.3780, 8.5300, 'restaurant bar wifi aircon', 'Characterful, on the lively Langstrasse.'),
      ],
    },
    {
      id: 'dublin', city: 'Dublin', country: 'Ireland', currency: 'EUR',
      lat: 53.3498, lng: -6.2603,
      landmarks: [
        { name: 'Temple Bar', aliases: [], lat: 53.3456, lng: -6.2645 },
        { name: 'Trinity College', aliases: ['book of kells'], lat: 53.3438, lng: -6.2546 },
        { name: 'Guinness Storehouse', aliases: ['guinness'], lat: 53.3419, lng: -6.2867 },
        { name: 'Grafton Street', aliases: [], lat: 53.3420, lng: -6.2600 },
      ],
      hotels: [
        h('The Shelbourne', 'St Stephens Green', 5, 9.1, 2410, 340, 53.3390, -6.2570, 'spa restaurant bar wifi gym aircon parking', 'On St Stephens Green, where the constitution was drafted.'),
        h('The Merrion Hotel', 'Merrion Square', 5, 9.4, 1240, 420, 53.3380, -6.2520, 'pool spa restaurant bar wifi gym parking aircon', 'Four Georgian townhouses with a private art collection.'),
        h('Jacobs Inn Hostel', 'Talbot Street', 2, 8.6, 3210, 55, 53.3510, -6.2500, 'wifi bar breakfast aircon', 'Beside Connolly Station and the Busaras.'),
      ],
    },
    {
      id: 'edinburgh', city: 'Edinburgh', country: 'United Kingdom', currency: 'GBP',
      lat: 55.9533, lng: -3.1883,
      landmarks: [
        { name: 'Edinburgh Castle', aliases: ['the castle'], lat: 55.9486, lng: -3.1999 },
        { name: 'Royal Mile', aliases: ['old town'], lat: 55.9500, lng: -3.1880 },
        { name: 'Arthurs Seat', aliases: ['holyrood park'], lat: 55.9444, lng: -3.1617 },
        { name: 'Princes Street', aliases: ['new town'], lat: 55.9520, lng: -3.1950 },
      ],
      hotels: [
        h('The Balmoral', 'Princes Street', 5, 9.2, 2140, 380, 55.9520, -3.1890, 'pool spa restaurant bar wifi gym aircon parking', 'The clock tower above Waverley, deliberately three minutes fast.'),
        h('The Witchery by the Castle', 'Royal Mile', 5, 9.5, 640, 420, 55.9490, -3.1950, 'restaurant bar wifi aircon', 'Theatrical gothic suites at the castle gates.'),
        h('CoDE Pod Hostel The LoftHouse', 'Old Town', 2, 8.7, 1840, 50, 55.9480, -3.1930, 'wifi breakfast', 'Pod bunks a minute from the Grassmarket.'),
      ],
    },
    {
      id: 'reykjavik', city: 'Reykjavik', country: 'Iceland', currency: 'ISK',
      lat: 64.1466, lng: -21.9426,
      landmarks: [
        { name: 'Hallgrimskirkja', aliases: ['hallgrimskirkja church'], lat: 64.1417, lng: -21.9266 },
        { name: 'Blue Lagoon', aliases: [], lat: 63.8804, lng: -22.4495 },
        { name: 'Harpa', aliases: ['harpa concert hall'], lat: 64.1504, lng: -21.9327 },
      ],
      hotels: [
        h('The Reykjavik EDITION', 'Old Harbour', 5, 9.2, 640, 480, 64.1500, -21.9400, 'spa restaurant bar wifi gym aircon parking', 'Beside Harpa on the old harbour, with a hot tub deck.'),
        h('Hotel Borg', 'Downtown', 4, 8.9, 1240, 280, 64.1470, -21.9370, 'spa restaurant bar wifi gym aircon', 'Art deco hotel on Austurvollur square.'),
        h('Kex Hostel', 'Laugavegur', 2, 8.7, 2140, 75, 64.1470, -21.9280, 'wifi bar breakfast gym', 'Old biscuit factory with a well-known bar.'),
      ],
    },

    // ---------------------------------------------------------- Americas
    {
      id: 'new-york', city: 'New York', country: 'United States', currency: 'USD',
      lat: 40.7128, lng: -74.0060,
      landmarks: [
        { name: 'Times Square', aliases: [], lat: 40.7580, lng: -73.9855 },
        { name: 'Central Park', aliases: [], lat: 40.7829, lng: -73.9654 },
        { name: 'Brooklyn Bridge', aliases: ['dumbo'], lat: 40.7061, lng: -73.9969 },
        { name: 'Empire State Building', aliases: ['midtown'], lat: 40.7484, lng: -73.9857 },
        { name: 'JFK Airport', aliases: ['jfk'], lat: 40.6413, lng: -73.7781 },
        { name: 'Williamsburg', aliases: ['brooklyn'], lat: 40.7081, lng: -73.9571 },
      ],
      hotels: [
        h('The Plaza', 'Midtown', 5, 8.9, 3210, 720, 40.7644, -73.9744, 'spa restaurant bar wifi gym aircon parking familyfriendly', 'At the corner of Central Park since 1907.'),
        h('The Bowery Hotel', 'East Village', 4, 9.0, 1840, 420, 40.7260, -73.9920, 'restaurant bar wifi aircon petfriendly', 'Dark-wood lobby and a courtyard, downtown.'),
        h('Pod 51', 'Midtown East', 3, 8.4, 4120, 165, 40.7550, -73.9690, 'wifi bar aircon rooftop', 'Small, efficient rooms with a roof deck.'),
        h('The Ludlow Hotel', 'Lower East Side', 4, 9.1, 1240, 380, 40.7220, -73.9880, 'restaurant bar wifi aircon petfriendly', 'Garden bar and factory windows on Ludlow Street.'),
      ],
    },
    {
      id: 'los-angeles', city: 'Los Angeles', country: 'United States', currency: 'USD',
      lat: 34.0522, lng: -118.2437,
      landmarks: [
        { name: 'Hollywood', aliases: ['hollywood sign', 'walk of fame'], lat: 34.0928, lng: -118.3287 },
        { name: 'Santa Monica Pier', aliases: ['santa monica'], lat: 34.0094, lng: -118.4973 },
        { name: 'Venice Beach', aliases: ['venice boardwalk'], lat: 33.9850, lng: -118.4695 },
        { name: 'Downtown LA', aliases: ['dtla'], lat: 34.0407, lng: -118.2468 },
        { name: 'LAX', aliases: ['los angeles airport'], lat: 33.9416, lng: -118.4085 },
      ],
      hotels: [
        h('Chateau Marmont', 'West Hollywood', 5, 8.8, 940, 620, 34.0980, -118.3730, 'pool restaurant bar wifi aircon parking petfriendly', 'The castle on Sunset, discreet since 1929.'),
        h('Hotel Erwin', 'Venice Beach', 4, 8.6, 2140, 280, 33.9870, -118.4720, 'restaurant bar wifi gym rooftop aircon parking beach', 'Rooftop bar over the Venice boardwalk.'),
        h('Freehand Los Angeles', 'Downtown', 3, 8.5, 1840, 175, 34.0450, -118.2560, 'pool restaurant bar wifi gym rooftop aircon', 'Rooftop pool bar in a 1920s downtown building.'),
      ],
    },
    {
      id: 'miami', city: 'Miami', country: 'United States', currency: 'USD',
      lat: 25.7617, lng: -80.1918,
      landmarks: [
        { name: 'South Beach', aliases: ['ocean drive', 'sobe'], lat: 25.7826, lng: -80.1341 },
        { name: 'Wynwood Walls', aliases: ['wynwood'], lat: 25.8010, lng: -80.1990 },
        { name: 'Little Havana', aliases: ['calle ocho'], lat: 25.7650, lng: -80.2200 },
      ],
      hotels: [
        h('Faena Hotel Miami Beach', 'Mid-Beach', 5, 9.0, 1640, 620, 25.8030, -80.1220, 'pool spa restaurant bar wifi gym beach seaview aircon parking', 'Gilded mammoth in the lobby, private beach behind.'),
        h('The Setai Miami Beach', 'South Beach', 5, 9.3, 940, 780, 25.7880, -80.1290, 'pool spa restaurant bar wifi gym beach seaview aircon', 'Three temperature-graded pools and an art deco tower.'),
        h('Generator Miami', 'South Beach', 3, 8.3, 2140, 130, 25.7900, -80.1290, 'pool wifi bar breakfast aircon', 'Collins Avenue, private and shared rooms.'),
      ],
    },
    {
      id: 'mexico-city', city: 'Mexico City', country: 'Mexico', currency: 'MXN',
      lat: 19.4326, lng: -99.1332,
      landmarks: [
        { name: 'Zocalo', aliases: ['historic centre', 'centro historico'], lat: 19.4326, lng: -99.1332 },
        { name: 'Chapultepec', aliases: ['chapultepec park'], lat: 19.4204, lng: -99.1817 },
        { name: 'Roma Norte', aliases: ['la roma'], lat: 19.4180, lng: -99.1620 },
        { name: 'Condesa', aliases: [], lat: 19.4110, lng: -99.1710 },
        { name: 'Coyoacan', aliases: ['frida kahlo museum'], lat: 19.3500, lng: -99.1620 },
      ],
      hotels: [
        h('Las Alcobas', 'Polanco', 5, 9.3, 940, 340, 19.4300, -99.1900, 'spa restaurant bar wifi gym aircon parking', 'Warm rosewood interiors on Presidente Masaryk.'),
        h('Four Seasons Hotel Mexico City', 'Reforma', 5, 9.2, 1640, 380, 19.4270, -99.1690, 'pool spa restaurant bar wifi gym parking aircon familyfriendly', 'Hacienda-style courtyard on Paseo de la Reforma.'),
        h('Casa Pancha', 'Roma Norte', 3, 8.9, 640, 85, 19.4150, -99.1650, 'wifi breakfast bar aircon petfriendly', 'Small guesthouse on a leafy Roma Norte street.'),
      ],
    },
    {
      id: 'rio', city: 'Rio de Janeiro', country: 'Brazil', currency: 'BRL',
      lat: -22.9068, lng: -43.1729,
      landmarks: [
        { name: 'Christ the Redeemer', aliases: ['corcovado', 'cristo redentor'], lat: -22.9519, lng: -43.2105 },
        { name: 'Copacabana', aliases: ['copacabana beach'], lat: -22.9711, lng: -43.1822 },
        { name: 'Ipanema', aliases: ['ipanema beach'], lat: -22.9838, lng: -43.2048 },
        { name: 'Sugarloaf Mountain', aliases: ['pao de acucar', 'sugarloaf'], lat: -22.9492, lng: -43.1545 },
      ],
      hotels: [
        h('Copacabana Palace', 'Copacabana', 5, 9.3, 2140, 480, -22.9670, -43.1790, 'pool spa restaurant bar wifi gym beach seaview aircon parking', 'The 1923 white facade facing Copacabana beach.'),
        h('Hotel Fasano Rio de Janeiro', 'Ipanema', 5, 9.2, 940, 520, -22.9840, -43.1980, 'pool spa restaurant bar wifi gym beach seaview aircon rooftop', 'Philippe Starck rooftop pool over Ipanema.'),
        h('Selina Lapa Rio de Janeiro', 'Lapa', 3, 8.2, 1640, 60, -22.9130, -43.1800, 'pool wifi bar breakfast aircon', 'Under the Lapa arches, lively at night.'),
      ],
    },
    {
      id: 'buenos-aires', city: 'Buenos Aires', country: 'Argentina', currency: 'ARS',
      lat: -34.6037, lng: -58.3816,
      landmarks: [
        { name: 'La Boca', aliases: ['caminito'], lat: -34.6345, lng: -58.3630 },
        { name: 'Recoleta', aliases: ['recoleta cemetery'], lat: -34.5875, lng: -58.3930 },
        { name: 'Palermo', aliases: ['palermo soho'], lat: -34.5880, lng: -58.4300 },
        { name: 'Obelisco', aliases: ['obelisk', 'avenida 9 de julio'], lat: -34.6037, lng: -58.3816 },
      ],
      hotels: [
        h('Alvear Palace Hotel', 'Recoleta', 5, 9.2, 1240, 280, -34.5880, -58.3860, 'pool spa restaurant bar wifi gym parking aircon', 'Belle époque grandeur in Recoleta since 1932.'),
        h('Faena Hotel Buenos Aires', 'Puerto Madero', 5, 9.0, 940, 260, -34.6100, -58.3630, 'pool spa restaurant bar wifi gym aircon parking', 'A red-draped Starck conversion of a grain mill.'),
        h('Milhouse Hostel Avenue', 'Monserrat', 2, 8.4, 2140, 35, -34.6090, -58.3790, 'wifi bar breakfast aircon rooftop', 'Sociable hostel on Avenida de Mayo.'),
      ],
    },
    {
      id: 'toronto', city: 'Toronto', country: 'Canada', currency: 'CAD',
      lat: 43.6532, lng: -79.3832,
      landmarks: [
        { name: 'CN Tower', aliases: [], lat: 43.6426, lng: -79.3871 },
        { name: 'Distillery District', aliases: ['distillery'], lat: 43.6503, lng: -79.3596 },
        { name: 'Kensington Market', aliases: ['kensington'], lat: 43.6547, lng: -79.4005 },
        { name: 'Toronto Pearson Airport', aliases: ['yyz', 'pearson'], lat: 43.6777, lng: -79.6248 },
      ],
      hotels: [
        h('The Ritz-Carlton Toronto', 'Entertainment District', 5, 9.2, 1640, 420, 43.6450, -79.3870, 'pool spa restaurant bar wifi gym parking aircon', 'Beside Roy Thomson Hall, with a long lap pool.'),
        h('The Drake Hotel', 'Queen West', 4, 8.8, 940, 240, 43.6430, -79.4250, 'restaurant bar wifi aircon petfriendly rooftop', 'Art-filled rooms above a Queen West music venue.'),
        h('Planet Traveler Hostel', 'Kensington Market', 2, 8.5, 1240, 45, 43.6560, -79.4020, 'wifi bar breakfast rooftop', 'Solar-powered hostel with a Kensington rooftop.'),
      ],
    },

    // ---------------------------------------------------------- Oceania
    {
      id: 'sydney', city: 'Sydney', country: 'Australia', currency: 'AUD',
      lat: -33.8688, lng: 151.2093,
      landmarks: [
        { name: 'Sydney Opera House', aliases: ['opera house', 'circular quay'], lat: -33.8568, lng: 151.2153 },
        { name: 'Bondi Beach', aliases: ['bondi'], lat: -33.8908, lng: 151.2743 },
        { name: 'Sydney Harbour Bridge', aliases: ['harbour bridge'], lat: -33.8523, lng: 151.2108 },
        { name: 'Darling Harbour', aliases: [], lat: -33.8748, lng: 151.2010 },
      ],
      hotels: [
        h('Park Hyatt Sydney', 'The Rocks', 5, 9.4, 1240, 780, -33.8570, 151.2100, 'pool spa restaurant bar wifi gym seaview aircon parking', 'Curved along the quay, facing the Opera House.'),
        h('QT Sydney', 'CBD', 5, 9.0, 2140, 280, -33.8700, 151.2070, 'restaurant bar wifi gym aircon', 'Theatrical rooms in the old State Theatre building.'),
        h('Wake Up! Sydney', 'Central', 2, 8.3, 3210, 45, -33.8820, 151.2060, 'wifi bar breakfast aircon', 'Opposite Central Station, busy and central.'),
      ],
    },
    {
      id: 'auckland', city: 'Auckland', country: 'New Zealand', currency: 'NZD',
      lat: -36.8485, lng: 174.7633,
      landmarks: [
        { name: 'Sky Tower', aliases: [], lat: -36.8485, lng: 174.7621 },
        { name: 'Waiheke Island', aliases: ['waiheke'], lat: -36.8000, lng: 175.1000 },
        { name: 'Viaduct Harbour', aliases: ['viaduct'], lat: -36.8430, lng: 174.7600 },
      ],
      hotels: [
        h('Hotel Britomart', 'Britomart', 5, 9.3, 640, 320, -36.8440, 174.7690, 'restaurant bar wifi gym aircon', 'New Zealand\\u2019s first 5 Green Star hotel, brick and timber.'),
        h('SO/ Auckland', 'Britomart', 5, 8.9, 940, 260, -36.8460, 174.7660, 'spa restaurant bar wifi gym rooftop aircon', 'Rooftop bar over the harbour in the old Customhouse.'),
        h('Haka Hotel Newmarket', 'Newmarket', 4, 8.7, 740, 145, -36.8700, 174.7770, 'wifi gym aircon parking familyfriendly', 'Apartment-style rooms near the Newmarket shops.'),
      ],
    },
  ]
}
