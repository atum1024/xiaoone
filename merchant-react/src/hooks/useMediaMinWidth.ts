import { useEffect, useState } from 'react'

/** 与 Tailwind `md` 对齐：768px */
export function useMediaMinWidth(minPx: number): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(min-width: ${minPx}px)`).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minPx}px)`)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [minPx])

  return matches
}
