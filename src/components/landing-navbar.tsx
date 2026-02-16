"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import UserComponent from "@/components/userComponent";
import { cn } from "@/lib/utils";
import { getCurrentUserRole } from "@/app/actions/users";
import type { Roles } from "@/types/globals";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isValidRole(role: unknown): role is Roles {
  return role === "admin" || role === "hotel_owner" || role === "hotel_staff";
}

export default function LandingNavbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user, isLoaded, isSignedIn } = useUser();
    const [role, setRole] = useState<Roles | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadRole = async () => {
            if (!isLoaded) return;

            if (!user) {
                setRole(null);
                return;
            }

            const maxAttempts = 4;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const currentRole = await getCurrentUserRole();
                    if (!isMounted) return;

                    if (isValidRole(currentRole)) {
                        setRole(currentRole);
                        return;
                    }
                } catch {
                    // Retry below.
                }

                if (attempt < maxAttempts) {
                    await sleep(attempt * 120);
                }
            }

            if (isMounted) {
                setRole(null);
            }
        };

        loadRole();

        return () => {
            isMounted = false;
        };
    }, [isLoaded, user?.id]);

    const isAdmin = role === "admin";
    const isHotelStaff = role === "hotel_owner" || role === "hotel_staff";

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 transition-all duration-300 md:px-16 lg:px-24",
                scrolled
                    ? "bg-[#0a0a0f]/80 backdrop-blur-md py-4 shadow-lg"
                    : "bg-transparent"
            )}
        >
            <span className="font-goldman text-4xl font-bold tracking-wide text-[#2974dd]">
                Oasis
            </span>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-10 text-sm font-light tracking-wide text-white/60 md:flex font-jost">
                <a href="#hotels" className="transition-colors hover:text-white">
                    Hotels
                </a>
                <a href="#how" className="transition-colors hover:text-white">
                    How it works
                </a>
                <UserComponent
                    showName={false}
                    showSignOut={false}
                    containerClassName="contents"
                    className="contents"
                    signInButton={
                        <button className="rounded-full bg-[#2974dd]/10 px-6 py-2 text-[#2974dd] transition-all hover:bg-[#2974dd] hover:text-white hover:shadow-lg hover:shadow-[#2974dd]/20">
                            Log in
                        </button>
                    }
                />
            </div>

            {/* Mobile Hamburger Button */}
            <button
                className="block text-white md:hidden relative z-50"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
            >
                {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>

            {/* Mobile Menu Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-xl transition-all duration-300 md:hidden",
                    isOpen ? "visible opacity-100" : "invisible opacity-0"
                )}
            >
                <div className="flex flex-col items-center gap-8 text-lg font-light tracking-wide text-white/80 font-jost">
                    <a
                        href="#hotels"
                        className="transition-colors hover:text-white"
                        onClick={() => setIsOpen(false)}
                    >
                        Hotels
                    </a>
                    <a
                        href="#how"
                        className="transition-colors hover:text-white"
                        onClick={() => setIsOpen(false)}
                    >
                        How it works
                    </a>

                    {isAdmin && (
                        <Link
                            href="/admin"
                            className="transition-colors hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            Admin Panel
                        </Link>
                    )}

                    {isHotelStaff && (
                        <Link
                            href="/dashboard"
                            className="transition-colors hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            Dashboard
                        </Link>
                    )}

                    <div onClick={() => setIsOpen(false)}>
                        {!isSignedIn && (
                            <UserComponent
                                showName={false}
                                showSignOut={false}
                                containerClassName="flex flex-col items-center gap-4"
                                className="contents"
                                signInButton={
                                    <button className="rounded-full bg-[#2974dd]/10 px-8 py-3 text-lg text-[#2974dd] transition-all hover:bg-[#2974dd] hover:text-white hover:shadow-lg hover:shadow-[#2974dd]/20">
                                        Log in
                                    </button>
                                }
                            />
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
