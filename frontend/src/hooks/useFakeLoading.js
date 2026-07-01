import { useState, useEffect } from 'react'

/**
 * Simule un état de chargement pendant `delay` ms.
 * À remplacer par un vrai état de fetch quand l'API sera branchée.
 */
export default function useFakeLoading(delay = 1200) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), delay)
    return () => clearTimeout(t)
  }, [delay])
  return loading
}
