import { Head, Link, usePage } from "@inertiajs/react"

import { dashboardPath, signInPath } from "@/routes"

export default function Welcome() {
  const page = usePage()
  const { auth } = page.props

  return (
    <>
      <Head title="Specslides">
        <link rel="preconnect" href="https://fonts.bunny.net" />
        <link
          href="https://fonts.bunny.net/css?family=space-grotesk:400,500,600,700|fraunces:400,600,700"
          rel="stylesheet"
        />
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-[#0C0F12] text-[#F4F1EA]">
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-[#E7A84C] opacity-30 blur-[120px]" />
        <div className="absolute right-0 top-40 h-[360px] w-[360px] rounded-full bg-[#3C6E9E] opacity-25 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_50%)]" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 lg:px-12">
          <header className="flex items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-[#E7A84C]">
                Specslides
              </p>
              <p className="text-sm text-[#A6ADB7]">
                Turn AI build sessions into shareable slides.
              </p>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              {auth.user ? (
                <Link
                  href={dashboardPath()}
                  className="rounded-full border border-[#2A3036] px-4 py-2 transition hover:border-[#E7A84C] hover:text-[#E7A84C]"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href={signInPath()}
                  className="rounded-full border border-transparent px-4 py-2 text-[#A6ADB7] transition hover:border-[#2A3036] hover:text-[#F4F1EA]"
                >
                  Log in
                </Link>
              )}
            </nav>
          </header>

          <main className="mt-16 grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <section>
              <h1 className="font-[Fraunces] text-4xl leading-tight text-[#F4F1EA] md:text-6xl">
                Replay the build.
                <br />
                Share the spec.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-[#C8CDD6]">
                Specslides turns your terminal agent transcripts into a cinematic
                slideshow. Capture every prompt, decision, and pivot, then share a
                single link that walks people through how the product was built.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <div className="rounded-full bg-[#E7A84C] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#0C0F12]">
                  MVP ready for SpecStory logs
                </div>
                <div className="rounded-full border border-[#2A3036] px-6 py-3 text-sm text-[#A6ADB7]">
                  Shareable slide decks
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#2A3036] bg-[#11161B] p-8 shadow-[0_30px_70px_-60px_rgba(0,0,0,0.9)]">
              <h2 className="text-lg font-semibold text-[#F4F1EA]">
                MVP flow
              </h2>
              <ol className="mt-6 space-y-5 text-sm text-[#C8CDD6]">
                {[
                  "Install the CLI helper in your repo.",
                  "Sync SpecStory markdown into .specstory/history.",
                  "Upload and get a shareable Specslides URL.",
                  "Present the deck with keyboard navigation.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#2A3036] text-xs text-[#E7A84C]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-xs text-[#6F7782]">
                Next: public galleries, tags, and remixable decks.
              </p>
            </section>
          </main>
        </div>
      </div>
    </>
  )
}
