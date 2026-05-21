"use client";

/**
 * src/app/terms/page.tsx
 *
 * Terms of Service for Curses! Custom Character Builder.
 * Static legal page — no auth required.
 */

import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function TermsOfServicePage() {
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
            <Link
              href="/privacy"
              className="hover:text-[#b9baa3]/70 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/conduct"
              className="hover:text-[#b9baa3]/70 transition-colors"
            >
              Code of Conduct
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 pb-24">
        {/* Title */}
        <h1 className="font-serif text-4xl font-bold text-[#f7f7ff] mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-[#b9baa3]/50 mb-10">
          Last updated: April 5, 2026
        </p>

        <div className="space-y-10 text-[#b9baa3] leading-relaxed">
          {/* 1. Acceptance */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing or using{" "}
              <strong className="text-[#f7f7ff]">
                Curses! Custom Character Builder
              </strong>{" "}
              (&ldquo;CCB,&rdquo; &ldquo;the Service&rdquo;), available at{" "}
              <a
                href="https://ccb.curses.show"
                className="text-[#577399] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                ccb.curses.show
              </a>
              , you agree to be bound by these Terms of Service
              (&ldquo;Terms&rdquo;). If you do not agree, do not use the
              Service.
            </p>
            <p className="mt-3">
              CCB is operated by{" "}
              <strong className="text-[#f7f7ff]">Man in Jumpsuit</strong>{" "}
              (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;). We may
              update these Terms from time to time. Continued use after changes
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* 2. Eligibility */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              2. Eligibility
            </h2>
            <p>
              You must be at least{" "}
              <strong className="text-[#f7f7ff]">13 years of age</strong> to use
              CCB. By creating an account, you represent that you are at least
              13 years old. If you are under 18, you represent that your parent
              or legal guardian has reviewed and agrees to these Terms on your
              behalf.
            </p>
            <p className="mt-3">
              We do not knowingly collect personal information from children
              under 13. If we learn that a user is under 13, we will promptly
              delete their account and associated data.
            </p>
          </section>

          {/* 3. Description of the Service */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              3. Description of the Service
            </h2>
            <p>
              CCB is a free web application for creating, managing, and sharing
              character sheets for the Daggerheart tabletop role-playing game.
              The Service allows you to:
            </p>
            <ul className="mt-3 ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>Create and edit Daggerheart character sheets</li>
              <li>Upload character portrait images</li>
              <li>Share character sheets via public URLs</li>
              <li>
                Participate in campaigns with other users (Patreon-linked
                feature)
              </li>
              <li>Access additional features by linking a Patreon account</li>
            </ul>
            <p className="mt-3">
              <strong className="text-[#f7f7ff]">Free tier</strong> users may
              create up to 5 level-1 characters. Additional features &mdash;
              including unlimited characters, leveling beyond level 1, campaign
              access, and custom dice colors &mdash; are available through free
              or paid Patreon membership tiers.
            </p>
          </section>

          {/* 4. Fan-Made Tool Disclaimer */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              4. Daggerheart Intellectual Property
            </h2>
            <p>
              <strong className="text-[#f7f7ff]">
                CCB is a fan-made, community tool. It is not produced by,
                endorsed by, supported by, or affiliated with Darrington Press,
                Critical Role, or any official Daggerheart entity.
              </strong>
            </p>
            <p className="mt-3">
              &ldquo;Daggerheart&rdquo; and related terms are trademarks of
              Darrington Press, LLC. CCB uses game mechanics and reference data
              from the Daggerheart System Reference Document (SRD), which is
              made available under its open license terms. Our use of SRD
              content does not imply any official relationship with Darrington
              Press.
            </p>
            <p className="mt-3">
              If you believe any content on CCB infringes your intellectual
              property rights, please contact us at the address listed below.
            </p>
          </section>

          {/* 5. User Accounts */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              5. User Accounts
            </h2>
            <p>
              To use CCB, you must create an account using an email address and
              password or by signing in with Google. You are responsible for:
            </p>
            <ul className="mt-3 ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Providing accurate information during registration</li>
              <li>
                Notifying us promptly if you suspect unauthorized access to your
                account
              </li>
            </ul>
            <p className="mt-3">
              You may optionally link a Patreon account to access additional
              features. Linking is voluntary and can be removed at any time.
            </p>
          </section>

          {/* 6. User-Generated Content */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              6. User-Generated Content
            </h2>
            <p>
              You retain ownership of the original creative content you create
              through CCB, including character names, backstories, homebrew
              content, and uploaded images (&ldquo;User Content&rdquo;). By
              using the Service, you grant us a limited, non-exclusive,
              royalty-free license to store, display, and transmit your User
              Content solely for the purpose of operating the Service &mdash;
              for example, rendering your character sheet or displaying a shared
              public page.
            </p>
            <p className="mt-3">
              This license ends when you delete your content or your account,
              except where your content has been shared with other users (e.g.,
              within a campaign) and those copies are retained by the receiving
              users.
            </p>
            <p className="mt-3">
              Game mechanics, stats, class data, and other elements derived from
              the Daggerheart SRD are not owned by you or by us &mdash; they
              remain subject to the SRD&rsquo;s open license terms.
            </p>
          </section>

          {/* 7. Acceptable Use */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              7. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="mt-3 ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>
                Use CCB for any unlawful purpose or in violation of any
                applicable laws
              </li>
              <li>
                Upload, share, or display content that is hateful, harassing,
                threatening, sexually explicit, or exploitative &mdash;
                including any content involving minors
              </li>
              <li>
                Impersonate any person or entity, or misrepresent your
                affiliation with any person or entity
              </li>
              <li>
                Attempt to gain unauthorized access to other users&rsquo;
                accounts, data, or any part of our infrastructure
              </li>
              <li>
                Use automated scripts, bots, scrapers, or similar tools to
                access or interact with the Service without our prior written
                permission
              </li>
              <li>
                Interfere with or disrupt the Service, servers, or networks
                connected to the Service
              </li>
              <li>
                Reverse-engineer, decompile, or disassemble any part of the
                Service
              </li>
              <li>
                Resell, redistribute, or commercially exploit the Service or any
                data obtained from it
              </li>
              <li>
                Upload content that infringes on the intellectual property
                rights of others
              </li>
            </ul>
          </section>

          {/* 8. Content Moderation */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              8. Content Moderation and Removal
            </h2>
            <p>
              We reserve the right &mdash; but are not obligated &mdash; to
              review, edit, or remove any User Content that violates these Terms
              or our{" "}
              <Link href="/conduct" className="text-[#577399] hover:underline">
                Code of Conduct
              </Link>
              . We are not responsible for monitoring all content on the
              Service, and we do not endorse any User Content.
            </p>
          </section>

          {/* 9. Patreon Integration */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              9. Patreon Integration
            </h2>
            <p>
              Certain features are available through Patreon membership tiers.
              Patreon is a third-party service operated by Patreon, Inc. Your
              Patreon membership is governed by Patreon&rsquo;s own terms and
              policies. We are not responsible for Patreon&rsquo;s service,
              billing, or data practices.
            </p>
            <p className="mt-3">
              If you cancel your Patreon membership, you will retain access to
              free-tier features. Characters and campaigns you created while
              subscribed will not be deleted, but certain features (such as
              campaign management and advanced leveling) may become read-only or
              inaccessible until membership is restored.
            </p>
          </section>

          {/* 10. Account Termination */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              10. Account Termination
            </h2>
            <p>
              <strong className="text-[#f7f7ff]">By you:</strong> You may delete
              your account at any time through your account settings. Deleting
              your account will permanently remove your profile, characters,
              campaigns, and uploaded images from our systems.
            </p>
            <p className="mt-3">
              <strong className="text-[#f7f7ff]">By us:</strong> We may suspend
              or terminate your account at our discretion if you violate these
              Terms, our Code of Conduct, or if we reasonably believe your use
              of the Service poses a risk to other users or the platform&rsquo;s
              integrity. We will make reasonable efforts to notify you, but are
              not required to do so in cases of serious misconduct.
            </p>
          </section>

          {/* 11. Disclaimer of Warranties */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              11. Disclaimer of Warranties
            </h2>
            <p>
              CCB is provided{" "}
              <strong className="text-[#f7f7ff]">&ldquo;as is&rdquo;</strong>{" "}
              and{" "}
              <strong className="text-[#f7f7ff]">
                &ldquo;as available&rdquo;
              </strong>{" "}
              without warranties of any kind, whether express or implied. We do
              not guarantee that the Service will be uninterrupted, error-free,
              secure, or free of harmful components.
            </p>
            <p className="mt-3">
              We make no warranty regarding the accuracy or completeness of any
              Daggerheart game data presented through the Service. For
              authoritative rules, consult the official Daggerheart publications
              from Darrington Press.
            </p>
          </section>

          {/* 12. Limitation of Liability */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              12. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Man in Jumpsuit, its
              owners, operators, and contributors shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages
              arising from your use of or inability to use the Service,
              including but not limited to loss of data, loss of goodwill, or
              service interruption.
            </p>
            <p className="mt-3">
              Our total liability for any claim arising from these Terms or your
              use of the Service shall not exceed the amount you paid to us in
              the twelve (12) months preceding the claim. Since CCB is a free
              service, this amount may be zero.
            </p>
          </section>

          {/* 13. Indemnification */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              13. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless Man in Jumpsuit from any
              claims, damages, losses, or expenses (including reasonable
              attorney fees) arising from your use of the Service, your User
              Content, or your violation of these Terms.
            </p>
          </section>

          {/* 14. Governing Law */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              14. Governing Law and Disputes
            </h2>
            <p>
              These Terms are governed by the laws of the United States. Any
              disputes arising under these Terms shall be resolved through
              good-faith negotiation. If negotiation fails, disputes shall be
              resolved through binding arbitration administered in accordance
              with the rules of the American Arbitration Association, except
              that either party may seek injunctive relief in a court of
              competent jurisdiction.
            </p>
            <p className="mt-3">
              You agree that any claim must be brought individually and not as
              part of a class action or representative proceeding.
            </p>
          </section>

          {/* 15. Changes to the Service */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              15. Changes to the Service
            </h2>
            <p>
              We may modify, suspend, or discontinue any part of the Service at
              any time, with or without notice. We are not liable for any
              modification, suspension, or discontinuation of the Service. We
              are a small, independent project and cannot guarantee indefinite
              availability.
            </p>
          </section>

          {/* 16. Third-Party Services */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              16. Third-Party Services
            </h2>
            <p>
              CCB relies on third-party services including Amazon Web Services
              (AWS), Google OAuth, and Patreon. We are not responsible for the
              availability, security, or practices of these third-party
              services. Your use of third-party sign-in methods is subject to
              those providers&rsquo; respective terms and privacy policies.
            </p>
          </section>

          {/* 17. Severability */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              17. Severability
            </h2>
            <p>
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision shall be modified to the minimum extent
              necessary to make it enforceable, or severed if modification is
              not possible. The remaining provisions shall remain in full force
              and effect.
            </p>
          </section>

          {/* 18. Contact */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              18. Contact Us
            </h2>
            <p>
              If you have questions about these Terms, please reach out through
              our community Discord or website:
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
