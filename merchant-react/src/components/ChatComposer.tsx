import { useEffect, useRef, useState } from 'react'
import './ChatComposer.css'
import { Icon } from './Icon'

interface Props {
  placeholder?: string
  loading?: boolean
  autofocus?: boolean
  onSend: (text: string) => void
}

export function ChatComposer({ placeholder = '输入要处理的消息…', loading = false, autofocus = false, onSend }: Props) {
  const [text, setText] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autofocus) {
      setTimeout(() => taRef.current?.focus(), 50)
    }
  }, [autofocus])

  const autoresize = () => {
    if (!taRef.current) return
    taRef.current.style.height = 'auto'
    taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 220)}px`
  }

  const submit = () => {
    const v = text.trim()
    if (!v || loading) return
    onSend(v)
    setText('')
    if (taRef.current) {
      taRef.current.style.height = 'auto'
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <textarea
        ref={taRef}
        className="composer-input"
        placeholder={placeholder}
        rows={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          autoresize()
        }}
        onKeyDown={onKey}
      />
      <button
        type="submit"
        className={`composer-send ${loading ? 'loading' : ''}`}
        disabled={loading || !text.trim()}
      >
        <Icon name="send" size={16} />
      </button>
    </form>
  )
}
