"use client";

/**
 * src/app/auth/callback/page.tsx
 *
 * OAuth callback page. Cognito redirects here after Google SSO with an
 * authorization code. Exchanges the code for tokens via PKCE, stores them
 * in the auth store, then redirects to the dashboard.
 */

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { handleGoogleCallback } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [error, setError] = useState("");
  // Prevent double-execution in React strict mode.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (!searchParams) return;
    handled.current = true;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      setError(errorDescription ?? errorParam);
      return;
    }

    if (!code) {
      setError("No authorization code in callback. Please try signing in again.");
      return;
    }

    handleGoogleCallback(code).then(async (result) => {
      if (result.ok && result.tokens) {
        await signInWithGoogle(result.tokens);
        router.replace("/dashboard");
      } else {
        setError(result.error ?? "Sign in failed.");
      }
    });
  }, [searchParams, router, signInWithGoogle]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm rounded-xl border border-burgundy-900 bg-slate-900 p-8 text-center shadow-card-fantasy">
          <h1 className="font-serif text-xl font-bold text-parchment-100 mb-3">
            Sign in failed
          </h1>
          <p className="text-sm text-burgundy-300 mb-6">{error}</p>
          <Link
            href="/auth/login"
            className="
              inline-block rounded-lg px-6 py-2.5 font-semibold text-sm
              bg-burgundy-700 text-parchment-100
              hover:bg-burgundy-600 transition-colors shadow-glow-burgundy
              focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-900
            "
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <p className="text-sm text-parchment-600">Completing sign in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <p className="text-sm text-parchment-600">Completing sign in...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
