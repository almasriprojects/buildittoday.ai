# BuildItToday.ai — Frontend Architecture & Routes
*Complete Next.js page structure, routing, and component hierarchy*

---

## PROJECT STRUCTURE

```
buildittoday/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (nav, footer)
│   ├── page.tsx                      # Homepage
│   ├── fonts.ts                      # Font optimization
│   │
│   ├── (auth)/                       # Auth group routes
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   ├── (marketing)/                  # Public marketing pages
│   │   ├── services/
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   └── faq/
│   │       └── page.tsx
│   │
│   ├── demo/                         # Customer demo pages (public)
│   │   └── [businessId]/
│   │       ├── page.tsx              # Dynamic demo site
│   │       └── layout.tsx
│   │
│   ├── admin/                        # Your admin dashboard (protected)
│   │   ├── layout.tsx                # Admin nav + sidebar
│   │   ├── page.tsx                  # Dashboard overview
│   │   ├── customers/
│   │   │   ├── page.tsx              # Customer list
│   │   │   ├── [customerId]/
│   │   │   │   ├── page.tsx          # Customer details
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── campaigns/
│   │   │   ├── page.tsx              # Postcard campaigns
│   │   │   ├── [campaignId]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── analytics/
│   │   │   ├── page.tsx              # Overall analytics
│   │   │   └── [customerId]/
│   │   │       └── page.tsx          # Per-customer analytics
│   │   ├── billing/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── customer/                     # Customer portal (protected)
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Customer dashboard
│   │   ├── website/
│   │   │   ├── page.tsx              # View their site info
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── requests/
│   │   │   └── page.tsx              # Submit change requests
│   │   └── billing/
│   │       └── page.tsx
│   │
│   ├── api/                          # API routes
│   │   ├── auth/
│   │   │   ├── route.ts              # Auth endpoints
│   │   │   ├── login/
│   │   │   │   └── route.ts
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   └── logout/
│   │   │       └── route.ts
│   │   │
│   │   ├── checkout/
│   │   │   └── route.ts              # Stripe payment
│   │   │
│   │   ├── generate/
│   │   │   ├── route.ts              # Main generation endpoint
│   │   │   ├── analyze/
│   │   │   │   └── route.ts          # Competitor analysis
│   │   │   ├── design/
│   │   │   │   └── route.ts          # Design generation
│   │   │   └── code/
│   │   │       └── route.ts          # Code generation
│   │   │
│   │   ├── deploy/
│   │   │   ├── route.ts              # Deploy to Vercel
│   │   │   └── status/
│   │   │       └── route.ts
│   │   │
│   │   ├── customers/
│   │   │   ├── route.ts              # GET/POST customers
│   │   │   └── [customerId]/
│   │   │       └── route.ts          # GET/PUT/DELETE customer
│   │   │
│   │   ├── postcards/
│   │   │   ├── route.ts              # Generate postcards (Lob)
│   │   │   └── [postcardId]/
│   │   │       └── route.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── route.ts              # General analytics
│   │   │   └── [customerId]/
│   │   │       └── route.ts          # Per-customer analytics
│   │   │
│   │   ├── webhooks/
│   │   │   ├── stripe/
│   │   │   │   └── route.ts          # Stripe webhook
│   │   │   └── lob/
│   │   │       └── route.ts          # Lob webhook
│   │   │
│   │   └── track/
│   │       └── [demoId]/
│   │           └── route.ts          # QR scan tracking
│   │
│   └── error.tsx                     # Global error page
│
├── components/                       # Reusable components
│   ├── Navigation.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Form.tsx
│   ├── Modal.tsx
│   ├── Loading.tsx
│   │
│   ├── admin/
│   │   ├── Sidebar.tsx
│   │   ├── CustomerList.tsx
│   │   ├── CampaignForm.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   └── BillingTable.tsx
│   │
│   ├── demo/
│   │   ├── DemoHero.tsx              # Hero section
│   │   ├── DemoServices.tsx          # Services section
│   │   ├── DemoContact.tsx           # Contact form
│   │   ├── DemoTestimonials.tsx
│   │   └── DemoFooter.tsx
│   │
│   └── customer/
│       ├── CustomerNav.tsx
│       └── AnalyticsCard.tsx
│
├── lib/                              # Utility functions
│   ├── auth.ts                       # Authentication helpers
│   ├── api.ts                        # API client
│   ├── stripe.ts                     # Stripe integration
│   ├── lob.ts                        # Lob API integration
│   ├── claude.ts                     # Claude API integration
│   ├── database.ts                   # Supabase client
│   ├── validators.ts                 # Form validation
│   └── utils.ts                      # General utilities
│
├── public/                           # Static assets
│   ├── logos/
│   ├── icons/
│   └── images/
│
├── styles/
│   ├── globals.css                   # Global Tailwind
│   └── variables.css                 # CSS variables (colors, spacing)
│
└── next.config.js                    # Next.js config

```

