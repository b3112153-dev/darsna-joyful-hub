import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "Terms of Use & Privacy Policy – Darsna Jo";
const DESC = "Terms of Use and Privacy Policy for Darsna Jo, the study community for Jordanian Tawjihi students.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

const SECTIONS: [string, string][] = [
  ["About the platform", "Darsna Jo is a study-community platform for Jordanian Tawjihi students (Classes of 2009 and 2010). It offers chat rooms, a study timer, study tools, a library and an avatar system."],
  ["Eligibility and accounts", "You must provide accurate information (gender and date of birth) when you register. Gender and generation cannot be changed after registration. If you are under 18, you confirm that a parent or guardian is aware that you use the platform. You are responsible for your account and password."],
  ["Community rules", "Be respectful. No harassment, bullying, hate speech, threats, or sexual or inappropriate content. Do not share external links, personal contact details, or other people's private information. Do not impersonate staff. Do not try to bypass the platform's restrictions or ban."],
  ["Separation of chat rooms", "Chat rooms are separated by generation and gender. You can only see and use the chat that matches your profile. Study rounds are open to your generation."],
  ["Moderation", "Staff (moderators, support and the owner) may delete messages or files, mute or ban accounts, and remove content that breaks these rules. Reports are reviewed by staff."],
  ["Content and archive", "Messages and files you send are stored. Deleted messages are hidden from other users but may be retained in a private archive that only the platform owner can access, for safety, moderation and legal reasons. Messages with support are also archived."],
  ["Account access for safety and support", "The platform owner may access or view an account, including the sign-in email, when needed to provide support, investigate a complaint, or protect users. Such access is logged."],
  ["Study points and virtual currency", "\"Masareek\" (JD) and levels are virtual rewards earned by studying on the platform. They have no cash value, cannot be exchanged for money, and may be adjusted or reset to keep the platform fair."],
  ["Privacy", "We collect your name, email, gender, date of birth, generation, study activity (hours, tasks, exam results), messages and files you upload, and device identifiers used for security. We use them only to run the platform, keep it safe, and show study progress. We do not sell your data or show ads. Your date of birth is not shown to other users. Public leaderboards show avatar nicknames only."],
  ["Files you upload", "You confirm that you own or are allowed to share what you upload. Files are published only after review by support. We may remove files that infringe rights."],
  ["Security and availability", "We work to keep the platform secure and available but cannot guarantee uninterrupted service. Do not rely on it as your only study material."],
  ["Intellectual property", "The platform, its design, avatars and content are owned by Darsna Jo. © 2026 Darsna Jo – All rights reserved. You may not copy or resell them."],
  ["Termination", "We may suspend or ban accounts that break these terms. You may ask us to delete your account."],
  ["Changes", "We may update these terms. If the changes are significant, you will be asked to accept the new version."],
  ["Contact", "Use the Support section inside the platform."],
];

function Terms() {
  return (
    <main dir="ltr" lang="en" className="mx-auto max-w-3xl px-4 py-10 text-left">
      <h1 className="mb-2 text-3xl font-bold">{TITLE}</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: October 24, 2026</p>
      {SECTIONS.map(([h, p], i) => (
        <section key={h} className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">{i + 1}. {h}</h2>
          <p className="leading-relaxed text-foreground/90">{p}</p>
        </section>
      ))}
      <Link to="/" className="text-primary underline">Back to home</Link>
    </main>
  );
}
