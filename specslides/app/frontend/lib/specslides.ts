type SlideRole = "User" | "Agent" | "System"

export interface Specslide {
  id: string
  role: SlideRole
  meta: string | null
  content: string
}

interface ParsedStory {
  title: string
  slides: Specslide[]
}

export interface PromptThread {
  id: string
  prompt: string
  timestamp: string | null
  toolUses: ToolUse[]
}

export interface ToolUse {
  name: string
  type: string | null
  content: string
}

interface ParsedThreads {
  title: string
  threads: PromptThread[]
}

const ROLE_HEADER = /^_\*\*(User|Agent)(.*?)\*\*_$/
const TOOL_USE_OPEN = /<tool-use\b([^>]*)>/i
const TOOL_USE_CLOSE = /<\/tool-use>/i
const TOOL_WRAPPER_TAG = /^<\/?(details|summary)>/i
const TOOL_NAME_ATTR = /data-tool-name="([^"]+)"/i
const TOOL_TYPE_ATTR = /data-tool-type="([^"]+)"/i

export function parseSpecstoryMarkdown(markdown: string): ParsedStory {
  const title = extractTitle(markdown)
  const lines = markdown.split("\n")
  const slides: Specslide[] = []
  let current: Specslide | null = null

  for (const line of lines) {
    const headerMatch = line.match(ROLE_HEADER)
    if (headerMatch) {
      if (current) {
        current.content = current.content.trim()
        if (current.content.length > 0) {
          slides.push(current)
        }
      }

      const role = headerMatch[1] as SlideRole
      const meta = headerMatch[2]?.trim() || null
      current = {
        id: `${slides.length + 1}`,
        role,
        meta,
        content: "",
      }
      continue
    }

    if (!current) {
      continue
    }

    if (line.trim() === "---") {
      continue
    }

    current.content += `${line}\n`
  }

  if (current) {
    current.content = current.content.trim()
    if (current.content.length > 0) {
      slides.push(current)
    }
  }

  return { title, slides }
}

export function parseSpecstoryThreads(markdown: string): ParsedThreads {
  const title = extractTitle(markdown)
  const lines = markdown.split("\n")
  const threads: PromptThread[] = []

  let currentRole: SlideRole | null = null
  let currentThread: PromptThread | null = null
  let promptBuffer: string[] = []
  let toolBuffer: string[] = []
  let toolName: string | null = null
  let toolType: string | null = null
  let capturingTool = false

  const finalizePrompt = () => {
    if (!currentThread) return
    const text = promptBuffer.join("\n").trim()
    if (text.length > 0) {
      currentThread.prompt = text
    }
    promptBuffer = []
  }

  const finalizeTool = () => {
    if (!currentThread || !toolName) {
      toolBuffer = []
      toolName = null
      toolType = null
      capturingTool = false
      return
    }

    const content = toolBuffer.join("\n").trim()
    if (content.length > 0) {
      currentThread.toolUses.push({
        name: toolName,
        type: toolType,
        content,
      })
    }

    toolBuffer = []
    toolName = null
    toolType = null
    capturingTool = false
  }

  for (const line of lines) {
    const headerMatch = line.match(ROLE_HEADER)
    if (headerMatch) {
      if (currentRole === "User") {
        finalizePrompt()
      }

      const role = headerMatch[1] as SlideRole
      currentRole = role

      if (role === "User") {
        const meta = headerMatch[2]?.trim() || ""
        const timestampMatch = meta.match(/\(([^)]+)\)/)
        const timestamp = timestampMatch ? timestampMatch[1] : null
        const nextThread: PromptThread = {
          id: `${threads.length + 1}`,
          prompt: "",
          timestamp,
          toolUses: [],
        }
        threads.push(nextThread)
        currentThread = nextThread
      }
      continue
    }

    if (capturingTool) {
      if (TOOL_USE_CLOSE.test(line)) {
        finalizeTool()
      } else if (!TOOL_WRAPPER_TAG.test(line.trim())) {
        toolBuffer.push(line)
      } else {
        // Skip wrapper tags to keep the content readable.
      }
      continue
    }

    const toolMatch = line.match(TOOL_USE_OPEN)
    if (toolMatch) {
      const attrs = toolMatch[1] ?? ""
      const nameMatch = attrs.match(TOOL_NAME_ATTR)
      const typeMatch = attrs.match(TOOL_TYPE_ATTR)
      toolName = nameMatch ? nameMatch[1] : "tool"
      toolType = typeMatch ? typeMatch[1] : null
      capturingTool = true
      toolBuffer = []
      continue
    }

    if (currentRole === "User" && currentThread) {
      if (line.trim() === "---") {
        continue
      }
      promptBuffer.push(line)
    }
  }

  if (currentRole === "User") {
    finalizePrompt()
  }
  if (capturingTool) {
    finalizeTool()
  }

  return { title, threads: threads.filter((thread) => thread.prompt.length > 0) }
}

export function extractTitle(markdown: string): string {
  const line = markdown.split("\n").find((l) => l.startsWith("# "))
  if (!line) return "Untitled Specslides"
  return line.replace(/^#\s+/, "").trim() || "Untitled Specslides"
}

export interface ContentBlock {
  type: "text" | "code"
  content: string
  language?: string
}

export function splitContentBlocks(text: string): ContentBlock[] {
  const lines = text.split("\n")
  const blocks: ContentBlock[] = []
  let buffer: string[] = []
  let inCode = false
  let language: string | undefined

  const flushText = () => {
    const content = buffer.join("\n").trim()
    if (content.length > 0) {
      blocks.push({ type: "text", content })
    }
    buffer = []
  }

  const flushCode = () => {
    const content = buffer.join("\n").replace(/\n$/, "")
    blocks.push({ type: "code", content, language })
    buffer = []
    language = undefined
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!inCode) {
        flushText()
        inCode = true
        language = line.replace("```", "").trim() || undefined
      } else {
        inCode = false
        flushCode()
      }
      continue
    }

    buffer.push(line)
  }

  if (buffer.length > 0) {
    if (inCode) {
      flushCode()
    } else {
      flushText()
    }
  }

  return blocks
}