---

## ROUTE STRUCTURE & PAGES

### PUBLIC ROUTES

#### Homepage (`/`)
```typescript
// app/page.tsx
- Hero section (headline + CTA)
- Problem statement
- How it works (3 steps)
- Portfolio gallery (20 websites)
- Testimonials (5-6 social proof)
- Pricing section
- FAQ
- Footer CTA
```

**Purpose:** Sell the vision, show proof, convert visitors to customers

**Key elements:**
- Hero image (small business at work)
- Portfolio grid (2-3 columns, responsive)
- Testimonial cards with rotation
- Clear pricing ($1,500 setup + $50/month)
- "Schedule a Call" CTA button
- Phone number in header (clickable)

---

#### Demo Page (`/demo/[businessId]`)
```typescript
// app/demo/[businessId]/page.tsx
- Dynamic route for each generated website
- Fetches business data from Supabase
- Renders pre-built demo site
- Tracks QR code scan
- Shows business-specific content

Structure:
1. Header (business name + phone)
2. Hero (business tagline + booking CTA)
3. Services (3-4 industry-specific services)
4. Testimonials (generic but realistic)
5. Contact form (Name, Phone, Email)
6. Footer

Analytics tracked:
- Page view timestamp
- Time on page
- Scroll depth
- Form submission
- CTA clicks
```

**Why this is critical:** This is what the customer sees from the postcard. Must be FAST and PROFESSIONAL.

---

#### Services Page (`/services`)
```typescript
// app/(marketing)/services/page.tsx
- Website Design & Development
- Mobile-Responsive Design
- SEO Optimization
- Contact Forms & Lead Capture
- Google Maps Integration
- One-Year Hosting Included
- Monthly Maintenance Plans

Simple cards layout. No fluff.
```

---

#### Pricing Page (`/pricing`)
```typescript
// app/(marketing)/pricing/page.tsx
One card. One price. $1,500.

What's included:
✓ Custom website (5-7 pages)
✓ Mobile-responsive design
✓ Contact forms
✓ Google Maps
✓ 1 year hosting included
✓ Free domain
✓ 3 revisions included

CTA: "Start Your Website"
```

---

#### FAQ Page (`/faq`)
```typescript
// app/(marketing)/faq/page.tsx
Accordion-style FAQ

Questions:
1. "How long does it take?"
   → "One week from approval to launch"

2. "Can I make changes later?"
   → "Yes, $200 per change request"

3. "What if I don't like it?"
   → "We revise until you're happy (3 free revisions)"

4. "Do you include hosting?"
   → "Yes, included for 1 year. After that, $50/month"

5. "Is it mobile-friendly?"
   → "100% mobile-responsive"

6. "Can I use my own domain?"
   → "Yes, or we provide a free subdomain"

7. "What about SEO?"
   → "Basic SEO included. Monthly optimization available"
```

---

### PROTECTED ROUTES (Admin Panel)

#### Admin Dashboard (`/admin`)
```typescript
// app/admin/page.tsx
Overview of entire business:

Components:
1. Key metrics cards (top row)
   - Total customers
   - Monthly recurring revenue
   - Postcards sent (this month)
   - New leads (this month)

2. Recent customers table (last 10)
   - Business name
   - Signup date
   - Status (active/pending/churned)
   - Monthly spend
   - Actions (view/edit)

3. Revenue chart (last 6 months)
   - Setup revenue (bars)
   - Recurring revenue (line)

4. Recent campaigns (last 3)
   - Postcards sent
   - QR scans
   - Conversion rate
   - Revenue generated
```

