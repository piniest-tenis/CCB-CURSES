"use client";

/**
 * src/app/auth/login/page.tsx
 *
 * Login page. React Hook Form + Zod validation. Calls authStore.signIn.
 */

import React from "react";
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
        err instanceof Error ? err.message : "Sign in failed. Please try again.";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-parchment-100">
            Daggerheart
          </h1>
          <p className="mt-1 text-sm text-parchment-500">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-7 shadow-card-fantasy">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
                autoComplete="current-password"
                {...register("password")}
                className={`
                  w-full rounded-lg border bg-slate-850 px-3 py-2.5
                  text-sm text-parchment-200 placeholder-parchment-700
                  focus:outline-none transition-colors
                  ${
                    errors.password
                      ? "border-burgundy-600 focus:border-burgundy-500"
                      : "border-burgundy-800 focus:border-gold-500"
                  }
                `}
                placeholder="••••••••••••"
              />
              {errors.password && (
                <p className="text-xs text-burgundy-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                mt-2 w-full rounded-lg py-2.5 font-semibold text-sm
                bg-burgundy-700 text-parchment-100
                hover:bg-burgundy-600 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors shadow-glow-burgundy
              "
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>
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
        <p className="text-center text-xs text-parchment-700">
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
