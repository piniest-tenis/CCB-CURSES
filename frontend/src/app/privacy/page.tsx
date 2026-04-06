"use client";

/**
 * src/app/privacy/page.tsx
 *
 * Privacy Policy for Curses! Custom Character Builder.
 * Static legal page — no auth required.
 */

import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a100d]">
      {/* Header bar */}
      <header
        className="border-b border-slate-800/60 sticky top-0 z-10 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(10,16,13,0.92)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#577399] hover:text-[#577399]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
          >
            &larr; Back to Dashboard
          </Link>
          <nav className="flex gap-4 text-xs text-[#b9baa3]/40">
            <Link href="/terms" className="hover:text-[#b9baa3]/70 transition-colors">
              Terms
            </Link>
            <Link href="/conduct" className="hover:text-[#b9baa3]/70 transition-colors">
              Code of Conduct
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 pb-24">
        {/* Title */}
        <h1 className="font-serif text-4xl font-bold text-[#f7f7ff] mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-[#b9baa3]/50 mb-10">
          Last updated: April 5, 2026
        </p>

        <div className="space-y-10 text-[#b9baa3] leading-relaxed">
          {/* Intro */}
          <section>
            <p>
              This Privacy Policy explains how <strong className="text-[#f7f7ff]">Man in Jumpsuit
              Productions</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) collects,
              uses, stores, and protects your information when you use{" "}
              <strong className="text-[#f7f7ff]">Curses! Custom Character Builder</strong> (&ldquo;CCB,&rdquo;
              &ldquo;the Service&rdquo;), available at{" "}
              <a
                href="https://curses-ccb.maninjumpsuit.com"
                className="text-[#577399] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                curses-ccb.maninjumpsuit.com
              </a>
              .
            </p>
            <p className="mt-3">
              We believe in transparency and simplicity. We collect only what we need to run the
              Service, we never sell your data, and we give you control over your information.
            </p>
          </section>

          {/* 1. What We Collect */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              1. Information We Collect
            </h2>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              1.1 Information You Provide
            </h3>
            <ul className="ml-6 space-y-2 list-disc marker:text-[#577399]/50">
              <li>
                <strong className="text-[#f7f7ff]">Account information:</strong> When you register,
                we collect your email address and a display name. If you sign in with Google, we
                receive your email address and name from Google.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Character data:</strong> Character names,
                stats, equipment, backstories, class and subclass selections, and other information
                you enter while building characters.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Campaign data:</strong> Campaign names,
                descriptions, session schedules, and associated character assignments.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Uploaded images:</strong> Character portraits
                and avatar images you upload.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Preferences:</strong> Display settings such as
                custom dice colors.
              </li>
            </ul>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              1.2 Information from Third Parties
            </h3>
            <ul className="ml-6 space-y-2 list-disc marker:text-[#577399]/50">
              <li>
                <strong className="text-[#f7f7ff]">Google OAuth:</strong> If you choose to sign in
                with Google, we receive your name and email address. We do not receive your Google
                password.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Patreon:</strong> If you choose to link your
                Patreon account, we receive your Patreon user ID and current membership tier status.
                We use this solely to determine which features to unlock. We do not receive your
                Patreon payment details.
              </li>
            </ul>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              1.3 Information Collected Automatically
            </h3>
            <ul className="ml-6 space-y-2 list-disc marker:text-[#577399]/50">
              <li>
                <strong className="text-[#f7f7ff]">Authentication tokens:</strong> When you sign
                in, secure tokens are stored in your browser to keep you logged in. These are
                functional &mdash; not tracking cookies.
              </li>
            </ul>
            <p className="mt-3">
              <strong className="text-[#f7f7ff]">We do not use analytics cookies, advertising
              trackers, or any third-party tracking scripts.</strong> We do not serve advertisements.
            </p>
          </section>

          {/* 2. How We Use Your Information */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              2. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="mt-3 ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>Create and manage your account</li>
              <li>Store and display your characters and campaigns</li>
              <li>Render public character sheet pages when you choose to share them</li>
              <li>Determine your Patreon membership tier for feature access</li>
              <li>Display your uploaded images within the Service</li>
              <li>Communicate with you about your account if necessary (e.g., security issues)</li>
            </ul>
            <p className="mt-3">
              We do not use your data for advertising, profiling, automated decision-making, or any
              purpose unrelated to operating the Service.
            </p>
          </section>

          {/* 3. How We Store and Protect Your Data */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              3. How We Store and Protect Your Data
            </h2>
            <p>Your data is stored using Amazon Web Services (AWS) infrastructure:</p>
            <ul className="mt-3 ml-6 space-y-2 list-disc marker:text-[#577399]/50">
              <li>
                <strong className="text-[#f7f7ff]">Authentication:</strong> Managed by{" "}
                <strong className="text-[#f7f7ff]">AWS Cognito</strong>, which handles secure
                password hashing, token issuance, and login flows. We never store your password
                in plain text.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Character and campaign data:</strong> Stored in{" "}
                <strong className="text-[#f7f7ff]">AWS DynamoDB</strong>, a managed database
                service with encryption at rest.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Uploaded images:</strong> Stored in{" "}
                <strong className="text-[#f7f7ff]">AWS S3</strong> with encryption at rest. Images
                are served through <strong className="text-[#f7f7ff]">AWS CloudFront</strong> (a
                content delivery network) for performance.
              </li>
            </ul>
            <p className="mt-3">
              All data is stored in the <strong className="text-[#f7f7ff]">United States
              (us-east-2 region)</strong>. Data is transmitted over HTTPS (TLS encryption) between
              your browser and our servers.
            </p>
            <p className="mt-3">
              While we take reasonable measures to protect your data, no system is 100% secure. We
              cannot guarantee absolute security.
            </p>
          </section>

          {/* 4. Data Sharing */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              4. Who We Share Data With
            </h2>
            <p className="font-semibold text-[#f7f7ff]">
              We do not sell, rent, or trade your personal information to anyone.
            </p>
            <p className="mt-3">We share data only in these limited circumstances:</p>
            <ul className="mt-3 ml-6 space-y-2 list-disc marker:text-[#577399]/50">
              <li>
                <strong className="text-[#f7f7ff]">Infrastructure providers:</strong> AWS processes
                your data as part of hosting the Service. AWS acts as a data processor on our behalf
                under their standard terms of service.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Public sharing:</strong> If you share a character
                sheet via a public URL, the character data on that page is visible to anyone with the
                link. This is an opt-in action you control.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Campaign members:</strong> If you join a
                campaign, other members of that campaign can see your character data associated with
                the campaign.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Legal requirements:</strong> We may disclose data
                if required by law, regulation, or valid legal process.
              </li>
            </ul>
          </section>

          {/* 5. Cookies and Tokens */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              5. Cookies and Local Storage
            </h2>
            <p>
              CCB uses <strong className="text-[#f7f7ff]">authentication tokens</strong> stored in
              your browser&rsquo;s local storage to maintain your login session. These are strictly
              necessary for the Service to function and are not used for tracking or analytics.
            </p>
            <p className="mt-3">
              We do not use third-party cookies, advertising cookies, or social media tracking
              pixels. There is no cookie consent banner because we do not use optional cookies.
            </p>
          </section>

          {/* 6. Your Rights and Choices */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              6. Your Rights and Choices
            </h2>
            <p>You have the right to:</p>
            <ul className="mt-3 ml-6 space-y-2 list-disc marker:text-[#577399]/50">
              <li>
                <strong className="text-[#f7f7ff]">Access your data:</strong> You can view all
                character, campaign, and profile data through the Service&rsquo;s interface at any
                time.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Correct your data:</strong> You can edit your
                display name, character information, and other data directly in the app.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Delete your data:</strong> You can delete
                individual characters or campaigns, or delete your entire account. Account deletion
                permanently removes all of your data from our systems, including all characters,
                campaigns, and uploaded images.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Unlink third-party accounts:</strong> You can
                disconnect your Patreon account at any time through your profile settings.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Request a copy of your data:</strong> Contact us
                through Discord or our website to request a copy of the personal data we hold about
                you.
              </li>
            </ul>
            <p className="mt-3">
              We honor these rights regardless of your location. You do not need to be in a specific
              jurisdiction to exercise them.
            </p>
          </section>

          {/* 7. Data Retention */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              7. Data Retention
            </h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account,
              we delete all associated data (profile, characters, campaigns, images) from our
              production systems. Some data may persist in encrypted backups for a limited period
              (typically up to 30 days) before being automatically purged.
            </p>
            <p className="mt-3">
              If your account is inactive for an extended period, we may contact you before taking
              any action on your account. We will not delete inactive accounts without notice.
            </p>
          </section>

          {/* 8. Children's Privacy */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              8. Children&rsquo;s Privacy (COPPA)
            </h2>
            <p>
              CCB is not intended for children under 13 years of age. We do not knowingly collect
              personal information from children under 13. If you are a parent or guardian and
              believe your child under 13 has provided us with personal information, please contact
              us immediately and we will delete the account and associated data.
            </p>
            <p className="mt-3">
              Users between 13 and 18 may use the Service with the consent of a parent or legal
              guardian.
            </p>
          </section>

          {/* 9. International Users */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              9. International Users
            </h2>
            <p>
              CCB is hosted in the United States. If you access the Service from outside the United
              States, your data will be transferred to and stored in the US. By using the Service,
              you consent to this transfer.
            </p>
            <p className="mt-3">
              While we are not subject to the EU General Data Protection Regulation (GDPR), we
              follow GDPR-inspired practices as a matter of principle: we minimize data collection,
              provide access and deletion rights, and are transparent about how data is handled.
            </p>
          </section>

          {/* 10. Changes */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we
              will update the &ldquo;Last updated&rdquo; date at the top of this page. We encourage
              you to review this page periodically. Continued use of the Service after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 11. Contact */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              11. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy or want to exercise your data rights,
              you can reach us through:
            </p>
            <ul className="mt-3 ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>
                Discord:{" "}
                <a
                  href="https://discord.gg/KBqDAS4Tbv"
                  className="text-[#577399] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  discord.gg/KBqDAS4Tbv
                </a>
              </li>
              <li>
                Website:{" "}
                <a
                  href="https://maninjumpsuit.com"
                  className="text-[#577399] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  maninjumpsuit.com
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
