import json
import re
import urllib.request

ENV_PATH = "/Users/ananalmasri/Downloads/***_WORKING_NOW/SiteReplicate/.env"

def load_key():
    with open(ENV_PATH) as f:
        for line in f:
            m = re.match(r"^OPENROUTER_API_KEY=(.+)$", line.strip())
            if m:
                return m.group(1).strip().strip('"').strip("'")
    raise RuntimeError("key not found")

OPENROUTER_KEY = load_key()

BRIEF = {
    "palette": {"primary": "#1B4332", "secondary": "#52796F", "accent": "#D4A574", "background": "#F8F6F1"},
    "typography": {"heading": "sharp serif, medium weight, tight letter-spacing -0.02em, oversized scale (clamp 2.5rem-5rem for h1)", "body": "humanist sans, 1.6-1.7 line height"},
    "hero_statement": "We help Central Florida businesses build strategies for sustainable growth — without the overhead of a big firm.",
    "hero_pattern": "typography-led -- NO hero image or video. The large serif statement IS the hero.",
    "effects": {"grain_texture": True, "marquee_band": False, "preloader": False, "oversized_typography": True},
    "motion_intensity": "subtle -- smooth scroll, gentle fade-ins only. No magnetic buttons, no custom cursor -- those read as playful/bold, wrong for this brief.",
}

LEAD = {
    "business_name": "Tim Todd Consulting, LLC",
    "city": "Winter Haven", "state": "FL",
    "tagline": "Strategic Guidance for Sustainable Growth",
    "about": "Tim Todd Consulting, LLC provides comprehensive consulting services to businesses and organizations throughout Winter Haven and Central Florida. We focus on understanding your unique challenges and delivering practical, actionable solutions that align with your goals and drive meaningful progress.",
    "services": [
        {"title": "Business Strategy Development", "description": "Custom strategic planning and roadmap creation to align your operations with long-term objectives."},
        {"title": "Operational Efficiency Analysis", "description": "In-depth assessment of your processes to identify opportunities for improvement and cost optimization."},
        {"title": "Change Management Support", "description": "Guidance through organizational transitions with structured implementation plans and stakeholder engagement."},
        {"title": "Performance Optimization", "description": "Data-driven recommendations to enhance productivity, streamline workflows, and maximize resource allocation."},
        {"title": "Advisory Services", "description": "Ongoing strategic counsel and problem-solving support as your business evolves and grows."}
    ],
    "why_choose_us": [
        "Customized solutions tailored to your specific industry and organizational needs",
        "Results-focused approach with clear deliverables and measurable outcomes",
        "Collaborative partnership model that values your input and expertise",
        "Deep commitment to understanding Winter Haven's business community and local market dynamics"
    ],
    "contact_cta": {"heading": "Ready to Move Your Business Forward?", "body": "Let's discuss how strategic consulting can help you overcome challenges and achieve your goals.", "button_text": "Contact Us Today"}
}

SYSTEM = """You are building ONE self-contained HTML file for a real small business's marketing site. \
Follow the design brief exactly -- it was reasoned specifically for this business, do not default to \
generic patterns instead. Structural requirements (proven, must all be present):

1. Single HTML file, all CSS in a <style> tag, all content real (from the lead data given, no placeholders/fake info).
2. Header: sticky, logo (business name), nav with real anchor links (Home #hero, About #about, Services #services, Contact #contact) plus one CTA button. Mobile: nav hidden by default behind a hamburger button with attribute data-menu-toggle, nav container has attribute data-menu-target, CSS shows it as a dropdown at max-width:767px with a .menu-open class toggle.
3. Hero: <section data-hero id="hero"> but per the brief, this is TYPOGRAPHY-LED -- no <img>/<video>, no .hero-bg element at all. Just the large serif hero statement as an <h1 data-split-text>, on the background color with a grain-texture CSS overlay (use an inline SVG feTurbulence data-URI or a repeating CSS pattern -- must be self-contained, no external requests).
4. About section: id="about", data-reveal on the text block, data-split-text on its heading. Text only, no image (per brief -- no photography anywhere on this page).
5. Services section: id="services", grid of .service-card, each data-reveal, real service title+description from lead data.
6. Why-choose-us section: 4 items from lead data, data-reveal.
7. Contact CTA section: id="contact", data-reveal.
8. Footer: nav sitemap (same anchor links as header) + services list + copyright line using <span data-current-year></span> (not a literal year).
9. Claim modal: <div data-claim-modal> hidden by default (not a page section), with a claim-modal-panel, a close button (data-claim-close), heading, short feature list, one CTA (data-claim-close). Every real CTA button on the page (header, hero, contact) gets data-claim-trigger + a real href="#contact" fallback. NO standalone "claim this website" page section -- modal only.
10. Single button system: use `.btn` and `.btn-secondary` ONLY. Do NOT use a `.btn-primary` class -- `.btn` alone is the primary look. Every CTA is a real <a href>, never a bare <button> with no action except the menu-toggle and claim-close controls.
11. CSS: html { scroll-behavior: smooth } plus a prefers-reduced-motion: reduce override back to auto.
12. Apply the exact palette hex values and typography direction from the brief. Headings use the oversized/tight-tracking scale specified. Grain texture per the brief's effects.grain_texture. Do NOT add a marquee or preloader (brief says false for both).
13. Do NOT include a <script> tag -- the motion runtime is injected separately, deterministically. Just include the HTML hooks (data-hero, data-split-text, data-reveal, data-progress, data-menu-toggle, data-menu-target, data-claim-modal, data-claim-trigger, data-claim-close) and a <div data-progress></div> right after <body>.
14. No magnetic-button or custom-cursor opt-out mechanism exists in the runtime (they're pointer:fine auto-gated globally) -- that's fine, leave as-is, just don't fight it in the markup.

Output ONLY the complete HTML file, no explanation, no markdown code fence."""

def call():
    payload = {
        "model": "anthropic/claude-sonnet-4.5",
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": json.dumps({"design_brief": BRIEF, "lead_data": LEAD}, indent=2)}
        ],
        "temperature": 0.6,
        "max_tokens": 16000,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {OPENROUTER_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read())
    content = data["choices"][0]["message"]["content"]
    cost = data.get("usage", {}).get("cost")
    return content, cost

if __name__ == "__main__":
    content, cost = call()
    content = re.sub(r"^```html\s*\n?", "", content.strip())
    content = re.sub(r"\n?```\s*$", "", content)
    with open("stage4_output.html", "w") as f:
        f.write(content)
    print(f"Saved {len(content)} chars to stage4_output.html")
    print(f"COST: ${cost}")
