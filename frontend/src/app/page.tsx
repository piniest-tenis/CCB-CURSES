"use client";

/**
 * src/app/page.tsx
 *
 * Root route — redirects to /dashboard.
 * The dashboard itself redirects unauthenticated users to /auth/login.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
    </div>
  );
}
