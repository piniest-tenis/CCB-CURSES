"use client";

/**
 * src/app/auth/login/page.tsx
 *
 * Login page. React Hook Form + Zod validation. Calls authStore.signIn.
 */

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(12, "Password must be at least 12 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await signIn(values.email, values.password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Sign in failed. Please try again.";

      // Map Cognito error codes to field-level errors
      if (
        message.includes("Incorrect username or password") ||
        message.includes("UserNotFoundException") ||
        message.includes("NotAuthorizedException")
      ) {
        setError("root", {
          message: "Incorrect email or password.",
        });
      } else if (message.includes("UserNotConfirmedException")) {
        setError("root", {
          message:
            "Your account is not confirmed. Please check your email for a verification link.",
        });
      } else {
        setError("root", { message });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      // Pass the store's current idToken so startGoogleLogin can detect an
      // existing SRP session and skip the OAuth redirect.
      const { idToken } = useAuthStore.getState();
      const { startGoogleLogin } = await import("@/lib/auth");
      const outcome = await startGoogleLogin(idToken);
      // A valid session already exists in this browser (e.g. another tab is
      // open). Skip the OAuth round-trip and go straight to the dashboard.
      if (outcome === "reused") {
        router.replace("/dashboard");
        return;
      }
      // outcome === "redirecting" - browser is navigating away; keep the
      // loading state active so the button stays disabled during the redirect.
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign in failed.";
      setError("root", { message });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 overflow-hidden">
      {/* Background video - preload="none" so it doesn't compete for
          bandwidth with the JS/CSS needed for interactivity. A poster
          image or the gradient overlay covers the gap. */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
        src="/videos/curses-logo-walk_60fps.webm"
      />
      {/* Linear gradient overlay: 80% bg at top → 85% bg at 80% → 95% bg at bottom */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(rgba(10, 16, 13, 0.8) 0%, rgba(10, 16, 13, 0.85) 80%, rgba(10, 16, 13, 0.95) 100%)",
        }}
      />
      {/* Content - sits above video + overlay */}
      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Image
              src="/images/curses-isolated-logo.png"
              alt="Curses! Custom Character Builder logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>
          <p className="mt-2 text-xs tracking-[0.2em] text-parchment-600 lowercase">
            custom character builder
          </p>
          <p className="mt-1 text-sm text-parchment-500">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-7 shadow-card-fantasy">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Root error */}
            {errors.root && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-burgundy-700 bg-burgundy-950/40 px-4 py-3 text-sm text-burgundy-300"
              >
                {errors.root.message}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium uppercase tracking-wider text-parchment-500"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-invalid={errors.email ? "true" : undefined}
                className={`
                  w-full rounded-lg border bg-slate-850 px-3 py-2.5
                  text-base text-parchment-200 placeholder-parchment-700
                  focus:outline-none focus:ring-2 transition-colors
                  ${
                    errors.email
                      ? "border-burgundy-600 focus:ring-burgundy-500 focus:border-burgundy-500"
                      : "border-burgundy-800 focus:ring-gold-500 focus:border-gold-500"
                  }
                `}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="text-sm text-burgundy-400"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium uppercase tracking-wider text-parchment-500"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                aria-invalid={errors.password ? "true" : undefined}
                className={`
                  w-full rounded-lg border bg-slate-850 px-3 py-2.5
                  text-base text-parchment-200 placeholder-parchment-700
                  focus:outline-none focus:ring-2 transition-colors
                  ${
                    errors.password
                      ? "border-burgundy-600 focus:ring-burgundy-500 focus:border-burgundy-500"
                      : "border-burgundy-800 focus:ring-gold-500 focus:border-gold-500"
                  }
                `}
                placeholder="••••••••••••"
              />
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="text-sm text-burgundy-400"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="
                mt-2 w-full rounded-lg py-2.5 font-semibold text-base
                bg-burgundy-700 text-parchment-100
                hover:bg-burgundy-600 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors shadow-glow-burgundy
                focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-900
              "
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-burgundy-900" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-parchment-700 lowercase tracking-wider">
                or
              </span>
            </div>
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || googleLoading}
            className="
              w-full flex items-center justify-center gap-2.5 rounded-lg
              border border-burgundy-800 bg-slate-850 px-3 py-2.5
              text-base font-medium text-parchment-200
              hover:bg-slate-800 hover:border-burgundy-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-900
            "
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>
        </div>

        {/* Links */}
        <p className="text-center text-sm text-parchment-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="text-gold-500 hover:text-gold-400 transition-colors font-medium"
          >
            Create account
          </Link>
        </p>
        <p className="text-center text-sm text-parchment-700">
          <Link
            href="/auth/forgot-password"
            className="hover:text-parchment-500 transition-colors"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
