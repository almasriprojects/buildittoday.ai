# BuildItToday.ai — Backend Architecture & Database Schema
*Complete database design, SQL tables, and API endpoints*

---

## DATABASE OVERVIEW

**Database:** Supabase PostgreSQL  
**Schemas:** public (all main tables)  
**Connections:** Next.js API routes → Supabase client  
**Authentication:** Supabase Auth (JWT tokens)

---

## CORE TABLES

### 1. USERS TABLE (Authentication)
Stores user accounts (you + customers)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'customer', -- 'admin' or 'customer'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'deleted'
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  -- Indexes for fast lookups
  CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

---

### 2. CUSTOMERS TABLE (Your Paying Customers)
Stores business information for each customer

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Links to customer's user account
  
  -- Business Info
  business_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100), -- 'salon', 'plumber', 'restaurant', etc.
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zip VARCHAR(10),
  
  -- Website Info
  website_url VARCHAR(255), -- Live site URL (e.g., hair-salon.buildittoday.ai)
  demo_url VARCHAR(255), -- Demo URL (e.g., buildittoday.ai/demo/[id])
  qr_code_url VARCHAR(255), -- URL to hosted QR code image
  
  -- Hosting Info
  docker_container_id VARCHAR(255), -- Container ID on VPS (Phase 2+)
  subdomain VARCHAR(100) UNIQUE, -- hair-salon-miami
  ssl_cert_expiry TIMESTAMP, -- When SSL cert expires
  hosting_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'paused', 'error'
  
  -- Subscription Info
  subscription_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'paused', 'churned'
  monthly_payment DECIMAL(10, 2) DEFAULT 50.00, -- Recurring payment amount
  setup_paid BOOLEAN DEFAULT FALSE,
  setup_paid_at TIMESTAMP,
  
  -- Stripe Info
  stripe_customer_id VARCHAR(255), -- For recurring billing
  stripe_subscription_id VARCHAR(255),
  next_billing_date DATE,
  
  -- Generated From
  generated_from_business_id VARCHAR(255), -- If from SunBiz scrape
  
  -- Timestamps
  signup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deployed_date TIMESTAMP,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- Soft delete
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_business_name ON customers(business_name);
CREATE INDEX idx_customers_status ON customers(subscription_status);
CREATE INDEX idx_customers_stripe_id ON customers(stripe_customer_id);
CREATE INDEX idx_customers_subdomain ON customers(subdomain);
```

---

### 3. DEPLOYMENTS TABLE (Website Versions)
Tracks every deployment of a customer's site

```sql
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Code & Build Info
  code_version VARCHAR(100), -- Version number (1.0, 1.1, etc.)
  html_template_id UUID REFERENCES html_templates(id), -- Which template was used
  docker_image_hash VARCHAR(255), -- SHA of Docker image
  build_log TEXT, -- Full build output
  
  -- Deployment Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'building', 'deploying', 'live', 'failed', 'rolled_back'
  deployed_at TIMESTAMP,
  error_message TEXT, -- If status='failed'
  
  -- Performance Metrics
  build_time_seconds INT,
  deployment_time_seconds INT,
  current_uptime_percentage DECIMAL(5, 2) DEFAULT 100.00,
  
  -- Metadata
  deployed_by VARCHAR(255) DEFAULT 'system', -- Who triggered deployment
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deployments_customer_id ON deployments(customer_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_deployed_at ON deployments(deployed_at);
```

---

### 4. HTML_TEMPLATES TABLE (Generated Code)
Stores generated HTML/React code for each site

```sql
CREATE TABLE html_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Generated Content
  html_content TEXT NOT NULL, -- Raw HTML (production-ready)
  tsx_components JSONB, -- React components as JSON
  -- Example: {
  --   "Hero": "export const Hero = () => ...",
  --   "Services": "export const Services = () => ...",
  --   "Contact": "export const Contact = () => ..."
  -- }
  
  css_tailwind TEXT, -- All Tailwind classes used
  
  -- Metadata
  design_system_used JSONB, -- Design decisions made
  competitor_analysis_id UUID, -- Which competitors were analyzed
  
  -- Generation Info
  generated_by VARCHAR(100) DEFAULT 'claude', -- 'claude', 'manual', etc.
  generation_prompt TEXT, -- The prompt used to generate this
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_html_templates_customer_id ON html_templates(customer_id);
```

---

### 5. COMPETITOR_ANALYSIS TABLE (Research Data)
Stores competitor research for design decisions

```sql
CREATE TABLE competitor_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Competitor Info
  industry VARCHAR(100),
  location VARCHAR(255),
  
  -- Analyzed Websites
  competitor_urls JSONB, -- Array of URLs analyzed
  -- Example: ["site1.com", "site2.com", "site3.com"]
  
  -- Extracted Patterns
  color_palette JSONB, -- Colors used by competitors
  -- Example: {"primary": "#123456", "secondary": "#789ABC"}
  
  typography JSONB, -- Font families and sizes
  layout_patterns JSONB, -- Common layout structures
  cta_styles JSONB, -- How they style buttons/CTAs
  
  -- Full Analysis
  analysis_json JSONB, -- Complete analysis from Claude Vision
  
  -- Screenshots
  screenshot_urls JSONB, -- Array of competitor website screenshots
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competitor_analysis_customer_id ON competitor_analysis(customer_id);
CREATE INDEX idx_competitor_analysis_industry ON competitor_analysis(industry);
```

---

### 6. POSTCARDS TABLE (Direct Mail)
Tracks every postcard sent via Lob

```sql
CREATE TABLE postcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Lob API Info
  lob_postcard_id VARCHAR(255) UNIQUE, -- Lob's ID for this postcard
  lob_request_id VARCHAR(255),
  
  -- QR Code
  qr_code_url VARCHAR(255), -- Points to demo site
  qr_code_image_url VARCHAR(255), -- Hosted image
  
  -- Postcard Details
  recipient_name VARCHAR(255),
  recipient_address_street VARCHAR(255),
  recipient_address_city VARCHAR(100),
  recipient_address_state VARCHAR(2),
  recipient_address_zip VARCHAR(10),
  
  -- Tracking
  sent_date TIMESTAMP,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'mailed', 'delivered', 'failed', 'returned'
  
  -- Analytics
  qr_scans INT DEFAULT 0,
  first_scan_date TIMESTAMP,
  last_scan_date TIMESTAMP,
  scan_timestamps JSONB, -- Array of all scan times
  
  converted BOOLEAN DEFAULT FALSE,
  conversion_date TIMESTAMP,
  
  -- Cost
  cost_cents INT, -- Cost in cents (50 = $0.50)
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_postcards_customer_id ON postcards(customer_id);
CREATE INDEX idx_postcards_campaign_id ON postcards(campaign_id);
CREATE INDEX idx_postcards_qr_code ON postcards(qr_code_url);
CREATE INDEX idx_postcards_status ON postcards(status);
```

---

### 7. CAMPAIGNS TABLE (Postcard Campaigns)
Groups postcards sent together

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Campaign Info
  campaign_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Targeting
  industry_filter VARCHAR(100), -- If targeting specific industry
  location_filter VARCHAR(255), -- City/state/region
  
  -- Postcard Count
  total_postcards INT,
  postcards_sent INT DEFAULT 0,
  
  -- Financials
  total_cost_cents INT, -- Total cost of campaign
  cost_per_postcard_cents INT, -- Cost per unit
  
  -- Results
  total_qr_scans INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  conversion_rate DECIMAL(5, 2), -- Percentage
  total_revenue DECIMAL(15, 2), -- Total from conversions
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_date TIMESTAMP,
  completed_date TIMESTAMP
);

CREATE INDEX idx_campaigns_sent_date ON campaigns(sent_date);
```

---

### 8. PAGE_ANALYTICS TABLE (Website Visitor Tracking)
Real-time analytics for customer websites

```sql
CREATE TABLE page_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Visitor Info
  session_id VARCHAR(255), -- Unique visitor session
  visitor_ip VARCHAR(255),
  visitor_country VARCHAR(100),
  
  -- Event Details
  event_type VARCHAR(50), -- 'page_view', 'form_submit', 'cta_click', 'phone_click'
  page_path VARCHAR(255), -- Which page (/demo/[id], /demo/[id]/services, etc.)
  referrer VARCHAR(255), -- Where they came from (QR code, Google, etc.)
  
  -- Timing
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_duration_seconds INT,
  
  -- Metadata
  device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
  browser VARCHAR(100),
  os VARCHAR(100),
  
  -- QR-Specific Tracking
  qr_code_id VARCHAR(255), -- If they came from QR
  qr_postcard_id UUID REFERENCES postcards(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_page_analytics_customer_id ON page_analytics(customer_id);
CREATE INDEX idx_page_analytics_session_id ON page_analytics(session_id);
CREATE INDEX idx_page_analytics_timestamp ON page_analytics(timestamp);
```

---

### 9. FORM_SUBMISSIONS TABLE (Lead Capture)
Tracks form submissions from customer websites

```sql
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  page_analytics_id UUID REFERENCES page_analytics(id),
  
  -- Submission Data
  visitor_name VARCHAR(255),
  visitor_phone VARCHAR(20),
  visitor_email VARCHAR(255),
  message TEXT,
  
  -- Form Details
  form_type VARCHAR(100), -- 'contact', 'booking', 'quote', 'newsletter'
  page_where_submitted VARCHAR(255),
  
  -- Tracking
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  customer_responded BOOLEAN DEFAULT FALSE,
  customer_response_time INTERVAL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_submissions_customer_id ON form_submissions(customer_id);
CREATE INDEX idx_form_submissions_submitted_at ON form_submissions(submitted_at);
```

---

### 10. INVOICES TABLE (Billing)
Tracks recurring invoices for recurring revenue

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Invoice Details
  invoice_number VARCHAR(100) UNIQUE, -- INV-2025-001
  stripe_invoice_id VARCHAR(255), -- Stripe's invoice ID
  
  -- Amounts
  setup_fee DECIMAL(10, 2), -- One-time (if applicable)
  hosting_fee DECIMAL(10, 2), -- Monthly recurring
  change_fee DECIMAL(10, 2), -- For custom changes
  total_amount DECIMAL(10, 2),
  
  -- Dates
  invoice_date DATE,
  due_date DATE,
  paid_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'failed', 'refunded'
  payment_method VARCHAR(100), -- 'stripe_card', 'ach', 'check'
  
  -- Notes
  description TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

---

### 11. CHANGE_REQUESTS TABLE (Support Tickets)
Customer requests for website changes

```sql
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Request Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Classification
  request_type VARCHAR(100), -- 'design', 'content', 'feature', 'performance', 'other'
  priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high'
  
  -- Attachment
  image_urls JSONB, -- Array of image URLs they uploaded
  
  -- Status
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'in_progress', 'completed', 'rejected'
  assigned_to VARCHAR(255), -- Your name/team
  
  -- Tracking
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  estimated_cost DECIMAL(10, 2), -- $200, $500, etc.
  actual_cost DECIMAL(10, 2),
  
  -- Notes
  internal_notes TEXT, -- Your private notes
  customer_response TEXT, -- Your response to customer
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_change_requests_customer_id ON change_requests(customer_id);
CREATE INDEX idx_change_requests_status ON change_requests(status);
```

---

## JUNCTION/REFERENCE TABLES

### 12. DESIGN_SYSTEMS TABLE (Reusable Design Patterns)
Stores design systems for different industries

```sql
CREATE TABLE design_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Classification
  industry VARCHAR(100), -- 'salon', 'plumber', 'restaurant', etc.
  name VARCHAR(255), -- "Modern Beauty Salon Design"
  
  -- Color Palette
  primary_color VARCHAR(7), -- #FF6B6B
  secondary_color VARCHAR(7), -- #4ECDC4
  accent_color VARCHAR(7), -- #FFE66D
  neutral_light VARCHAR(7), -- #F7F7F7
  neutral_dark VARCHAR(7), -- #333333
  
  -- Typography
  heading_font VARCHAR(255), -- 'Playfair Display'
  body_font VARCHAR(255), -- 'Inter'
  heading_size_px INT, -- 48
  body_size_px INT, -- 16
  
  -- Layout Defaults
  max_width_px INT, -- 1200
  spacing_unit_px INT, -- 8 (for margins/padding)
  border_radius_px INT, -- 8
  
  -- Component Styles (as JSON)
  button_style JSONB,
  card_style JSONB,
  nav_style JSONB,
  
  -- Hero Section
  hero_layout VARCHAR(100), -- 'image_left', 'image_right', 'full_bg', 'text_center'
  hero_height_vh INT, -- 100 (viewport height)
  
  -- Use Count
  usage_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_design_systems_industry ON design_systems(industry);
```

---

### 13. MONITORING_LOGS TABLE (System Health)
Tracks uptime and errors for each customer site

```sql
CREATE TABLE monitoring_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Check Info
  check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_interval_seconds INT DEFAULT 300, -- Every 5 minutes
  
  -- Results
  http_status_code INT, -- 200, 500, etc.
  response_time_ms INT, -- How long it took to respond
  is_up BOOLEAN, -- TRUE if status 200-299
  
  -- Error Tracking
  error_message TEXT, -- If status is not 2xx
  error_type VARCHAR(100), -- 'timeout', 'connection_refused', '500_error', etc.
  
  -- Metadata
  check_source VARCHAR(50), -- 'automated', 'manual'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_monitoring_logs_customer_id ON monitoring_logs(customer_id);
CREATE INDEX idx_monitoring_logs_check_timestamp ON monitoring_logs(check_timestamp);
```

---

## KEY QUERIES YOU'LL RUN FREQUENTLY

### Get Dashboard Data
```sql
-- Total revenue and MRR
SELECT 
  COUNT(DISTINCT id) as total_customers,
  SUM(monthly_payment) as monthly_recurring_revenue,
  COUNT(CASE WHEN subscription_status='active' THEN 1 END) as active_customers
FROM customers
WHERE subscription_status != 'churned';

-- Revenue over time
SELECT 
  DATE_TRUNC('month', signup_date) as signup_month,
  COUNT(*) as new_customers,
  COUNT(*) * 1500 as monthly_setup_revenue
FROM customers
GROUP BY DATE_TRUNC('month', signup_date)
ORDER BY signup_month DESC;
```

### Get Customer Details
```sql
-- Customer with latest deployment
SELECT 
  c.*,
  d.status as deployment_status,
  d.deployed_at,
  COUNT(DISTINCT pa.session_id) as unique_visitors_this_month,
  COUNT(DISTINCT fs.id) as form_submissions_this_month
FROM customers c
LEFT JOIN deployments d ON c.id = d.customer_id
LEFT JOIN page_analytics pa ON c.id = pa.customer_id 
  AND pa.timestamp > NOW() - INTERVAL '30 days'
LEFT JOIN form_submissions fs ON c.id = fs.customer_id
  AND fs.submitted_at > NOW() - INTERVAL '30 days'
WHERE c.id = $1
GROUP BY c.id, d.id;
```

### Campaign Performance
```sql
-- Campaign metrics
SELECT 
  c.id,
  c.campaign_name,
  c.total_postcards,
  COUNT(p.id) as postcards_sent,
  SUM(CASE WHEN p.converted THEN 1 ELSE 0 END) as total_conversions,
  ROUND(SUM(CASE WHEN p.converted THEN 1 ELSE 0 END)::NUMERIC / COUNT(p.id) * 100, 2) as conversion_rate,
  COUNT(DISTINCT p.id) * 1500 as total_revenue
FROM campaigns c
LEFT JOIN postcards p ON c.id = p.campaign_id
GROUP BY c.id;
```

### Overdue Payments
```sql
-- Customers who haven't paid
SELECT 
  c.id,
  c.business_name,
  c.email,
  i.invoice_number,
  i.total_amount,
  i.due_date,
  NOW() - i.due_date as days_overdue
FROM customers c
JOIN invoices i ON c.id = i.customer_id
WHERE i.status = 'pending'
  AND i.due_date < NOW()
ORDER BY i.due_date ASC;
```

### Site Uptime Report
```sql
-- Uptime percentage for each site
SELECT 
  customer_id,
  DATE_TRUNC('day', check_timestamp) as check_day,
  SUM(CASE WHEN is_up THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100 as uptime_percentage
FROM monitoring_logs
WHERE check_timestamp > NOW() - INTERVAL '30 days'
GROUP BY customer_id, DATE_TRUNC('day', check_timestamp)
ORDER BY check_day DESC;
```

---

## API ENDPOINTS (Next.js Routes)

### Authentication Endpoints
```
POST /api/auth/register
  Body: { email, password, full_name }
  Returns: { user_id, token, role }

POST /api/auth/login
  Body: { email, password }
  Returns: { user_id, token, role }

POST /api/auth/logout
  Returns: { success: true }

POST /api/auth/verify-email
  Body: { email, verification_code }
  Returns: { verified: true }

POST /api/auth/reset-password
  Body: { email }
  Returns: { reset_link_sent: true }
```

---

### Customer Management
```
GET /api/customers
  Query: ?status=active&sort=created_at&limit=20
  Returns: { customers: [], total: 150, page: 1 }

GET /api/customers/[customerId]
  Returns: { id, business_name, email, subscription_status, ... }

POST /api/customers
  Body: { business_name, industry, phone, email, address... }
  Returns: { id, website_url, demo_url, qr_code_url }

PUT /api/customers/[customerId]
  Body: { business_name, phone, email... }
  Returns: { updated_at, changes_deployed: boolean }

DELETE /api/customers/[customerId]
  Returns: { deleted: true, refund_issued: true }
```

---

### Generation Pipeline
```
POST /api/generate
  Body: { customer_id, business_name, industry, phone, address }
  Returns: { 
    deployment_id, 
    html_url, 
    qr_code_url,
    demo_url,
    status: "generating"
  }

GET /api/generate/[deploymentId]/status
  Returns: { status, progress: 0-100, estimated_time_seconds }

POST /api/generate/analyze
  Body: { industry, location }
  Returns: { competitors_found: 5, design_system_id, colors, fonts }

POST /api/generate/code
  Body: { design_system_id, business_data }
  Returns: { html, tsx_components, css, preview_url }
```

---

### Postcard Management
```
POST /api/postcards/campaign
  Body: { business_list_csv, design, total_count }
  Returns: { campaign_id, cost_total, timeline_days }

GET /api/postcards/campaign/[campaignId]
  Returns: { 
    campaign_name, 
    postcards_sent, 
    qr_scans, 
    conversions,
    roi_percentage
  }

POST /api/postcards/[campaignId]/send
  Action: Send to Lob API
  Returns: { postcards_queued: 500, estimated_cost: "$250.00" }

GET /api/postcards/[postcardId]/tracking
  Returns: { qr_scans, scan_dates, converted: boolean }
```

---

### Analytics
```
GET /api/analytics/dashboard
  Returns: { 
    total_customers, 
    mrr, 
    churn_rate,
    this_month_revenue,
    ltv
  }

GET /api/analytics/customer/[customerId]
  Returns: { 
    visitors_this_month,
    form_submissions,
    top_pages,
    conversion_funnel
  }

GET /api/analytics/campaigns
  Returns: [
    { campaign_id, total_sent, scans, conversions, roi }
  ]

POST /api/analytics/track/[demoId]
  Body: { event_type: "page_view", page_path: "...", ... }
  Action: Log event
  Returns: { logged: true }
```

---

### Billing
```
POST /api/checkout
  Body: { customer_id, amount, payment_method }
  Returns: { stripe_session_url, session_id }

GET /api/billing/invoices
  Query: ?customer_id=...&status=pending
  Returns: { invoices: [], total_owed: 0 }

POST /api/billing/[invoiceId]/pay
  Body: { payment_method_id }
  Returns: { payment_successful: true, confirmation_id }

GET /api/billing/recurring
  Returns: { customers, monthly_total, next_billing_dates }
```

---

### Webhooks (External Services)
```
POST /api/webhooks/stripe
  Header: X-Stripe-Signature
  Body: Stripe event payload
  Action: Update customer subscription status
  Returns: { processed: true }

POST /api/webhooks/lob
  Header: X-Lob-Signature
  Body: Lob event payload
  Action: Update postcard delivery status
  Returns: { processed: true }
```

---

## AUTHENTICATION FLOW

### User Registration (Customer)
```
1. User submits email + password
2. API validates input
3. API creates user in Supabase Auth
4. API creates customer record in DB
5. API sends verification email
6. API returns JWT token
7. User redirected to customer portal
```

### Admin Operations
```
1. Check JWT token in request header
2. Verify token signature with Supabase
3. Get user_id from token
4. Look up user.role from DB
5. If role != 'admin', return 403
6. Otherwise, allow operation
```

---

## ERROR HANDLING

All API endpoints return consistent error format:
```json
{
  "error": true,
  "code": "INVALID_INPUT",
  "message": "Business name is required",
  "status_code": 400
}
```

### Common Error Codes
```
INVALID_INPUT — 400
UNAUTHORIZED — 401
FORBIDDEN — 403
NOT_FOUND — 404
CONFLICT — 409 (e.g., duplicate email)
RATE_LIMITED — 429
SERVER_ERROR — 500
EXTERNAL_API_ERROR — 502 (Stripe, Lob, etc.)
```

---

## SECURITY NOTES

1. **JWT Tokens:** Issued by Supabase, verified in middleware
2. **Passwords:** Never logged, hashed with bcrypt
3. **API Keys:** Stripe & Lob keys stored as environment variables
4. **Database Access:** Always use prepared statements (prevent SQL injection)
5. **CORS:** Only allow requests from buildittoday.ai domain
6. **Rate Limiting:** 100 requests/minute per IP
7. **Input Validation:** All inputs validated before DB insert

---

## DATA RETENTION

```
Active customers: Keep all data permanently
Churned customers: Keep for 7 years (tax/legal)
Deleted customers: Soft delete (set deleted_at), keep data 2 years then purge
Analytics logs: Keep 1 year, archive older logs
Monitoring logs: Keep 90 days, then aggregate into daily summaries
```

---

## BACKUP STRATEGY

```
Daily snapshots: Supabase automatic daily backups
Weekly exports: Export customer data to CSV
Monthly archive: Archive to S3 (AWS)
Testing: Monthly restore test from backup
```

---

## NEXT STEPS

1. Create Supabase project (if not already done)
2. Run all CREATE TABLE statements
3. Set up Supabase Auth (email/password)
4. Create API routes referencing these tables
5. Test each endpoint with Postman/Insomnia
6. Deploy to Vercel

This is your complete backend blueprint.