**Data needed from Supabase:**
```sql
SELECT 
  COUNT(*) as total_customers,
  SUM(monthly_payment) as monthly_recurring,
  COUNT(CASE WHEN status='active') as active_customers
FROM customers;

SELECT 
  business_name, signup_date, status, monthly_payment
FROM customers
ORDER BY signup_date DESC
LIMIT 10;
```

---

#### Customers (`/admin/customers`)
```typescript
// app/admin/customers/page.tsx
Table of all customers:
- Business name
- Industry
- Signup date
- Monthly payment
- Hosting status (active/paused)
- QR scans (this month)
- Revenue (lifetime)
- Actions (view/edit/delete)

Filters:
- Status (active/paused/churned)
- Industry
- Date range
- Payment status

Can export to CSV for accounting.
```

---

#### Customer Details (`/admin/customers/[customerId]`)
```typescript
// app/admin/customers/[customerId]/page.tsx
Complete customer profile:

Sections:
1. Business Info
   - Name, phone, address, industry
   - Edit button

2. Website Info
   - Live URL
   - Deploy date
   - Last updated
   - Demo site URL
   - QR code (downloadable)

3. Financial
   - Setup fee paid ($1,500)
   - Monthly payment ($50)
   - Invoice history (table)
   - Pause/Cancel subscription

4. Performance
   - Monthly visitors (chart)
   - Form submissions (chart)
   - Top pages
   - Load time

5. Recent Activity
   - QR scans (timeline)
   - Form submissions
   - Support requests
   - Changes made

6. Actions
   - Edit website
   - Send postcard reminder
   - Pause subscription
   - Delete account
```

---

#### New Customer (`/admin/customers/new`)
```typescript
// app/admin/customers/new/page.tsx
Form to manually create a customer:

Fields:
- Business name (required)
- Industry (dropdown)
- Phone (required)
- Address (required)
- Email (required)

On submit:
1. Validate fields
2. Create customer in DB
3. Call `/api/generate` to create website
4. Deploy to Vercel
5. Create Lob postcard template
6. Show confirmation with URL + QR code
```

---

#### Campaigns (`/admin/campaigns`)
```typescript
// app/admin/campaigns/page.tsx
Postcard campaign management:

Table:
- Campaign name
- Date sent
- Postcards sent
- QR scans
- Conversions
- ROI (revenue / cost)
- Actions (view details)

Stats:
- Total sent: 500
- Total scans: 25-40 (5-8%)
- Total conversions: 5-8
- Avg customer value: $1,500
- Avg postcard cost: $0.50
```

---

#### Create Campaign (`/admin/campaigns/new`)
```typescript
// app/admin/campaigns/new/page.tsx
Step-by-step campaign creation:

Step 1: Select business list
- Load from CSV
- Filter: industry, location, registration date
- Preview: "1,000 businesses selected"

Step 2: Generate websites
- For each business, call `/api/generate`
- Show progress: "500/1000 websites generated"
- Time estimate: "~4 hours"

Step 3: Configure postcard
- Front: Business name + "Your website is ready" + QR
- Back: Your phone + BuildItToday.ai
- Preview postcard design

Step 4: Review & Submit
- Cost estimate: "500 postcards = $250"
- Timeline: "Delivery in 5-7 days"
- Submit to Lob API

Result: Postcards sent, tracking begins
```

---

#### Analytics (`/admin/analytics`)
```typescript
// app/admin/analytics/page.tsx
High-level business analytics:

Sections:
1. Revenue dashboard
   - Setup revenue (cumulative)
   - Recurring revenue (trend line)
   - Projected annual recurring revenue
   - Churn rate

2. Customer lifecycle
   - New customers (this month)
   - Active customers (total)
   - Churned customers (this month)
   - LTV (lifetime value)

3. Campaign performance
   - Total postcards sent
   - Avg response rate (5-8%)
   - Avg conversion rate (20%)
   - Avg customer acquisition cost
   - ROI per postcard

4. Website performance
   - Avg page load time
   - Avg monthly visitors (per site)
   - Avg form submissions (per site)
   - Most visited pages

5. Comparisons
   - Month over month growth
   - Best performing industries
   - Best performing campaigns
```

