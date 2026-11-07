/**
 * The Privacy Policy and Terms of Use, as data: every section and clause is numbered from its place here, and the
 * page's "On this page" list is built from the same sections, so the two can never disagree.
 * Text marks: **bold** and [label](/path) links. Describe only what Distill really does (checked against the code).
 */

export type LegalSection = { id: string; title: string; clauses: string[] };
export type LegalDoc = { title: string; eyebrow: string; intro: string; version: string; effective: string; sections: LegalSection[] };

export const CONTACT_EMAIL = "privacy@jeromebadour.com";

export const privacy: LegalDoc = {
  title: "Privacy Policy",
  eyebrow: "Legal",
  intro: "What Distill keeps about you, why, who else sees it, how long it stays and how to have it removed.",
  version: "1.0",
  effective: "7 November 2026",
  sections: [
    {
      id: "scope",
      title: "Scope",
      clauses: [
        "This policy covers Distill at distill.jeromebadour.com: the app, your account, guest sessions and the public admin demo.",
        "It sits alongside the [Terms of Use](/terms). Where this policy describes your data and the terms describe the agreement, both apply.",
      ],
    },
    {
      id: "what-we-keep",
      title: "What we keep",
      clauses: [
        "**Your account:** your name, username, email address and a password hash (Argon2id). We never store your password itself, and we cannot read it.",
        "**Guests:** a guest session has a generated name such as Guest 31, and no email or password.",
        "**Your summaries:** the text you paste, the summary Claude writes for it, the sentences each point links to and the figure checks. They are saved to your account so you can find them in Saved.",
        "**Usage records:** for every summary, when it ran, its length, the number of words and tokens and what it cost. Never the text itself. They power your hourly and daily limits and the app's spend caps.",
        "**Devices:** for each signed-in device, the browser and system name and when it was last used, so you can see and sign out your devices on your Profile.",
        "**Your preferences:** theme, motion, default length, avatar colour and how links to the source are shown.",
      ],
    },
    {
      id: "text",
      title: "The text you paste",
      clauses: [
        "To write a summary, your text is sent to **Anthropic's Claude API**. Anthropic processes it under its commercial terms: it does not train its models on it, and it deletes it on its side within 30 days, except where it must keep it longer to enforce its usage policy or the law.",
        "Your text is saved only in your own account. **Nobody at Distill, the owner included, can read it**: the admin console shows counts, lengths, times and costs, never what anyone pasted or got back.",
        "Do not paste anything you are not allowed to share with a service like this, such as another person's private data or confidential documents you have no right to process.",
      ],
    },
    {
      id: "why",
      title: "Why we keep it",
      clauses: [
        "To run the app: to sign you in, write and save your summaries, and show them back to you.",
        "To keep it fair and affordable: limits per hour and per day, and spend caps, are counted from the usage records.",
        "To keep it safe: sign-in attempts, staff actions and errors are recorded so problems and abuse can be found and fixed.",
        "We do not sell your data, show ads or use tracking or analytics tools.",
      ],
    },
    {
      id: "who-else",
      title: "Who else sees it",
      clauses: [
        "**Anthropic**, as described above, for the text you send to be summarised.",
        "**The hosting provider** (Contabo), whose server stores the database. It provides the machine; it does not use the data.",
        "**Staff** of Distill (the owner, admins and moderators) see account details and usage metadata in the admin console to run the service. Every staff action is recorded with its reason.",
        "Nobody else, unless the law requires it.",
      ],
    },
    {
      id: "where",
      title: "Where it is held",
      clauses: ["The database runs on one server in **Singapore**. Connections to it are encrypted (HTTPS)."],
    },
    {
      id: "how-long",
      title: "How long it is kept",
      clauses: [
        "**Summaries** stay until you delete them, or until you delete your account.",
        "**Devices** sign out by themselves after 30 days without use.",
        "**Usage records, sign-in events and staff actions** are kept to keep limits, spend and the security record correct. When your account is deleted, they stay without any link to you.",
        "The web server's own logs, which include IP addresses, are kept for **14 days** for security, then deleted. The app itself does not store IP addresses.",
      ],
    },
    {
      id: "your-choices",
      title: "Export and delete",
      clauses: [
        "**Export:** on your Profile, you can download everything in your account (your profile and every summary with its source) at any time.",
        "**Delete:** on your Profile, Delete account removes your account, every summary and every device at once. It cannot be undone.",
        "You can also delete single summaries from Saved at any time.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and storage",
      clauses: [
        "**Sign-in:** one cookie keeps you signed in. It holds a random token; only a hash of it is stored on the server.",
        "**Time zone and window height:** two small cookies, so times show in your zone and lists fit your window.",
        "**Theme and motion:** remembered in your browser's own storage.",
        "There are no advertising, tracking or third-party cookies.",
      ],
    },
    {
      id: "age",
      title: "Age",
      clauses: ["Distill is for people aged 18 and over."],
    },
    {
      id: "changes",
      title: "Changes and contact",
      clauses: [
        "If this policy changes, the new version and its date appear here before it applies.",
        `Questions, or a request about your data: [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}).`,
      ],
    },
  ],
};

export const terms: LegalDoc = {
  title: "Terms of Use",
  eyebrow: "Legal",
  intro: "The agreement for using Distill: your account, your content, the limits, and what the summaries can and cannot promise.",
  version: "1.0",
  effective: "7 November 2026",
  sections: [
    {
      id: "these-terms",
      title: "These terms",
      clauses: [
        "These terms are an agreement between you and Distill. By creating an account or starting a guest session, you accept them.",
        "If you do not accept them, do not use Distill. The [Privacy Policy](/privacy) explains what is kept about you.",
      ],
    },
    {
      id: "the-service",
      title: "The service",
      clauses: [
        "Distill writes short summaries of text you paste, using Anthropic's Claude. Each point links to the sentences it came from, and the figures in a summary are checked against your text.",
        "Distill is a portfolio project, offered as it is and free of charge. It may change, pause or stop.",
      ],
    },
    {
      id: "accounts",
      title: "Accounts and guests",
      clauses: [
        "You must be 18 or over. Keep your password to yourself; you are responsible for what happens in your account.",
        "Guest sessions need no account and have lower limits. A guest can turn the session into an account at any time and keep its summaries.",
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      clauses: [
        "Use Distill lawfully. Do not paste content you have no right to process, and do not use it to harm others.",
        "Do not try to get around the limits, break into other accounts, overload the service or reach parts of it you are not given.",
        "Anthropic's own usage policy also applies to the text that is sent to Claude.",
      ],
    },
    {
      id: "your-content",
      title: "Your content",
      clauses: [
        "What you paste and the summaries made from it are yours. You give Distill only the permission it needs to process them, store them in your account and show them to you.",
        "You can export or delete your content at any time, as the [Privacy Policy](/privacy) describes.",
      ],
    },
    {
      id: "limits",
      title: "Limits",
      clauses: [
        "Accounts can make up to **10 summaries an hour and 30 a day**; guests up to 5 an hour. A text can be up to 20,000 characters.",
        "The service has its own spend caps. When one is reached, new summaries pause until it resets, and the app says so.",
        "A summary that fails before it is finished does not count against your limit.",
      ],
    },
    {
      id: "accuracy",
      title: "Summaries can be wrong",
      clauses: [
        "Summaries are written by an AI model and **can be incomplete or wrong**. The links to the source and the figure checks are there so you can check, not a promise that nothing was missed.",
        "Do not rely on a summary alone for legal, medical, financial or other important decisions. Read the source.",
      ],
    },
    {
      id: "suspension",
      title: "Suspension and ending",
      clauses: [
        "Accounts that break these terms can be suspended. Suspended accounts are signed out and cannot sign in or make summaries; their content is kept, not deleted.",
        "You can end the agreement at any time by deleting your account.",
      ],
    },
    {
      id: "intellectual-property",
      title: "Intellectual property",
      clauses: [
        "Distill's code, design and name belong to Jerome Badour. The source is published for viewing only; see the licence in the [repository](https://github.com/jeromebadour/ai-summarizer).",
      ],
    },
    {
      id: "liability",
      title: "Disclaimers and liability",
      clauses: [
        "Distill is provided as it is, without warranties of any kind, as far as the law allows.",
        "As far as the law allows, Distill is not liable for losses that come from using it or from relying on a summary.",
      ],
    },
    {
      id: "changes",
      title: "Changes and contact",
      clauses: [
        "If these terms change, the new version and its date appear here before they apply.",
        `Questions: [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}).`,
      ],
    },
  ],
};
