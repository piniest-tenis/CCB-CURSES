"use client";

// src/app/auth/callback/page.tsx
// Cognito redirects here after Google SSO. Exchanges the authorization code
// for tokens via PKCE, verifies the email, then redirects to the dashboard.

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { handleCallback } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      setError(errorDescription ?? errorParam);
      return;
    }

    if (!code) {
      setError("No authorization code in callback. Try signing in again.");
      return;
    }

    const callbackUrl = `${window.location.origin}/auth/callback`;

    handleCallback(code, callbackUrl).then((result) => {
      if (result.ok) {
        router.replace("/");
      } else {
        setError(result.error ?? "Sign in failed.");
      }
    });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="bg-[#111a16] border border-brand-muted/20 rounded-lg p-8 w-full max-w-sm text-center">
          <h1 className="text-brand-light text-xl font-bold mb-3">Sign in failed</h1>
          <p className="text-brand-red text-sm mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-brand-blue hover:bg-brand-blue/80 text-brand-light font-semibold py-2 px-6 rounded transition-colors"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <p className="text-brand-muted text-sm">Completing sign in...</p>
    </div>
  );
}
