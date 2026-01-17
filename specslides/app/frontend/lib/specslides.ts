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

const ROLE_HEADER = /^_\*\*(User|Agent)(.*?)\*\*_$/

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
