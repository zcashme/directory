import type { Metadata } from "next";

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
  primaryAction: NsLandingAction;
  secondaryAction?: NsLandingAction;
  stats: Array<{ label: string; value: string }>;
  sections: NsLandingSection[];
  onboardingSteps?: NsLandingStep[];
  wallets?: NsLandingWallet[];
  rewards?: NsLandingReward[];
  benefits?: NsLandingBenefit[];
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
    title: "Name Service Directory - Zcash.me",
    description: "Browse Zcash profiles with verified name service entries.",
    eyebrow: "Network School Directory",
    headline: "The peer-to-peer electronic cash of The Network School",
    intro:
      "Discover who is already using Zcash, open profiles, and send shielded payments or messages directly from the directory.",
    primaryAction: { href: "/ns/start", label: "Get started" },
    secondaryAction: { href: "/ns/learn", label: "What is Zcash?" },
    stats: [],
    sections: [],
  },
  start: {
    slug: "start",
    title: "Get Started with Zcash - Zcash.me",
    description: "Learn the fastest path to create a profile, set up a wallet, and start using Zcash at Network School.",
    eyebrow: "Get Started",
    headline: "Start using Zcash in a single session",
    intro:
      "Set up the basics, claim your profile, and get to the point where someone can pay you privately with confidence.",
    primaryAction: { href: "/ns", label: "Browse directory" },
    secondaryAction: { href: "/ns/office", label: "Join office hours" },
    stats: [
      { label: "Step 1", value: "Download wallet" },
      { label: "Step 2", value: "Join with Discord" },
      { label: "Step 3", value: "Finish profile" },
    ],
    sections: [
      {
        eyebrow: "Join Flow",
        title: "Your first objective is a profile that can receive money",
        body: "The shortest path is: install a wallet, copy your unified Zcash address, join the directory, and finish enough profile setup that other people can recognize and pay you.",
        points: [
          "Use a unified Zcash address, not a partial or outdated address type.",
          "Go to `zcash.me/ns` and press `Add your name` to start the join flow.",
          "After joining, open `zcash.me/{username}` and use `Menu > Edit profile` to add your picture and finish setup.",
        ],
      },
      {
        eyebrow: "Airdrop",
        title: "Network School airdrop: do the minimum cleanly",
        body: "The airdrop is simple if you treat it like a checklist. Complete the basics first, then improve your profile, then refer one other person.",
        points: [
          "Minimum join requirements: username or display name, unified address, and Discord sign-in.",
          "Add a profile picture after joining so people can identify you quickly in the directory.",
          "Refer one person and make sure they mention you when they complete the same flow.",
        ],
      },
    ],
    onboardingSteps: [
      {
        number: "1",
        title: "Download a wallet",
        body: "Pick a wallet first. If you skip this step, you have nowhere to receive the airdrop and nowhere to copy a usable address from.",
        points: [
          "Install one wallet from the list below.",
          "Open the app and complete its initial setup and backup prompts.",
          "Prefer a wallet that makes receiving a unified address obvious.",
        ],
      },
      {
        number: "2",
        title: "Press receive and copy your wallet address",
        body: "Once your wallet is ready, go to the receive screen and copy your unified address. This is the address you will use when joining the directory.",
        points: [
          "Use the wallet's `Receive` screen, not a send screen or exchange deposit flow.",
          "Copy the full unified address exactly as shown.",
          "Keep it ready so you can paste it into the join form immediately.",
        ],
      },
      {
        number: "3",
        title: "Join the directory and sign in with Discord",
        body: "Go to `zcash.me/ns` and press `Add your name`. Complete the join flow, including Discord sign-in, because that is part of the minimum airdrop requirement.",
        points: [
          "Enter a recognizable username or display name.",
          "Paste your unified address into the form.",
          "Finish Discord sign-in before you consider the join complete.",
        ],
      },
      {
        number: "4",
        title: "Open your profile and finish setup",
        body: "After joining, open `zcash.me/{username}`. Use the menu to edit your profile and add your picture so people can identify you and the airdrop checklist is satisfied.",
        points: [
          "Open your public profile directly after signup.",
          "Tap `Menu > Edit profile`.",
          "Add a profile picture as your minimum first improvement.",
        ],
      },
    ],
    wallets: [
      {
        name: "Edge",
        href: "https://edge.app/",
        summary: "Good default for people who want a polished mainstream wallet experience.",
        strengths: [
          "Simple onboarding and broad multi-asset support.",
          "Good if you want one wallet that feels familiar quickly.",
        ],
      },
      {
        name: "Unstoppable",
        href: "https://unstoppable.money/",
        summary: "Useful if you want a modern mobile wallet with strong multi-chain coverage.",
        strengths: [
          "Clean mobile-first experience.",
          "Good fit if you already use other crypto assets too.",
        ],
      },
      {
        name: "Cake Wallet",
        href: "https://cakewallet.com/",
        summary: "A common pick for privacy-focused users who want a wallet with a long track record.",
        strengths: [
          "Well-known in privacy-coin circles.",
          "Good if you want a more established mobile wallet option.",
        ],
      },
      {
        name: "Zingo",
        href: "https://zingolabs.org/zingo/legacy/",
        summary: "Zcash-native orientation makes it easier to think in Zcash terms from the start.",
        strengths: [
          "Closer to the Zcash-specific use case.",
          "Good if you want to focus on Zcash rather than general crypto management.",
        ],
      },
      {
        name: "ZODL",
        href: "https://zodl.com/",
        summary: "Another option if you want a Zcash-compatible wallet and prefer comparing interfaces yourself.",
        strengths: [
          "Worth testing if another wallet's UX does not click for you.",
          "Good reminder that the right wallet is the one you will actually keep using.",
        ],
      },
    ],
    rewards: [
      {
        amount: "$2",
        title: "Join the directory",
        requirement: "Minimum: add a username or display name, add a unified Zcash address, and sign in with Discord.",
      },
      {
        amount: "$2",
        title: "Edit your profile",
        requirement: "Minimum: add a profile picture so your listing is recognizable.",
      },
      {
        amount: "$1",
        title: "Refer another person",
        requirement: "Have them complete the same flow and mention you as the referral.",
      },
    ],
    benefits: [
      {
        title: "Accept from any currency",
        body: "You can share your `zcash.me` link instead of manually managing address handoffs every time someone wants to pay you.",
      },
      {
        title: "Pay to any currency",
        body: "Once your profile and wallet are live, you are on-ramp ready for cross-currency flows instead of only direct ZEC-to-ZEC interactions.",
      },
      {
        title: "Send invoices and payment requests",
        body: "A profile link gives you a cleaner way to request payment in Zcash than repeating an address across side channels.",
      },
      {
        title: "Share a link instead of an address",
        body: "This helps when you do not have your wallet in front of you, do not want to paste an address into chat, or cannot show a QR code in person.",
      },
    ],
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
