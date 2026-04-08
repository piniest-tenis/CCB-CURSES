"use client";

/**
 * src/app/auth/register/page.tsx
 *
 * Registration page. Collects email, display name, and password.
 * On success redirects to /auth/confirm with email pre-filled.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(50, "Display name must be 50 characters or fewer")
      .trim(),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const cognitoAuth = await import("@/lib/auth");
      await cognitoAuth.signUp(values.email, values.password, values.displayName);
      // Redirect to confirmation page with email pre-populated
      router.push(`/auth/confirm?email=${encodeURIComponent(values.email)}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";

      if (message.includes("UsernameExistsException") || message.includes("already exists")) {
        setError("email", {
          message: "An account with this email already exists.",
        });
      } else if (message.includes("InvalidPasswordException")) {
        setError("password", {
          message: "Password does not meet Cognito requirements.",
        });
      } else {
        setError("root", { message });
      }
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setGoogleLoading(true);
      const cognitoAuth = await import("@/lib/auth");
      await cognitoAuth.startGoogleLogin();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign up failed.";
      setError("root", { message });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-parchment-100">
            Daggerheart
          </h1>
          <p className="mt-1 text-sm text-parchment-500">
            Create your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-7 shadow-card-fantasy">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Root error */}
            {errors.root && (
              <div role="alert" className="rounded-lg border border-burgundy-700 bg-burgundy-950/40 px-4 py-3 text-sm text-burgundy-300">
                {errors.root.message}
              </div>
            )}

            {/* Display name */}
            <div className="space-y-1">
              <label
                htmlFor="displayName"
                className="block text-sm font-medium uppercase tracking-wider text-parchment-500"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                aria-invalid={!!errors.displayName}
                aria-describedby={errors.displayName ? "displayName-error" : undefined}
                {...register("displayName")}
                className={`
                  w-full rounded-lg border bg-slate-850 px-3 py-2.5
                  text-base text-parchment-200 placeholder-parchment-700
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 transition-colors
                  ${
                    errors.displayName
                      ? "border-burgundy-600 focus:border-burgundy-500 focus:ring-burgundy-500"
                      : "border-burgundy-800 focus:border-gold-500 focus:ring-gold-500"
                  }
                `}
                placeholder="Aldric Stormweave"
              />
              {errors.displayName && (
                <p id="displayName-error" role="alert" className="text-sm text-burgundy-400">{errors.displayName.message}</p>
              )}
            </div>

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
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
                className={`
                  w-full rounded-lg border bg-slate-850 px-3 py-2.5
                  text-base text-parchment-200 placeholder-parchment-700
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 transition-colors
                  ${
                    errors.email
                      ? "border-burgundy-600 focus:border-burgundy-500 focus:ring-burgundy-500"
                      : "border-burgundy-800 focus:border-gold-500 focus:ring-gold-500"
                  }
                `}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-sm text-burgundy-400">{errors.email.message}</p>
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
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : "password-hint"}
                {...register("password")}
                className={`
                  w-full rounded-lg border bg-slate-850 px-3 py-2.5
                  text-base text-parchment-200 placeholder-parchment-700
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 transition-colors
                  ${
                    errors.password
                      ? "border-burgundy-600 focus:border-burgundy-500 focus:ring-burgundy-500"
                      : "border-burgundy-800 focus:border-gold-500 focus:ring-gold-500"
                  }
                `}
                placeholder="••••••••••••"
              />
              {errors.password && (
                <p id="password-error" role="alert" className="text-sm text-burgundy-400">{errors.password.message}</p>
              )}
              {!errors.password && (
                <p id="password-hint" className="text-sm text-parchment-700">
                  12+ characters, upper &amp; lowercase, and a number
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium uppercase tracking-wider text-parchment-500"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                {...register("confirmPassword")}
                className={`
                  w-full rounded-lg border bg-slate-850 px-3 py-2.5
                  text-base text-parchment-200 placeholder-parchment-700
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 transition-colors
                  ${
                    errors.confirmPassword
                      ? "border-burgundy-600 focus:border-burgundy-500 focus:ring-burgundy-500"
                      : "border-burgundy-800 focus:border-gold-500 focus:ring-gold-500"
                  }
                `}
                placeholder="••••••••••••"
              />
              {errors.confirmPassword && (
                <p id="confirmPassword-error" role="alert" className="text-sm text-burgundy-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || googleLoading}
              className="
                mt-2 w-full rounded-lg py-2.5 font-semibold text-base
                bg-burgundy-700 text-parchment-100
                hover:bg-burgundy-600 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors shadow-glow-burgundy
                focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-900
              "
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
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

          {/* Google sign-up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isSubmitting || googleLoading}
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
            {googleLoading ? "Redirecting..." : "Sign up with Google"}
          </button>
        </div>

        {/* Links */}
        <p className="text-center text-sm text-parchment-600">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-gold-500 hover:text-gold-400 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 rounded"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
