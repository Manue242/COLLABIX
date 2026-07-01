import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook générique de connexion WebSocket.
 * À brancher sur le serveur fourni par l'équipe backend (env var ou prop url).
 *
 * Convention de message attendue (JSON) :
 * { type: 'annotation' | 'comment', payload: {...} }
 */
export default function useWebSocket(url) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!url) return

    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.onopen = () => setIsConnected(true)
    socket.onclose = () => setIsConnected(false)
    socket.onerror = (err) => console.error('WebSocket error:', err)

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setMessages((prev) => [...prev, data])
      } catch (e) {
        console.warn('Message WS non-JSON ignoré:', event.data)
      }
    }

    return () => {
      socket.close()
    }
  }, [url])

  const send = useCallback((type, payload) => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }))
    } else {
      console.warn('WebSocket non connecté, message non envoyé')
    }
  }, [])

  return { isConnected, messages, send }
}
