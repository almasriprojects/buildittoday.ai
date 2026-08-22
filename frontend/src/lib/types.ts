// Shared TypeScript types for the admin console

export interface Customer {
  id: string;
  business_name: string;
  industry: string;
  phone: string;
  email: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  demo_url: string;
  live_url?: string;
  created_at: string;
  subscription_status: "active" | "pending" | "paused" | "churned";
  hosting_status: "active" | "pending" | "paused";
  monthly_payment: number;
  setup_fee_paid: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  date_sent: string;
  postcards_sent: number;
  qr_scans: number;
  conversions: number;
  revenue: number;
  cost: number;
  status: "draft" | "sent" | "processing";
}

export interface Invoice {
  id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  due_date: string;
  paid_date?: string;
}

export interface AnalyticsSummary {
  total_revenue: number;
  monthly_recurring: number;
  projected_arr: number;
  churn_rate: number;
  new_customers: number;
  active_customers: number;
  churned_customers: number;
  ltv: number;
  total_postcards_sent: number;
  avg_response_rate: number;
  avg_conversion_rate: number;
  cac: number;
  roi_per_postcard: number;
  avg_load_time: number;
  avg_monthly_visitors: number;
  avg_form_submissions: number;
}

export interface CustomerAnalytics {
  customer_id: string;
  customer_name: string;
  total_visits: number;
  unique_visitors: number;
  page_views: number;
  avg_time_on_page: number;
  bounce_rate: number;
  top_pages: { page: string; traffic: number }[];
  form_submissions: number;
  phone_clicks: number;
  visitor_trend: { date: string; visits: number }[];
}

// Lead — mirrors the `leads` table in Supabase
export interface Lead {
  id: string;
  document_number: string;
  business_name: string;
  entity_type_code?: string;
  entity_type_name?: string;
  status?: string;
  lead_tier?: string;
  lead_priority?: string;
  record_valid?: boolean;
  street_address?: string;
  city?: string;
  county?: string;
  state?: string;
  state_full?: string;
  zip?: string;
  full_address?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  owner_full_name?: string;
  owner_title?: string;
  owner_address_reliable?: boolean;
  backup_owner_full_name?: string;
  all_officers_json?: Record<string, unknown>;
  filing_date?: string;
  source?: string;
  business_category?: string;
  target_fit?: string;
  classification_reason?: string;
  dataskip_checked?: boolean;
  skip_trace_checked_date?: string;
  contact_status?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_full_name?: string;
  contact_phone?: string;
  phone_type?: string;
  contact_email?: string;
  all_emails?: string;
  contact_phone_dnc?: boolean;
  maps_checked?: boolean;
  found_on_maps?: boolean;
  maps_phone?: string;
  maps_website?: string;
  maps_business_status?: string;
  maps_rating?: number;
  maps_review_count?: number;
  maps_types?: string;
  likely_established?: boolean;
  recheck_date?: string;
  site_generated?: boolean;
  site_generated_at?: string;
  demo_slug?: string;
  generated_content?: Record<string, unknown>;
  postcard_sent?: boolean;
  postcard_id?: string;
  postcard_sent_date?: string;
  expected_delivery_date?: string;
  postcard_error?: string;
  customer_id?: string;
  owner_mailing_address?: string;
  owner_mailing_city?: string;
  owner_mailing_state?: string;
  owner_mailing_zip?: string;
  dataskip_credits_charged?: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;

  // Computed outreach fields (added by /api/leads)
  outreach_channel?: "email" | "postcard" | "excluded";
  outreach_status?: "ready" | "site_needed" | "sent" | "excluded";
  email_valid?: boolean;

  // Pipeline attribution fields (added by 20260817_next_phase_pipeline.sql)
  outreach_sent_at?: string;
  email_opened_at?: string;
  email_clicked_at?: string;
  qr_scanned_at?: string;
  demo_viewed_at?: string;
  signup_completed_at?: string;
  potential_customer_at?: string;
  converted_at?: string;
  acquisition_channel?: "email" | "postcard";
}

// PotentialCustomer — the middle stage between lead & customer
export interface PotentialCustomer {
  id: string;
  lead_id: string;
  demo_slug?: string;
  email?: string;
  full_name?: string;
  source?: "email" | "postcard";
  status?: "new" | "paid" | "lost";
  converted_at?: string;
  created_at: string;

  // Joined lead info (for admin table display)
  business_name?: string;
  document_number?: string;
}
