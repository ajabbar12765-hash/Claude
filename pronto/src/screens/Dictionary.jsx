import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '../components/Icon.jsx'
import { canSpeak, speakItalian } from '../lib/speech.js'

const HISTORY_KEY = 'pronto:dictionary:v1'
const MAX_HISTORY = 12

function loadHistory() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(list) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
  } catch {
    // localStorage unavailable — history just won't persist
  }
}

const GENDER_LABEL = { masculine: 'masc.', feminine: 'fem.' }

export default function Dictionary({ onExit, progress }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error | error-no-key
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState(() => loadHistory())
  const speechSupported = canSpeak()

  useEffect(() => {
    saveHistory(history)
  }, [history])

  function rememberResult(entry) {
    setHistory((prev) => {
      const withoutDupe = prev.filter((h) => h.query.toLowerCase() !== entry.query.toLowerCase())
      return [entry, ...withoutDupe].slice(0, MAX_HISTORY)
    })
  }

  async function lookup(term) {
    const trimmed = term.trim()
    if (!trimmed) return
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus(data.error === 'missing_api_key' || data.error === 'invalid_api_key' ? 'error-no-key' : 'error')
        setErrorMessage(data.message || 'Something went wrong. Try again.')
        return
      }

      setResult(data)
      rememberResult(data)
      progress?.recordDictionaryLookup()
      setStatus('idle')
    } catch {
      setStatus('error')
      setErrorMessage('Couldn’t reach the server. Check your connection and try again.')
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    lookup(query)
  }

  function openFromHistory(entry) {
    setResult(entry)
    setQuery('')
    setStatus('idle')
    setErrorMessage('')
  }

  function speak() {
    if (!result) return
    speakItalian(result.italianWithArticle || result.italian)
  }

  return (
    <motion.div className="screen screen-dictionary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="lesson-header">
        <button type="button" className="lesson-exit" onClick={onExit} aria-label="Back">
          <Icon name="chevronLeft" size={22} strokeWidth={2.2} />
        </button>
        <span className="call-header-title">Dictionary</span>
      </div>

      <p className="dict-intro">Type any word — in English or Italian — and get the translation, the article, and how to say it.</p>

      <form className="dict-search-row" onSubmit={handleSubmit}>
        <div className="dict-search-field">
          <Icon name="search" size={18} strokeWidth={2.1} />
          <input
            type="text"
            className="dict-search-input"
            placeholder="water… il pane… fork…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={status === 'loading'}
          />
        </div>
        <motion.button whileTap={{ scale: 0.95 }} type="submit" className="btn-primary dict-search-submit" disabled={status === 'loading' || !query.trim()}>
          {status === 'loading' ? '…' : 'Look up'}
        </motion.button>
      </form>

      {(status === 'error' || status === 'error-no-key') && errorMessage && (
        <div className={`call-error ${status === 'error-no-key' ? 'call-error-key' : ''} dict-error`}>{errorMessage}</div>
      )}

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.query + result.italian}
            className="dict-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            <div className="dict-card-top">
              <div>
                <p className="dict-card-italian">{result.italianWithArticle || result.italian}</p>
                {result.pronunciation && <p className="dict-card-pron">{result.pronunciation}</p>}
              </div>
              {speechSupported && (
                <button type="button" className="dict-listen" onClick={speak} aria-label="Listen">
                  <Icon name="volume" size={20} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="dict-card-tags">
              {result.partOfSpeech && <span className="dict-tag">{result.partOfSpeech}</span>}
              {result.gender && <span className="dict-tag">{GENDER_LABEL[result.gender] || result.gender}</span>}
              {result.plural && <span className="dict-tag">pl. {result.plural}</span>}
            </div>

            <p className="dict-card-english">{result.english}</p>

            {result.exampleIt && (
              <div className="dict-card-example">
                <p className="dict-card-example-it">{result.exampleIt}</p>
                <p className="dict-card-example-en">{result.exampleEn}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 0 && (
        <div className="dict-history">
          <p className="dict-history-label">Recent lookups</p>
          <div className="dict-history-chips">
            {history.map((h) => (
              <button type="button" key={h.query + h.italian} className="dict-history-chip" onClick={() => openFromHistory(h)}>
                {h.italianWithArticle || h.italian}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
