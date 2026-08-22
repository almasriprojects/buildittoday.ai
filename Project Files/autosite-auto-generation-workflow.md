# BuildItToday.ai — Automated Website Generation Workflow
*Pre-build demo sites and send QR code via postcard before customer even knows they want you*

---

## CRITICAL ARCHITECTURAL DECISION: Hosted Demo vs. Customer-Owned Server

You asked: *"Should we deploy to one template server and move files under customer names, or auto-deploy to their VPS?"*

**The honest answer:** Deploy to YOUR servers first. Here's why.

### The Two Approaches

**APPROACH A: Hosted Demo (Your Recommendation)**
- Generate HTML/React code
- Deploy to `buildittoday.ai/demo/[business-name-uuid]`
- Customer scans QR code → sees working site on YOUR domain
- If they buy → you control deployment decision later
- Speed: 4 minutes to demo
- Cost: $0.001 per page view
- Conversion: HIGH (immediate proof)

**APPROACH B: Auto-Deploy to Their VPS**
- Generate TypeScript project
- Auto-provision Docker container on THEIR server
- Deploy to THEIR domain
- Customer scans → sees site on their own domain
- Speed: 10-15 minutes (server provisioning + deployment)
- Cost: High (you manage their infrastructure)
- Complexity: Very high (error handling, updates, maintenance)
- Conversion: MEDIUM (they need server access first)

### The Real Answer

**Use APPROACH A (Hosted Demo) + Smart Fulfillment Logic**

Here's why this is the only correct architecture:

**From the customer's perspective:**
1. They get postcard with QR code
2. They scan → see their website LIVE and WORKING on buildittoday.ai
3. They think: "They built this. It works. It's beautiful."
4. They call you
5. You say: "Like it? Yours for $1,500. We can host it on your domain, or your own server, your choice."
6. Based on their choice, you execute:
   - **Option 1 (They pick hosted):** Flip DNS to their domain, keep it on your server, charge $20/month for hosting
   - **Option 2 (They pick self-hosted):** Generate Docker deployment commands, they run them on their VPS, you provide support
   - **Option 3 (They pick third-party):** Export project, they upload to Bluehost/Namecheap/etc.

**Why this wins:**

