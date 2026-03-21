"use client";

// src/app/help/page.tsx
// Help page — explains the single-user lock and how to reset it.

import React, { useState } from "react";
import AuthGate from "@/components/AuthGate";
import Nav from "@/components/Nav";

const REGISTERED_SUB_KEY = "cms_registered_sub";

export default function HelpPage() {
  const [reset, setReset] = useState(false);

  function handleReset() {
    localStorage.removeItem(REGISTERED_SUB_KEY);
    setReset(true);
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-brand-bg">
        <Nav />
        <main className="max-w-2xl mx-auto px-6 py-8">
          <h1 className="text-brand-light text-2xl font-bold mb-1">Help</h1>
          <p className="text-brand-muted text-sm mb-8">
            Reference for CMS access and account management.
          </p>

          <section className="bg-[#111a16] border border-brand-muted/20 rounded-lg p-6 mb-6">
            <h2 className="text-brand-light font-semibold text-lg mb-3">
              Single-user access lock
            </h2>
            <p className="text-brand-muted text-sm mb-3">
              The CMS allows only one Google account at a time. The first account
              to sign in is registered as the sole authorized user. Any other
              Google account is rejected until the lock is reset.
            </p>
            <p className="text-brand-muted text-sm">
              The lock is stored in your browser&apos;s local storage under the key{" "}
              <code className="text-brand-blue bg-brand-blue/10 px-1 rounded">
                cms_registered_sub
              </code>
              . Signing out does not clear it — you must reset it explicitly.
            </p>
          </section>

          <section className="bg-[#111a16] border border-brand-muted/20 rounded-lg p-6 mb-6">
            <h2 className="text-brand-light font-semibold text-lg mb-3">
              How to transfer access to a different account
            </h2>
            <ol className="text-brand-muted text-sm space-y-2 list-decimal list-inside mb-4">
              <li>Sign out using the button in the top navigation.</li>
              <li>
                Reset the user lock using the button below, or manually:{" "}
                open DevTools (F12) &rarr; Application &rarr; Local Storage &rarr;
                delete the{" "}
                <code className="text-brand-blue bg-brand-blue/10 px-1 rounded">
                  cms_registered_sub
                </code>{" "}
                entry.
              </li>
              <li>Sign in again with the new Google account.</li>
            </ol>
            {reset ? (
              <p className="text-brand-green text-sm font-medium">
                Lock cleared. The next sign-in will register a new authorized user.
              </p>
            ) : (
              <p className="text-brand-muted text-sm font-medium">
                Lock cleared. The next sign-in will register a new authorized user.
              </p>
            )}
          </section>
        </main>
      </div>
    </AuthGate>
  );
}
