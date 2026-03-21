"use client";

// src/components/AuthGate.tsx
// Renders children if authenticated. Otherwise shows a "Sign in with Google"
// button that redirects through Cognito Hosted UI. No password form.

import React, { useEffect, useState } from "react";
import { isAuthenticated, startGoogleLogin } from "@/lib/auth";

interface AuthGateProps {
  children: React.ReactNode;
}

const CALLBACK_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "http://localhost:3001/auth/callback";

export default function AuthGate({ children }: AuthGateProps) {
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated()) setAuthed(true);
  }, []);

  if (!mounted) return null;
  if (authed) return <>{children}</>;

  async function handleSignIn() {
    setLoading(true);
    const origin = window.location.origin;
    await startGoogleLogin(`${origin}/auth/callback`);
    // page will redirect — loading state stays true
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="bg-[#111a16] border border-brand-muted/20 rounded-lg p-8 w-full max-w-sm text-center">
        <h1 className="text-brand-light text-2xl font-bold mb-2">Curses! CMS</h1>
        <p className="text-brand-muted text-sm mb-6">Sign in with your Google account to continue.</p>
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full bg-brand-blue hover:bg-brand-blue/80 text-brand-light font-semibold py-2 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
