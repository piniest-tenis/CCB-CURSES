"use client";

/**
 * src/app/auth/register/page.tsx
 *
 * Registration page. Collects email, display name, and password.
 * On success redirects to /auth/confirm with email pre-filled.
 */

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as cognitoAuth from "@/lib/auth";

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
                className="block text-xs font-medium uppercase tracking-wider text-parchment-500"
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
                  text-sm text-parchment-200 placeholder-parchment-700
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
                <p id="displayName-error" role="alert" className="text-xs text-burgundy-400">{errors.displayName.message}</p>
              )}
            </div>

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
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
                className={`
                  w-full rounded-lg border bg-slate-850 px-3 py-2.5
                  text-sm text-parchment-200 placeholder-parchment-700
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
                <p id="email-error" role="alert" className="text-xs text-burgundy-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider text-parchment-500"
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
                  text-sm text-parchment-200 placeholder-parchment-700
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
                <p id="password-error" role="alert" className="text-xs text-burgundy-400">{errors.password.message}</p>
              )}
              {!errors.password && (
                <p id="password-hint" className="text-xs text-parchment-700">
                  12+ characters, upper &amp; lowercase, and a number
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium uppercase tracking-wider text-parchment-500"
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
                  text-sm text-parchment-200 placeholder-parchment-700
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
                <p id="confirmPassword-error" role="alert" className="text-xs text-burgundy-400">{errors.confirmPassword.message}</p>
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
                focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-900
              "
            >
              {isSubmitting ? "Creating account…" : "Create Account"}
            </button>
          </form>
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
