import json
import re
import urllib.request
import paths as P

ENV_PATH = str(P.SITEREPLICATE_ENV or P.FRONTEND_ENV)

def load_key():
    with open(ENV_PATH) as f:
        for line in f:
            m = re.match(r"^OPENROUTER_API_KEY=(.+)$", line.strip())
            if m:
                return m.group(1).strip().strip('"').strip("'")
    raise RuntimeError("key not found")

OPENROUTER_KEY = load_key()

LEAD = {
    "business_name": "Tim Todd Consulting, LLC",
    "category": "Professional Services",
    "city": "Winter Haven",
    "state": "FL",
    "generated_content": {
        "tagline": "Strategic Guidance for Sustainable Growth",
        "hero": {
            "headline": "Expert Consulting Solutions for Winter Haven Businesses",
            "subheadline": "Tim Todd Consulting delivers tailored strategies that drive measurable results, helping organizations navigate challenges and achieve their objectives with confidence."
        },
        "about": {
            "heading": "Strategic Partnership You Can Trust",
            "body": "Tim Todd Consulting, LLC provides comprehensive consulting services to businesses and organizations throughout Winter Haven and Central Florida."
        },
        "services": [
            "Business Strategy Development", "Operational Efficiency Analysis",
            "Change Management Support", "Performance Optimization", "Advisory Services"
        ],
        "why_choose_us": [
            "Customized solutions tailored to your specific industry and organizational needs",
            "Results-focused approach with clear deliverables and measurable outcomes",
            "Collaborative partnership model that values your input and expertise",
            "Deep commitment to understanding Winter Haven's business community and local market dynamics"
        ]
    }
}

SYSTEM = """You are a senior brand/art director at a top-tier design studio (Awwwards-caliber). \
Given a real small business's identity and content, produce a specific, opinionated style brief \
for a one-page scroll-driven marketing site. Do NOT default to generic "professional blue" \
corporate cliches unless genuinely justified. Reason from the business's actual name, tone of \
voice, service tier (boutique/solo consultant vs. large firm), and locale. Be decisive and specific \
-- give exact hex-adjacent color directions, a named typography pairing style, and a clear point of \
view on restraint vs. boldness. Output strict JSON only, no prose outside the JSON, with this shape:
{
  "palette": {"primary": "...", "secondary": "...", "accent": "...", "background": "...", "reasoning": "..."},
  "typography": {"heading_style": "...", "body_style": "...", "reasoning": "..."},
  "tone_descriptors": ["...", "...", "..."],
  "motion_intensity": "subtle" | "moderate" | "bold",
  "motion_intensity_reasoning": "...",
  "effects_recommended": {"grain_texture": true|false, "marquee_band": true|false, "preloader": true|false, "oversized_typography": true|false},
  "effects_reasoning": "..."
}"""

def call():
    payload = {
        "model": "anthropic/claude-sonnet-4.5",
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": json.dumps(LEAD, indent=2)}
        ],
        "temperature": 0.7,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read())
    content = data["choices"][0]["message"]["content"]
    cost = data.get("usage", {}).get("cost")
    return content, cost

if __name__ == "__main__":
    content, cost = call()
    print(content)
    print(f"\n\nCOST: ${cost}")
