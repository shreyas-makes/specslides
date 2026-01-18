import { Head, usePage } from "@inertiajs/react"
import { useEffect, useMemo, useState } from "react"

import { useClipboard } from "@/hooks/use-clipboard"
import {
  parseSpecstoryThreads,
  splitContentBlocks,
  type PromptThread,
} from "@/lib/specslides"

type Story = {
  title: string
  slug: string
  markdown: string
  created_at: string
  source?: string
  source_path?: string
}

export default function StoryShow() {
  const { story } = usePage<{ story: Story }>().props
  const { title, threads } = useMemo(
    () => parseSpecstoryThreads(story.markdown),
    [story.markdown],
  )
  const [threadIndex, setThreadIndex] = useState(0)
  const [toolIndex, setToolIndex] = useState(0)
  const [origin, setOrigin] = useState("")
  const [copied, copy] = useClipboard()

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (threads.length === 0) {
      setThreadIndex(0)
      return
    }
    setThreadIndex((current) => Math.min(current, threads.length - 1))
  }, [threads.length])

  useEffect(() => {
    setToolIndex(0)
  }, [threadIndex])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (threads.length === 0) {
        return
      }

      const maxThreadIndex = Math.max(threads.length - 1, 0)

      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault()
        setThreadIndex((current) => Math.min(current + 1, maxThreadIndex))
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault()
        setThreadIndex((current) => Math.max(current - 1, 0))
      }

      if (event.key === "ArrowDown") {
        event.preventDefault()
        setToolIndex((current) => {
          const max = Math.max(0, threads[threadIndex]?.toolUses.length - 1)
          return Math.min(current + 1, max)
        })
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setToolIndex((current) => Math.max(current - 1, 0))
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [threads, threadIndex])

  const shareUrl = origin ? `${origin}/s/${story.slug}` : `/s/${story.slug}`
  const currentThread = threads[threadIndex]
  const sessionTitle = story.title || title

  return (
    <>
      <Head title={title}>
        <link rel="preconnect" href="https://fonts.bunny.net" />
        <link
          href="https://fonts.bunny.net/css?family=space-grotesk:400,500,600,700|fraunces:400,600,700"
          rel="stylesheet"
        />
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-[#0C0F12] text-[#F4F1EA]">
        <div className="absolute -left-40 top-0 h-[380px] w-[380px] rounded-full bg-[#E7A84C] opacity-20 blur-[120px]" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[420px] w-[420px] rounded-full bg-[#3C6E9E] opacity-30 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 lg:px-12">
          <header className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-[#E7A84C]">
                Specslides
              </p>
              <h1 className="font-[Fraunces] text-3xl leading-tight text-[#F4F1EA] md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-[#A6ADB7]">
                {threads.length} prompts · built from {story.source ?? "specstory"} transcript
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => copy(shareUrl)}
                className="rounded-full border border-[#F4F1EA]/20 bg-[#13181D] px-5 py-2 text-sm font-semibold text-[#F4F1EA] transition hover:border-[#E7A84C] hover:text-[#E7A84C]"
              >
                {copied ? "Link copied" : "Copy share link"}
              </button>
              <div className="rounded-full bg-[#E7A84C] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0C0F12]">
                {Math.min(threadIndex + 1, Math.max(threads.length, 1))} / {threads.length}
              </div>
            </div>
          </header>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#6F7782]">
            Use ← → to move prompts, ↑ ↓ to move code changes
          </p>

          <main className="mt-12 grid w-full gap-8 lg:items-start lg:gap-10 lg:grid-cols-[minmax(0,320px)_1px_minmax(0,1fr)]">
            <aside className="w-full min-w-0 rounded-3xl border border-[#1E242B] bg-[#0F1419] p-6 shadow-[0_40px_90px_-70px_rgba(0,0,0,0.9)]">
              <p className="text-xs uppercase tracking-[0.38em] text-[#E7A84C]">
                Session
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[#F4F1EA]">
                {sessionTitle}
              </h2>
              <p className="mt-2 text-sm text-[#8A919C]">
                Prompts inside this chat session.
              </p>
              <div className="mt-6 grid max-h-[520px] gap-3 overflow-y-auto pr-1">
                {threads.map((thread, idx) => (
                  <button
                    type="button"
                    onClick={() => setThreadIndex(idx)}
                    key={thread.id}
                    className={`min-w-0 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      idx === threadIndex
                        ? "border-[#E7A84C] bg-[#1A2129] text-[#F4F1EA]"
                        : "border-[#1F252C] bg-[#121820] text-[#C9CFD6] hover:border-[#39424C]"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#6F7782]">
                      Prompt {idx + 1}
                    </p>
                    <p className="mt-2 break-words text-sm leading-relaxed">
                      {thread.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            <div className="hidden h-full w-px rounded-full bg-[#1F252C] lg:block" aria-hidden="true" />

            <section className="w-full min-w-0 space-y-6">
              {threads.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#2A3036] bg-[#11161B] px-8 py-16 text-center">
                  <h2 className="text-2xl font-semibold text-[#F4F1EA]">
                    No prompts found
                  </h2>
                  <p className="mt-3 text-sm text-[#A6ADB7]">
                    Upload a SpecStory markdown file to render prompt threads.
                  </p>
                </div>
              ) : (
                currentThread && (
                  <PromptThreadCard
                    thread={currentThread}
                    toolIndex={toolIndex}
                    onSelectTool={setToolIndex}
                    index={threadIndex}
                    total={threads.length}
                    sessionTitle={sessionTitle}
                  />
                )
              )}
            </section>
          </main>
        </div>
      </div>
    </>
  )
}

function PromptThreadCard({
  thread,
  toolIndex,
  onSelectTool,
  index,
  total,
  sessionTitle,
}: {
  thread: PromptThread
  toolIndex: number
  onSelectTool: (index: number) => void
  index: number
  total: number
  sessionTitle: string
}) {
  const promptBlocks = splitContentBlocks(thread.prompt)
  const toolUses = thread.toolUses

  return (
    <div className="w-full min-w-0 rounded-3xl border border-[#2A3036] bg-[#11161B] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] md:p-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#F4F1EA]/20 bg-[#13181D] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[#A6ADB7]">
            Prompt {index + 1} / {total}
          </span>
          {thread.timestamp && (
            <span className="text-xs text-[#6F7782]">{thread.timestamp}</span>
          )}
        </div>
        <p className="text-xs uppercase tracking-[0.28em] text-[#6F7782]">
          {sessionTitle}
        </p>
      </div>

      <p className="mt-5 text-sm uppercase tracking-[0.3em] text-[#E7A84C]">
        {thread.prompt.split("\n")[0]}
      </p>

      <div className="mt-6 grid gap-6">
        {promptBlocks.map((block, blockIndex) => {
          if (block.type === "code") {
            return (
              <pre
                key={`${thread.id}-prompt-code-${blockIndex}`}
                className="overflow-x-auto rounded-2xl border border-[#2A3036] bg-[#0C0F12] p-5 text-sm text-[#E7E2D8]"
              >
                <code>{block.content}</code>
              </pre>
            )
          }

          const paragraphs = block.content.split(/\n{2,}/g)
          return (
            <div key={`${thread.id}-prompt-text-${blockIndex}`} className="space-y-4">
              {paragraphs.map((paragraph, paragraphIndex) => (
                <p
                  key={`${thread.id}-prompt-paragraph-${blockIndex}-${paragraphIndex}`}
                  className="text-base leading-relaxed text-[#F4F1EA] md:text-lg"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )
        })}
      </div>

      <div className="mt-10 border-t border-[#1F252C] pt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-[#E7A84C]">
            Code Impact
          </p>
          <span className="text-xs text-[#6F7782]">
            {toolUses.length} change{toolUses.length === 1 ? "" : "s"}
          </span>
        </div>

        {toolUses.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#2A3036] bg-[#0F1419] px-4 py-5 text-sm text-[#8A919C]">
            No code changes captured for this prompt. Code impact appears only when the
            transcript includes tool-use blocks or diffs.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {toolUses.map((toolUse, idx) => {
              const isSelected = idx === toolIndex
              return (
                <button
                  key={`${thread.id}-tool-${idx}`}
                  type="button"
                  onClick={() => onSelectTool(idx)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    isSelected
                      ? "border-[#E7A84C] bg-[#131A21]"
                      : "border-[#222931] bg-[#0F1419] hover:border-[#39424C]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#F4F1EA]">
                      {toolUse.name}
                    </p>
                    {toolUse.type && (
                      <span className="rounded-full border border-[#2A3036] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#8A919C]">
                        {toolUse.type}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <ToolUseContent
                      threadId={thread.id}
                      toolIndex={idx}
                      content={toolUse.content}
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolUseContent({
  threadId,
  toolIndex,
  content,
}: {
  threadId: string
  toolIndex: number
  content: string
}) {
  const blocks = splitContentBlocks(content)

  return (
    <div className="mt-4 space-y-4">
      {blocks.map((block, blockIndex) => {
        if (block.type === "code") {
          if (isDiffBlock(block.content, block.language)) {
            return (
              <DiffBlock
                key={`${threadId}-tool-${toolIndex}-diff-${blockIndex}`}
                content={block.content}
              />
            )
          }
          return (
            <pre
              key={`${threadId}-tool-${toolIndex}-code-${blockIndex}`}
              className="overflow-x-auto rounded-2xl border border-[#2A3036] bg-[#0C0F12] p-4 text-sm text-[#E7E2D8]"
            >
              <code>{block.content}</code>
            </pre>
          )
        }

        if (isDiffBlock(block.content)) {
          return (
            <DiffBlock
              key={`${threadId}-tool-${toolIndex}-diff-${blockIndex}`}
              content={block.content}
            />
          )
        }

        const paragraphs = block.content.split(/\n{2,}/g)
        return (
          <div key={`${threadId}-tool-${toolIndex}-text-${blockIndex}`} className="space-y-3">
            {paragraphs.map((paragraph, paragraphIndex) => (
              <p
                key={`${threadId}-tool-${toolIndex}-paragraph-${blockIndex}-${paragraphIndex}`}
                className="text-sm leading-relaxed text-[#C7CDD5]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function isDiffBlock(content: string, language?: string) {
  if (language && ["diff", "patch"].includes(language.toLowerCase())) {
    return true
  }

  const lines = content.split("\n")
  const hasHeader = lines.some((line) => line.startsWith("diff --git") || line.startsWith("@@"))
  const hasChange = lines.some(
    (line) =>
      (line.startsWith("+") && !line.startsWith("+++")) ||
      (line.startsWith("-") && !line.startsWith("---")),
  )
  return hasHeader && hasChange
}

function getDiffLineClass(line: string) {
  if (line.startsWith("@@")) {
    return "bg-[#1B1408] text-[#E7A84C]"
  }
  if (line.startsWith("diff --git") || line.startsWith("index ")) {
    return "text-[#9CC3FF]"
  }
  if (line.startsWith("--- ") || line.startsWith("+++ ")) {
    return "text-[#9CC3FF]"
  }
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "bg-[#102016] text-[#B3F1C2]"
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return "bg-[#201014] text-[#F1B3B3]"
  }
  return ""
}

function DiffBlock({ content }: { content: string }) {
  const lines = content.split("\n")
  const lineNumberWidth = String(lines.length).length

  return (
    <pre className="overflow-x-auto rounded-2xl border border-[#2A3036] bg-[#0B0F12] p-4 text-sm text-[#E7E2D8]">
      <code className="block">
        {lines.map((line, idx) => (
          <div
            key={`diff-line-${idx}`}
            className={`flex gap-4 rounded-sm px-2 py-0.5 ${getDiffLineClass(line)}`}
          >
            <span className="select-none text-[#4A525C]">
              {String(idx + 1).padStart(lineNumberWidth, " ")}
            </span>
            <span className="whitespace-pre">{line || " "}</span>
          </div>
        ))}
      </code>
    </pre>
  )
}
