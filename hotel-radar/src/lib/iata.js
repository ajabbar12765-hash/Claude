// IATA city codes, for providers that identify a place by code rather than by
// name. Amadeus is the one that matters here: its hotel search takes a
// cityCode, so without this table it can only ever cover the handful of cities
// someone happened to hard-code.
//
// These are *city* codes, not airport codes, which differ more often than you
// would expect — London is LON and not LHR, New York is NYC and not JFK, Tokyo
// is TYO and not HND. Getting that wrong silently narrows a search to one
// airport's neighbourhood instead of the city.
//
// A destination with no code is skipped by code-based providers rather than
// guessed at. Lake Como and the Maldives are regions rather than cities and
// have no sensible single code; a wrong guess would return hotels in the wrong
// place, which is worse than returning none.

export const IATA_BY_DESTINATION = {
  // Italy
  milan: 'MIL',
  rome: 'ROM',
  venice: 'VCE',
  florence: 'FLR',
  // Rest of Europe
  paris: 'PAR',
  barcelona: 'BCN',
  amsterdam: 'AMS',
  london: 'LON',
  lisbon: 'LIS',
  berlin: 'BER',
  vienna: 'VIE',
  prague: 'PRG',
  madrid: 'MAD',
  athens: 'ATH',
  copenhagen: 'CPH',
  zurich: 'ZRH',
  dublin: 'DUB',
  edinburgh: 'EDI',
  reykjavik: 'REK',
  santorini: 'JTR',
  // Middle East and Africa
  dubai: 'DXB',
  'abu-dhabi': 'AUH',
  doha: 'DOH',
  istanbul: 'IST',
  'cape-town': 'CPT',
  marrakech: 'RAK',
  cairo: 'CAI',
  // Asia
  bangkok: 'BKK',
  tokyo: 'TYO',
  singapore: 'SIN',
  bali: 'DPS',
  'hong-kong': 'HKG',
  'kuala-lumpur': 'KUL',
  karachi: 'KHI',
  lahore: 'LHE',
  islamabad: 'ISB',
  delhi: 'DEL',
  mumbai: 'BOM',
  // Americas
  'new-york': 'NYC',
  'los-angeles': 'LAX',
  miami: 'MIA',
  'mexico-city': 'MEX',
  rio: 'RIO',
  'buenos-aires': 'BUE',
  toronto: 'YTO',
  // Oceania
  sydney: 'SYD',
  auckland: 'AKL',
  // Deliberately absent: lake-como and maldives are regions, not cities.
}

export function iataFor(destinationId) {
  return IATA_BY_DESTINATION[destinationId] || null
}
