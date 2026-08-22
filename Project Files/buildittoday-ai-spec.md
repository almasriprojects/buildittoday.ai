# BuildItToday.ai — Complete Website & Platform Specification
*For Claude Code Implementation — Conversion-Focused Architecture*

---

## CRITICAL HONESTY FIRST

Before we build anything, you need to hear this directly:

**The fancy stuff (AI video generation, heavy motion effects, complex animations) will actually HURT your conversion rate.**

Here's why:
- A small business owner sees heavy animation/AI effects → thinks "this is expensive"
- Complex design → feels inaccessible
- Too much showiness → looks like you're selling design, not simplicity

**What actually converts for your customer base:**
1. Crystal clear value prop ("Website. $1,500. One Week.")
2. Real portfolio work (20 different industries)
3. Social proof (customer testimonials)
4. Speed demonstration ("Built in 4 days")
5. Zero friction CTA ("Yes, start mine")

**Your secret weapon is NOT complexity. It's simplicity + speed + proof.**

So here's what we're actually building: **A fast, clean, trust-focused website that showcases you CAN build fast and clean. The website itself becomes your proof.**

---

## TECH STACK DECISION

### Backend
**Next.js 15 (App Router) + TypeScript**

Why:
- Server-side rendering for fast page loads (converts better)
- API routes for Lob integration (dynamic postcards)
- Environment variables for secrets
- Vercel-native (or Hetzner with Docker)
- You know it already

### Frontend Components
**Shadcn/ui + TailwindCSS + Framer Motion**

Why:
- Shadcn is production-grade, not "fancy"
- Components are accessible and fast
- Framer Motion for subtle, purposeful animations (not gimmicks)
- Zero bloat. Fast load times.

### Animation
**Framer Motion (use sparingly)**

What to animate:
- Portfolio images fade in on scroll (subtle)
- Testimonial cards slide in (subtle)
- CTA button pulse (draws attention without shouting)
- NOT: spinning heroes, morphing shapes, parallax scrolls

### Database
**Supabase PostgreSQL**

Why:
- You already use Supabase
- Store customer demo data
- Track which postcards were sent (Lob integration)
- Simple and cheap

### Postcard/Dynamic Generation
**Lob.com API**

Integration points:
- When you create a demo for a customer, generate a postcard template
- QR code points to: `buildittoday.ai/demo/[unique-id]`
- Store the Lob request + response in Supabase
- Track opens/clicks via QR code analytics

### Hosting
**Vercel (easiest) OR Docker on your Hetzner VPS**

If VPS:
- Next.js in Docker
- Nginx reverse proxy
- Let's Encrypt SSL (free)
- PM2 for process management

---

## PAGE ARCHITECTURE

### 1. Homepage (`/`)
**Single-scroll landing page**

Sections (in order):
```
A. Hero (above fold)
   - Headline: "Website For Your Business"
   - Subheadline: "$1,500. Built in One Week."
   - CTA Button: "See Your Free Demo"
   - Background: One high-quality photo of a successful small business

B. The Problem (2-3 lines of text)
   - "You registered your LLC. You need to be found online."
   - "But web agencies cost $10K. Designers take months."
   - "We do it in one week for $1,500."

C. How It Works (3 steps, simple icons)
   Step 1: "We review your business"
   Step 2: "We build your website"
   Step 3: "You launch it"
   
D. Portfolio Gallery (20 different websites you've built)
   - Grid layout: 2-3 columns on desktop, 1 column mobile
   - Click to view full demo (opens `/demo/[business-name]`)
   - Show variety: plumbing, dental, cleaning, restaurants, etc.
   - Include tagline per business (e.g., "Custom website for a Miami dentist")
   - NO hover effects (mobile-unfriendly). Just clean images.

E. Testimonials (3-5 real or realistic quotes)
   - "Built in 5 days. Exactly what I needed." — Sarah, Dental Office
   - "Best $1,500 I spent." — Mike, Plumbing Company
   - "More customers since launch." — Ana, Cleaning Service
   - Simple cards. White background. Black text.

F. Pricing (transparent, one option)
   - "One Price: $1,500"
   - What's included:
     • Custom website (5 pages)
     • Mobile-friendly
     • Contact form
     • Google Maps integration
     • One week to launch
   - CTA: "Start Your Website"

G. FAQ (address objections)
   - "Can I make changes later?" → Yes, $200/update
   - "Do you include hosting?" → Yes, included for 1 year. After that, $20/month.
   - "What if I hate it?" → We revise until you're happy.
   - "How fast is the website?" → Optimized for Google. Fast page speed.
   - "What about SEO?" → Basic SEO built in. Monthly service available.

H. CTA Section (before footer)
   - Large button: "Schedule a Call"
   - Subtext: "Pick a time, we'll build your website preview"
   - Links to Calendly or booking form

I. Footer
   - Phone number (clickable)
   - Email (clickable)
   - Social links (if you have them)
   - Copyright

---

### 2. Demo Page (`/demo/[business-id]`)
**Customer-specific website preview**

This is THE page customers see from the postcard QR code.

Structure:
```
A. Header
   - Company logo (generated from business name)
   - Navigation: Home | Services | Contact
   - Phone number (prominent, clickable)

