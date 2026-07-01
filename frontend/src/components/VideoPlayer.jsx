import React, { forwardRef } from 'react'

/**
 * Wrapper autour de la balise <video> native.
 * Le ref est exposé pour que le composant parent (AnnotationCanvas)
 * puisse lire currentTime, dimensions, etc.
 */
const VideoPlayer = forwardRef(function VideoPlayer({ src, onTimeUpdate }, ref) {
  return (
    <video
      ref={ref}
      src={src}
      controls
      onTimeUpdate={(e) => onTimeUpdate?.(e.target.currentTime)}
      style={{ width: '100%', display: 'block' }}
    />
  )
})

export default VideoPlayer
