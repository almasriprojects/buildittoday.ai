// The 10-step process for building a client website.
// Mirrors a professional agency workflow (Discovery → Launch → Growth).

export interface ProcessStep {
  num: string;
  title: string;
  desc: string;
}

export const processSteps10: ProcessStep[] = [
  {
    num: "01",
    title: "Discovery Call",
    desc: "We learn about your business, your customers, and what makes you different. This shapes everything we build.",
  },
  {
    num: "02",
    title: "Strategy & Planning",
    desc: "We map out your site structure, pages, and conversion goals so every element has a clear purpose.",
  },
  {
    num: "03",
    title: "Custom Design",
    desc: "We craft a unique, on-brand design — not a template. You see the look and feel before we build.",
  },
  {
    num: "04",
    title: "Design Review",
    desc: "You review the design and we refine it together until it feels exactly right for your business.",
  },
  {
    num: "05",
    title: "Development",
    desc: "We build your site with clean, fast, mobile-responsive code that loads in under 2 seconds.",
  },
  {
    num: "06",
    title: "Content & Copy",
    desc: "We write sharp, conversion-focused copy and place your real photos and details throughout.",
  },
  {
    num: "07",
    title: "SEO & Analytics",
    desc: "We set up technical SEO, Google Search Console, and analytics so you can track every visitor.",
  },
  {
    num: "08",
    title: "Testing & QA",
    desc: "We test on every device and browser, fix any issues, and make sure everything works flawlessly.",
  },
  {
    num: "09",
    title: "Launch",
    desc: "Your site goes live on your own domain with SSL, hosting, and everything configured.",
  },
  {
    num: "10",
    title: "Ongoing Support",
    desc: "We monitor, update, and support your site so it keeps performing while you run your business.",
  },
];