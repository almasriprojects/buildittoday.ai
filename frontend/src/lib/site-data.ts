import { TIERS, money } from "./pricing";

// Central data for the main page sections: 10 crafts, packages, traffic, automations.

export interface Craft {
  num: string;
  title: string;
  tagline: string;
  copy: string;
  demo: CraftDemo;
}

export type CraftDemo =
  | "design"
  | "layout"
  | "imagery"
  | "3d"
  | "content"
  | "motion"
  | "performance"
  | "conversion"
  | "build"
  | "speed";

export const crafts: Craft[] = [
  {
    num: "01",
    title: "Design",
    tagline: "Taste is a business asset.",
    copy: "Design isn't decoration. Buyers decide whether you look worth their money in about a second — and a considered brand wins that second. Tap a swatch to retint this panel live.",
    demo: "design",
  },
  {
    num: "02",
    title: "Layout",
    tagline: "One clear path to the next yes.",
    copy: "Hierarchy and white space decide whether attention reaches the next yes. Flip between layouts to see how structure guides the eye.",
    demo: "layout",
  },
  {
    num: "03",
    title: "Imagery",
    tagline: "Art-directed media wins.",
    copy: "Landing-page video can lift conversion ~86%. Stock and fake proof underperform real photography. Choose a treatment to see the difference.",
    demo: "imagery",
  },
  {
    num: "04",
    title: "3D Animation",
    tagline: "A signature moment per section.",
    copy: "Interactive 3D and custom motion make you look like the serious choice. Spin the cube — restraint, never noise.",
    demo: "3d",
  },
  {
    num: "05",
    title: "Content",
    tagline: "Sharp outcome copy.",
    copy: "Headlines with numbers outperform vague claims by ~36%. First-person CTA copy has won by up to 90%. Watch the copy sharpen live.",
    demo: "content",
  },
  {
    num: "06",
    title: "Motion",
    tagline: "Purposeful motion holds attention.",
    copy: "Visitors spend ~1.4× longer on pages with motion — more time to comprehend and decide. Drag the slider to feel the pacing.",
    demo: "motion",
  },
  {
    num: "07",
    title: "Performance",
    tagline: "Speed that holds attention.",
    copy: "A 0.1s faster mobile load lifts retail conversion +8.4%. A 1-second delay can cut mobile conversions ~20%. Watch your own load times.",
    demo: "performance",
  },
  {
    num: "08",
    title: "Conversion",
    tagline: "One primary CTA wins.",
    copy: "One primary CTA outperforms competing asks. CTA color wins only via contrast — not a magic hue. Toggle the hierarchy to see it.",
    demo: "conversion",
  },
  {
    num: "09",
    title: "Build",
    tagline: "Real code & HTTPS.",
    copy: "84% of US consumers will not enter payment info on a non-HTTPS site. Core Web Vitals protect both rankings and conversion hygiene.",
    demo: "build",
  },
  {
    num: "10",
    title: "Speed to Lead",
    tagline: "Under 5 min → 9× conversion.",
    copy: "Responding within 5 minutes vs 30 minutes increases lead conversion ~9×. Most businesses still take a day or more.",
    demo: "speed",
  },
];

/**
 * The build packages, derived from the single pricing source so the homepage,
 * /pricing, the hero and the footer can never drift apart.
 */
export interface Package {
  name: string;
  price: string;
  /** Rendered next to the setup fee — never leave the recurring cost implied. */
  monthly: string;
  tagline: string;
  features: string[];
  popular?: boolean;
  cta: string;
  href?: string;
}

export const packages: Package[] = TIERS.map((t) => ({
  name: t.name,
  price: money(t.setup),
  monthly: `${money(t.monthly)}/month`,
  tagline: t.tagline,
  features: t.features,
  popular: t.popular,
  cta: t.cta,
  href: t.href,
}));

export interface TrafficLayer {
  title: string;
  tool: string;
  headline: string;
  copy: string;
  why: string;
}

