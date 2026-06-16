const DSML_TAG_PATTERN = /<\/?\s*\|\s*DSML\s*\|[^>]*>/i

function hasDsmlProtocol(content: string): boolean {
  return DSML_TAG_PATTERN.test(content || '')
}

function findFirstDsmlIndex(content: string): number {
  const match = DSML_TAG_PATTERN.exec(content)
  return match?.index ?? -1
}

function findLastDsmlEnd(content: string): number {
  const tagPattern = new RegExp(DSML_TAG_PATTERN.source, 'gi')
  let lastEnd = -1
  let match: RegExpExecArray | null
  while ((match = tagPattern.exec(content)) != null) {
    lastEnd = tagPattern.lastIndex
  }
  return lastEnd
}

function looksLikeProtocolPayload(content: string): boolean {
  const text = content.trim()
  if (!text) return false
  if (/^[\]}{,"\s:[\]\w.-]+$/.test(text)) return true
  return /"(priority|content|status)"\s*:/.test(text) || /<\/?\s*\|\s*DSML\s*\|/i.test(text)
}

function extractJsonArrayFrom(content: string, startAt: number): string {
  const start = content.indexOf('[', Math.max(0, startAt))
  if (start < 0) return ''
  let depth = 0
  let inString = false
  let escaping = false
  for (let index = start; index < content.length; index += 1) {
    const char = content[index]
    if (inString) {
      if (escaping) {
        escaping = false
      } else if (char === '\\') {
        escaping = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '[') depth += 1
    if (char === ']') {
      depth -= 1
      if (depth === 0)
        return content.slice(start, index + 1)
    }
  }
  return ''
}

export function protocolProgressText(content: string): string {
  if (!hasDsmlProtocol(content)) return ''
  const todosMarker = content.search(/name=["']todos["']/i)
  if (todosMarker >= 0) {
    const rawJson = extractJsonArrayFrom(content, todosMarker)
    if (rawJson) {
      try {
        const todos = JSON.parse(rawJson) as Array<{ content?: unknown; status?: unknown }>
        const normalized = todos
          .map(item => ({
            content: String(item?.content || '').trim(),
            status: String(item?.status || '').trim(),
          }))
          .filter(item => item.content)
        const active = normalized.find(item => item.status === 'in_progress')
        if (active)
          return `正在执行任务：${active.content}。`
        const pending = normalized.find(item => item.status === 'pending')
        if (pending)
          return `任务已拆解，准备执行：${pending.content}。`
        const doneCount = normalized.filter(item => item.status === 'completed' || item.status === 'done').length
        if (doneCount > 0)
          return `任务步骤已更新，已完成 ${doneCount} 项。`
      } catch {
        // Fall back to regex extraction below.
      }
    }
    const contentMatch = /"content"\s*:\s*"([^"]+)"/.exec(content)
    if (contentMatch?.[1])
      return `正在执行任务：${contentMatch[1]}。`
    return '正在整理任务步骤。'
  }
  const toolName = /invoke\s+name=["']([^"']+)["']/i.exec(content)?.[1]
  if (toolName)
    return '正在调用工具处理任务。'
  return '正在处理任务。'
}

export function sanitizeAgentAssistantText(content: string): string {
  if (!hasDsmlProtocol(content)) return content || ''
  const firstMarker = findFirstDsmlIndex(content)
  const lastMarkerEnd = findLastDsmlEnd(content)
  const before = firstMarker > 0 ? content.slice(0, firstMarker).trim() : ''
  const after = lastMarkerEnd >= 0 ? content.slice(lastMarkerEnd).trim() : ''
  const visibleParts = [before]
  if (after && !looksLikeProtocolPayload(after))
    visibleParts.push(after)
  const visible = visibleParts.filter(Boolean).join('\n\n').trim()
  if (visible)
    return visible
  return protocolProgressText(content)
}