---

#### Per-Customer Analytics (`/admin/analytics/[customerId]`)
```typescript
// app/admin/analytics/[customerId]/page.tsx
Detailed metrics for one customer:

Metrics:
- Total visits (this month)
- Unique visitors
- Page views
- Average time on page
- Bounce rate
- Top pages (traffic %)
- Contact form submissions
- Phone clicks

Charts:
- Visitor trend (last 30 days)
- Traffic by page
- Time on page by page
- Conversion funnel

Actions:
- Download report (PDF)
- Share with customer
- Request feedback
```

---

#### Billing (`/admin/billing`)
```typescript
// app/admin/billing/page.tsx
Financial tracking:

Table:
- Customer name
- Monthly payment
- Status (active/pending/paused)
- Next billing date
- Last payment date
- Amount paid (lifetime)

Actions:
- Manually collect payment (Stripe)
- Email invoice
- Pause subscription
- Update payment amount

Summary:
- Monthly recurring revenue
- Overdue payments
- Upcoming invoices (next 7 days)
```

---

### PROTECTED ROUTES (Customer Portal)

#### Customer Dashboard (`/customer`)
```typescript
// app/customer/page.tsx
What the customer sees:

1. Website status
   - "Your site is live at: [URL]"
   - Last updated: [date]
   - Monthly visitors: [number]

2. Performance (this month)
   - New visitors: [count]
   - Form submissions: [count]
   - Top page: [page name]

3. Quick actions
   - View live site (button)
   - Request changes (button)
   - Contact support (button)

4. Billing
   - Next payment: $50 on [date]
   - Payment method: [ending in 4242]
   - Pause subscription (link)

5. Support
   - FAQ
   - Contact email
```

---

#### Website Settings (`/customer/website/settings`)
```typescript
// app/customer/website/settings/page.tsx
Manage their website:

Fields (editable):
- Business description
- Phone number
- Email
- Hours
- Social media links
- Address

Actions:
- Update (saves to DB, triggers redeploy)
- Request design changes (form)
- Download logo (if available)

Changes submitted here:
- Send to you as change requests
- You review + implement
- Customer gets notified when live
```

---

#### Analytics (`/customer/analytics`)
```typescript
// app/customer/analytics/page.tsx
Simplified analytics view:

Sections:
1. Key metrics
   - Visitors this month
   - Form submissions
   - Top page

2. Visitor trend (chart, last 30 days)

3. Top pages (simple list)

4. Submit feedback
   - "What's working?"
   - "What needs improvement?"
```

---

#### Support Requests (`/customer/requests`)
```typescript
// app/customer/requests/page.tsx
Submit & track change requests:

List of past requests:
- Description
- Date submitted
- Status (submitted/in-progress/complete)
- Response (if complete)

Form to create new request:
- Type (design change / content update / feature request)
- Description
- Priority (low/medium/high)
- Attach images (optional)

Submit → Creates ticket in your system
```

---

## API ROUTES (Endpoints You'll Build)

### Authentication
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
POST /api/auth/verify-email
POST /api/auth/reset-password
```

### Generation Pipeline
```
POST /api/generate
  Input: business_name, industry, phone, address
  Output: deployed_url, qr_code, html_file

POST /api/generate/analyze
  Input: industry, location
  Output: competitor_sites, design_patterns

POST /api/generate/code
  Input: design_system, business_data
  Output: tsx_components, html, css

POST /api/deploy
  Input: code, subdomain
  Output: live_url, qr_code
```

### Customers
```
GET /api/customers
GET /api/customers/[customerId]
POST /api/customers
PUT /api/customers/[customerId]
DELETE /api/customers/[customerId]
```

### Postcards
```
POST /api/postcards
  Input: business_list (CSV), design
  Output: lob_request_id, cost

