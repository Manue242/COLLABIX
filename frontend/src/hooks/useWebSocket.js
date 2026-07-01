import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook WebSocket — connecté au backend FastAPI.
 *
 * URL attendue : ws://localhost:5173/ws/{video_id}?user_id={user_id}
 * (Vite proxie /ws → ws://backend:8000/ws/...)
 *
 * Format des messages backend (discriminant "type") :
 *   { type: 'cursor',             x, y, user_id }
 *   { type: 'annotation_added',   annotation: { id, video_id, type, content, timestamp, color, ... } }
 *   { type: 'annotation_deleted', id }
 *   { type: 'error',              detail }
 */
export default function useWebSocket(url) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!url) return

    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.onopen  = () => setIsConnected(true)
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

    return () => socket.close()
  }, [url])

  // send accepte un objet message complet : { type, ...champs }
  const send = useCallback((message) => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket non connecté, message non envoyé')
    }
  }, [])

  return { isConnected, messages, send }
}
