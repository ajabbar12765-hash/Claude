// Outbound booking links.
//
// These are live search URLs on the real booking sites, built from the hotel
// name, city and the selected dates and occupancy. Clicking one lands on
// genuine, bookable inventory — the app never handles payment itself.

const enc = encodeURIComponent

export const PROVIDERS = [
  { id: 'booking', label: 'Booking.com', primary: true },
  { id: 'google', label: 'Google Hotels' },
  { id: 'expedia', label: 'Expedia' },
  { id: 'hotels', label: 'Hotels.com' },
  { id: 'trivago', label: 'Trivago' },
  { id: 'maps', label: 'Map' },
]

function starFilter(stars) {
  // Booking.com class filter, e.g. class=5
  return stars ? `&nflt=${enc(`class=${stars}`)}` : ''
}

/**
 * @param {object} hotel  catalog hotel
 * @param {object} trip   { checkIn, checkOut, adults, rooms }
 * @returns {Record<string, string>} provider id -> url
 */
export function bookingLinks(hotel, trip) {
  const { checkIn, checkOut, adults = 2, rooms = 1 } = trip || {}
  const q = `${hotel.name}, ${hotel.city}`
  const cityQ = `${hotel.city}, ${hotel.country}`
  const dates = checkIn && checkOut

  return {
    booking:
      `https://www.booking.com/searchresults.html?ss=${enc(q)}` +
      (dates ? `&checkin=${checkIn}&checkout=${checkOut}` : '') +
      `&group_adults=${adults}&no_rooms=${rooms}&group_children=0` +
      starFilter(hotel.stars === 5 ? 5 : 0),

    google:
      `https://www.google.com/travel/search?q=${enc(q)}` +
      (dates ? `&checkin=${checkIn}&checkout=${checkOut}` : ''),

    expedia:
      `https://www.expedia.com/Hotel-Search?destination=${enc(q)}` +
      (dates ? `&startDate=${checkIn}&endDate=${checkOut}` : '') +
      `&adults=${adults}&rooms=${rooms}`,

    hotels:
      `https://www.hotels.com/Hotel-Search?destination=${enc(q)}` +
      (dates ? `&startDate=${checkIn}&endDate=${checkOut}` : '') +
      `&adults=${adults}&rooms=${rooms}`,

    trivago: `https://www.trivago.com/en-US/srl?search=${enc(q)}`,

    maps: `https://www.google.com/maps/search/?api=1&query=${enc(q)}&query_place_id=`,

    cityBooking:
      `https://www.booking.com/searchresults.html?ss=${enc(cityQ)}` +
      (dates ? `&checkin=${checkIn}&checkout=${checkOut}` : '') +
      `&group_adults=${adults}&no_rooms=${rooms}`,
  }
}