GET /api/postcards/[campaignId]
  Output: postcard_status, qr_scans, conversions

POST /api/postcards/[campaignId]/send
  Action: Send to Lob API
```

### Analytics
```
GET /api/analytics
  Output: total_revenue, mrr, churn_rate

GET /api/analytics/[customerId]
  Output: visitor_count, form_subs, top_pages

POST /api/analytics/track/[demoId]
  Action: Log QR scan or page view
```

### Payments
```
POST /api/checkout
  Input: customer_id, amount
  Output: stripe_session_url

POST /api/webhooks/stripe
  Action: Verify payment, update customer status
```

---

## COMPONENT HIERARCHY

### Homepage Components
```
Home (page.tsx)
├── Hero
├── ProblemStatement
├── HowItWorks (3 steps)
├── PortfolioGallery
│   └── PortfolioItem (× 20)
├── Testimonials
│   └── TestimonialCard (× 5)
├── Pricing
└── FAQ
```

### Admin Components
```
AdminLayout
├── Sidebar (navigation)
└── Content
    ├── DashboardPage
    │   ├── MetricsCard (× 4)
    │   ├── RecentCustomersTable
    │   └── RevenueChart
    ├── CustomersPage
    │   └── CustomersTable
    ├── CustomerDetailsPage
    │   ├── BusinessInfoCard
    │   ├── FinancialCard
    │   ├── AnalyticsCard
    │   └── ActionButtons
    ├── CampaignPage
    │   ├── CampaignForm
    │   └── CampaignList
    └── AnalyticsPage
        ├── RevenueChart
        ├── CustomerLifecycleChart
        └── CampaignPerformanceTable
```

### Demo Site Components
```
DemoLayout
├── DemoHeader
│   ├── Logo (business name)
│   ├── Navigation
│   └── Phone number
├── DemoHero
├── DemoServices
├── DemoGallery (if applicable)
├── DemoTestimonials
├── DemoContact
└── DemoFooter
```

---

## AUTHENTICATION & PROTECTION

### Public Routes
- `/` — Homepage
- `/services` — Services page
- `/pricing` — Pricing
- `/faq` — FAQ
- `/demo/[businessId]` — Customer demo sites

### Admin-Only Routes (require login + admin role)
- `/admin/*` — All admin pages
- `/api/generate/*` — Generation endpoints
- `/api/customers/*` — Customer management
- `/api/campaigns/*` — Campaign management

### Customer-Only Routes (require login + customer role)
- `/customer/*` — Customer portal
- `/api/customer/*` — Customer-specific endpoints

### Middleware Protection
```typescript
// middleware.ts
- Check auth token (JWT)
- Validate role (admin / customer / public)
- Redirect if unauthorized
- Add user context to request
```

---

## NAVIGATION STRUCTURE

### Public Navigation
- Logo → Homepage
- Services
- Pricing
- FAQ
- Contact
- Login (top right)

### Admin Navigation (Sidebar)
- Dashboard
- Customers
  - List
  - New Customer
- Campaigns
  - List
  - New Campaign
- Analytics
  - Overview
  - By Customer
- Billing
- Settings
- Logout

### Customer Navigation (Sidebar)
- Dashboard
- My Website
  - View Live Site
  - Settings
  - Analytics
  - Support Requests
- Billing
- Logout

---

## KEY DESIGN DECISIONS

1. **Role-based access:** Admin vs Customer portals are completely separate
2. **Dynamic demo sites:** Each customer sees their own pre-built website
3. **Single-page admin:** Admins manage everything from one interface
4. **No complex navigation:** Users always know where they are
5. **Mobile-first:** All pages work on mobile (primary customer device)
6. **Fast load times:** Demo pages must load in < 2 seconds
7. **Zero friction:** Phone numbers clickable, forms pre-filled, CTAs clear

---

## NEXT STEP

Use this architecture as your blueprint. Start with:
1. Root layout and homepage
2. Demo page template
3. Admin dashboard
4. Then fill in the rest

Each page references the backend schema (next document) to understand what data to fetch.
