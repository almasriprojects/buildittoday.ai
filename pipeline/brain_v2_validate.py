"""Validation + one corrective retry, mirroring validateMotionHooks in the real edge function."""
import re


def validate(html):
    f = []
    if not re.search(r'<video[^>]*class="hero-bg"', html, re.I):
        f.append("hero must be a <video class=\"hero-bg\">, not an image or text-only hero")
    if not re.search(r'poster="https://', html, re.I):
        f.append("hero <video> must have a poster attribute with the poster image URL")
    if not re.search(r'class="hero-scrim"', html, re.I):
        f.append("missing .hero-scrim div between the video and hero content (a ::after on a <video> does not render)")
    if re.search(r'\.hero-bg::after', html, re.I):
        f.append(".hero-bg::after is used but does not render on a <video> element -- use a .hero-scrim div instead")

    hero = re.search(r'<section[^>]*data-hero.*?</section>', html, re.S | re.I)
    if hero and not re.search(r'text-shadow', hero.group(0), re.I):
        css = re.search(r'<style.*?</style>', html, re.S | re.I)
        if not (css and re.search(r'hero-content\s+h1[^}]*text-shadow', css.group(0), re.I | re.S)):
            f.append("hero h1 and subheadline must carry a text-shadow for legibility over video")

    ms = re.search(r'<section[^>]*data-media-sequence.*?</section>', html, re.S | re.I)
    if not ms:
        f.append("missing <section data-media-sequence> scroll-scrubbed image section")
    else:
        n = len(re.findall(r'class="ms-item"', ms.group(0)))
        if n < 2:
            f.append(
                f"data-media-sequence has only {n} .ms-item -- it MUST contain at least 2 "
                ".ms-item blocks (one per supporting image), otherwise the 250vh sticky "
                "scroll section shows a single static image and is wasted scroll. Put BOTH "
                "supporting images in the media sequence as separate .ms-item blocks, each "
                "with its own .ms-caption h3+p written from this business's real services."
            )
        if not re.search(r'ms-caption', ms.group(0), re.I):
            f.append("media sequence items must each have a .ms-caption with real copy")

    if not re.search(r'data-parallax-img', html, re.I):
        f.append("one supporting image (e.g. in the About section) must use data-parallax-img=\"0.15\"")
    if not re.search(r'data-menu-toggle', html, re.I):
        f.append("missing data-menu-toggle hamburger button")
    if not re.search(r'data-menu-target', html, re.I):
        f.append("missing data-menu-target nav container")
    if not re.search(r'data-claim-modal', html, re.I):
        f.append("missing data-claim-modal element")
    if not re.search(r'data-claim-trigger', html, re.I):
        f.append("missing data-claim-trigger on CTA buttons")
    if re.search(r'class="[^"]*\bbtn-primary\b', html):
        f.append(".btn-primary is not a defined class -- use .btn alone for primary CTAs")
    if re.search(r'class="[^"]*\bclaim-section\b', html):
        f.append("standalone .claim-section must not exist -- the claim UI is modal-only")
    if not re.search(r'data-current-year', html, re.I):
        f.append("footer copyright must use <span data-current-year></span>, not a literal year")
    if not re.search(r'scroll-behavior:\s*smooth', html, re.I):
        f.append("missing html{scroll-behavior:smooth}")
    if not re.search(r'fonts\.googleapis\.com', html, re.I):
        f.append("missing Google Fonts <link> for the brief's typography")
    if not re.search(r'data-progress', html, re.I):
        f.append("missing <div data-progress></div> scroll progress bar")
    return f
