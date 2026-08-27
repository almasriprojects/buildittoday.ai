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

with open("stage2_competitor_signals.json") as f:
    stage2 = json.load(f)

LEAD_CONTENT = {
    "business_name": "Tim Todd Consulting, LLC",
    "category": "Professional Services",
    "city": "Winter Haven", "state": "FL",
    "tagline": "Strategic Guidance for Sustainable Growth",
    "services": [
        "Business Strategy Development", "Operational Efficiency Analysis",
        "Change Management Support", "Performance Optimization", "Advisory Services"
    ],
    "about": "Tim Todd Consulting, LLC provides comprehensive consulting services to businesses and organizations throughout Winter Haven and Central Florida."
}

STAGE1 = {
    "palette": {"primary": "#1B4332", "secondary": "#52796F", "accent": "#D4A574", "background": "#F8F6F1"},
    "typography": {"heading_style": "Sharp serif, medium weight (Tiempos Text/Freight Display style)", "body_style": "Humanist sans, 1.6-1.7 line height (Inter/Untitled Sans style)"},
    "tone_descriptors": ["Grounded authority", "Warm professionalism", "Understated confidence"],
    "motion_intensity": "subtle",
    "effects_recommended": {"grain_texture": True, "marquee_band": False, "preloader": False, "oversized_typography": False}
}

SYSTEM = """You are synthesizing research into one final design brief for a real one-page business \
website. You are given: (0) the actual business's real content -- name, services, tagline, about text \
-- this is GROUND TRUTH, never contradict or reinterpret what the business actually does; (1) a style \
analysis reasoned from the business's identity; (2) style signals observed from real competitor/peer \
sites in the same space (patterns only, not literal source material to copy). Resolve any tension \
between (1) and (2) into ONE decisive final brief -- don't just concatenate both. Any example copy you \
write in the output (e.g. hero statement wording) MUST be about what this business actually does per \
field (0) -- never invent a different business type, industry, or offering. Output strict JSON:
{
  "final_palette": {...same shape as input...},
  "final_typography": {...},
  "hero_pattern": "photo-video-led" | "typography-led" | "hybrid",
  "hero_pattern_reasoning": "...",
  "nav_style": "conventional (Home/About/Services/Contact)" | "conversational (plain-language labels)",
  "nav_style_reasoning": "...",
  "motion_intensity": "subtle" | "moderate" | "bold",
  "effects_final": {"grain_texture": bool, "marquee_band": bool, "preloader": bool, "oversized_typography": bool},
  "one_paragraph_creative_direction": "A single paragraph a developer could read and know exactly what to build."
}"""

def call():
    payload = {
        "model": "anthropic/claude-sonnet-4.5",
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": json.dumps({"ground_truth_business_content": LEAD_CONTENT, "stage1_style_analysis": STAGE1, "stage2_competitor_signals": stage2}, indent=2)}
        ],
        "temperature": 0.5,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {OPENROUTER_KEY}", "Content-Type": "application/json"},
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
