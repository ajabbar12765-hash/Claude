// Starter catalogue of Pakistani promo codes and gift-card deals.
//
// These are SAMPLE entries — realistic in shape (real store names, plausible
// codes and terms) but not a live scrape of anyone's checkout. Codes rotate
// constantly and no automated system can honestly promise a store's current
// live code without an official affiliate/API deal (see README). Every entry
// carries `sample: true` and the app badges it "Unverified" until you (or a
// future scraper/API you wire up) confirm it and flip `sample: false`, or
// until someone hits "It worked" enough times to earn a Verified badge.
//
// Add your own real finds any time from the "+ Add a code" button — they're
// stored locally and treated exactly like these, just without the sample tag.

export const CATEGORIES = [
  { id: 'ecommerce', label: 'Online shopping', icon: '\u{1F6D2}' },
  { id: 'fashion', label: 'Fashion & clothing', icon: '\u{1F457}' },
  { id: 'food', label: 'Food delivery', icon: '\u{1F355}' },
  { id: 'grocery', label: 'Grocery', icon: '\u{1F6D2}' },
  { id: 'electronics', label: 'Electronics', icon: '\u{1F4F1}' },
  { id: 'telecom', label: 'Mobile & internet', icon: '\u{1F4F6}' },
  { id: 'giftcard', label: 'Gift cards', icon: '\u{1F381}' },
  { id: 'travel', label: 'Travel', icon: '\u{2708}\u{FE0F}' },
]

// Each category gets one of three jewel-tone accents, cycled so the grid
// reads as deliberately colorful rather than randomly multi-colored.
export const CATEGORY_ACCENT = {
  ecommerce: 'turquoise',
  fashion: 'pink',
  food: 'gold',
  grocery: 'turquoise',
  electronics: 'pink',
  telecom: 'gold',
  giftcard: 'pink',
  travel: 'turquoise',
}

export const COUNTRIES = [
  'Pakistan (domestic)',
  'UAE',
  'Saudi Arabia',
  'Turkey',
  'Thailand',
  'Malaysia',
  'United Kingdom',
  'China',
]