B. Hero Section (specific to business)
   - Business name
   - Business tagline (generated or custom)
   - Hero image (stock photo relevant to industry OR generated)
   - CTA: "Get Your Website Live"

C. Services Section (dynamic based on business type)
   - 3-4 key services for that industry
   - Simple text. No fluff.

D. Social Proof
   - "Join [Number] local businesses online"
   - Simple stat.

E. Contact Section
   - Phone number (prominent)
   - Contact form (Name, Phone, Email, Message)
   - "We'll build your final website and launch it in one week"

F. Footer
   - Phone number
   - Email
   - "Powered by BuildItToday.ai"
```

**CRITICAL:** Every demo should load in under 2 seconds. Speed IS your proof.

---

### 3. Services Page (`/services`)
**What you offer (optional, but useful for credibility)**

Sections:
```
- Website Design & Development
- Mobile-Friendly (essential)
- Contact Forms & Lead Capture
- Google Map Integration
- Performance Optimization
- One-Year Hosting Included
- Optional: Monthly Maintenance
```

Keep it simple. List the services. Move on.

---

### 4. Admin Page (`/admin`)
**For you to manage demos and postcard campaigns**

Features:
```
- Create new demo (select business type, fill in details)
- Generate Lob postcard (automatically creates QR code pointing to demo)
- View all demos
- Track which postcards were sent
- View customer leads/inquiries from demos
- Analytics: clicks per demo, form submissions
```

Backend: Simple form + Supabase queries. No fancy admin dashboard.

---

## KEY DESIGN DECISIONS

### Color Palette
- Primary: Professional blue or teal (trust, tech)
- Secondary: One accent color (orange or green for CTAs)
- Background: White or very light gray
- Text: Dark gray or black (not pure black, easier on eyes)

**Do NOT use:** Rainbow colors, gradients, multi-color schemes. This is for small business owners, not startups.

### Typography
- Headings: Bold, clean sans-serif (Inter, Outfit, or system font)
- Body: Regular weight, 16px minimum for mobile readability
- No script fonts, no serif headings

### Animation (Minimal & Purposeful)
```javascript
// DO:
- Fade-in images on scroll (ease-in-out, 0.6s)
- Slide-in testimonial cards (staggered, 0.3s each)
- Pulse on CTA button (continuous, draws eye)
- Smooth page transitions (0.3s opacity)

// DON'T:
- Spinning backgrounds
- Morphing shapes
- Parallax scrolling
- Auto-playing video (kills conversion)
- Complex menu animations
```

---

## CONVERSION OPTIMIZATION

### What Actually Converts
1. **Fast page load** (under 2s) — Shows you deliver speed
2. **Clear headline** — "Website. $1,500. One Week."
3. **Proof in portfolio** — 20 different real examples
4. **Social proof** — Customer testimonials
5. **Single CTA above fold** — "See Your Free Demo"
6. **Zero friction** — Phone number clickable on mobile
7. **Specific pricing** — $1,500 (no "starting at")

### What Kills Conversion
- Heavy animations (feels expensive)
- Video hero (takes time to load, 40% bounce immediately)
- Stock photo heroes (looks like template)
- Vague copy ("Solutions," "Leverage")
- Multiple CTAs (confuses people)
- Small text (especially on mobile)
- No phone number in header

---

## SPECIFIC PAGES & COMPONENTS

### Homepage Hero Component
```
<Hero>
  <Headline>Website For Your Business</Headline>
  <Subheadline>$1,500. Built in One Week.</Subheadline>
  <CTAButton href="/demo">See Your Free Demo</CTAButton>
  <BackgroundImage src="small-business-working.jpg" />
</Hero>
```

### Portfolio Grid Component
```
<PortfolioGrid>
  - Each item: Image + Business Name + Industry Tag
  - Click to open full demo page
  - Lazy load images (improves page speed)
  - 2-3 columns responsive
</PortfolioGrid>
```

### Testimonial Card Component
```
<TestimonialCard>
  <Quote>"Best investment for my business."</Quote>
  <Author>Sarah, Dental Office</Author>
  <Image>profile-photo.jpg</Image>
</TestimonialCard>
```

### CTA Button Component
```
<CTAButton variant="primary" size="large">
  Start Your Website