export const trafficLayers: TrafficLayer[] = [
  {
    title: "SEO",
    tool: "Ahrefs",
    headline: "Buyers find you without you paying per click",
    copy: "We research what your customers actually type when they're ready to spend, then build pages that earn those rankings instead of bidding for them.",
    why: "Ads stop the day you stop paying. A page that ranks keeps delivering customers next quarter and next year, which is why your cost per lead falls the longer we run.",
  },
  {
    title: "AEO",
    tool: "Ahrefs",
    headline: "You're the answer the AI gives",
    copy: "Answer Engine Optimization structures your pages so ChatGPT, Google's AI answers, and Perplexity can quote you as the source — with the schema and clear answers those systems need.",
    why: "More buyers now ask an assistant before they ever open a search page. If a competitor is the one being cited, you never enter the conversation.",
  },
  {
    title: "Analytics",
    tool: "PostHog",
    headline: "You stop guessing where the money leaks",
    copy: "PostHog records the real paths people take — which pages they enter on, where they hesitate, and the exact step where they give up.",
    why: "Opinions about your website get expensive. Knowing that four out of five visitors abandon one specific page tells you precisely where a fix pays.",
  },
  {
    title: "CRO",
    tool: "PostHog",
    headline: "The same traffic starts producing more work",
    copy: "We test the headlines, offers, layouts, and calls to action that analytics flagged, then keep what wins and remove what doesn't.",
    why: "Doubling your traffic is slow and expensive. Converting a larger share of the visitors you already have shows up in booked calls this month.",
  },
];

export interface AutomationModule {
  num: string;
  title: string;
  desc: string;
}

export const automationModules: AutomationModule[] = [
  { num: "01", title: "Answers after hours", desc: "Picks up at 9pm, at 2am, and on Sundays. Callers get a real conversation and a booked time instead of voicemail, and you get the transcript in the morning." },
  { num: "02", title: "Qualifies before you spend time", desc: "Asks your qualifying questions on the call or in chat, scores the answers against your criteria, and only puts the buyers worth your hour on your calendar." },
  { num: "03", title: "Runs the calendar", desc: "Books, reschedules, confirms, and chases no-shows on its own — checking real availability and travel time instead of double-booking your Tuesday." },
  { num: "04", title: "Drafts your paperwork", desc: "Generates quotes, proposals, contracts, and invoices from the details of the conversation, ready for you to glance at and send." },
  { num: "05", title: "Reads what comes in", desc: "Pulls the numbers off inbound PDFs, permits, purchase orders, and intake forms, then files the data where it belongs — no one retyping it into a spreadsheet." },
  { num: "06", title: "Does the research", desc: "Briefs you before a pitch: who the prospect is, what the competition charges, what changed in your market this week. Waiting for you, not requested by you." },
  { num: "07", title: "Keeps the inbox and CRM straight", desc: "Triages email, drafts the replies you always send, and logs every call, quote, and follow-up to the CRM so your pipeline is accurate without anyone maintaining it." },
  { num: "08", title: "Chases the money", desc: "Follows up on overdue invoices with escalating reminders, so you stop financing customers who simply forgot." },
];

export interface HowWeWorkStep {
  num: string;
  title: string;
  desc: string;
}

export const howWeWork: HowWeWorkStep[] = [
  { num: "01", title: "Discovery", desc: "Map processes, bottlenecks, and which module pays for itself first." },
  { num: "02", title: "Roadmap", desc: "A prioritized order so you can start with one and expand over time." },
  { num: "03", title: "Build & integrate", desc: "Custom n8n workflows and AI agents — plus Next.js when you need a real app." },
  { num: "04", title: "Support", desc: "Monitoring, tweaks, and new modules as your business evolves." },
];

export interface Value {
  title: string;
  desc: string;
}

export const values: Value[] = [
  { title: "Patience", desc: "Craft compounds — like rock layers under pressure." },
  { title: "Persistence", desc: "Ship, measure, improve. Then do it again." },
  { title: "Ownership", desc: "Real code in your GitHub. No lock-in theater." },
  { title: "Restraint", desc: "One signature moment per section. Never noise." },
];