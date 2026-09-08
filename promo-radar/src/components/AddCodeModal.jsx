import { useState } from 'react'
import { CATEGORIES, COUNTRIES } from '../lib/catalog.js'

const empty = {
  store: '', code: '', title: '', description: '',
  category: 'ecommerce', country: 'Pakistan (domestic)',
  discountType: 'percent', discountValue: '', minSpend: '', maxDiscount: '',
  url: '', expiresAt: '',
}

export default function AddCodeModal({ open, onClose, onSave }) {
  const [form, setForm] = useState(empty)
  if (!open) return null

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function submit(e) {
    e.preventDefault()
    if (!form.store.trim() || !form.code.trim() || !form.expiresAt) return
    const id = `custom-${form.store}-${form.code}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    onSave({
      id,
      store: form.store.trim(),
      code: form.code.trim().toUpperCase(),
      title: form.title.trim() || 'Promo code',
      description: form.description.trim(),
      category: form.category,
      country: form.category === 'travel' ? form.country : (form.category === 'giftcard' ? 'ANY' : 'Pakistan (domestic)'),
      discountType: form.discountType,
      discountValue: form.discountValue ? Number(form.discountValue) : null,
      minSpend: form.minSpend ? Number(form.minSpend) : null,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      terms: [],
      howTo: [],
      url: form.url.trim() || '#',
      addedAt: new Date().toISOString().slice(0, 10),
      expiresAt: form.expiresAt,
      sample: false,
      source: 'added by you',
    })
    setForm(empty)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2>Add a code you found</h2>
        <p className="modal-desc">
          Saved locally to your browser and tracked by the radar just like the starter catalogue —
          it'll get auto-retired once its expiry date passes, and you can mark it used or expired any time.
        </p>

        <div className="form-grid">
          <label>Store / brand<input required value={form.store} onChange={set('store')} placeholder="e.g. Daraz" /></label>
          <label>Code<input required value={form.code} onChange={set('code')} placeholder="e.g. SAVE20" /></label>
          <label>Category
            <select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          {form.category === 'travel' && (
            <label>Destination country
              <select value={form.country} onChange={set('country')}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
          <label>Short title<input value={form.title} onChange={set('title')} placeholder="e.g. 20% off sitewide" /></label>
          <label>Discount type
            <select value={form.discountType} onChange={set('discountType')}>
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount off</option>
              <option value="bogo">Buy 1 Get 1</option>
              <option value="shipping">Free shipping</option>
              <option value="cashback">Cashback / bonus</option>
            </select>
          </label>
          <label>Discount value<input type="number" value={form.discountValue} onChange={set('discountValue')} placeholder="e.g. 20" /></label>
          <label>Min spend (Rs.)<input type="number" value={form.minSpend} onChange={set('minSpend')} /></label>
          <label>Max discount (Rs.)<input type="number" value={form.maxDiscount} onChange={set('maxDiscount')} /></label>
          <label>Store URL<input value={form.url} onChange={set('url')} placeholder="https://…" /></label>
          <label>Expires on<input required type="date" value={form.expiresAt} onChange={set('expiresAt')} /></label>
        </div>

        <label className="full">Description
          <textarea value={form.description} onChange={set('description')} rows={2} placeholder="What it covers, any restrictions…" />
        </label>

        <div className="modal-actions">
          <button type="submit" className="btn-primary">Save code</button>
        </div>
      </form>
    </div>
  )
}
