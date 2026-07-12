import type { Metadata } from "next";
import discordFavicon from "@/lib/profile/assets/favicons/favicon-discord-32.png";

const discordIconSrc = typeof discordFavicon === "string" ? discordFavicon : discordFavicon.src;

export type NsLandingPageKey =
  | "directory"
  | "start"
  | "office"
  | "events"
  | "accept"
  | "learn"
  | "community"
  | "ux";

export interface NsLandingAction {
  href: string;
  label: string;
  external?: boolean;
  iconSrc?: string;
  hideIcon?: boolean;
}

export interface NsLandingSection {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
}

export interface NsLandingStep {
  number: string;
  title: string;
  body: string;
  points: string[];
  action?: NsLandingAction;
}

export interface NsLandingWallet {
  name: string;
  href: string;
  summary: string;
  strengths: string[];
}

export interface NsLandingReward {
  amount: string;
  title: string;
  requirement: string;
}

export interface NsLandingBenefit {
  title: string;
  body: string;
}

export interface NsLandingPageContent {
  slug: NsLandingPageKey;
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  intro: string;
  primaryAction?: NsLandingAction;
  secondaryAction?: NsLandingAction;
  stats: Array<{ label: string; value: string; action?: NsLandingAction }>;
  sections: NsLandingSection[];
  onboardingSteps?: NsLandingStep[];
  wallets?: NsLandingWallet[];
  rewards?: NsLandingReward[];
  benefits?: NsLandingBenefit[];
  hideExploreMore?: boolean;
}

export const nsLandingOrder: NsLandingPageKey[] = [
  "start",
  "office",
  "events",
  "accept",
  "learn",
  "community",
  "ux",
];

