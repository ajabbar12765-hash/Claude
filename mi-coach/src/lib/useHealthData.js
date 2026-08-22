import { useEffect, useState } from 'react'
import { api } from './api.js'

export function useHealthData(range) {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .data(range)
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [range])

  return { summary, loading, error }
}
