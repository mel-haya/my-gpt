"use client";

import { useSearchParams } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldAlert, LogIn, Lock } from "lucide-react";
import { Suspense } from "react";

function AccessDeniedContent() {
    const searchParams = useSearchParams();
    const reason = searchParams.get("reason") || "not_signed_in";
    const redirectTo = searchParams.get("redirectTo") || "/";

    const config: Record<
        string,
        {
            icon: React.ReactNode;
            title: string;
            description: string;
            showSignIn: boolean;
        }
    > = {
        not_signed_in: {
            icon: <LogIn className="w-12 h-12 text-blue-400" />,
            title: "Sign In Required",
            description:
                "You need to sign in to access this page. Please sign in with your account to continue.",
            showSignIn: true,
        },
        not_admin: {
            icon: <ShieldAlert className="w-12 h-12 text-red-400" />,
            title: "Admin Access Required",
            description:
                "You don't have admin privileges to access this page. If you believe this is an error, please contact your administrator.",
            showSignIn: false,
        },
        no_access: {
            icon: <Lock className="w-12 h-12 text-yellow-400" />,
            title: "Access Denied",
            description:
                "You don't have the required permissions to access this page. This area is restricted to authorized personnel only.",
            showSignIn: false,
        },
    };

    const current = config[reason] || config.not_signed_in;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4">
            <div className="max-w-md w-full">
                <div className="bg-neutral-800/60 backdrop-blur-xl border border-neutral-700/50 rounded-2xl p-8 shadow-2xl text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-neutral-700/40 rounded-full p-4">
                            {current.icon}
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-white mb-3">
                        {current.title}
                    </h1>

                    {/* Description */}
                    <p className="text-gray-400 mb-8 leading-relaxed text-sm">
                        {current.description}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        {current.showSignIn ? (
                            <>
                                <SignInButton
                                    mode="modal"
                                    forceRedirectUrl={redirectTo}
                                >
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 cursor-pointer">
                                        <LogIn className="w-4 h-4 mr-2" />
                                        Sign In to Continue
                                    </Button>
                                </SignInButton>

                                <Link href="/">
                                    <Button
                                        variant="ghost"
                                        className="w-full text-gray-400 hover:text-white cursor-pointer"
                                    >
                                        Go to Home Page
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/">
                                    <Button className="w-full bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2.5 cursor-pointer">
                                        Go to Home Page
                                    </Button>
                                </Link>

                                {reason === "not_admin" && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Signed in as a non-admin user
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AccessDeniedPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-neutral-950">
                    <div className="text-gray-400">Loading...</div>
                </div>
            }
        >
            <AccessDeniedContent />
        </Suspense>
    );
}
