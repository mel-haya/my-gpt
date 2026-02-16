import { Metadata } from "next";
import Link from "next/link";
import { getAllHotelsForLanding } from "@/services/hotelService";
import UserComponent from "@/components/userComponent";
import LandingNavbar from "@/components/landing-navbar";

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
      {/* ── nav ── */}
      <LandingNavbar />

      {/* ── hero ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-8 pt-16 pb-20 text-center md:px-16 md:pt-28 md:pb-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/6 bg-white/4 px-4 py-1.5 text-xs tracking-widest text-white/70 uppercase backdrop-blur-sm font-jost">
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

        <h2 className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed font-light text-white/70 font-jost md:text-xl">
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
          <p className="mt-3 text-base text-white/60 font-jost font-light">
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
                    <div className="flex items-center gap-1.5 text-sm text-white/60 font-jost font-light">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="shrink-0 text-white/50"
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

      {/* ── features ── */}
      <div
        aria-hidden
        className="relative z-10 mx-auto max-w-7xl px-8 md:px-16 lg:px-24"
      >
        <div className="h-px bg-linear-to-r from-transparent via-[#2974dd]/20 to-transparent" />
      </div>

      <section className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:px-16 lg:px-24">
        <div className="mb-14 text-center">
          <h3 className="font-goldman text-3xl font-bold text-white/90 md:text-4xl">
            What Oasis Can Do
          </h3>
          <p className="mt-3 text-base text-white/60 font-jost font-light">
            Everything our guests need, one conversation away
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Smart Booking",
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                  />
                </svg>
              ),
              items: [
                "Check availability",
                "Book or modify reservations",
                "Instant confirmation",
              ],
            },
            {
              title: "Hotel Information",
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                  />
                </svg>
              ),
              items: [
                "Check-in / check-out times",
                "Breakfast hours",
                "Amenities and services",
                "Local recommendations",
              ],
            },
            {
              title: "Guest Assistance",
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                </svg>
              ),
              items: [
                "Request housekeeping",
                "Report issues",
                "Ask for room service or extras",
              ],
            },
            {
              title: "Multilingual & 24/7",
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558"
                  />
                </svg>
              ),
              items: ["Always available", "Supports multiple languages"],
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-white/6 bg-white/3 p-6 transition-all duration-300 hover:border-[#2974dd]/20 hover:bg-white/5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#2974dd]/8 text-[#2974dd]/80 transition-colors group-hover:bg-[#2974dd]/14 group-hover:text-[#2974dd]">
                {feature.icon}
              </div>
              <h4 className="mb-3 text-base font-semibold text-white/90 font-jost">
                {feature.title}
              </h4>
              <ul className="flex flex-col gap-2">
                {feature.items.map((item, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2 text-sm text-white/60 font-jost font-light leading-relaxed"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="mt-0.5 shrink-0 text-[#2974dd]/50"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
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
            <p className="text-sm leading-relaxed text-white/60 font-jost font-light">
              {f.desc}
            </p>
          </div>
        ))}
      </section>

      {/* ── footer ── */}
      <div
        aria-hidden
        className="relative z-10 mx-auto max-w-7xl px-8 md:px-16 lg:px-24"
      >
        <div className="h-px bg-linear-to-r from-transparent via-[#2974dd]/20 to-transparent" />
      </div>

      <footer className="relative z-10 mx-auto max-w-7xl px-8 py-12 md:px-16 lg:px-24">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          <span className="font-goldman text-2xl font-bold tracking-wide text-[#2974dd]/60">
            Oasis
          </span>

          <div className="flex items-center gap-8 text-sm font-light tracking-wide text-white/40 font-jost">
            <a href="#hotels" className="transition-colors hover:text-white/70">
              Hotels
            </a>
            <a href="#how" className="transition-colors hover:text-white/70">
              How it works
            </a>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-white/25 font-jost font-light tracking-wide">
          © {new Date().getFullYear()} Oasis. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
