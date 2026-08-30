export const CURRENCIES = [
  { code: 'PKR', locale: 'en-PK', label: 'Pakistani Rupee' },
  { code: 'EUR', locale: 'de-DE', label: 'Euro' },
  { code: 'USD', locale: 'en-US', label: 'US Dollar' },
  { code: 'GBP', locale: 'en-GB', label: 'British Pound' },
]

export function formatMoney(amount, code) {
  const meta = CURRENCIES.find((c) => c.code === code) || CURRENCIES[0]
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount || 0)
  } catch {
    return `${(amount || 0).toFixed(2)} ${code}`
  }
}