export const nsLandingPages: Record<NsLandingPageKey, NsLandingPageContent> = {
  directory: {
    slug: "directory",
    title: "Pay with Zcash at Network School - Zcash.me",
    description: "Browse Network School profiles and pay people with Zcash through zcash.me.",
    eyebrow: "Network School Directory",
    headline: "The peer-to-peer electronic cash of The Network School",
    intro:
      "Discover who is already using Zcash, open profiles, and send shielded payments or messages directly from the directory.",
    primaryAction: { href: "/ns/start", label: "Get started", hideIcon: true },
    secondaryAction: {
      href: "https://discord.com/channels/900827411917201418/1454104981320892591",
      label: "Join the Discord",
      external: true,
      iconSrc: discordIconSrc,
    },
    stats: [],
    sections: [],
  },
  start: {
    slug: "start",
    title: "Get Started with Zcash - Zcash.me",
    description: "Learn the fastest path to get the Zcash airdrop at Network School.",
    eyebrow: "Get Started",
    headline: "How to get the Zcash airdrop",
    intro:
      "Set up the basics, claim your airdrop, and get to the point where someone can pay you privately with any cryptocurrency.",
    primaryAction: undefined,
    secondaryAction: undefined,
    stats: [
      { label: "Step 1", value: "Download Zodl" },
      { label: "Step 2", value: "Copy shielded address" },
      {
        label: "Step 3",
        value: "Post in Discord",
        action: {
          href: "https://discord.com/channels/900827411917201418/1454104981320892591",
          label: "Join the Discord",
          external: true,
          iconSrc: discordIconSrc,
        },
      },
      {
        label: "Optional",
        value: "Join directory",
        action: {
          href: "/ns",
          label: "Browse",
        },
      },
    ],
    sections: [],
    onboardingSteps: [
      {
        number: "1",
        title: "Download the Zodl wallet",
        body: "Download the Zodl wallet at `Zodl.com`. Zodl is the recommended first choice, but other wallets are listed below if you want alternatives.",
        points: [],
        action: {
          href: "https://zodl.com/?utm_source=chatgpt.com",
          label: "Get Zodl",
          external: true,
          iconSrc: "https://play-lh.googleusercontent.com/0tPoGDUdDKVQ-T4bpx9vo4X72827KtZySJdVmbbyaGu6CMG9v_7RgRTocvPHJAxdGuH3tLB07RPEd5eVUkUR=w480-h960-rw",
        },
      },
      {
        number: "2",
        title: "Find and copy your shielded wallet address",
        body: "From the wallet home screen, tap `Receive`. Make sure you are viewing your shielded address, not the transparent address, then copy it to your clipboard.",
        points: [],
      },
      {
        number: "3",
        title: "Post your shielded address in Discord",
        body: "Join the Zcash Network School Discord thread and paste your shielded wallet address as a comment. Once you have posted it, you are ready for the next airdrop.",
        points: [],
        action: {
          href: "https://discord.com/channels/900827411917201418/1454104981320892591",
          label: "Join the Discord",
          external: true,
          iconSrc: discordIconSrc,
        },
      },
      {
        number: "4",
        title: "Optional: join the directory and sign in with Discord",
        body: "Go to `zcash.me/ns` or tap `Add your name` button on the top-right if you want a public profile, the ability to create payment links, and an easy way for people to recognize and pay you.",
        action: {
          href: "/ns",
          label: "Add your name",
          hideIcon: true,
        },
        points: [
          "Enter a recognizable username or display name and paste your shielded address.",
          "Finish Discord sign-in to connect your profile to the Network School community.",
          "Add a profile picture after joining so people can identify you quickly in the directory.",
          "Send Payment Requests from your profile instead of repeating an address in chat.",
          "Share a link instead of an address.",
        ],
      },
    ],
    wallets: [
      {
        name: "Zodl",
        href: "https://zodl.com/",
        summary: "Simple path into Zcash and private payments.",
        strengths: [
          "Recommended",
          "Swap Tokens",
          "Cross Pay",
        ],
      },
      {
        name: "Edge",
        href: "https://edge.app/",
        summary: "A strong mainstream option if you want a familiar multi-asset wallet.",
        strengths: [
          "Network-level Privacy",
          "Multi-Asset",
          "Zcash Names",
        ],
      },
      {
        name: "Unstoppable",
        href: "https://unstoppable.money/",
        summary: "A modern mobile wallet if you want broader crypto coverage beyond Zcash.",
        strengths: [
          "Swap Tokens",
          "Multi-Asset",
          "Zcash Names",
        ],
      },
      {
        name: "Cake Wallet",
        href: "https://cakewallet.com/",
        summary: "A long-running option for people who prefer a more established privacy-wallet brand.",
        strengths: [
          "Swap Tokens",
          "Multi-Asset",
          "Local Contacts",
          "Zcash Names",
        ],
      },
      {
        name: "Zingo",
        href: "https://zingolabs.org/zingo/legacy/",
        summary: "A Zcash-oriented option if you want a wallet centered more directly on the Zcash use case.",
        strengths: [
          "Desktop Available",
          "Local Contacts",
          "Zcash Names",
        ],
      },
    ],
    rewards: [],
    benefits: [],
    hideExploreMore: true,
  },
  office: {
    slug: "office",
    title: "Zcash Office Hours - Zcash.me",
    description: "Drop into office hours for wallet setup, directory onboarding, and merchant or team questions.",
    eyebrow: "Office Hours",
    headline: "Bring the setup problem you are stuck on",
    intro:
      "Office hours are the shortest route from confusion to a working setup, whether you need help with wallets, profiles, payments, or messaging.",
    primaryAction: { href: "/ns/community", label: "Join community" },
    secondaryAction: { href: "/ns/start", label: "Start on your own" },
    stats: [
      { label: "Topics", value: "Wallets, profiles, payments" },
      { label: "Format", value: "Live Q&A" },
      { label: "Best for", value: "New users + operators" },
    ],
    sections: [
      {
        eyebrow: "What to bring",
        title: "Arrive with your current setup",
        body: "You will get better help if you show the exact wallet, device, and profile state you already have instead of describing it abstractly.",
        points: [
          "Bring the wallet app you are actually using.",
          "Have your `zcash.me` or Network School profile open if you already made one.",
          "Write down the exact point where the flow breaks or becomes unclear.",
        ],
      },
      {
        eyebrow: "What you leave with",
        title: "Turn open questions into a working flow",
        body: "The target outcome is not theory. It is a repeatable setup you can use again after the call.",
        points: [
          "A verified address you can share confidently.",
          "A profile people can find in the directory.",
          "A next action if you are implementing Zcash for a team or storefront.",
        ],
      },
    ],
  },
  events: {
    slug: "events",
    title: "Zcash Events - Zcash.me",
    description: "Track upcoming events, demos, and meetups around Zcash usage in the Network School ecosystem.",
    eyebrow: "Events",
    headline: "Meet the people using the tools in public",
    intro:
      "Events make the network legible. They show which workflows matter, who is building, and where Zcash is already being used socially or commercially.",
    primaryAction: { href: "/ns/community", label: "Find the people" },
    secondaryAction: { href: "/ns/ux", label: "Share research" },
    stats: [
      { label: "Formats", value: "Talks, demos, meetups" },
      { label: "Signal", value: "Real user workflows" },
      { label: "Goal", value: "Participation" },
    ],
    sections: [
      {
        eyebrow: "Attend",
        title: "Use events to shorten your learning curve",
        body: "Watching someone else demonstrate wallet setup, private transfers, or merchant onboarding often removes entire classes of confusion.",
        points: [
          "Look for live demos instead of abstract presentations.",
          "Use the directory before and after events to stay connected.",
          "Bring a concrete workflow you want to test with other attendees.",
        ],
      },
      {
        eyebrow: "Host",
        title: "Run events that produce adoption, not just awareness",
        body: "The strongest events end with more active users, more listings, and more completed transactions.",
        points: [
          "Include a profile-creation or wallet-install block.",
          "Give attendees a reason to send a real transaction.",
          "Point people toward office hours for unresolved setup problems.",
        ],
      },
    ],
  },
  accept: {
    slug: "accept",
    title: "Accept ZEC - Zcash.me",
    description: "Use Zcash.me to help merchants and storefront operators accept ZEC and get discovered by the community.",
    eyebrow: "Accept ZEC",
    headline: "Make your storefront payable in ZEC",
    intro:
      "If you run a shop, service, or online storefront, the first requirement is clarity: where to pay, who it goes to, and how customers know they found the right listing.",
    primaryAction: { href: "/ns", label: "View storefront-ready profiles" },
    secondaryAction: { href: "/ns/start", label: "Set up payments" },
    stats: [
      { label: "Merchant need", value: "Clear payment path" },
      { label: "Directory role", value: "Discovery + trust" },
      { label: "Outcome", value: "Storefront listing" },
    ],
    sections: [
      {
        eyebrow: "Listing",
        title: "Create a profile customers can verify quickly",
        body: "A storefront listing should remove hesitation. Customers need a recognizable name, a simple description, and a payment address that matches the merchant identity.",
        points: [
          "Use your business name consistently across profile, links, and storefront.",
          "Add the links customers already trust, such as your site or marketplace presence.",
          "Keep the payment path short enough to complete on mobile.",
        ],
      },
      {
        eyebrow: "Operations",
        title: "Treat ZEC acceptance like a repeatable checkout flow",
        body: "The merchant problem is rarely theoretical support for ZEC. It is making payment collection and fulfillment feel routine.",
        points: [
          "Decide who monitors incoming payments and order notes.",
          "Document how staff verify incoming transfers.",
          "Test the exact customer flow before you announce acceptance publicly.",
        ],
      },
    ],
  },
  learn: {
    slug: "learn",
    title: "What Is Zcash? - Zcash.me",
    description: "A concise explanation of what Zcash is, why privacy matters, and how it fits the Network School community.",
    eyebrow: "What Is Zcash?",
    headline: "Private digital cash for the internet",
    intro:
      "Zcash is a cryptocurrency focused on private payments. In practice, that means you can send money without exposing everything about the sender, receiver, and payment memo to the whole world.",
    primaryAction: { href: "/ns/start", label: "Try it" },
    secondaryAction: { href: "/ns/community", label: "Talk to users" },
    stats: [
      { label: "Core idea", value: "Private payments" },
      { label: "Why it matters", value: "Less public leakage" },
      { label: "Best way to learn", value: "Use it" },
    ],
    sections: [
      {
        eyebrow: "Mental model",
        title: "Understand Zcash as money with better default boundaries",
        body: "Most digital payment systems leak too much information by default. Zcash exists to improve that tradeoff while still being usable on the public internet.",
        points: [
          "It is digital cash, not just a speculative asset.",
          "Privacy protects ordinary users, not only edge cases.",
          "Real understanding comes from sending a transaction yourself.",
        ],
      },
      {
        eyebrow: "Why here",
        title: "Why Network School users care",
        body: "A directory of online identities becomes more useful when it connects directly to a payment rail that respects privacy.",
        points: [
          "Profiles become payment endpoints, not just contact cards.",
          "Merchants and builders can transact without oversharing.",
          "Community discovery and payments can live in the same workflow.",
        ],
      },
    ],
  },
  community: {
    slug: "community",
    title: "Join the Zcash Community - Zcash.me",
    description: "Find the people, conversations, and support loops around Zcash and Network School adoption.",
    eyebrow: "Join Community",
    headline: "Find the people already doing the work",
    intro:
      "Communities compound faster than documentation. If you want to use Zcash well, spend time with the people already debugging wallets, onboarding merchants, and teaching newcomers.",
    primaryAction: { href: "/ns", label: "Explore directory" },
    secondaryAction: { href: "/ns/events", label: "Find events" },
    stats: [
      { label: "Best entry", value: "People, not PDFs" },
      { label: "Main loop", value: "Ask, test, report" },
      { label: "Outcome", value: "Faster adoption" },
    ],
    sections: [
      {
        eyebrow: "Connect",
        title: "Start with the people nearest your use case",
        body: "The right first contact depends on whether you are here as a user, merchant, organizer, or builder.",
        points: [
          "Find profiles with the context you need in the directory.",
          "Use events and office hours to establish trust faster.",
          "Share what you are trying to do, not just what product you installed.",
        ],
      },
      {
        eyebrow: "Contribute",
        title: "Give the network better feedback loops",
        body: "Healthy communities improve because users report friction clearly and builders can respond to concrete examples.",
        points: [
          "Document where onboarding breaks.",
          "Show how real people discover and pay each other.",
          "Point newcomers toward workflows that already work today.",
        ],
      },
    ],
  },
  ux: {
    slug: "ux",
    title: "Zcash UX Research - Zcash.me",
    description: "Collect and share user research about Zcash onboarding, payments, merchant flows, and directory usability.",
    eyebrow: "UX Research",
    headline: "Turn user confusion into product signal",
    intro:
      "If adoption matters, interface quality matters. UX research here should focus on where real users hesitate, misread the flow, or fail to complete a transaction.",
    primaryAction: { href: "/ns/office", label: "Watch live onboarding" },
    secondaryAction: { href: "/ns/community", label: "Talk to users" },
    stats: [
      { label: "Research scope", value: "Wallets + directory + checkout" },
      { label: "Priority", value: "Observed friction" },
      { label: "Output", value: "Actionable fixes" },
    ],
    sections: [
      {
        eyebrow: "Research targets",
        title: "Study the moments where trust or comprehension collapses",
        body: "Users usually fail at handoffs: understanding addresses, choosing the right action, or trusting that a payment path is legitimate.",
        points: [
          "Watch the first-run wallet and profile flow closely.",
          "Measure confusion around payment address formats and memos.",
          "Track where merchant acceptance flows stop feeling credible.",
        ],
      },
      {
        eyebrow: "Use the findings",
        title: "Convert observations into implementation work",
        body: "The point of research is not a deck. It is a smaller set of product changes with clear expected impact.",
        points: [
          "Prioritize changes that unblock first payment success.",
          "Share examples with builders in the community.",
          "Re-test the flow after each meaningful copy or UI change.",
        ],
      },
    ],
  },
};

export function getNsLandingPageContent(slug: NsLandingPageKey): NsLandingPageContent {
  return nsLandingPages[slug];
}

export function buildNsMetadata(slug: NsLandingPageKey): Metadata {
  const page = getNsLandingPageContent(slug);

  return {
    title: page.title,
    description: page.description,
    icons: {
      icon: "/zns-favicon.png",
    },
  };
}
