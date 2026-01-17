import { Head, usePage } from "@inertiajs/react"
import { useEffect, useMemo, useState } from "react"

import { useClipboard } from "@/hooks/use-clipboard"
import { parseSpecstoryMarkdown, splitContentBlocks, type Specslide } from "@/lib/specslides"

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
  const { title, slides } = useMemo(
    () => parseSpecstoryMarkdown(story.markdown),
    [story.markdown],
  )
  const [index, setIndex] = useState(0)
  const [origin, setOrigin] = useState("")
  const [copied, copy] = useClipboard()

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault()
        setIndex((current) => Math.min(current + 1, slides.length - 1))
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault()
        setIndex((current) => Math.max(current - 1, 0))
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [slides.length])

  const slide = slides[index]
  const shareUrl = origin ? `${origin}/s/${story.slug}` : `/s/${story.slug}`

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
                {slides.length} slides · built from {story.source ?? "specstory"} transcript
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
                {index + 1} / {slides.length}
              </div>
            </div>
          </header>

          <main className="mt-12 flex flex-1 items-center">
            {slide ? (
              <article className="w-full">
                <div className="flex items-center gap-4">
                  <span className="rounded-full border border-[#F4F1EA]/20 bg-[#13181D] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[#A6ADB7]">
                    {slide.role}
                  </span>
                  {slide.meta && (
                    <span className="text-xs text-[#6F7782]">{slide.meta}</span>
                  )}
                </div>

                <div className="mt-6 grid gap-6">
                  <SlideContent slide={slide} />
                </div>
              </article>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#2A3036] bg-[#11161B] px-8 py-16 text-center">
                <h2 className="text-2xl font-semibold text-[#F4F1EA]">
                  No slides found
                </h2>
                <p className="mt-3 text-sm text-[#A6ADB7]">
                  Upload a SpecStory markdown file to generate slides.
                </p>
              </div>
            )}
          </main>

          <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 text-xs text-[#6F7782]">
            <p className="uppercase tracking-[0.2em]">
              Use ← → or space to navigate
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIndex((current) => Math.max(current - 1, 0))}
                className="rounded-full border border-[#2A3036] px-4 py-2 transition hover:border-[#E7A84C] hover:text-[#E7A84C]"
                disabled={index === 0}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setIndex((current) => Math.min(current + 1, slides.length - 1))
                }
                className="rounded-full border border-[#2A3036] px-4 py-2 transition hover:border-[#E7A84C] hover:text-[#E7A84C]"
                disabled={index === slides.length - 1}
              >
                Next
              </button>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}

function SlideContent({ slide }: { slide: Specslide }) {
  const blocks = splitContentBlocks(slide.content)

  return (
    <div className="rounded-3xl border border-[#2A3036] bg-[#11161B] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] md:p-12">
      {blocks.map((block, blockIndex) => {
        if (block.type === "code") {
          return (
            <pre
              key={`${slide.id}-code-${blockIndex}`}
              className="overflow-x-auto rounded-2xl border border-[#2A3036] bg-[#0C0F12] p-5 text-sm text-[#E7E2D8]"
            >
              <code>{block.content}</code>
            </pre>
          )
        }

        const paragraphs = block.content.split(/\n{2,}/g)
        return (
          <div key={`${slide.id}-text-${blockIndex}`} className="space-y-4">
            {paragraphs.map((paragraph, paragraphIndex) => (
              <p
                key={`${slide.id}-paragraph-${blockIndex}-${paragraphIndex}`}
                className="text-base leading-relaxed text-[#F4F1EA] md:text-lg"
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