const days = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// discountType: 'percent' | 'fixed' | 'bogo' | 'cashback' | 'shipping'
const seed = [
  // ---------------------------------------------------------------- ecommerce
  {
    store: 'Daraz', category: 'ecommerce', code: 'DARAZ10', title: '10% off sitewide',
    discountType: 'percent', discountValue: 10, minSpend: 1500, maxDiscount: 500,
    description: '10% off eligible items storewide, capped at Rs. 500 off.',
    terms: ['Excludes mobiles, top-ups and Daraz Global unless stated at checkout', 'One use per account', 'Cannot be combined with Daraz Vouchers wallet credit'],
    howTo: ['Add items to cart', 'Go to checkout → Apply Voucher/Code', 'Paste the code and confirm'],
    url: 'https://www.daraz.pk/', expiresIn: 21,
  },
  {
    store: 'Daraz', category: 'ecommerce', code: 'DZFREESHIP', title: 'Free shipping over Rs. 1,000',
    discountType: 'shipping', discountValue: 0, minSpend: 1000, maxDiscount: null,
    description: 'Waives delivery fee on orders above Rs. 1,000 from Daraz Mall sellers.',
    terms: ['Daraz Mall sellers only', 'Excludes bulky/large items'],
    howTo: ['Filter to Daraz Mall', 'Apply at checkout under shipping options'],
    url: 'https://www.daraz.pk/', expiresIn: 14,
  },
  {
    store: 'Telemart', category: 'ecommerce', code: 'TELE500', title: 'Rs. 500 off electronics',
    discountType: 'fixed', discountValue: 500, minSpend: 5000, maxDiscount: 500,
    description: 'Flat Rs. 500 off orders above Rs. 5,000 on electronics and appliances.',
    terms: ['One redemption per customer', 'Not valid with bank installment plans'],
    howTo: ['Add to cart', 'Enter code in the coupon field before payment'],
    url: 'https://telemart.pk/', expiresIn: 10,
  },
  {
    store: 'iShopping.pk', category: 'electronics', code: 'ISHOP7', title: '7% off laptops & accessories',
    discountType: 'percent', discountValue: 7, minSpend: 10000, maxDiscount: 3000,
    description: '7% off laptops, monitors and accessories, capped at Rs. 3,000.',
    terms: ['Excludes already discounted clearance items'],
    howTo: ['Apply at checkout under "Have a coupon?"'],
    url: 'https://ishopping.pk/', expiresIn: 18,
  },
  {
    store: 'Symbios.pk', category: 'electronics', code: 'SYM15', title: '15% off mobile accessories',
    discountType: 'percent', discountValue: 15, minSpend: 2000, maxDiscount: 1000,
    description: 'Covers, chargers, earbuds and cases at 15% off.',
    terms: ['Excludes original Apple accessories'],
    howTo: ['Apply at cart page before checkout'],
    url: 'https://symbios.pk/', expiresIn: 12,
  },

  // ------------------------------------------------------------------ fashion
  {
    store: 'Springs', category: 'fashion', code: 'SPRINGS20', title: '20% off new season lawn',
    discountType: 'percent', discountValue: 20, minSpend: 3000, maxDiscount: 2500,
    description: '20% off the new-season lawn and ready-to-wear collection.',
    terms: ['Excludes bridal and festive collections', 'In-store and online'],
    howTo: ['Online: apply at checkout', 'In-store: show the code to the cashier'],
    url: 'https://www.springs.com.pk/', expiresIn: 20,
  },
  {
    store: 'Khaadi', category: 'fashion', code: 'KHAADI15', title: '15% off unstitched fabric',
    discountType: 'percent', discountValue: 15, minSpend: 2500, maxDiscount: 2000,
    description: '15% off unstitched and pret fabric, online only.',
    terms: ['Online orders only', 'Excludes Khaadi Home and sale racks'],
    howTo: ['Apply at the bag/checkout page'],
    url: 'https://pk.khaadi.com/', expiresIn: 16,
  },
  {
    store: 'Sapphire', category: 'fashion', code: 'SAPPHIRE10', title: '10% off first order',
    discountType: 'percent', discountValue: 10, minSpend: 2000, maxDiscount: 1500,
    description: 'First-order discount for new online accounts.',
    terms: ['New customers only, one per account/CNIC'],
    howTo: ['Create an account', 'Code auto-suggested at checkout, or paste it manually'],
    url: 'https://sapphireonline.pk/', expiresIn: 25,
  },
  {
    store: 'Gul Ahmed', category: 'fashion', code: 'GULAHMED500', title: 'Rs. 500 off orders over Rs. 4,000',
    discountType: 'fixed', discountValue: 500, minSpend: 4000, maxDiscount: 500,
    description: 'Flat Rs. 500 off unstitched, pret and home textiles.',
    terms: ['Not valid on Ideas clearance section'],
    howTo: ['Apply in the cart summary before payment'],
    url: 'https://www.gulahmedshop.com/', expiresIn: 9,
  },
  {
    store: 'Outfitters', category: 'fashion', code: 'OUT25', title: '25% off end-of-season sale items',
    discountType: 'percent', discountValue: 25, minSpend: 0, maxDiscount: 3500,
    description: 'Extra 25% off already-marked-down sale stock.',
    terms: ['Sale section only', 'Cannot combine with student discount'],
    howTo: ['Filter to Sale', 'Apply code at checkout'],
    url: 'https://outfitters.com.pk/', expiresIn: 7,
  },
  {
    store: 'Bonanza Satrangi', category: 'fashion', code: 'BONANZA300', title: 'Rs. 300 off orders over Rs. 3,000',
    discountType: 'fixed', discountValue: 300, minSpend: 3000, maxDiscount: 300,
    description: 'Flat discount on formal and casual wear.',
    terms: ['One-time use per account'],
    howTo: ['Enter at checkout under "Promo code"'],
    url: 'https://bonanzasatrangi.com/', expiresIn: 15,
  },
  {
    store: 'J. (Junaid Jamshed)', category: 'fashion', code: 'JJPRAY10', title: '10% off prayer & modest wear',
    discountType: 'percent', discountValue: 10, minSpend: 1500, maxDiscount: 1200,
    description: '10% off abayas, prayer sets and formal wear.',
    terms: ['Excludes perfumes and accessories'],
    howTo: ['Apply at the online checkout page'],
    url: 'https://www.junaidjamshed.com/', expiresIn: 13,
  },
  {
    store: "Levi's Pakistan", category: 'fashion', code: 'LEVIS500', title: 'Rs. 500 off denim over Rs. 6,000',
    discountType: 'fixed', discountValue: 500, minSpend: 6000, maxDiscount: 500,
    description: 'Flat off on jeans and jackets, online and select stores.',
    terms: ['Excludes outlet stores'],
    howTo: ['Show at store till or apply online at checkout'],
    url: 'https://www.levis.com.pk/', expiresIn: 11,
  },

  // --------------------------------------------------------------------- food
  {
    store: 'Foodpanda', category: 'food', code: 'PANDA50', title: 'Rs. 50 off + free delivery',
    discountType: 'fixed', discountValue: 50, minSpend: 400, maxDiscount: 50,
    description: 'Rs. 50 off and waived delivery fee on your next order.',
    terms: ['Selected vendors only', 'New/lapsed users get the best version of this'],
    howTo: ['Add code at checkout under "Voucher code"'],
    url: 'https://www.foodpanda.pk/', expiresIn: 5,
  },
  {
    store: 'Foodpanda', category: 'food', code: 'PANDAGOLD', title: '20% off with pandago pro',
    discountType: 'percent', discountValue: 20, minSpend: 1000, maxDiscount: 400,
    description: '20% off for pandapro members on participating restaurants.',
    terms: ['Requires active pandapro subscription'],
    howTo: ['Applies automatically at checkout for members'],
    url: 'https://www.foodpanda.pk/', expiresIn: 30,
  },
  {
    store: 'Cheetay', category: 'food', code: 'CHEETAY100', title: 'Rs. 100 off orders over Rs. 800',
    discountType: 'fixed', discountValue: 100, minSpend: 800, maxDiscount: 100,
    description: 'Flat Rs. 100 off food, grocery or pharmacy orders.',
    terms: ['Lahore, Karachi, Islamabad only'],
    howTo: ['Enter code in the promo field before placing order'],
    url: 'https://cheetay.pk/', expiresIn: 8,
  },

  // ------------------------------------------------------------------ grocery
  {
    store: 'Metro Cash & Carry', category: 'grocery', code: 'METRO5', title: '5% off first online order',
    discountType: 'percent', discountValue: 5, minSpend: 3000, maxDiscount: 1000,
    description: 'First online-order discount for Metro app/website.',
    terms: ['New online customers only'],
    howTo: ['Sign up, apply at checkout'],
    url: 'https://www.metro-online.pk/', expiresIn: 22,
  },
  {
    store: 'Imtiaz Super Market', category: 'grocery', code: 'IMTIAZ200', title: 'Rs. 200 off over Rs. 2,500',
    discountType: 'fixed', discountValue: 200, minSpend: 2500, maxDiscount: 200,
    description: 'Flat off on the Imtiaz Online app.',
    terms: ['App orders only'],
    howTo: ['Apply at checkout in the Imtiaz app'],
    url: 'https://imtiaz.com.pk/', expiresIn: 6,
  },

  // ------------------------------------------------------------------ telecom
  {
    store: 'Jazz', category: 'telecom', code: 'JAZZWEEKLY', title: 'Bonus 2GB on weekly bundle purchase',
    discountType: 'cashback', discountValue: null, minSpend: null, maxDiscount: null,
    description: 'Extra 2GB data when you buy a JazzWorld weekly internet bundle via the app.',
    terms: ['Once per number per month'],
    howTo: ['Open MyJazz app → Bundles → apply the offer code'],
    url: 'https://jazz.com.pk/', expiresIn: 4,
  },
  {
    store: 'Zong', category: 'telecom', code: 'ZONGDATA10', title: '10% cashback on monthly internet bundle',
    discountType: 'percent', discountValue: 10, minSpend: null, maxDiscount: null,
    description: '10% balance cashback on select monthly internet bundles.',
    terms: ['Via My Zong app only'],
    howTo: ['My Zong app → Offers → redeem code'],
    url: 'https://www.zong.com.pk/', expiresIn: 9,
  },
  {
    store: 'Telenor', category: 'telecom', code: 'TELENORCALL', title: 'Free 100 on-net minutes',
    discountType: 'cashback', discountValue: null, minSpend: null, maxDiscount: null,
    description: '100 free Telenor-to-Telenor minutes on qualifying recharge.',
    terms: ['Recharge of Rs. 300+ required'],
    howTo: ['My Telenor app → Offers → activate'],
    url: 'https://www.telenor.com.pk/', expiresIn: 7,
  },
  {
    store: 'Ufone', category: 'telecom', code: 'UFONE4U', title: '5% extra credit on load',
    discountType: 'percent', discountValue: 5, minSpend: null, maxDiscount: null,
    description: 'Bonus credit on easyload of Rs. 500+.',
    terms: ['Selected franchise/app loads only'],
    howTo: ['My Ufone app → Easyload → enter code'],
    url: 'https://www.ufone.com/', expiresIn: 12,
  },

  // ----------------------------------------------------------------- giftcard
  {
    store: 'SteamShop.pk (Google Play)', category: 'giftcard', code: 'GPLAY-BONUS10', title: '10% bonus credit on gift card top-up',
    discountType: 'percent', discountValue: 10, minSpend: null, maxDiscount: null, country: 'ANY',
    description: 'Google Play doesn’t sell PKR cards directly — SteamShop.pk and CodesDukaan.pk are real local resellers that deliver a code by email; they occasionally run a bonus-credit promo on top-ups.',
    terms: ['Reseller-dependent, not a Google-issued discount', 'Confirm the reseller is a legitimate, reviewed store before paying'],
    howTo: ['Check the reseller listing for an active bonus code at purchase'],
    url: 'https://steamshop.pk/gift-cards/google-play-gift-card', expiresIn: 10,
  },
  {
    store: 'Careem', category: 'giftcard', code: 'CAREEMGIFT', title: 'Rs. 200 bonus on gift card redemption',
    discountType: 'fixed', discountValue: 200, minSpend: 1000, maxDiscount: 200, country: 'ANY',
    description: 'Bonus Careem credit when redeeming a Careem gift card for the first time.',
    terms: ['New wallet top-up users'],
    howTo: ['Careem app → Wallet → Redeem gift card → enter code'],
    url: 'https://www.careem.com/', expiresIn: 20,
  },
  {
    store: 'Daraz', category: 'giftcard', code: 'DZGIFT5', title: '5% extra on Daraz Gift Card purchase',
    discountType: 'percent', discountValue: 5, minSpend: 1000, maxDiscount: 500, country: 'ANY',
    description: 'Bonus balance when buying a Daraz e-Gift Card during promo periods.',
    terms: ['Promo periods only — check the gift card page'],
    howTo: ['Daraz app → Gift Cards → apply code at purchase'],
    url: 'https://www.daraz.pk/gift-cards/', expiresIn: 18,
  },

  // ------------------------------------------------------------------- travel
  {
    store: 'PIA (Pakistan International Airlines)', category: 'travel', country: 'UAE', code: 'PIA-UAE5',
    title: '5% off Karachi/Lahore ↔ Dubai fares', discountType: 'percent', discountValue: 5, minSpend: null, maxDiscount: 3000,
    description: 'Discount fare class on select Dubai and Sharjah routes.',
    terms: ['Subject to seat availability in the promo fare class', 'Travel window may be restricted'],
    howTo: ['Book on piac.com.pk', 'Apply promo code at the payment step'],
    url: 'https://www.piac.com.pk/', expiresIn: 25,
  },
  {
    store: 'Airblue', category: 'travel', country: 'Saudi Arabia', code: 'AB-KSA10',
    title: '10% off Jeddah/Madinah routes', discountType: 'percent', discountValue: 10, minSpend: null, maxDiscount: 4000,
    description: 'Discount on Umrah-season routes to Jeddah and Madinah.',
    terms: ['Blackout dates during peak Umrah season'],
    howTo: ['Apply at checkout on airblue.com'],
    url: 'https://www.airblue.com/', expiresIn: 20,
  },
  {
    store: 'flynas', category: 'travel', country: 'Saudi Arabia', code: 'FLYNAS-PK',
    title: 'Rs. 2,000 off return fares', discountType: 'fixed', discountValue: 2000, minSpend: null, maxDiscount: 2000,
    description: 'Flat discount on return Riyadh/Jeddah bookings from Pakistan.',
    terms: ['Return bookings only'],
    howTo: ['Apply on flynas.com at the fare summary step'],
    url: 'https://www.flynas.com/', expiresIn: 15,
  },
  {
    store: 'Sastaticket.pk', category: 'travel', country: 'Turkey', code: 'STK-TURKEY',
    title: 'Rs. 3,000 off Istanbul packages', discountType: 'fixed', discountValue: 3000, minSpend: 60000, maxDiscount: 3000,
    description: 'Flight + hotel bundle discount for Istanbul.',
    terms: ['Bundle bookings only, not flights alone'],
    howTo: ['Apply at the packages checkout on sastaticket.pk'],
    url: 'https://www.sastaticket.pk/', expiresIn: 17,
  },
  {
    store: 'Bookme.pk', category: 'travel', country: 'Thailand', code: 'BOOKME-THAI',
    title: '8% off Bangkok/Phuket tour packages', discountType: 'percent', discountValue: 8, minSpend: 50000, maxDiscount: 6000,
    description: 'Discount on curated tour packages to Thailand.',
    terms: ['Package tours only'],
    howTo: ['Apply the code at the tours checkout on bookme.pk'],
    url: 'https://www.bookme.pk/', expiresIn: 19,
  },
  {
    store: 'Bookme.pk', category: 'travel', country: 'Malaysia', code: 'BOOKME-KL12',
    title: '12% off Kuala Lumpur hotel bookings', discountType: 'percent', discountValue: 12, minSpend: null, maxDiscount: 5000,
    description: 'Hotel-only discount for Kuala Lumpur and Langkawi stays.',
    terms: ['Non-refundable rate plans only'],
    howTo: ['Apply at the hotel checkout page'],
    url: 'https://www.bookme.pk/', expiresIn: 12,
  },
  {
    store: 'Booking.com', category: 'travel', country: 'United Kingdom', code: 'BKUK-STAY15',
    title: '15% off London stays, 2+ nights', discountType: 'percent', discountValue: 15, minSpend: null, maxDiscount: 8000,
    description: 'Booking.com promo for London properties, minimum two-night stay.',
    terms: ['Selected partner properties, check the discount is applied before paying'],
    howTo: ['Apply the code on the payment step at booking.com'],
    url: 'https://www.booking.com/', expiresIn: 14,
  },
  {
    store: 'China Southern Airlines', category: 'travel', country: 'China', code: 'CZ-PK2026',
    title: 'Rs. 4,000 off Guangzhou/Beijing fares', discountType: 'fixed', discountValue: 4000, minSpend: null, maxDiscount: 4000,
    description: 'Fare discount on Islamabad/Karachi to China routes.',
    terms: ['Round-trip bookings only'],
    howTo: ['Apply at checkout on the airline site or an approved agent'],
    url: 'https://www.csair.com/', expiresIn: 23,
  },
  {
    store: 'PTDC / Northern Tours', category: 'travel', country: 'Pakistan (domestic)', code: 'HUNZA-EARLY',
    title: '10% early-bird off Hunza/Skardu tour packages', discountType: 'percent', discountValue: 10, minSpend: 20000, maxDiscount: 4000,
    description: 'Early-booking discount on guided Northern Areas packages.',
    terms: ['Booked 30+ days ahead of departure'],
    howTo: ['Apply when booking through a listed tour operator'],
    url: 'https://tourism.gov.pk/', expiresIn: 28,
  },
  {
    store: 'Serena Hotels Pakistan', category: 'travel', country: 'Pakistan (domestic)', code: 'SERENA-STAY',
    title: '20% off weekday stays', discountType: 'percent', discountValue: 20, minSpend: null, maxDiscount: 10000,
    description: 'Weekday-only discount across the Serena domestic network.',
    terms: ['Sunday–Thursday check-in only'],
    howTo: ['Apply at booking on serenahotels.com'],
    url: 'https://www.serenahotels.com/', expiresIn: 11,
  },
]

