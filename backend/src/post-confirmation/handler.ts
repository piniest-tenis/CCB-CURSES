// backend/src/post-confirmation/handler.ts
// Cognito Post-Confirmation Lambda trigger.
//
// Fires once after a user successfully verifies their email address
// (triggerSource === "PostConfirmation_ConfirmSignUp").
//
// Sends a welcome email via SES that explains what the app is and how to
// get started building a first character.
//
// Required env vars:
//   SES_FROM_ADDRESS  — verified SES sender, e.g. "noreply@curses-ccb.maninjumpsuit.com"
//   APP_BASE_URL      — e.g. "https://curses-ccb.maninjumpsuit.com"

import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env["AWS_REGION"] ?? "us-east-1" });

const FROM = process.env["SES_FROM_ADDRESS"] ?? "noreply@curses-ccb.maninjumpsuit.com";
const APP_URL = (process.env["APP_BASE_URL"] ?? "https://curses-ccb.maninjumpsuit.com").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Email copy
// ---------------------------------------------------------------------------

function buildSubject(): string {
  return "Welcome to Curses! Custom Character Builder";
}

function buildTextBody(email: string): string {
  return `
Hey there, adventurer!

You've successfully verified ${email} — your Curses! CCB account is now active.

Here's what you can do:

CAMPAIGNS
A Campaign is a shared game-session space. A Game Master creates a Campaign, then
invites players by sharing a link. Once you join, everyone in the Campaign can see
each other's characters and the GM can manage the session.

  → ${APP_URL}/dashboard

HOW TO BUILD YOUR FIRST CHARACTER
1. Go to your Dashboard (link above)
2. Click "New Character"
3. Choose your Ancestry, Class, and Subclass
4. Assign your Hope, Agility, Strength, Finesse, Instinct, Presence, and Knowledge
5. Name your character and save — you're ready to play!

If you have questions, reach out on our Discord or open an issue on GitHub.

— The Curses! CCB Team
`.trim();
}

function buildHtmlBody(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Curses! CCB</title>
  <style>
    body { margin: 0; padding: 0; background: #0f0e17; font-family: 'Segoe UI', system-ui, sans-serif; color: #fffffe; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #1a1828; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6b2fa0 0%, #3d1a6e 100%); padding: 40px 40px 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; color: #fffffe; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 14px; color: #c9b8e8; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
    .intro { font-size: 15px; color: #c9b8e8; margin: 0 0 32px; }
    .section { margin: 0 0 28px; }
    .section-title { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #9b72cf; margin: 0 0 12px; }
    .section p { font-size: 14px; color: #c9b8e8; margin: 0 0 12px; line-height: 1.6; }
    .steps { list-style: none; margin: 0; padding: 0; }
    .steps li { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: #c9b8e8; margin: 0 0 10px; line-height: 1.5; }
    .step-num { flex-shrink: 0; width: 24px; height: 24px; background: #6b2fa0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fffffe; }
    .cta { text-align: center; margin: 36px 0 0; }
    .cta a { display: inline-block; background: #6b2fa0; color: #fffffe; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; }
    .footer { border-top: 1px solid #2a2640; padding: 24px 40px; text-align: center; font-size: 12px; color: #6b6590; }
    .footer a { color: #9b72cf; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Curses! Custom Character Builder</h1>
      <p>Your account is ready</p>
    </div>
    <div class="body">
      <p class="greeting">Hey there, adventurer!</p>
      <p class="intro">
        You've verified <strong>${email}</strong> — you're all set to start building characters for Daggerheart.
      </p>

      <div class="section">
        <div class="section-title">Campaigns</div>
        <p>
          A <strong>Campaign</strong> is a shared game-session space. Your Game Master creates
          a Campaign and shares an invite link with the party. Once everyone joins, the GM can
          manage the session and players can access each other's characters at the table.
        </p>
        <p>
          To join a Campaign, ask your GM for the invite link — or create your own if you're
          running the game.
        </p>
      </div>

      <div class="section">
        <div class="section-title">Build Your First Character</div>
        <ol class="steps">
          <li><span class="step-num">1</span> Go to your Dashboard</li>
          <li><span class="step-num">2</span> Click <strong>New Character</strong></li>
          <li><span class="step-num">3</span> Choose your Ancestry, Class, and Subclass</li>
          <li><span class="step-num">4</span> Assign your Hope, Agility, Strength, Finesse, Instinct, Presence, and Knowledge</li>
          <li><span class="step-num">5</span> Name your character and save — you're ready to play!</li>
        </ol>
      </div>

      <div class="cta">
        <a href="${APP_URL}/dashboard">Go to Dashboard &rarr;</a>
      </div>
    </div>
    <div class="footer">
      You received this email because you created an account at
      <a href="${APP_URL}">curses-ccb.maninjumpsuit.com</a>.<br />
      If you didn't sign up, you can safely ignore this message.
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: PostConfirmationTriggerHandler = async (event) => {
  // Only send the welcome email for email-verification confirmations,
  // not for admin-created users or other trigger sources.
  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") {
    return event;
  }

  const email = event.request.userAttributes["email"];
  if (!email) {
    console.warn("PostConfirmation: no email in userAttributes, skipping welcome email");
    return event;
  }

  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: buildSubject(), Charset: "UTF-8" },
          Body: {
            Text: { Data: buildTextBody(email), Charset: "UTF-8" },
            Html: { Data: buildHtmlBody(email), Charset: "UTF-8" },
          },
        },
      })
    );
    console.log(`PostConfirmation: welcome email sent to ${email}`);
  } catch (err) {
    // Log but do NOT re-throw — a failed welcome email must never block
    // the user from completing sign-up.
    console.error("PostConfirmation: failed to send welcome email", err);
  }

  // Always return the event unchanged so Cognito proceeds normally.
  return event;
};
