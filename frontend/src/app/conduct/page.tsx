"use client";

/**
 * src/app/conduct/page.tsx
 *
 * Community Code of Conduct for Curses! Custom Character Builder.
 * Static legal page — no auth required.
 */

import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function CodeOfConductPage() {
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
            <Link href="/privacy" className="hover:text-[#b9baa3]/70 transition-colors">
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 pb-24">
        {/* Title */}
        <h1 className="font-serif text-4xl font-bold text-[#f7f7ff] mb-2">
          Community Code of Conduct
        </h1>
        <p className="text-sm text-[#b9baa3]/50 mb-10">
          Last updated: April 5, 2026
        </p>

        <div className="space-y-10 text-[#b9baa3] leading-relaxed">
          {/* Preamble */}
          <section>
            <p>
              <strong className="text-[#f7f7ff]">Curses! Custom Character Builder</strong> (CCB) is a
              community-driven tool for Daggerheart players. We want every person who uses
              CCB &mdash; regardless of their background, identity, or experience level &mdash; to
              feel welcome, safe, and respected.
            </p>
            <p className="mt-3">
              This Code of Conduct applies to all content you create, share, or upload through CCB,
              including character names, backstories, portraits, campaign interactions, and any
              publicly shared character sheets.
            </p>
          </section>

          {/* 1. Our Standards */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              1. Our Standards
            </h2>
            <p>We expect all users to:</p>
            <ul className="mt-3 ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>
                <strong className="text-[#f7f7ff]">Be respectful.</strong> Treat other users with
                kindness and consideration, even when you disagree.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Be inclusive.</strong> Welcome people of all
                backgrounds, identities, experience levels, and playstyles.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Be constructive.</strong> Offer helpful feedback
                and engage in good faith.
              </li>
              <li>
                <strong className="text-[#f7f7ff]">Be thoughtful about shared content.</strong>{" "}
                Remember that publicly shared character sheets and campaign content are visible to
                others, including younger players.
              </li>
            </ul>
          </section>

          {/* 2. Unacceptable Behavior */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              2. Unacceptable Behavior
            </h2>
            <p>The following behaviors are not tolerated on CCB:</p>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              2.1 Hate Speech and Discrimination
            </h3>
            <p>
              Content or behavior that attacks, demeans, or promotes hatred against individuals or
              groups based on race, ethnicity, nationality, religion, gender, gender identity, sexual
              orientation, disability, age, or any other protected characteristic. This includes
              slurs, stereotypes, and dehumanizing language in character names, backstories, or
              uploaded images.
            </p>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              2.2 Harassment and Threats
            </h3>
            <p>
              Targeted harassment, bullying, intimidation, stalking, or threats of violence against
              any user. This includes using campaign features to harass other players, creating
              characters intended to mock or target specific real people, or sending unwanted
              messages through campaign tools.
            </p>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              2.3 Exploitation and Harm to Minors
            </h3>
            <p>
              <strong className="text-[#f7f7ff]">Absolutely no content</strong> that sexualizes,
              exploits, or endangers minors in any way. This is a zero-tolerance policy that
              results in immediate and permanent account termination, and may be reported to
              relevant authorities.
            </p>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              2.4 Inappropriate Content
            </h3>
            <ul className="ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>
                Sexually explicit, pornographic, or gratuitously violent images uploaded as
                character portraits or avatars
              </li>
              <li>
                Character names or backstories that are primarily designed to be offensive, shocking,
                or to circumvent content standards
              </li>
              <li>
                Content that promotes illegal activities, self-harm, or substance abuse
              </li>
            </ul>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              2.5 Spam and Abuse
            </h3>
            <ul className="ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>
                Creating accounts or characters for the purpose of spamming, phishing, or
                distributing malware
              </li>
              <li>
                Attempting to exploit, disrupt, or overload the Service
              </li>
              <li>
                Using the Service to advertise products, services, or other platforms without
                permission
              </li>
            </ul>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              2.6 Intellectual Property Violations
            </h3>
            <p>
              Uploading images you do not have the right to use, or creating content that infringes
              on copyrights, trademarks, or other intellectual property rights of others.
            </p>
          </section>

          {/* 3. Content Guidelines */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              3. Content Guidelines
            </h2>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              3.1 Character Names
            </h3>
            <p>
              Character names should be appropriate for a community that includes players of all ages
              (13+). Names that are slurs, overtly sexual, or clearly designed to offend will be
              removed.
            </p>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              3.2 Uploaded Images
            </h3>
            <p>
              Portrait and avatar images should depict characters in a manner appropriate for a
              general audience. Fantasy violence consistent with the genre is acceptable; explicit
              gore, nudity, and real-world violence are not.
            </p>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              3.3 Homebrew Content
            </h3>
            <p>
              You are encouraged to create and share homebrew content. When doing so:
            </p>
            <ul className="mt-2 ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>Respect the intellectual property of other creators</li>
              <li>Credit original authors when adapting or building on others&rsquo; work</li>
              <li>Follow all other content guidelines in this Code of Conduct</li>
            </ul>

            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] mt-5 mb-2">
              3.4 Campaign Interactions
            </h3>
            <p>
              When participating in campaigns with other players, be mindful that your actions
              affect their experience. Collaborate in good faith, respect your fellow players and
              Game Master, and address conflicts constructively.
            </p>
          </section>

          {/* 4. Reporting */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              4. Reporting Violations
            </h2>
            <p>
              If you encounter content or behavior that violates this Code of Conduct, please report
              it through our Discord server:
            </p>
            <div className="mt-4 rounded-xl border border-[#577399]/30 bg-[#577399]/5 px-5 py-4">
              <p className="text-[#f7f7ff] font-semibold mb-1">Report on Discord</p>
              <a
                href="https://discord.gg/KBqDAS4Tbv"
                className="text-[#577399] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                discord.gg/KBqDAS4Tbv
              </a>
              <p className="text-sm text-[#b9baa3]/50 mt-2">
                Use the designated reporting channel or contact a moderator directly.
              </p>
            </div>
            <p className="mt-4">When reporting, please include:</p>
            <ul className="mt-2 ml-6 space-y-1.5 list-disc marker:text-[#577399]/50">
              <li>A description of the violation</li>
              <li>The username or character name involved (if applicable)</li>
              <li>Screenshots or links to the offending content (if possible)</li>
              <li>Any additional context that may help us investigate</li>
            </ul>
            <p className="mt-3">
              All reports are reviewed by the CCB team. We take reports seriously and will handle them
              as promptly as we can. Reports are kept confidential to the extent possible.
            </p>
          </section>

          {/* 5. Enforcement */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              5. Enforcement and Consequences
            </h2>
            <p>
              Violations of this Code of Conduct will be addressed based on the severity and
              frequency of the offense. Consequences are applied at the sole discretion of the CCB
              team and may include:
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 p-4">
                <h3 className="font-serif text-base font-semibold text-[#f7f7ff] mb-1">
                  Level 1 &mdash; Warning
                </h3>
                <p className="text-sm">
                  A private notice explaining the violation and requesting that you correct the
                  behavior or remove the offending content. Applicable to first-time or minor
                  infractions.
                </p>
              </div>

              <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 p-4">
                <h3 className="font-serif text-base font-semibold text-[#f7f7ff] mb-1">
                  Level 2 &mdash; Content Removal
                </h3>
                <p className="text-sm">
                  Offending content (character names, images, backstories) will be removed or
                  hidden. You will be notified of what was removed and why.
                </p>
              </div>

              <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 p-4">
                <h3 className="font-serif text-base font-semibold text-[#f7f7ff] mb-1">
                  Level 3 &mdash; Temporary Suspension
                </h3>
                <p className="text-sm">
                  Your account will be temporarily suspended for a set period. During suspension,
                  you will not be able to log in or access the Service. Applicable to repeated
                  violations or moderately serious offenses.
                </p>
              </div>

              <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 p-4">
                <h3 className="font-serif text-base font-semibold text-[#f7f7ff] mb-1">
                  Level 4 &mdash; Permanent Ban
                </h3>
                <p className="text-sm">
                  Your account will be permanently terminated and all associated data deleted.
                  Applicable to severe violations, including exploitation of minors, credible
                  threats of violence, and persistent harassment after prior warnings.
                </p>
              </div>
            </div>

            <p className="mt-4">
              <strong className="text-[#f7f7ff]">We reserve the right to skip levels</strong> for
              serious offenses. Content that exploits or endangers minors will result in immediate
              permanent bans without prior warning.
            </p>
          </section>

          {/* 6. Appeals */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              6. Appeals
            </h2>
            <p>
              If you believe an enforcement action was taken in error, you may appeal by contacting
              us through Discord within 30 days of the action. Please provide your username and a
              clear explanation of why you believe the action was unwarranted. Appeals are reviewed
              by the CCB team and decisions are final.
            </p>
          </section>

          {/* 7. Community Spirit */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              7. In the Spirit of the Game
            </h2>
            <p>
              Daggerheart is a game about collaboration, creativity, and shared storytelling. CCB
              exists to support that experience. We believe the best communities are built on mutual
              respect, generosity, and a willingness to make space for everyone at the table.
            </p>
            <p className="mt-3">
              Be the kind of player you&rsquo;d want in your party. Welcome newcomers. Share your
              creativity. Lift each other up. The adventure is better when everyone feels they
              belong.
            </p>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff] mb-3">
              8. Contact
            </h2>
            <p>
              Questions about this Code of Conduct? Reach out to us:
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