</CTAButton>
```
- Pulse animation (Framer Motion)
- Hover: slight background shift
- No rounded corners (cleaner)

### Demo Page Dynamic Component
```
<DemoPage businessId={params.id}>
  - Fetch business data from Supabase
  - Generate hero image (stock photo by industry)
  - Render services based on business type
  - Populate contact form with business phone
  - Track page view in analytics
</DemoPage>
```

---

## DATABASE SCHEMA (Supabase)

### Table: businesses
```
id: uuid (primary key)
name: string
industry: string (e.g., "plumbing", "dental", "cleaning")
phone: string
address: string
description: text
hero_image_url: string
created_at: timestamp
```

### Table: postcards
```
id: uuid
business_id: uuid (foreign key)
lob_request_id: string (from Lob API)
qr_code_url: string
sent_date: timestamp
status: string (sent, bounced, clicked)
```

### Table: leads
```
id: uuid
demo_id: uuid
name: string
phone: string
email: string
message: text
created_at: timestamp
followed_up: boolean
```

---

## LOBS INTEGRATION

### Generate Postcard When You Create a Demo
```javascript
// Pseudo-code
const createDemo = async (businessData) => {
  // 1. Save to Supabase
  const { data: business } = await supabase
    .from('businesses')
    .insert([businessData])
  
  // 2. Generate QR code pointing to demo
  const qrCodeUrl = `buildittoday.ai/demo/${business.id}`
  
  // 3. Call Lob API to create postcard
  const lob = new Lob({ apiKey: process.env.LOB_API_KEY })
  const postcard = await lob.postcards.create({
    front: `<html>...${qrCodeUrl}...</html>`,
    back: `<html>...company info...</html>`,
    to: {
      name: businessData.name,
      address_line1: businessData.address
    }
  })
  
  // 4. Store Lob request in Supabase
  await supabase.from('postcards').insert({
    business_id: business.id,
    lob_request_id: postcard.id,
    qr_code_url: qrCodeUrl
  })
}
```

---

## DEPLOYMENT

### Option 1: Vercel (Recommended for Speed)
```
1. Connect GitHub repo to Vercel
2. Set environment variables (Supabase, Lob API key)
3. Deploy on push
4. Point buildittoday.ai DNS to Vercel
```

### Option 2: Hetzner VPS + Docker
```
1. Dockerfile:
   FROM node:20-alpine
   WORKDIR /app
   COPY . .
   RUN npm install && npm run build
   CMD ["npm", "start"]

2. docker-compose.yml:
   - Next.js container
   - Nginx reverse proxy
   - Let's Encrypt SSL

3. Deploy: Push to GitHub, pull on server, docker-compose up
```

---

## ACTUAL CONVERSION FLOW

```
Day 1: You mail 500 postcards
Day 3-4: Responses start coming in
Customer receives postcard → Scans QR code
↓
Lands on buildittoday.ai/demo/[their-business]
↓
Sees a fully built, working website for a business like theirs
↓
Sees phone number prominently
↓
Calls your phone or fills contact form
↓
You say: "Liked the preview? That's yours for $1,500."
↓
They say yes
↓
You collect payment (Stripe)
↓
You spend 3-4 days building their final site
↓
You deliver
↓
Done
```

This is the flow. Simple. No complexity. No gimmicks.

---

## WHAT NOT TO DO

- Don't add "AI-generated video clips" in the hero (wastes load time, adds no value)
- Don't use heavy animations (confuses the value prop)
- Don't show "behind-the-scenes" footage (makes it seem complicated)
- Don't add case studies or long-form content (small business owners don't read past 2 paragraphs)
- Don't use dark mode (harder to read, less conversion)
- Don't build a mobile app (waste of time, nobody needs it)
- Don't create "customer dashboard" yet (first, get 10 paying customers)

---

## NEXT STEPS FOR CLAUDE CODE

1. Create Next.js 15 project with TypeScript
2. Install: shadcn/ui, Framer Motion, Supabase client, Lob client
3. Build pages in this order:
   - Homepage (hero + portfolio grid + testimonials + pricing)
   - Demo page (dynamic business preview)
   - Admin page (create demos, manage postcards)
4. Connect Supabase
5. Test locally
6. Deploy to Vercel
7. Set DNS on Cloudflare to point to Vercel

**Timeline: 5-7 days to launch.**

---

## THE ACTUAL SECRET

Your website doesn't need to be fancy. It needs to be:
- **Fast** (proves you deliver speed)
- **Clean** (proves you deliver quality)
- **Simple** (proves you don't overcomplicate)
- **Working** (proves your demo pages work)

The website itself becomes your portfolio. That's the entire strategy.

Build this. Launch it. Mail postcards. Close customers.

Everything else is noise.