1. **Fastest to proof** (4 minutes, not 15)
2. **Zero friction to show proof** (no need their server credentials)
3. **Highest conversion** (they see working product first)
4. **Most profitable** (hosting fee + setup = extra revenue)
5. **Least complex** (you don't manage their servers)
6. **Easiest to scale** (shared hosting, not per-customer infrastructure)

**The cost difference:**
- Approach A: $0.001 per page view = ~$1-2/month per demo
- Approach B: $10-50/month per deployed server = 100x more expensive

**You should NEVER auto-deploy to customer servers on the demo stage.** That's expensive, slow, and adds zero value. They can't access it anyway (they don't have a server yet).

---

## THE BRAIN BEHIND THE SYSTEM (How It Actually Works)

Before diving into steps, you need to understand the **three phases** of the system:

### Phase 1: PRE-CONTACT (Automated, Zero Customer Involvement)
**What happens:** Everything before they call you

1. Identify business (from SunBiz)
2. Research competitors (analyze top 5 sites)
3. Extract design patterns (Claude reads screenshots)
4. Generate HTML (Claude creates complete website)
5. Convert to TypeScript (Claude modularizes components)
6. Deploy to demo server (Next.js + Vercel)
7. Generate postcard + QR code (Lob API)
8. Send postcard (USPS)

**Timeline:** 4 minutes from SunBiz data → postcard mailed  
**Cost:** $0.60 per demo  
**Customer's experience:** Receives postcard, scans QR code, sees working website

### Phase 2: CONTACT (Semi-Automated, Customer Initiated)
**What happens:** When they scan the QR code or call

1. QR code → `buildittoday.ai/demo/[uuid]`
2. They see their website (working, beautiful, ready)
3. Analytics track: page views, time spent, contact form submission
4. If they call: you answer
5. You say: "Saw your website? That's $1,500 to make it official."
6. They say: "Yes" or "Tell me more"
7. You close the sale

**Timeline:** 30 seconds for demo page load  
**Cost:** $0.001 per page view  
**Your effort:** 5-10 minute phone call per close

### Phase 3: FULFILLMENT (Customer-Specific, Triggered by Purchase)
**What happens:** After they pay

**Logic tree in the system:**

```
Customer buys $1,500 package
  ↓
System asks: "Where do you want it hosted?"
  ↓
  ├─ Option A: "Host it for me ($20/month)"
  │   ↓ System: Flip DNS to their domain on your server
  │   ↓ System: Set up SSL + backups
  │   ↓ System: Update demo site to production
  │   ↓ Time: 2 hours
  │   ↓ Your cost: $1/month (hosting)
  │
  ├─ Option B: "Give me Docker commands for my VPS"
  │   ↓ System: Generate Dockerfile + docker-compose.yml
  │   ↓ System: Generate deployment instructions (README)
  │   ↓ System: Email them commands + support docs
  │   ↓ Time: 30 minutes (they run commands)
  │   ↓ Your cost: $0 (they manage their server)
  │
  └─ Option C: "I'll upload to Bluehost/Namecheap"
      ↓ System: Generate .zip with all files
      ↓ System: Include FTP upload instructions
      ↓ Time: 20 minutes (they upload)
      ↓ Your cost: $0 (they manage hosting)
```

**This is the brain.** It's a decision tree that handles each customer's choice automatically.

---

## THE COMPLETE WORKFLOW (8 Steps)

### STEP 1: Lead Scraper (n8n Workflow)
**Input:** Nothing (runs scheduled daily)  
**Output:** 50-200 new businesses per day ready for demo generation  
**Purpose:** Find new LLCs that don't have websites yet

**Exact process:**
1. Query SunBiz (Florida Secretary of State public database)
2. Filter: LLC registrations from past 7-30 days (new businesses)
3. Extract:
   - Business name
   - Business type (from filing)
   - Address
   - Phone (search via Google Maps)
   - Email (if available)
4. For each business, check: Do they have a website?
   - If YES → skip (they're handled)
   - If NO → add to queue for demo generation
5. Find top 5 competitor websites in same industry + city
6. Save complete profile to Supabase

**What gets stored:**
```
{
  business_id: uuid,
  name: "Sally's Hair Salon",
  industry: "hair salon",
  city: "Miami",
  phone: "305-555-1234",
  address: "123 Main St, Miami, FL 33101",
  competitors: [
    "competitor1.com",
    "competitor2.com",
    "competitor3.com",
    "competitor4.com",
    "competitor5.com"
  ],
  status: "ready_for_analysis"
}
```

**Tools:**
- SunBiz API (public, free)
- Google Places API ($0.01 per lookup)
- Puppeteer/Cheerio (website detection)
- n8n workflow orchestration

**Time per business:** 5 seconds  
**Cost per business:** $0.02 (API calls)  
**Daily output:** ~100-200 ready businesses

---

### STEP 2: Competitor Screenshot & Analysis (n8n + Puppeteer)
**Input:** 5 competitor URLs from Step 1  
**Output:** Full-page screenshots + structured HTML data  
**Purpose:** Understand what good looks like in this industry

**Exact process:**
1. For each competitor URL:
   - Take full-page screenshot (using Puppeteer headless browser)
   - Save screenshot as image file to MinIO (image storage)
   - Extract raw HTML (save to Supabase)
   - Extract metadata:
     - Colors used (scan CSS)
     - Layout structure (header, hero, sections, footer)
     - CTA buttons (text, position)
     - Forms present (yes/no)
     - Social links
2. Process 5 screenshots → prepare for Step 3

**What gets stored:**
```
{
  competitor_id: uuid,
  business_id: uuid (link back to original business),
  url: "competitor1.com",
  screenshot_url: "s3://minIO/screenshots/competitor1.jpg",
  html_raw: "<html>...</html>",
  metadata: {
    primary_color: "#333",
    secondary_color: "#FF6B9D",
    sections: ["nav", "hero", "services", "staff", "gallery", "testimonials", "contact"],
    has_booking_form: true,
    cta_text: ["Book Now", "Schedule Appointment"],
    vibe: "modern, minimalist"
  }
}
```

**Tools:**
- Puppeteer (headless browser, screenshots)
- Cheerio (HTML parsing, CSS extraction)
- MinIO (store screenshots)
- n8n (orchestration)

**Time per competitor:** 3 seconds (5 competitors = 15 seconds)  
**Cost:** $0.02 per business (screenshot storage)  
**Output:** 5 screenshots + structured HTML data

---

### STEP 3: Design Pattern Analysis (Claude Vision + n8n)
**Input:** 5 screenshots + HTML data from Step 2  
**Output:** Industry-specific design system  
**Purpose:** Understand what works in this industry, create consistent design

**Exact process:**
1. Call Claude Vision API with all 5 screenshots
2. Prompt Claude to analyze:
   - Common layout patterns
   - Color palettes used
   - Typography choices
   - Button/CTA styles
   - What makes them professional
3. Claude returns structured design system
4. Save to Supabase

**Prompt to Claude:**
```
You are analyzing 5 professional hair salon websites from Miami.

Screenshots: [5 images]
Raw HTML: [competitor data]

Answer these questions:
1. What's the primary color palette? (list hex codes)
2. What layout pattern is used? (hero + sections?)
3. How are services displayed? (grid? cards? text?)
4. What CTAs are used? ("Book Now"? "Schedule"? "Call"?)
5. What typography? (modern serif? clean sans-serif?)
6. What sections appear in every site? (services, staff, testimonials, contact?)

Generate a JSON design system that:
- Follows industry best practices
- Feels professional and trustworthy
- Is optimized for conversion

Output ONLY valid JSON, no markdown.
```

**What gets stored:**
```json
{
  "design_pattern_id": uuid,
  "business_id": uuid,
  "industry": "hair salon",
  "design_system": {
    "colors": {
      "primary": "#2C3E50",
      "secondary": "#F39C12",
      "accent": "#E74C3C",
      "background": "#F5F5F5",
      "text": "#333"
    },
    "typography": {
      "heading_font": "Poppins",
      "heading_weight": "700",
      "body_font": "Inter",
      "body_weight": "400",
      "size_heading": "32px",
      "size_body": "16px"
    },
    "layout": {
      "hero": "full_width_image_with_cta",
      "sections": ["services", "staff", "testimonials", "contact"],
      "footer": "dark_background_with_contact"
    },
    "components": {
      "cta_button": "rounded_corners, primary_color",
      "service_card": "grid_3_columns, icon_top",
      "testimonial": "quote_marks, star_rating",
      "contact_form": "simple_3_fields"
    },
    "vibe": "modern, minimalist, professional, welcoming"
  }
}
```

**Tools:**
- Claude Vision API (analyze screenshots)
- n8n (orchestration)

**Time:** 20 seconds (Claude thinks about 5 images)  
**Cost:** $0.05 (Claude Vision)  
**Output:** Complete design system for that industry

---

### STEP 4: HTML Template Generator (Claude + n8n)
**Input:** Design system + business data (name, phone, address)  
**Output:** Complete, production-ready HTML file

What it does:
1. Take the design system
2. Generate a single-page HTML website
3. Include all industry-standard sections:
   - Navigation (business name + phone)
   - Hero (business name + tagline)
   - Services section (3-4 key services)
   - Staff/About section
   - Testimonials (generic but realistic)
   - Booking CTA
   - Contact (phone, address, hours)
   - Footer

**Prompt to Claude:**
```
You are a web designer building a website for a hair salon.
Business name: [name]
Phone: [phone]
Address: [address]
Design system: [colors, typography, layout]

Generate a complete, production-ready HTML file with:
- Semantic HTML5
- Inline TailwindCSS (no external CDN calls)
- Responsive design (mobile-first)
- Fast load time
- No external images (use placeholder SVGs or solid colors)
- Accessibility (alt tags, ARIA labels)

Structure:
- Nav: Business name + phone
- Hero: Tagline + "Book Your Appointment"
- Services: 4 services with icons
- Testimonials: 3 reviews
- Contact: Phone + hours + address
- Footer

Make it professional and trustworthy.
```

**Output:** Full HTML file with inline CSS + minimal JavaScript

**Storage:** Save raw HTML to Supabase table `html_templates`, also save as file to MinIO

---

### STEP 5: HTML to React/TypeScript Converter (Claude Code Agent)
**Input:** HTML file from Step 4  
**Output:** Modular React TypeScript components

What it does:
1. Parse HTML
2. Extract individual sections (Hero, Services, Contact, etc.)
3. Convert each section to a React component
4. Create Tailwind classes (no inline styles)
5. Add TypeScript interfaces for props
6. Generate main page component that combines all

**Prompt to Claude:**
```
Convert this HTML website to modular React TypeScript components.

Requirements:
- Create separate components: Hero, Services, Testimonials, Contact, Footer, Header
- Each component should have TypeScript interface for props
- Use TailwindCSS for styling (no inline styles)
- Make it reusable (props-driven)
- Include proper TypeScript types
- Export components as named exports

Structure:
- components/Hero.tsx
- components/Services.tsx
- components/Testimonials.tsx
- components/Contact.tsx
- components/Footer.tsx
- pages/[businessId].tsx (main page that combines all)

The main page should:
- Accept businessId as param
- Fetch business data from Supabase
- Render all components with business-specific data
- Track page view in analytics
- Include button to contact or book
```

**Output:** Complete Next.js component structure with TypeScript

**Storage:** Save to GitHub repo under `components/` + deploy-ready code to Supabase

---

### STEP 6: Build & Deploy (Next.js + Vercel)
**Input:** React components from Step 5  
**Output:** Live website at `buildittoday.ai/demo/[business-id]`

What it does:
1. Combine components into complete Next.js page
2. Connect to Supabase for business data
3. Add analytics tracking (Vercel Analytics)
4. Deploy to Vercel (auto-deploy via GitHub)
5. Create unique URL: `buildittoday.ai/demo/[business-name-uuid]`
6. Set up SSL (automatic)

**Process:**
```bash
1. GitHub commit: components + page
2. Vercel webhook triggers build
3. Build completes in 2-3 minutes
4. Site live at unique URL
5. Return URL to workflow
```

**Storage:** URL stored in Supabase table `deployed_demos`

---

### STEP 7: Postcard Generation & Sending (Lob + n8n)
**Input:** Business address + deployed demo URL  
**Output:** Postcard sent to customer with QR code

What it does:
1. Generate QR code pointing to demo URL
2. Create postcard design:
   - Front: Business name + "Your website is ready" + QR code
   - Back: Phone number + "See your free website preview"
3. Send via Lob API
4. Track delivery status

**Postcard copy:**
```
[FRONT]
=====================================
[Business Name]
Your Website Is Ready.
[QR Code] → buildittoday.ai/demo/xyz

[BACK]
=====================================
Hi [Name],

We reviewed your business and built you 
a professional website preview.

See it instantly: Scan QR code above.

Like what you see? 
Call us to make it official.

[Your Phone Number]
BuildItToday.ai
```

**Storage:** Lob request logged in Supabase table `postcards_sent`

---

### STEP 8: Lead Tracking & Conversion (Supabase + Analytics)
**Input:** Customer scans QR code  
**Output:** Lead data + conversion tracking

What it does:
1. When they scan QR code → redirect to demo URL
2. Track:
   - QR scan timestamp
   - How long they spend on demo page
   - If they click "Book" or contact button
   - Phone call (if they call directly)
3. Store in Supabase table `lead_activity`
4. Alert you in real-time (email/Slack)

**Database tracking:**
```
leads table:
- id
- business_id
- qr_scan_time
- contact_attempted (bool)
- contacted_us_at (timestamp)
- paid_status (yes/no)
```

---

## COMPLETE N8N WORKFLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Lead Scraper (SunBiz + Google Maps)            │
│ → Output: CSV of 5,000 new LLCs                        │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Batch Process (Split Node)                      │
│ → For each business, trigger Steps 2-7 in parallel     │
└────────────────┬────────────────────────────────────────┘
                 ↓
      ┌──────────┴──────────┐
      ↓                     ↓
┌──────────────────┐  ┌──────────────────────┐
│ STEP 2:          │  │ STEP 2:              │
│ Competitor       │  │ Competitor Research  │
│ Screenshot       │  │ (Claude analysis)    │
└────────┬─────────┘  └────────┬─────────────┘
         │                     │
         └──────────┬──────────┘
                    ↓
         ┌──────────────────────┐
         │ STEP 3:              │
         │ Design Pattern       │
         │ Extractor (Claude)   │
         └────────┬─────────────┘
                  ↓
         ┌──────────────────────┐
         │ STEP 4:              │
         │ HTML Generator       │
         │ (Claude)             │
         └────────┬─────────────┘
                  ↓
         ┌──────────────────────┐
         │ STEP 5:              │
         │ HTML→TSX Converter   │
         │ (Claude)             │
         └────────┬─────────────┘
                  ↓
         ┌──────────────────────┐
         │ STEP 6:              │
         │ Build & Deploy       │
         │ (Next.js + Vercel)   │
         └────────┬─────────────┘
                  ↓
         ┌──────────────────────┐
         │ STEP 7:              │
         │ Postcard Gen & Send  │
         │ (Lob API)            │
         └────────┬─────────────┘
                  ↓
         ┌──────────────────────┐
         │ STEP 8:              │
         │ Lead Tracking        │
         │ (Supabase)           │
         └──────────────────────┘
```

---

## TIMING & SCALING

### Per Business:
- Step 1: 5 seconds (scrape SunBiz)
- Step 2: 15 seconds (screenshot + extract)
- Step 3: 20 seconds (Claude analysis)
- Step 4: 30 seconds (HTML generation)
- Step 5: 45 seconds (component conversion)
- Step 6: 2 minutes (deploy)
- Step 7: 5 seconds (postcard generation)
- **Total: ~4 minutes per website**

### Scale:
- 1,000 businesses → 66 hours of compute (run in parallel, finishes in 2-3 hours)
- 5,000 businesses → 330 hours of compute (run overnight, finishes in 12-15 hours)

**Cost per website:**
- Claude API calls: ~$0.05-0.10
- Vercel hosting: ~$0.001-0.005
- Lob postcard: ~$0.50
- **Total COGS: ~$0.60 per demo site**

---

## IMPLEMENTATION SEQUENCE

### Week 1: Build the infrastructure
- ✅ Set up Next.js app with Supabase
- ✅ Build Step 6 (deploy pipeline)
- ✅ Test with 5 manual websites

### Week 2: Build n8n workflows
- ✅ Step 1: SunBiz scraper
- ✅ Step 2: Screenshot + competitor research
- ✅ Step 3: Design pattern extractor
- ✅ Step 4: HTML generator
- ✅ Step 5: HTML to TSX converter

### Week 3: End-to-end test
- ✅ Run workflow on 50 businesses
- ✅ Verify all demo sites deploy correctly
- ✅ Test QR codes from postcards
- ✅ Track analytics

### Week 4: Scale & mail
- ✅ Generate 500 demo sites
- ✅ Mail 500 postcards
- ✅ Track conversions

---

## EXPECTED RESULTS

### Before (Manual Build):
- Build time: 3-4 days per customer
- Conversion rate: 2-3% (direct mail typical)
- Cost to acquire: $300+ (time + energy)

### After (Auto-Build):
- Build time: 0 days (done before postcard sent)
- Conversion rate: 5-8% (proof of work)
- Cost to acquire: $0.60 (just Lob postcard + API)
- Revenue per close: $1,500
- Profit per close: $1,200+

### Month 1-2 (500 postcards):
- 500 postcards sent
- ~25-40 scan QR code and visit demo
- ~5-8 convert to customers
- Revenue: $7,500-12,000
- Cost: $250 (postcards) + $300 (API/hosting)
- Profit: $6,950-11,450

### Month 3+ (Scale):
- 2,000 postcards/month
- 100-160 site visits/month
- 20-32 customers/month
- Revenue: $30,000-48,000/month

---

## KEY ADVANTAGES OF THIS MODEL

1. **Zero build time** — Site exists before they call
2. **Proof of speed** — Shows you CAN deliver fast
3. **Risk elimination** — They see exactly what they get
4. **Higher close rate** — Pre-sold by the time they call
5. **Scalability** — Automatic generation = infinite scaling
6. **Cost efficient** — $0.60 COGS, $1,500 revenue
7. **Viral potential** — Each business might share their free site ("Look, they built this for me!")

---

## THE HONEST CAVEAT

This is complex. It requires:
- Solid n8n skills (you have this)
- Claude API integration (you have this)
- Vercel deployment pipeline (you can learn in 1 day)
- Supabase database design (you know this)
- Error handling for edge cases (every 100th website will break, plan for it)

**But once it's running, it's hands-off. You just mail postcards and close customers.**

---

## NEXT STEPS

1. ✅ Read this spec completely
2. ✅ Start with Step 6 (deploy one manual site, make sure it works)
3. ✅ Build Step 4 (HTML generator in Claude)
4. ✅ Build Step 5 (HTML to TSX converter)
5. ✅ Connect Steps 4→5→6 in n8n
6. ✅ Test with 10 sample businesses
7. ✅ Build Steps 1-3 (competitor research)
8. ✅ Run full workflow on 100 businesses
9. ✅ Mail first batch of 500 postcards
10. ✅ Track conversions

**Timeline: 4 weeks from start to first revenue.**

This is the actual automation that solves your problem.
