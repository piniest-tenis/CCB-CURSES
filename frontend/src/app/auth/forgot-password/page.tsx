"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as cognitoAuth from "@/lib/auth";

const resetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

const resetConfirmSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    code: z
      .string()
      .min(6, "Code must be 6 digits")
      .max(6, "Code must be 6 digits")
      .regex(/^\d{6}$/, "Code must contain only digits"),
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

type ResetRequestFormValues = z.infer<typeof resetRequestSchema>;
type ResetConfirmFormValues = z.infer<typeof resetConfirmSchema>;

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams?.get("email") ?? "";
  const codeFromQuery = searchParams?.get("code") ?? "";

  const [step, setStep] = useState<"request" | "confirm">(
    codeFromQuery ? "confirm" : "request"
  );
  const [sentEmail, setSentEmail] = useState(emailFromQuery);
  const [isRequestSuccessful, setIsRequestSuccessful] = useState(false);
  const [isResetSuccessful, setIsResetSuccessful] = useState(false);

  const requestForm = useForm<ResetRequestFormValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: emailFromQuery },
  });

  const confirmForm = useForm<ResetConfirmFormValues>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: {
      email: emailFromQuery,
      code: codeFromQuery,
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (emailFromQuery) {
      requestForm.setValue("email", emailFromQuery);
      confirmForm.setValue("email", emailFromQuery);
      setSentEmail(emailFromQuery);
    }
    if (codeFromQuery) {
      confirmForm.setValue("code", codeFromQuery);
      setStep("confirm");
    }
  }, [codeFromQuery, confirmForm, emailFromQuery, requestForm]);

  const requestHelpText = useMemo(() => {
    if (!sentEmail) {
      return "Enter your account email and we will send you a reset code.";
    }
    return `We sent a reset code to ${sentEmail}. Enter it below with your new password.`;
  }, [sentEmail]);

  const handleRequestSubmit = async (values: ResetRequestFormValues) => {
    requestForm.clearErrors();

    try {
      await cognitoAuth.requestPasswordReset(values.email);
      setSentEmail(values.email);
      setIsRequestSuccessful(true);
      setStep("confirm");
      confirmForm.setValue("email", values.email);
      confirmForm.setFocus("code");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not start password reset. Please try again.";

      if (message.includes("UserNotFoundException")) {
        requestForm.setError("email", {
          message: "No account found with this email.",
        });
      } else if (message.includes("LimitExceededException")) {
        requestForm.setError("root", {
          message: "Too many reset attempts. Please wait a few minutes and try again.",
        });
      } else {
        requestForm.setError("root", { message });
      }
    }
  };

  const handleConfirmSubmit = async (values: ResetConfirmFormValues) => {
    confirmForm.clearErrors();

    try {
      await cognitoAuth.confirmPasswordReset(
        values.email,
        values.code,
        values.password
      );
      setIsResetSuccessful(true);
      setTimeout(() => {
        router.replace(`/auth/login?email=${encodeURIComponent(values.email)}`);
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not reset your password. Please try again.";

      if (message.includes("CodeMismatchException")) {
        confirmForm.setError("code", {
          message: "Incorrect reset code. Please try again.",
        });
      } else if (message.includes("ExpiredCodeException")) {
        confirmForm.setError("code", {
          message: "This reset code has expired. Request a new one below.",
        });
      } else if (message.includes("UserNotFoundException")) {
        confirmForm.setError("email", {
          message: "No account found with this email.",
        });
      } else if (message.includes("InvalidPasswordException")) {
        confirmForm.setError("password", {
          message: "Password does not meet Cognito requirements.",
        });
      } else {
        confirmForm.setError("root", { message });
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-parchment-100">
            Daggerheart
          </h1>
          <p className="mt-1 text-sm text-parchment-500">Reset your password</p>
        </div>

        <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-7 shadow-card-fantasy">
          {isResetSuccessful ? (
            <div role="status" className="space-y-3 text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold-600 text-xl text-gold-400"
                aria-hidden="true"
              >
                ✓
              </div>
              <p className="font-semibold text-parchment-200">Password updated</p>
              <p className="text-sm text-parchment-500">Redirecting to sign in…</p>
            </div>
          ) : step === "request" ? (
            <form
              onSubmit={requestForm.handleSubmit(handleRequestSubmit)}
              noValidate
              className="space-y-4"
            >
              <p className="text-sm text-parchment-500">
                Enter your account email and we will send you a reset code.
              </p>

              {requestForm.formState.errors.root && (
                <div
                  role="alert"
                  className="rounded-lg border border-burgundy-700 bg-burgundy-950/40 px-4 py-3 text-sm text-burgundy-300"
                >
                  {requestForm.formState.errors.root.message}
                </div>
              )}

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
                  aria-invalid={!!requestForm.formState.errors.email}
                  aria-describedby={
                    requestForm.formState.errors.email ? "email-error" : undefined
                  }
                  {...requestForm.register("email")}
                  className={`
                    w-full rounded-lg border bg-slate-850 px-3 py-2.5
                    text-base text-parchment-200 placeholder-parchment-700
                    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 transition-colors
                    ${
                      requestForm.formState.errors.email
                        ? "border-burgundy-600 focus:border-burgundy-500 focus:ring-burgundy-500"
                        : "border-burgundy-800 focus:border-gold-500 focus:ring-gold-500"
                    }
                  `}
                  placeholder="you@example.com"
                />
                {requestForm.formState.errors.email && (
                  <p id="email-error" role="alert" className="text-sm text-burgundy-400">
                    {requestForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={requestForm.formState.isSubmitting}
                className="
                   mt-2 w-full rounded-lg py-2.5 font-semibold text-base
                   bg-burgundy-700 text-parchment-100
                   hover:bg-burgundy-600 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors shadow-glow-burgundy
                   focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-900
                 "
              >
                {requestForm.formState.isSubmitting
                  ? "Sending reset code…"
                  : "Send Reset Code"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={confirmForm.handleSubmit(handleConfirmSubmit)}
              noValidate
              className="space-y-4"
            >
              <p className="text-sm text-parchment-500">{requestHelpText}</p>

              {isRequestSuccessful && (
                <div
                  role="status"
                  className="rounded-lg border border-gold-800 bg-gold-950/20 px-4 py-3 text-sm text-gold-300"
                >
                  Reset code sent. Check your inbox and spam folder.
                </div>
              )}

              {confirmForm.formState.errors.root && (
                <div
                  role="alert"
                  className="rounded-lg border border-burgundy-700 bg-burgundy-950/40 px-4 py-3 text-sm text-burgundy-300"
                >
                  {confirmForm.formState.errors.root.message}
                </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="confirm-email"
                  className="block text-sm font-medium uppercase tracking-wider text-parchment-500"
                >
                  Email
                </label>
                <input
                  id="confirm-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!confirmForm.formState.errors.email}
                  aria-describedby={
                    confirmForm.formState.errors.email ? "confirm-email-error" : undefined
                  }
                  {...confirmForm.register("email")}
                  className={`
                    w-full rounded-lg border bg-slate-850 px-3 py-2.5
                    text-base text-parchment-200 placeholder-parchment-700
                    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 transition-colors
                    ${
                      confirmForm.formState.errors.email
                        ? "border-burgundy-600 focus:border-burgundy-500 focus:ring-burgundy-500"
                        : "border-burgundy-800 focus:border-gold-500 focus:ring-gold-500"
                    }
                  `}
                  placeholder="you@example.com"
                />
                {confirmForm.formState.errors.email && (
                  <p
                    id="confirm-email-error"
                    role="alert"
                    className="text-sm text-burgundy-400"
                  >
                    {confirmForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="code"
                  className="block text-sm font-medium uppercase tracking-wider text-parchment-500"
                >
                  Reset Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-invalid={!!confirmForm.formState.errors.code}
                  aria-describedby={confirmForm.formState.errors.code ? "code-error" : undefined}
                  {...confirmForm.register("code")}
                  className={`
                    w-full rounded-lg border bg-slate-850 px-3 py-2.5
                    text-center text-lg font-mono tracking-[0.5em]
                    text-parchment-200 placeholder-parchment-700
                    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 transition-colors
                    ${
                      confirmForm.formState.errors.code
                        ? "border-burgundy-600 focus:border-burgundy-500 focus:ring-burgundy-500"
                        : "border-burgundy-800 focus:border-gold-500 focus:ring-gold-500"
                    }
                  `}
                  placeholder="000000"
                />
                {confirmForm.formState.errors.code && (
                  <p id="code-error" role="alert" className="text-sm text-burgundy-400">
                    {confirmForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium uppercase tracking-wider text-parchment-500"
                >
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!confirmForm.formState.errors.password}
                  aria-describedby={
                    confirmForm.formState.errors.password ? "password-error" : "password-hint"
                  }
                  {...confirmForm.register("password")}
                  className={`
                    w-full rounded-lg border bg-slate-850 px-3 py-2.5
                    text-base text-parchment-200 placeholder-parchment-700
                    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 transition-colors
                    ${
                      confirmForm.formState.errors.password
                        ? "border-burgundy-600 focus:border-burgundy-500 focus:ring-burgundy-500"
                        : "border-burgundy-800 focus:border-gold-500 focus:ring-gold-500"
                    }
                  `}
                  placeholder="••••••••••••"
                />
                {confirmForm.formState.errors.password ? (
                  <p id="password-error" role="alert" className="text-sm text-burgundy-400">
                    {confirmForm.formState.errors.password.message}
                  </p>
                ) : (
                  <p id="password-hint" className="text-sm text-parchment-700">
                    12+ characters, upper &amp; lowercase, and a number
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium uppercase tracking-wider text-parchment-500"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!confirmForm.formState.errors.confirmPassword}
                  aria-describedby={
                    confirmForm.formState.errors.confirmPassword
                      ? "confirm-password-error"
                      : undefined
                  }
                  {...confirmForm.register("confirmPassword")}
                  className={`
                    w-full rounded-lg border bg-slate-850 px-3 py-2.5
                    text-base text-parchment-200 placeholder-parchment-700
                    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 transition-colors
                    ${
                      confirmForm.formState.errors.confirmPassword
                        ? "border-burgundy-600 focus:border-burgundy-500 focus:ring-burgundy-500"
                        : "border-burgundy-800 focus:border-gold-500 focus:ring-gold-500"
                    }
                  `}
                  placeholder="••••••••••••"
                />
                {confirmForm.formState.errors.confirmPassword && (
                  <p
                    id="confirm-password-error"
                    role="alert"
                    className="text-sm text-burgundy-400"
                  >
                    {confirmForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={confirmForm.formState.isSubmitting}
                className="
                   mt-2 w-full rounded-lg py-2.5 font-semibold text-base
                   bg-burgundy-700 text-parchment-100
                   hover:bg-burgundy-600 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors shadow-glow-burgundy
                   focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-900
                 "
              >
                {confirmForm.formState.isSubmitting
                  ? "Updating password…"
                  : "Update Password"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRequestSuccessful(false);
                  setStep("request");
                }}
                className="w-full text-sm text-parchment-600 transition-colors hover:text-parchment-400"
              >
                Need a new code?
              </button>
            </form>
          )}
        </div>

        <div className="space-y-1 text-center">
          <p className="text-sm text-parchment-600">
            Remembered it?{" "}
            <Link
              href="/auth/login"
              className="text-gold-500 hover:text-gold-400 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 rounded"
            >
              Sign in
            </Link>
          </p>
          {step === "confirm" && (
            <p className="text-sm text-parchment-700">
              Need to start over?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRequestSuccessful(false);
                  setStep("request");
                }}
                className="transition-colors hover:text-parchment-500"
              >
                Request another reset code
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-screen items-center justify-center bg-slate-950"
        >
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
          />
          <span className="sr-only">Loading…</span>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
