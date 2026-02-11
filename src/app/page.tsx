import { Metadata } from "next";
import Link from "next/link";
import { getAllHotelsForLanding } from "@/services/hotelService";

export const metadata: Metadata = {
  title: "Oasis — AI Hotel Assistant",
  description:
    "Book rooms, get instant answers, and request hotel services through a smart conversational AI assistant available 24/7.",
};

export default async function LandingPage() {
  const hotels = await getAllHotelsForLanding();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white selection:bg-[#2974dd]/30 selection:text-blue-100">
      {/* ── ambient background ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 right-[-10%] h-150 w-150 rounded-full bg-[#2974dd]/9 blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-8%] h-125 w-125 rounded-full bg-[#53335a]/15 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />
      </div>

      {/* ── nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 md:px-16 lg:px-24">
        <span className="font-goldman text-4xl font-bold tracking-wide text-[#2974dd]">
          Oasis
        </span>
        <div className="hidden items-center gap-10 text-sm font-light tracking-wide text-white/60 md:flex font-jost">
          <a href="#hotels" className="transition-colors hover:text-white">
            Hotels
          </a>
          <a href="#how" className="transition-colors hover:text-white">
            How it works
          </a>
        </div>
      </nav>

      {/* ── hero ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-8 pt-16 pb-20 text-center md:px-16 md:pt-28 md:pb-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/6 bg-white/4 px-4 py-1.5 text-xs tracking-widest text-white/50 uppercase backdrop-blur-sm font-jost">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          AI-Powered Hospitality
        </div>

        <h1 className="font-goldman text-5xl leading-[1.08] font-bold tracking-tight md:text-6xl lg:text-7xl">
          <span className="bg-linear-to-r from-[#5b9eef] via-[#2974dd] to-[#7a4f85] bg-clip-text text-transparent">
            Your AI Hotel Assistant
          </span>
          <br />
          <span className="mt-2 block text-white/90">Book, Ask, Relax.</span>
        </h1>

        <h2 className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed font-light text-white/50 font-jost md:text-xl">
          Book rooms, get instant answers, and request hotel services — all
          through a smart conversational assistant available{" "}
          <span className="text-[#2974dd]/80 font-normal">24/7</span>.
        </h2>
      </section>

      {/* ── divider ── */}
      <div
        aria-hidden
        className="relative z-10 mx-auto max-w-7xl px-8 md:px-16 lg:px-24"
      >
        <div className="h-px bg-linear-to-r from-transparent via-[#2974dd]/20 to-transparent" />
      </div>

      {/* ── hotel directory ── */}
      <section
        id="hotels"
        className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:px-16 lg:px-24"
      >
        <div className="mb-12 text-center">
          <h3 className="font-goldman text-3xl font-bold text-white/90 md:text-4xl">
            Choose Your Hotel
          </h3>
          <p className="mt-3 text-base text-white/40 font-jost font-light">
            Select a hotel to start chatting with its AI concierge
          </p>
        </div>

        {hotels.length === 0 ? (
          <p className="text-center text-white/30 font-jost">
            No hotels available at the moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.map((hotel) => {
              const href = hotel.slug ? `/${hotel.slug}` : "#";
              return (
                <Link
                  key={hotel.slug ?? hotel.name}
                  href={href}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/6 bg-white/3 backdrop-blur-sm transition-all duration-300 hover:border-[#2974dd]/30 hover:bg-white/5 hover:shadow-lg hover:shadow-[#2974dd]/5"
                >
                  {/* image area */}
                  <div className="relative h-44 w-full overflow-hidden bg-white/4">
                    {hotel.image ? (
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#2974dd]/10 to-[#53335a]/10">
                        <span className="text-5xl opacity-30">🏨</span>
                      </div>
                    )}
                    {/* hover overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f]/80 to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
                  </div>

                  {/* info */}
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <h4 className="text-lg font-semibold text-white/90 font-jost group-hover:text-white transition-colors">
                      {hotel.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-sm text-white/40 font-jost font-light">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="shrink-0 text-white/30"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                        />
                      </svg>
                      {hotel.location}
                    </div>

                    <div className="mt-auto pt-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2974dd]/70 font-jost transition-colors group-hover:text-[#2974dd]">
                        Chat with AI concierge
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="transition-transform group-hover:translate-x-0.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── how it works ── */}
      <div
        aria-hidden
        className="relative z-10 mx-auto max-w-7xl px-8 md:px-16 lg:px-24"
      >
        <div className="h-px bg-linear-to-r from-transparent via-[#2974dd]/20 to-transparent" />
      </div>

      <section
        id="how"
        className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-0 px-8 py-20 sm:grid-cols-3 md:px-16 lg:px-24"
      >
        {[
          {
            step: "01",
            title: "Pick Your Hotel",
            desc: "Browse the list and select the hotel you're staying at or planning to visit.",
          },
          {
            step: "02",
            title: "Ask Anything",
            desc: "Chat with the AI concierge — ask about rooms, amenities, or local tips.",
          },
          {
            step: "03",
            title: "Book & Request",
            desc: "Reserve rooms and request services like room service, housekeeping, or spa — all in the chat.",
          },
        ].map((f, i) => (
          <div
            key={i}
            className="group flex flex-col items-start gap-4 border-white/4 p-8 transition-colors hover:bg-white/2 sm:border-l first:border-l-0"
          >
            <span className="font-goldman text-3xl font-bold text-[#2974dd]/20 group-hover:text-[#2974dd]/40 transition-colors">
              {f.step}
            </span>
            <h3 className="text-base font-semibold text-white/90 font-jost">
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed text-white/40 font-jost font-light">
              {f.desc}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