export const CATALOG = seed.map((entry, i) => {
  const id = `${entry.store}-${entry.code}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return {
    id,
    store: entry.store,
    category: entry.category,
    country: entry.country || 'Pakistan (domestic)',
    code: entry.code,
    title: entry.title,
    discountType: entry.discountType,
    discountValue: entry.discountValue,
    minSpend: entry.minSpend ?? null,
    maxDiscount: entry.maxDiscount ?? null,
    description: entry.description,
    terms: entry.terms || [],
    howTo: entry.howTo || [],
    url: entry.url,
    addedAt: days(-Math.max(1, (i % 10) + 1)),
    expiresAt: days(entry.expiresIn),
    sample: true,
    source: 'starter catalogue',
    priority: entry.priority || false,
  }
})

// Priority items float to the top of whatever list they appear in — the
// "featured" mechanism. Stable otherwise: two non-priority items keep the
// order they were already in.
export function sortByPriority(items) {
  return [...items].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0))
}

export function discountLabel(item) {
  switch (item.discountType) {
    case 'percent':
      return item.discountValue != null ? `${item.discountValue}% off` : 'Percent off'
    case 'fixed':
      return item.discountValue != null ? `Rs. ${item.discountValue.toLocaleString()} off` : 'Amount off'
    case 'bogo':
      return 'Buy 1 Get 1'
    case 'shipping':
      return 'Free shipping'
    case 'cashback':
      return 'Bonus / cashback'
    default:
      return 'Special offer'
  }
}
