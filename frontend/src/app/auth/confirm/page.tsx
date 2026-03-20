"use client";

/**
 * src/app/auth/confirm/page.tsx
 *
 * Email confirmation page. Accepts a 6-digit code from Cognito.
 * Email is pre-populated from the query string set by the register page.
 * On success redirects to /auth/login.
 */

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as cognitoAuth from "@/lib/auth";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const confirmSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  code: z
    .string()
    .min(6, "Code must be 6 digits")
    .max(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must contain only digits"),
});

type ConfirmFormValues = z.infer<typeof confirmSchema>;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams?.get("email") ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { email: emailFromQuery, code: "" },
  });

  // Sync email from query param after mount (handles client navigation)
  useEffect(() => {
    if (emailFromQuery) {
      setValue("email", emailFromQuery);
    }
  }, [emailFromQuery, setValue]);

  const onSubmit = async (values: ConfirmFormValues) => {
    try {
      await cognitoAuth.confirmSignUp(values.email, values.code);
      // Brief success state — then redirect to login
      setTimeout(() => router.replace("/auth/login"), 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Confirmation failed. Please try again.";

      if (message.includes("CodeMismatchException")) {
        setError("code", { message: "Incorrect code. Please try again." });
      } else if (message.includes("ExpiredCodeException")) {
        setError("code", {
          message: "This code has expired. Request a new one below.",
        });
      } else if (message.includes("UserNotFoundException")) {
        setError("email", { message: "No account found with this email." });
      } else if (message.includes("NotAuthorizedException")) {
        setError("root", {
          message: "This account is already confirmed. You can sign in.",
        });
      } else {
        setError("root", { message });
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-parchment-100">
            Daggerheart
          </h1>
          <p className="mt-1 text-sm text-parchment-500">
            Confirm your email address
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-7 shadow-card-fantasy">
          {isSubmitSuccessful ? (
            /* Success state */
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold-600 text-gold-400 text-xl">
                ✓
              </div>
              <p className="font-semibold text-parchment-200">Email confirmed!</p>
              <p className="text-sm text-parchment-500">Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <p className="text-sm text-parchment-500">
                Check your inbox for a 6-digit verification code and enter it
                below.
              </p>

              {/* Root error */}
              {errors.root && (
                <div className="rounded-lg border border-burgundy-700 bg-burgundy-950/40 px-4 py-3 text-sm text-burgundy-300">
                  {errors.root.message}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium uppercase tracking-wider text-parchment-500"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className={`
                    w-full rounded-lg border bg-slate-850 px-3 py-2.5
                    text-sm text-parchment-200 placeholder-parchment-700
                    focus:outline-none transition-colors
                    ${
                      errors.email
                        ? "border-burgundy-600 focus:border-burgundy-500"
                        : "border-burgundy-800 focus:border-gold-500"
                    }
                  `}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-burgundy-400">{errors.email.message}</p>
                )}
              </div>

              {/* Code */}
              <div className="space-y-1">
                <label
                  htmlFor="code"
                  className="block text-xs font-medium uppercase tracking-wider text-parchment-500"
                >
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  {...register("code")}
                  className={`
                    w-full rounded-lg border bg-slate-850 px-3 py-2.5
                    text-center text-lg font-mono tracking-[0.5em]
                    text-parchment-200 placeholder-parchment-700
                    focus:outline-none transition-colors
                    ${
                      errors.code
                        ? "border-burgundy-600 focus:border-burgundy-500"
                        : "border-burgundy-800 focus:border-gold-500"
                    }
                  `}
                  placeholder="000000"
                />
                {errors.code && (
                  <p className="text-xs text-burgundy-400">{errors.code.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  mt-2 w-full rounded-lg py-2.5 font-semibold text-sm
                  bg-burgundy-700 text-parchment-100
                  hover:bg-burgundy-600 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors shadow-glow-burgundy
                "
              >
                {isSubmitting ? "Confirming…" : "Confirm Email"}
              </button>
            </form>
          )}
        </div>

        {/* Links */}
        <div className="space-y-1 text-center">
          <p className="text-sm text-parchment-600">
            Already confirmed?{" "}
            <Link
              href="/auth/login"
              className="text-gold-500 hover:text-gold-400 transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
          <p className="text-xs text-parchment-700">
            Didn&apos;t receive a code?{" "}
            <Link
              href="/auth/register"
              className="hover:text-parchment-500 transition-colors"
            >
              Try registering again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
        </div>
      }
    >
      <ConfirmForm />
    </Suspense>
  );
}
