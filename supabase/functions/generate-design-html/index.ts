import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GENERATOR_VERSION = "v13-earned-headline";

const MOTION_RUNTIME = `// motion_runtime.js v2.4 — clean premium scroll-motion for cloned sites.
// Zero fighting with native scroll. Adds: smooth native parallax/hero,
// split-text reveals, magnetic feel, media sequences (img->video->img),
// scroll progress, generalized image parallax, Ken-Burns idle motion.
// v2.2: fixes reduced-motion coverage (was hero-only), adds
// data-parallax-img + .ken-burns as opt-in single-image motion hooks.
// v2.3: adds custom cursor + magnetic buttons (desktop, pointer:fine only,
// no new HTML hooks needed -- works automatically off the existing .btn
// class every generated page already uses).
// v2.4: heroInit rewritten to combine continuous idle zoom with the
// existing scroll parallax in one loop (hero now moves even with zero
// scroll). Adds mobileMenuInit (real hamburger toggle for multi-link nav)
// and claimModalInit (popup claim mechanism replacing the old embedded
// claim section).
// v2.4a: the custom cursor is raised above the claim modal (it was painted
// underneath it, leaving no visible pointer at all inside the popup) and the
// native cursor is restored on form fields, where a dot and ring cannot say
// "you can type here".

(function () {
  if (window.__motionRuntimeV2) return;
  window.__motionRuntimeV2 = true;

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var raf = window.requestAnimationFrame || function (fn) { setTimeout(fn, 16); };

  function onScrollRegister(fn) {
    var last = 0;
    function loop() {
      var y = window.scrollY;
      if (Math.abs(y - last) > 0.5) { last = y; fn(y); }
      raf(loop);
    }
    raf(loop);
  }

  // ---------- HERO (continuous idle zoom + scroll parallax, unified) ----------
  // Previously this only updated on scroll, so a hero with zero scroll was
  // completely static. Now runs its own rAF loop that combines a slow
  // continuous idle zoom (time-driven) with the existing scroll-driven
  // parallax into ONE transform, from one function -- no separate CSS
  // animation, so there is no collision risk with the scroll transform.
  function heroInit() {
    var hero = document.querySelector("[data-hero]");
    if (!hero || prefersReduced) return;
    var title = hero.querySelector("h1") || hero.querySelector(".hero-title");
    var bg = hero.querySelector(".hero-bg");
    var startTime = (window.performance && performance.now) ? performance.now() : Date.now();
    hero.style.willChange = "transform";
    function frame() {
      var r = hero.getBoundingClientRect();
      var pct;
      if (r.bottom < 0 || r.top > window.innerHeight * 2) { pct = r.bottom < 0 ? 1 : 0; }
      else pct = Math.min(1, Math.max(0, -r.top / window.innerHeight));
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var elapsed = (now - startTime) / 1000;
      var idleZoom = 1 + Math.min(elapsed / 25, 1) * 0.06;
      if (title) {
        title.style.transform = "scale(" + (1 + pct * 0.15) +
          ") translateY(" + pct * 40 + "px)";
        title.style.opacity = String(Math.max(0, 1 - pct * 1.1));
      }
      if (bg && bg !== hero) {
        bg.style.transform = "translateY(" + pct * 60 + "px) scale(" + (idleZoom + pct * 0.08) + ")";
      }
      raf(frame);
    }
    raf(frame);
  }

  // ---------- MEDIA SEQUENCE (scroll scrubs img -> video -> img) ----------
  function mediaInit() {
    var stages = document.querySelectorAll("[data-media-sequence]");
    if (!stages.length) return;
    stages.forEach(function (stage) {
      var items = Array.prototype.slice.call(
        stage.querySelectorAll(".ms-item:not(.ms-ui)")
      );
      if (!items.length) return;
      if (prefersReduced) {
        // No scroll-scrubbing for reduced-motion users — just show the
        // first item statically instead of leaving everything at opacity:0.
        items[0].classList.add("ms-active");
        return;
      }
      var scrollLen = Math.min(items.length * 0.8, 4) * window.innerHeight;
      var progressBar = stage.querySelector(".ms-progress");
      function update(y) {
        var r = stage.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, -r.top / scrollLen));
        var idx = Math.min(items.length - 1, Math.floor(p * items.length));
        items.forEach(function (it, i) {
          it.classList.toggle("ms-active", i === idx);
        });
        var activeVid = items[idx] && items[idx].querySelector("video");
        items.forEach(function (it) {
          var v = it.querySelector("video");
          if (v && v !== activeVid) v.pause();
        });
        if (activeVid && activeVid.paused) {
          activeVid.play().catch(function () {});
        }
        if (progressBar) progressBar.style.width = (p * 100).toFixed(1) + "%";
      }
      onScrollRegister(update);
      update(0);
    });
  }

  // ---------- SPLIT-TEXT ----------
  function splitInit() {
    if (prefersReduced) return; // leave headings as plain, fully visible text
    var els = document.querySelectorAll("[data-split-text]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        el.classList.add("split-ready");
        var chars = el.querySelectorAll(".char");
        chars.forEach(function (c, i) {
          c.style.transitionDelay = (30 + i * 18) + "ms";
        });
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) {
      var words = el.textContent.trim().split(" ");
      el.innerHTML = words.map(function (word) {
        return '<span class="ms-word">' + word.split("").map(function (c) {
          return '<span class="char">' + (c === " " ? "&nbsp;" : c) + "</span>";
        }).join("") + "</span>";
      }).join(" ");
      io.observe(el);
    });
    injectCss(
      '[data-split-text] .char{display:inline-block;overflow:hidden;' +
      'transform:translateY(115%);transition:transform .6s cubic-bezier(.2,.7,.25,1)}' +
      '[data-split-text].split-ready .char{transform:translateY(0)}'
    );
  }

  // ---------- DIAGONAL/CLIP REVEAL ----------
  function revealInit() {
    if (prefersReduced) return; // elements stay at natural full visibility —
    // the [data-reveal] CSS below (which starts them at opacity:0) is only
    // injected inside this function, so skipping it entirely is the fix.
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-done");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
    injectCss(
      "[data-reveal]{opacity:0;transform:translateY(26px);" +
      "transition:opacity .9s ease,transform .9s cubic-bezier(.2,.8,.25,1)}" +
      "[data-reveal].reveal-done{opacity:1;transform:none}"
    );
  }

  // ---------- SCROLL PROGRESS ----------
  // Not gated behind prefersReduced: a slim width-indicator bar is not the
  // kind of parallax/scaling motion prefers-reduced-motion is meant to
  // suppress, and leaving it un-animated would look like a rendering bug
  // (permanently 0-width) rather than a graceful degradation.
  function progressInit() {
    var bar = document.querySelector("[data-progress]");
    if (!bar) return;
    onScrollRegister(function (y) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0).toFixed(2) + "%";
    });
  }

  // ---------- GENERALIZED IMAGE PARALLAX (any image, not just the hero) ----------
  function parallaxImgInit() {
    if (prefersReduced) return;
    var els = document.querySelectorAll("[data-parallax-img]");
    if (!els.length) return;
    els.forEach(function (el) {
      var speed = parseFloat(el.getAttribute("data-parallax-img")) || 0.15;
      onScrollRegister(function () {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var offset = (r.top - window.innerHeight / 2) * speed;
        el.style.transform = "translateY(" + offset + "px)";
      });
    });
  }

  // ---------- KEN-BURNS (idle zoom/pan on a single static image) ----------
  // Pure CSS animation, gated by its own prefers-reduced-motion media query
  // rather than a JS check, so it degrades correctly even without JS.
  function kenBurnsCssInit() {
    injectCss(
      "@media (prefers-reduced-motion: no-preference){" +
      ".ken-burns{animation:mrv2-kenburns 14s ease-in-out infinite alternate;" +
      "will-change:transform}" +
      "@keyframes mrv2-kenburns{0%{transform:scale(1)}100%{transform:scale(1.08)}}" +
      "}"
    );
  }

  // ---------- CUSTOM CURSOR (desktop, pointer:fine only) ----------
  function customCursorInit() {
    if (prefersReduced) return;
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
    var dot = document.createElement("div");
    var ring = document.createElement("div");
    dot.className = "mrv2-cursor-dot";
    ring.className = "mrv2-cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.documentElement.classList.add("mrv2-custom-cursor");
    var mouseX = 0, mouseY = 0, ringX = 0, ringY = 0, started = false;
    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = "translate(" + mouseX + "px," + mouseY + "px)";
      if (!started) { ringX = mouseX; ringY = mouseY; started = true; }
    });
    function loop() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.transform = "translate(" + ringX + "px," + ringY + "px)";
      raf(loop);
    }
    raf(loop);
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest("a, button, .btn")) {
        ring.classList.add("mrv2-cursor-hover");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest("a, button, .btn")) {
        ring.classList.remove("mrv2-cursor-hover");
      }
    });
    // The cursor must sit above everything it replaces.
    //
    // At z-index 10000 it was painted UNDER the claim modal, which is at
    // 20000 — and the real cursor is hidden by cursor:none. So the moment the
    // popup opened, the visitor had no pointer at all: not the drawn one,
    // which was behind the panel, and not the system one. On the one screen
    // where a lead is asked to type their details, they could not see where
    // they were pointing.
    //
    // Form fields keep the native cursor deliberately. A dot and a ring say
    // "you can click here"; they cannot say "you can type here". The I-beam
    // is the only thing that does, and hiding it inside a form the business
    // owner is meant to fill in costs more than the effect is worth.
    injectCss(
      ".mrv2-custom-cursor,.mrv2-custom-cursor a,.mrv2-custom-cursor button{cursor:none}" +
      ".mrv2-custom-cursor input,.mrv2-custom-cursor textarea," +
      ".mrv2-custom-cursor select,.mrv2-custom-cursor [contenteditable]{cursor:auto}" +
      ".mrv2-cursor-dot{position:fixed;top:0;left:0;width:6px;height:6px;margin:-3px;" +
      "border-radius:50%;background:#fff;mix-blend-mode:difference;pointer-events:none;" +
      "z-index:30000;transition:transform .05s linear}" +
      ".mrv2-cursor-ring{position:fixed;top:0;left:0;width:32px;height:32px;margin:-16px;" +
      "border-radius:50%;border:1.5px solid rgba(255,255,255,.8);mix-blend-mode:difference;" +
      "pointer-events:none;z-index:30000;" +
      "transition:width .2s ease,height .2s ease,margin .2s ease}" +
      ".mrv2-cursor-ring.mrv2-cursor-hover{width:52px;height:52px;margin:-26px}"
    );
  }

  // ---------- MAGNETIC BUTTONS ----------
  // Targets the .btn class every generated page already uses (enforced by
  // the build prompt's button-system requirement) -- no new HTML hook
  // needed. Does not touch any element heroInit/mediaInit/parallaxImgInit
  // already animate, so there is no transform-collision risk with Phase A1.
  function magneticButtonsInit() {
    if (prefersReduced) return;
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
    var btns = document.querySelectorAll(".btn");
    if (!btns.length) return;
    btns.forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        btn.style.transform = "translate(" + (x * 0.25) + "px," + (y * 0.25) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  // ---------- MOBILE MENU TOGGLE ----------
  // Real hamburger toggle for multi-link nav -- this is the piece that was
  // deliberately deferred earlier (nav was simplified away instead of
  // building this) because nav links then became unreachable on mobile.
  // Not gated by prefersReduced: opening/closing a menu is a UI state
  // change, not the kind of motion that preference is meant to suppress.
  function mobileMenuInit() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var target = document.querySelector("[data-menu-target]");
    if (!toggle || !target) return;
    toggle.addEventListener("click", function () {
      var isOpen = target.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  // ---------- CLAIM MODAL ----------
  // Replaces the old embedded "Claim This Website" page section. Every
  // [data-claim-trigger] (the page's real CTA buttons) opens this modal
  // instead of just scrolling to a section. Structural/positioning CSS is
  // injected here (like reveal/split-text) so it is guaranteed correct;
  // the page's own CSS only needs to style the modal's inner content.
  function claimModalInit() {
    var modal = document.querySelector("[data-claim-modal]");
    if (!modal) return;
    var triggers = document.querySelectorAll("[data-claim-trigger]");
    function openModal(e) {
      if (e) e.preventDefault();
      modal.classList.add("modal-open");
      document.body.style.overflow = "hidden";
    }
    function closeModal() {
      modal.classList.remove("modal-open");
      document.body.style.overflow = "";
    }
    triggers.forEach(function (t) {
      t.addEventListener("click", openModal);
    });
    var closeEls = modal.querySelectorAll("[data-claim-close]");
    closeEls.forEach(function (c) {
      c.addEventListener("click", closeModal);
    });
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("modal-open")) closeModal();
    });
    injectCss(
      "[data-claim-modal]{position:fixed;inset:0;z-index:20000;display:flex;" +
      "align-items:center;justify-content:center;padding:24px;" +
      "background:rgba(0,0,0,.6);opacity:0;visibility:hidden;" +
      "transition:opacity .3s ease}" +
      "[data-claim-modal].modal-open{opacity:1;visibility:visible}" +
      "[data-claim-modal] .claim-modal-panel{max-width:560px;width:100%;" +
      "max-height:85vh;overflow-y:auto;transform:translateY(20px);" +
      "transition:transform .3s ease}" +
      "[data-claim-modal].modal-open .claim-modal-panel{transform:translateY(0)}"
    );
  }

  // ---------- HELPERS ----------
  function injectCss(css) {
    var existing = document.getElementById("mrv2-css");
    if (existing) {
      existing.textContent += css;
      return;
    }
    var s = document.createElement("style");
    s.id = "mrv2-css";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function init() {
    kenBurnsCssInit();
    heroInit();
    mediaInit();
    splitInit();
    revealInit();
    progressInit();
    parallaxImgInit();
    customCursorInit();
    magneticButtonsInit();
    mobileMenuInit();
    claimModalInit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();`;

const BUILD_PROMPT_TEMPLATE = (opts: {
  businessName: string;
  category: string;
  city: string;
  state: string;
  contentJson: string;
  designTokensJson: string;
  layoutAnalysisJson: string;
  motionNotesJson: string;
  ownPhotosJson: string;
  heroVideoUrl: string;
  heroPosterUrl: string;
}) => `You are an elite senior front-end developer and motion designer (Awwwards/FWA level). You are given real, already-written honest content for ${opts.businessName}, a ${opts.category} business in ${opts.city}, ${opts.state} — plus a design token system, layout pattern language, and photography and a hero video commissioned for this business specifically.

Your job: generate a complete, polished, ORIGINAL single-file HTML page for this specific business, using this business's real content, styled according to the category's design language, with premium scroll-driven motion. This is NOT cloning an existing site — create an original design embodying the same professional quality and layout patterns as the reference category, populated with this business's own real content. The bar is: a lead who sees this page should feel like this business already looks like an established, premium brand, and want to claim it immediately.

REAL CONTENT (use verbatim — do not invent additional facts, credentials, stats, testimonials, licensing/insurance claims, or years-in-business beyond what is given here):
${opts.contentJson}

BUSINESS INFO:
Business name: ${opts.businessName}
Category: ${opts.category}
City/State: ${opts.city}, ${opts.state}

DESIGN TOKENS for this category (colors, typography, buttons, cards — use these exactly, do not default to generic blue/gray):
${opts.designTokensJson}

LAYOUT PATTERNS for this category (structural inspiration — adapt section order/count to fit only the content actually given; do not force a section with no corresponding real content, e.g. skip testimonials/partner-logos/stats sections if none were provided):
${opts.layoutAnalysisJson}

MOTION NOTES for this category (what should move, translate this into the v2.4 hooks described below):
${opts.motionNotesJson}

THIS BUSINESS'S OWN PHOTOGRAPHY (use these actual image URLs directly as <img src="..."> — do NOT use placeholder boxes, gradients-as-images, emoji, or SVG illustrations anywhere a real photo is called for, and do NOT reference any image URL that is not in this list):
${opts.ownPhotosJson}

These three photographs were commissioned for ${opts.businessName} specifically — they are not stock and not shared with any other site. They are ordered as a sequence: an establishing shot, work in progress, and a finished detail. Each carries a caption written from this business's own content; use those captions where a caption is called for, editing only for length.

THIS BUSINESS'S HERO VIDEO — a four-second clip that loops, animating the first photograph:
video: ${opts.heroVideoUrl}
poster: ${opts.heroPosterUrl}

THE HEADLINE (read before writing the h1):
The h1 is the only sentence most visitors read. Earn it from what makes THIS
business different, not from its category.

Across a batch of 43 generated sites, 11 headlines opened with "Professional",
4 more with "Transform Your", 3 with "Expert". That is a formula, and it reads
as machine-written on sight.

Do NOT begin the h1 with: Professional, Expert, Transform Your, Quality,
Your Trusted, Welcome to, Premier, Leading. Do NOT use the bare pattern
"<Adjective> <Trade> Services in <City>" — naming the city is good, naming only
the city and the trade is a directory listing, not a headline.

Write instead from whichever the real content actually supports: the outcome the
customer gets, the moment they need this business, a specific detail or number
from the provided content, or the owner's own plain words.

Two tests before committing to an h1:
  1. Could this exact sentence sit unchanged on a competitor's site? If yes,
     rewrite it.
  2. Does it say something, or only signal a category? A business called
     "Beachin Cleans & Maintenance" deserves better than "Professional Cleaning
     Services in Panama City Beach".

Under about 9 words where the content allows. Never invent a fact, number,
guarantee or credential that is not in the content provided above.

STRICT REQUIREMENTS:
1. Complete document: <!DOCTYPE html>, <html>, <head> (meta charset, viewport, <title> using the business name + tagline, meta description derived from the about/tagline), <body>.
2. Embedded CSS design system in a single <style> tag using CSS custom properties (:root) driven by the provided design tokens — exact hex colors, font choices, spacing scale, border radii. Style every section explicitly.
3. Use ONLY the real content provided above. Never invent additional services, credentials, testimonials, stats, years-in-business claims, or licensing/insurance/certification claims. If a layout pattern calls for content you don't have, OMIT that section rather than inventing fake content.
4. Follow the category's layout patterns for structure and section order, adapted sensibly to fit only the real content available.
5. Semantic HTML5: header, nav, main, section, footer, in that structural order.
6. MOTION — this page will run against motion runtime v2.4 (shown below for context ONLY — see requirement #10, you must NOT output this script yourself). It ONLY understands these exact hooks. Do NOT use any other motion hooks (no ".reveal" class, no "data-parallax" attribute — note this is different from "data-parallax-img", see below —, no "header[data-sticky]", no ".counter", no ".marquee" — those belonged to an older runtime and do nothing in v2.4; using them produces dead, static markup). Build the page using exactly these v2.4 hooks:
   - data-hero: put this attribute on the hero <section>. The full-bleed background MUST be the business's own hero video, written EXACTLY like this — not an <img>, not a CSS background-image, not a poster on its own:
     <video class="hero-bg" autoplay muted loop playsinline preload="metadata" poster="${opts.heroPosterUrl}"><source src="${opts.heroVideoUrl}" type="video/mp4"></video>
     Every attribute there is load-bearing: muted is what allows autoplay at all in Chrome and Safari, playsinline stops iOS taking the video fullscreen, loop is what makes four seconds enough, and the poster is what fills the hero during the moment before the clip is decoded — so a visitor on a slow phone still sees the photograph immediately rather than a black rectangle. Do not drop or reorder them, and do not add controls.
     The main heading goes in the same section as an <h1> (or class="hero-title"). The runtime will scale/fade the heading and parallax the .hero-bg automatically as the user scrolls past — you must give .hero-bg the CSS (position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0) and give the hero section position:relative;overflow:hidden so the parallax doesn't break layout. Put a scrim over the video (a gradient or tinted overlay between it and the text, e.g. .hero-bg::after or a dedicated overlay div at z-index:1) so the heading stays legible over moving footage — text that is readable over a still frame can become unreadable four seconds later.
   - data-media-sequence: build ONE pinned scroll-scrubbed section using all three of this business's photographs, in the order given. Each item MUST pair its image with its caption — do NOT ship bare images with no text. Structure exactly:
     <section data-media-sequence><div class="ms-track">
       <div class="ms-item"><img src="..." style="width:100%;height:100%;object-fit:cover"><div class="ms-caption"><h3>Short business-specific line (≤6 words)</h3><p>One supporting sentence using only the real content given above</p></div></div>
       ...repeat for each photo, each with its own distinct caption tied to a different real detail (a service, a value prop, a location detail) — never reuse the same caption text twice...
     </div></section>
     You MUST write the CSS yourself (the runtime only toggles the "ms-active" class on the whole .ms-item — it injects no CSS for this pattern, so the caption crossfades with its image for free via your own opacity transition):
     [data-media-sequence]{position:relative;height:300vh}
     [data-media-sequence] .ms-track{position:sticky;top:0;height:100vh;overflow:hidden}
     [data-media-sequence] .ms-item{position:absolute;inset:0;opacity:0;transition:opacity .8s ease}
     [data-media-sequence] .ms-item.ms-active{opacity:1;z-index:2}
     .ms-caption MUST be legible over an arbitrary photo — position it absolute (e.g. bottom:0;left:0;right:0), give it a gradient scrim behind the text (e.g. background:linear-gradient(transparent, rgba(0,0,0,.75))) or an equivalent solid/blurred panel, generous padding, and white/high-contrast text — the same technique you use for .hero-bg::after. A caption that is structurally present but unreadable over a bright photo is a failure.
     Place this section somewhere natural in the page flow (e.g. between the about/services section and testimonials/CTA), not necessarily right after the hero.
     IMPORTANT: do NOT give a .ms-item or the img inside it the data-parallax-img attribute or the ken-burns class described below — the media-sequence already has its own scroll-driven opacity transform, and combining it with another transform-driven effect on the same element will conflict.
   - data-split-text: put this attribute on 1-2 key headings (e.g. a section intro h2) you want to reveal character-by-character as the user scrolls to them. The runtime injects its own CSS for this — do not write competing CSS for ".char".
   - data-reveal: put this attribute on cards, feature blocks, and section content you want to fade+slide up as they enter the viewport. The runtime injects its own CSS for this — do not write competing CSS for it, and do not also give these elements an initial opacity:0 in your own stylesheet (the runtime handles that via its injected CSS).
   - data-progress: include one empty element, e.g. <div data-progress></div>, fixed to the very top of the viewport (position:fixed;top:0;left:0;height:3px;width:0;z-index:9999). Style its background color yourself using the category's accent color — the runtime only updates its width on scroll.
   - data-parallax-img (NEW, optional): put this attribute on ONE supporting/detail image elsewhere in the page (e.g. in an about or features section) — NOT the hero-bg, NOT a media-sequence item — with a value between 0.1 and 0.3 (e.g. data-parallax-img="0.2") controlling how fast it drifts relative to scroll. The runtime applies a scroll-linked translateY to it automatically. You MUST give its container overflow:hidden and make the image itself taller than its container (e.g. height:130%; the container clips it) so the drift never reveals empty space at the edges.
   - .ken-burns (NEW, optional): add this class to AT MOST ONE supporting/detail image (not the hero-bg, not a media-sequence item, not the same image as data-parallax-img) for a slow, subtle, automatic zoom that plays continuously while it's in view — a purely decorative "this photo feels alive" touch. No JS attribute needed, just the class; the runtime injects the CSS animation automatically (and it already respects reduced-motion on its own via a CSS media query, don't add your own competing animation).
   - The hero background is the video. Use the three photographs for the media-sequence section, and reuse one of them as a supporting/detail image elsewhere in the page (e.g. in an about or features section) — do not describe a photo you don't actually place as an <img>, and never reference an image URL that was not given to you. Use data-parallax-img and/or .ken-burns tastefully on at most one image each — this is a restrained accent, not something to apply everywhere.
7. Responsive: mobile-first, with media queries for tablet and desktop breakpoints. On narrow viewports the media-sequence section should remain usable (photos and captions still visible, just less dramatic pin distance is fine).
   HEADER NAV: the header must include real navigation — Home (logo, scrolls to top or the hero), About, Services, Contact — as anchor links (<a href="#about">, <a href="#services">, <a href="#contact">) to sections that actually exist on the page (give the About content block id="about"; Services and Contact sections already need id="services" / id="contact" per your own section structure), plus the existing primary CTA button. This must work correctly on mobile using data-menu-toggle / data-menu-target — do NOT just hide the nav on mobile with no way to reach it (that is a real bug, not a design choice):
   <header><div class="header-inner"><div class="logo">...</div>
     <button data-menu-toggle aria-label="Menu" aria-expanded="false">☰</button>
     <nav data-menu-target><a href="#about">About</a><a href="#services">Services</a><a href="#contact">Contact</a><a href="..." class="btn btn-primary" data-claim-trigger>...CTA text...</a></nav>
   </div></header>
   You MUST write this CSS yourself (the runtime only toggles the "menu-open" class on [data-menu-target] and toggles aria-expanded on the button — it injects no CSS for this pattern):
   [data-menu-target]{display:flex;align-items:center;gap:var(--spacing-md,24px)}
   [data-menu-toggle]{display:none;background:none;border:none;font-size:24px;cursor:pointer}
   @media (max-width:767px){
     [data-menu-toggle]{display:block}
     [data-menu-target]{display:none;position:absolute;top:100%;left:0;right:0;flex-direction:column;background:var(--color-background,#fff);padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.12)}
     [data-menu-target].menu-open{display:flex}
   }
   Style the mobile dropdown using this category's real design tokens (colors, spacing), not generic defaults.
8. CLAIM MODAL (replaces any embedded "Claim This Website" page section — do NOT add one as a normal scrollable section anywhere in the page): build ONE hidden-by-default modal near the end of <body>, structured exactly like this (the runtime handles show/hide positioning CSS automatically — you only need to style the inner content using this category's design tokens):
   <div data-claim-modal>
     <div class="claim-modal-panel">
       <button data-claim-close aria-label="Close">×</button>
       <h2>Claim This Website</h2>
       <p>This professionally designed website was created specifically for [business name]. If you are the business owner, claim this site today.</p>
       <div class="claim-features">... 3-4 short feature bullets, e.g. "Award-winning design", "Fully responsive", "Optimized for conversions" ...</div>
       <a href="/pricing" class="btn btn-primary" data-bit-open>Claim This Website Now</a>
     </div>
   </div>
   The runtime injects the modal's positioning/overlay/backdrop CSS automatically (do not write competing CSS for [data-claim-modal] itself) — you only style .claim-modal-panel's inner content (background, padding, border-radius, typography) using this category's design tokens.
   TWO RULES ABOUT THAT LAST BUTTON, both of which were previously got wrong on every site built:
   - data-claim-close belongs ONLY on the × button. Putting it on the call-to-action makes the one button meant to convert a visitor dismiss the offer instead — and because the × needs position:absolute, your own [data-claim-close] rule then drags the call-to-action out of flow and paints it on top of the heading.
   - data-bit-open is what the button carries instead. The prices are not part of this page; they are injected when the site is served. That attribute is the hand-off, and href="/pricing" is the no-JS fallback. Do not invent a price, a discount, or a "limited time" claim anywhere in this modal — you do not know what this costs.
9. Footer must include the business name, city/state, and the same Home/About/Services/Contact anchor links as the header (a standard footer sitemap, same #about/#services/#contact anchors). Do NOT include any personal owner contact information (no personal phone/email/mailing address) and do not fabricate a business phone/email if none was provided in the content above. Do NOT include any "this is a preview" or "contact us to claim this site" language in the footer — that messaging now lives only in the claim modal (requirement #8).
10. Do NOT include the motion runtime script in your output at all — no <script> tag containing it, and do not paraphrase or reimplement it either. The platform injects the real v2.4 runtime automatically after you respond. Your job is only to use the hooks (data-hero, data-media-sequence, data-split-text, data-reveal, data-progress, data-parallax-img, .ken-burns) correctly in your HTML/CSS — the runtime source below is shown so you understand exactly what each hook does, not so you reproduce it.
11. No external libraries, CDNs, icon fonts, or web fonts — system font stacks only. This business's own photo and video URLs are the one exception to "no external resources" — they are real hosted files and should be referenced by their given https URL directly in <img src> and the hero <video>.
12. BUTTONS: define exactly ONE reusable button system in your CSS — a base .btn class plus .btn-primary/.btn-secondary variants (or your own consistently-named equivalent) — and reuse that SAME system for every clickable CTA on the page (header, hero, section CTAs). Do not invent a new one-off button class per section (e.g. do not create separate .nav-cta, .hero-cta, .contact-cta-btn classes that each redefine their own padding/radius/hover treatment — that produces visual inconsistency across one page). Every CTA button (.btn) must ALSO carry data-claim-trigger and keep a real href="#contact" (or another real section id) as a no-JS fallback — clicking it opens the claim modal via JS, but if JS fails it still gracefully scrolls to a real section instead of doing nothing. Do NOT put data-claim-trigger on the Home/About/Services/Contact navigation links themselves — those must remain plain anchor links that scroll to their section, not modal triggers.

Here is the motion runtime script (v2.4) — FOR YOUR REFERENCE ONLY, to understand what each hook does. Per requirement #10, do NOT include this script (or anything like it) in your output:
${MOTION_RUNTIME}

Before responding, self-check: (a) is all content real, nothing invented? (b) did you use ONLY the v2.4 hooks (data-hero with .hero-bg, data-media-sequence with .ms-track/.ms-item/.ms-caption, data-split-text, data-reveal, data-progress, data-menu-toggle/data-menu-target, data-claim-modal/data-claim-trigger/data-claim-close, and optionally data-parallax-img / .ken-burns) and NONE of the old v1 hooks (.reveal, data-parallax, header[data-sticky], .counter, .marquee)? (c) did you write the manual CSS required for data-hero/.hero-bg, data-media-sequence/.ms-track/.ms-item/.ms-caption, data-progress, data-menu-toggle/data-menu-target (including the mobile dropdown), and data-parallax-img's container, while NOT writing competing CSS for data-split-text, data-reveal, .ken-burns, or [data-claim-modal] itself (the runtime injects its own CSS for all four)? (d) does every media-sequence item have its own distinct, legible caption tied to real content? (e) did you avoid putting data-parallax-img or ken-burns on the hero-bg or any media-sequence item? (f) is the hero background the exact <video class="hero-bg" autoplay muted loop playsinline ...> element given above, and are all three of this business's own photo URLs actually placed as <img> tags, with no image URL you were not given? (g) is the given design token palette actually used throughout? (h) does the header have real Home/About/Services/Contact nav links with a working data-menu-toggle/data-menu-target mobile pattern — not hidden with no way to reach it? (i) is there exactly one data-claim-modal (hidden by default, no competing CSS on the modal itself), with NO standalone "Claim This Website" section anywhere else in the page, and does its call-to-action carry data-bit-open with href="/pricing" while data-claim-close appears ONLY on the × button? (j) does every .btn CTA carry data-claim-trigger with a real href fallback, while the nav links do NOT carry data-claim-trigger? (k) is the footer free of personal owner contact info, free of fabricated business contact info, and free of any "preview"/"claim this site" language (that only lives in the modal now), while including the same nav sitemap links as the header? (l) did you leave out the motion runtime script entirely, per requirement #10? Fix any gaps before responding.

Return ONLY raw HTML. No markdown fences, no prose before or after.`;

function validateMotionHooks(html: string): { ok: boolean; failures: string[] } {
  const failures: string[] = [];

  if (!/data-hero/i.test(html)) {
    failures.push("missing data-hero attribute");
  } else if (!/class=["'][^"']*\bhero-bg\b[^"']*["']/i.test(html)) {
    failures.push("data-hero section is missing a .hero-bg element");
  }

  // The hero must actually be the video, and must actually be able to play it.
  //
  // This is the whole reason the quality gate was rejecting every automated
  // site: the hero was a still, or shared stock, and never a clip. Checked
  // here rather than left to the gate because the builder gets a free retry
  // and the gate does not — catching it here costs one rebuild, catching it
  // later costs the lead.
  //
  // Each attribute is checked separately because each fails differently and
  // silently: without muted, Chrome and Safari refuse to autoplay at all;
  // without playsinline, iOS Safari throws the clip into a fullscreen player
  // the moment it starts; without loop, the hero freezes on a black frame
  // after four seconds; without a poster, the hero is empty until the video
  // decodes, which on a phone on mobile data is the first thing the owner
  // sees.
  const heroVideo = html.match(/<video[^>]*class=["'][^"']*\bhero-bg\b[^"']*["'][^>]*>/i);
  if (!heroVideo) {
    failures.push("hero-bg must be a <video> element carrying this business's own hero clip, not an <img> or a CSS background");
  } else {
    const tag = heroVideo[0];
    for (const attr of ["autoplay", "muted", "loop", "playsinline"]) {
      if (!new RegExp(`\\b${attr}\\b`, "i").test(tag)) {
        failures.push(`hero video is missing the ${attr} attribute`);
      }
    }
    if (!/\bposter=/i.test(tag)) {
      failures.push("hero video has no poster (the hero is blank until the clip decodes)");
    }
    if (!/hero\.mp4/i.test(html)) {
      failures.push("hero video does not reference this business's hero.mp4");
    }
  }

  if (!/data-progress/i.test(html)) {
    failures.push("missing data-progress element");
  }

  if (!/data-reveal/i.test(html)) {
    failures.push("missing at least one data-reveal element");
  }

  // Transform-collision check: hero-bg must not also carry data-parallax-img or ken-burns.
  const heroBgTagMatch = html.match(/<[^>]+class=["'][^"']*\bhero-bg\b[^"']*["'][^>]*>/i);
  if (heroBgTagMatch) {
    const tag = heroBgTagMatch[0];
    if (/data-parallax-img/i.test(tag) || /\bken-burns\b/i.test(tag)) {
      failures.push("hero-bg element must not also use data-parallax-img or ken-burns (conflicts with the hero's own scroll transform)");
    }
  }

  if (/data-media-sequence/i.test(html)) {
    const cssOk =
      /\[data-media-sequence\]/i.test(html) &&
      /\.ms-track/i.test(html) &&
      /\.ms-item/i.test(html) &&
      /ms-active/i.test(html);
    if (!cssOk) {
      failures.push("data-media-sequence is missing required CSS (.ms-track/.ms-item/.ms-active)");
    }

    const sectionMatch = html.match(/<section[^>]*data-media-sequence[^>]*>[\s\S]*?<\/section>/i);
    if (!sectionMatch) {
      failures.push("data-media-sequence is not wrapped in a <section>...</section>");
    } else {
      const block = sectionMatch[0];
      const itemCount = (block.match(/class=["'][^"']*\bms-item\b[^"']*["']/gi) || []).length;
      const imgCount = (block.match(/<img\b/gi) || []).length;
      const captionCount = (
        block.match(/class=["'][^"']*\bms-caption\b[^"']*["']|<h[1-6]\b/gi) || []
      ).length;
      if (itemCount < 2) failures.push(`media-sequence has only ${itemCount} .ms-item (need >= 2)`);
      if (imgCount < 2) failures.push(`media-sequence has only ${imgCount} <img> (need >= 2)`);
      if (captionCount < itemCount) {
        failures.push(
          `media-sequence has ${itemCount} items but only ${captionCount} captions — every item needs its own caption`,
        );
      }

      // Transform-collision check: no .ms-item (or its children) may carry data-parallax-img or ken-burns.
      const itemTags = block.match(/<[^>]+class=["'][^"']*\bms-item\b[^"']*["'][^>]*>/gi) || [];
      const collidingItem = itemTags.some((tag) => /data-parallax-img/i.test(tag) || /\bken-burns\b/i.test(tag));
      const collidingImgInBlock = /<img\b[^>]*(?:data-parallax-img|class=["'][^"']*\bken-burns\b)/i.test(block);
      if (collidingItem || collidingImgInBlock) {
        failures.push("a .ms-item (or its image) must not also use data-parallax-img or ken-burns (conflicts with the media-sequence's own scroll transform)");
      }
    }
  }

  // Multi-link nav must have a working mobile toggle -- this is the exact
  // failure mode from before (links present but unreachable on mobile),
  // now caught automatically instead of hoped-for.
  const navAnchorCount = (html.match(/href=["']#(about|services|contact)["']/gi) || []).length;
  if (navAnchorCount >= 2) {
    if (!/data-menu-toggle/i.test(html)) {
      failures.push("multi-link nav present but missing data-menu-toggle (mobile hamburger button)");
    }
    if (!/data-menu-target/i.test(html)) {
      failures.push("multi-link nav present but missing data-menu-target (mobile nav container)");
    }
  }

  if (!/data-claim-modal/i.test(html)) {
    failures.push("missing data-claim-modal element");
  }
  if (!/data-claim-trigger/i.test(html)) {
    failures.push("missing data-claim-trigger on at least one CTA button");
  }

  // The one button in the popup that is supposed to sell.
  //
  // The prompt's own example carried data-claim-close and href="#", so every
  // site built to date shipped a "Claim This Website Now" that dismissed the
  // popup and navigated nowhere — and, because the close control needs
  // position:absolute, the page's own [data-claim-close] rule pulled it out of
  // flow and printed it across the heading. Both faults are invisible from the
  // build's point of view: valid HTML, correct hooks, a button that reads
  // right and does nothing.
  const closeCarriers = html.match(/<[^>]+data-claim-close[^>]*>/gi) ?? [];
  for (const tag of closeCarriers) {
    if (/class=["'][^"']*\bbtn\b[^"']*["']/i.test(tag)) {
      failures.push("data-claim-close is on a .btn — it belongs only on the modal's × control, or the call-to-action closes the offer instead of opening it");
    }
  }
  if (/data-claim-modal/i.test(html) && !/data-bit-open/i.test(html)) {
    failures.push("the claim modal's call-to-action is missing data-bit-open (nothing on the page opens the real prices)");
  }
  if (/class=["'][^"']*\bclaim-section\b[^"']*["']/i.test(html)) {
    failures.push("standalone .claim-section still present -- claim content must be inside data-claim-modal only, not a visible page section");
  }

  return { ok: failures.length === 0, failures };
}

function stripStrayRuntimeScripts(html: string): string {
  return html.replace(
    /<script>(?:(?!<\/script>)[\s\S])*__motionRuntimeV2(?:(?!<\/script>)[\s\S])*<\/script>/gi,
    "",
  );
}

function injectRuntime(html: string): string {
  const cleaned = stripStrayRuntimeScripts(html);
  const script = `\n<script>${MOTION_RUNTIME}</script>\n`;
  if (/<\/body>/i.test(cleaned)) {
    return cleaned.replace(/<\/body>/i, `${script}</body>`);
  }
  return cleaned + script;
}

async function callBuildModel(
  openrouterKey: string,
  messages: Array<{ role: string; content: string }>,
  temperature?: number,
): Promise<{ resp: Response; elapsedMs: number }> {
  const startedAt = Date.now();
  const body: Record<string, unknown> = {
    model: "anthropic/claude-sonnet-4.5",
    max_tokens: 10000,
    messages,
  };
  if (temperature !== undefined) body.temperature = temperature;
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openrouterKey}`,
      "HTTP-Referer": "https://buildittoday.ai",
      "X-Title": "AutoSite Design HTML Generation",
    },
    body: JSON.stringify(body),
  });
  return { resp, elapsedMs: Date.now() - startedAt };
}

function extractHtml(json: any): string {
  const raw = json.choices[0].message.content.trim();
  return raw.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
}

Deno.serve(async (req: Request) => {
  const runId = crypto.randomUUID().slice(0, 8);
  const fnStart = Date.now();
  const timings: Record<string, number> = {};
  console.log(`[${runId}] generate-design-html starting`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openrouterKey) {
    console.error(`[${runId}] OPENROUTER_API_KEY not set`);
    return new Response(JSON.stringify({ ok: false, error: "OPENROUTER_API_KEY not set" }), { status: 500 });
  }

  let leadId: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.leadId === "string" && body.leadId.length > 0) leadId = body.leadId;
  } catch { /* no body */ }

  if (!leadId) {
    console.error(`[${runId}] no leadId provided`);
    return new Response(JSON.stringify({ ok: false, error: "leadId is required" }), { status: 400 });
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, business_name, city, state, business_category, demo_slug, document_number, generated_content")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    console.error(`[${runId}] lead not found: ${leadError?.message}`);
    return new Response(JSON.stringify({ ok: false, error: "Lead not found" }), { status: 404 });
  }
  if (!lead.generated_content) {
    console.error(`[${runId}] lead ${leadId} has no generated_content — run generate-site first`);
    return new Response(
      JSON.stringify({ ok: false, error: "Lead has no generated_content. Run generate-site for this lead first." }),
      { status: 400 },
    );
  }
  timings.leadFetchMs = Date.now() - fnStart;
  console.log(`[${runId}] lead: ${lead.business_name} (${lead.business_category}, ${lead.city}), leadFetchMs=${timings.leadFetchMs}`);

  const t1 = Date.now();
  const { data: designRef, error: designRefError } = await supabase
    .from("category_design_references")
    // category_photos is deliberately not read any more — the photography now
    // comes from demo_media, commissioned per business. The column stays for
    // the 43 sites built before that.
    .select("design_tokens, layout_analysis, motion_notes")
    .eq("business_category", lead.business_category)
    .maybeSingle();
  timings.designRefFetchMs = Date.now() - t1;

  if (designRefError || !designRef || !designRef.design_tokens) {
    console.error(`[${runId}] no design tokens for category ${lead.business_category}`);
    return new Response(
      JSON.stringify({ ok: false, error: `No researched design tokens for category "${lead.business_category}"` }),
      { status: 400 },
    );
  }

  const demoSlug = lead.demo_slug || lead.document_number;
  if (!demoSlug) {
    console.error(`[${runId}] lead ${leadId} has no demo_slug or document_number`);
    return new Response(JSON.stringify({ ok: false, error: "Lead has no demo_slug or document_number" }), { status: 400 });
  }

  // This business's own photography and hero clip, from generate-hero-media.
  //
  // Until now every site was dressed in category_photos — the same stock
  // shared by every business in the trade — and had no hero video at all, so
  // the quality gate rejected each one for "no hero video" and was right to.
  // The standard is that a lead gets its own photographs and its own hero,
  // never something shared.
  //
  // A hard stop rather than a fallback: falling back to the shared stock is
  // exactly the outcome this is meant to end, and it would be invisible —
  // the page would build, look plausible, and be wrong. The chain orders
  // media before HTML, so reaching here without it means something upstream
  // did not run, which is worth seeing.
  const { data: media } = await supabase
    .from("demo_media")
    .select("status, hero_poster_url, hero_video_url, scenes_json")
    .eq("demo_slug", demoSlug)
    .maybeSingle();

  const photos = (media?.scenes_json?.photos ?? []) as
    { url: string; caption?: { heading?: string; body?: string } }[];

  if (media?.status !== "ready" || !media.hero_video_url || photos.length === 0) {
    const state = media?.status ?? "none";
    console.error(`[${runId}] media not ready for ${demoSlug} (status=${state})`);
    // Upsert, not update: on a first build there is no demo_sites row yet, and
    // an update would record the reason nowhere. Written as failed so the
    // builder picks it up again once the media lands.
    await supabase.from("demo_sites").upsert({
      lead_id: lead.id,
      demo_slug: demoSlug,
      business_name: lead.business_name,
      city: lead.city,
      state: lead.state,
      business_category: lead.business_category,
      status: "failed",
      error: `Media not ready (status=${state}). Run generate-hero-media for this lead first.`,
      updated_at: new Date().toISOString(),
    }, { onConflict: "demo_slug" });
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Media not ready for ${demoSlug} (status=${state}). Run generate-hero-media first.`,
      }),
      { status: 400 },
    );
  }

  const t2 = Date.now();
  const { error: upsertError } = await supabase
    .from("demo_sites")
    .upsert({
      lead_id: lead.id,
      demo_slug: demoSlug,
      business_name: lead.business_name,
      city: lead.city,
      state: lead.state,
      business_category: lead.business_category,
      content_json: lead.generated_content,
      status: "generating",
      error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "demo_slug" });
  timings.initialUpsertMs = Date.now() - t2;

  if (upsertError) {
    console.error(`[${runId}] initial upsert failed: ${upsertError.message}`);
    return new Response(JSON.stringify({ ok: false, error: upsertError.message }), { status: 500 });
  }

  const prompt = BUILD_PROMPT_TEMPLATE({
    businessName: lead.business_name,
    category: lead.business_category,
    city: lead.city || "",
    state: lead.state || "",
    contentJson: JSON.stringify(lead.generated_content, null, 2),
    designTokensJson: JSON.stringify(designRef.design_tokens, null, 2),
    layoutAnalysisJson: JSON.stringify(designRef.layout_analysis, null, 2),
    motionNotesJson: JSON.stringify(designRef.motion_notes, null, 2),
    ownPhotosJson: JSON.stringify(photos, null, 2),
    heroVideoUrl: media.hero_video_url as string,
    heroPosterUrl: (media.hero_poster_url as string) ?? photos[0].url,
  });

  console.log(`[${runId}] calling OpenRouter build model...`);

  let resp: Response;
  let elapsedMs: number;
  try {
    ({ resp, elapsedMs } = await callBuildModel(openrouterKey, [{ role: "user", content: prompt }]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${runId}] fetch to OpenRouter failed: ${msg}`);
    await supabase.from("demo_sites").update({ status: "failed", error: `OpenRouter fetch failed: ${msg}` }).eq("demo_slug", demoSlug);
    return new Response(JSON.stringify({ ok: false, error: `OpenRouter fetch failed: ${msg}` }), { status: 502 });
  }
  timings.openrouterMs = elapsedMs;
  console.log(`[${runId}] OpenRouter responded in ${elapsedMs}ms, status=${resp.status}`);

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[${runId}] OpenRouter ${resp.status}: ${errText.slice(0, 300)}`);
    await supabase.from("demo_sites").update({ status: "failed", error: `OpenRouter ${resp.status}: ${errText.slice(0, 500)}` }).eq("demo_slug", demoSlug);
    return new Response(JSON.stringify({ ok: false, error: `OpenRouter ${resp.status}: ${errText}` }), { status: 502 });
  }

  const json = await resp.json();
  let html: string;
  try {
    html = extractHtml(json);
  } catch {
    console.error(`[${runId}] failed to extract HTML from model response`);
    await supabase.from("demo_sites").update({ status: "failed", error: "Failed to extract HTML from model response" }).eq("demo_slug", demoSlug);
    return new Response(JSON.stringify({ ok: false, error: "Failed to extract HTML from model response" }), { status: 502 });
  }

  if (!html.toLowerCase().includes("<!doctype") && !html.toLowerCase().includes("<html")) {
    console.error(`[${runId}] output doesn't look like HTML, length=${html.length}`);
    await supabase.from("demo_sites").update({ status: "failed", error: "Model output did not look like a valid HTML document" }).eq("demo_slug", demoSlug);
    return new Response(JSON.stringify({ ok: false, error: "Model output did not look like a valid HTML document", preview: html.slice(0, 300) }), { status: 502 });
  }

  let validation = validateMotionHooks(html);
  let retried = false;

  if (!validation.ok) {
    console.warn(`[${runId}] validation failed on first attempt: ${validation.failures.join("; ")} — retrying once`);
    retried = true;
    const correction = `Your previous HTML response was missing/incorrect on these specific points:\n- ${validation.failures.join("\n- ")}\n\nReturn the COMPLETE corrected HTML document again (same content and design, just fix these specific issues). Return ONLY raw HTML, no markdown fences, no prose.`;
    let retryResp: Response;
    let retryElapsedMs: number;
    try {
      ({ resp: retryResp, elapsedMs: retryElapsedMs } = await callBuildModel(
        openrouterKey,
        [
          { role: "user", content: prompt },
          { role: "assistant", content: html },
          { role: "user", content: correction },
        ],
        0.5,
      ));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${runId}] retry fetch to OpenRouter failed: ${msg}`);
      await supabase.from("demo_sites").update({
        status: "failed",
        error: `Validation failed (${validation.failures.join("; ")}) and retry fetch failed: ${msg}`,
      }).eq("demo_slug", demoSlug);
      return new Response(JSON.stringify({ ok: false, error: `Retry fetch failed: ${msg}`, validationFailures: validation.failures }), { status: 502 });
    }
    timings.retryOpenrouterMs = retryElapsedMs;

    if (!retryResp.ok) {
      const errText = await retryResp.text();
      console.error(`[${runId}] retry OpenRouter ${retryResp.status}: ${errText.slice(0, 300)}`);
      await supabase.from("demo_sites").update({
        status: "failed",
        error: `Validation failed (${validation.failures.join("; ")}) and retry OpenRouter ${retryResp.status}: ${errText.slice(0, 300)}`,
      }).eq("demo_slug", demoSlug);
      return new Response(JSON.stringify({ ok: false, error: `Retry OpenRouter ${retryResp.status}: ${errText}`, validationFailures: validation.failures }), { status: 502 });
    }

    const retryJson = await retryResp.json();
    try {
      html = extractHtml(retryJson);
    } catch {
      console.error(`[${runId}] failed to extract HTML from retry response`);
      await supabase.from("demo_sites").update({
        status: "failed",
        error: `Validation failed (${validation.failures.join("; ")}) and retry produced unparseable output`,
      }).eq("demo_slug", demoSlug);
      return new Response(JSON.stringify({ ok: false, error: "Failed to extract HTML from retry response", validationFailures: validation.failures }), { status: 502 });
    }

    validation = validateMotionHooks(html);
    if (!validation.ok) {
      console.error(`[${runId}] validation still failing after retry: ${validation.failures.join("; ")}`);
      await supabase.from("demo_sites").update({
        status: "failed",
        error: `Validation failed after retry: ${validation.failures.join("; ")}`,
      }).eq("demo_slug", demoSlug);
      return new Response(
        JSON.stringify({ ok: false, error: "Validation failed after retry", validationFailures: validation.failures, timings }),
        { status: 502 },
      );
    }
    console.log(`[${runId}] retry passed validation`);
  }

  html = injectRuntime(html);
  console.log(`[${runId}] generated HTML: ${html.length} chars, retried=${retried}`);

  const storagePath = `${demoSlug}/index.html`;
  const uploadUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/demo-sites/${storagePath}?upsert=true`;
  const uploadStarted = Date.now();
  let uploadResp: Response;
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    uploadResp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Content-Type": "text/html; charset=utf-8",
        "x-upsert": "true",
      },
      body: html,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${runId}] storage upload fetch failed: ${msg}`);
    await supabase.from("demo_sites").update({ status: "failed", error: `Storage upload fetch failed: ${msg}` }).eq("demo_slug", demoSlug);
    return new Response(JSON.stringify({ ok: false, error: `Storage upload fetch failed: ${msg}` }), { status: 500 });
  }
  const uploadMs = Date.now() - uploadStarted;
  timings.uploadMs = uploadMs;
  timings.totalMsSoFar = Date.now() - fnStart;

  if (!uploadResp.ok) {
    const errText = await uploadResp.text();
    console.error(`[${runId}] storage upload failed ${uploadResp.status}: ${errText.slice(0, 300)}, timings=${JSON.stringify(timings)}`);
    await supabase.from("demo_sites").update({ status: "failed", error: `Storage upload ${uploadResp.status}: ${errText.slice(0, 500)}` }).eq("demo_slug", demoSlug);
    return new Response(JSON.stringify({ ok: false, error: `Storage upload ${uploadResp.status}: ${errText}`, timings }), { status: 500 });
  }

  const { error: finalUpdateError } = await supabase
    .from("demo_sites")
    .update({
      storage_path: storagePath,
      status: "ready",
      generator_version: GENERATOR_VERSION,
      generated_at: new Date().toISOString(),
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("demo_slug", demoSlug);

  if (finalUpdateError) {
    console.error(`[${runId}] final status update failed: ${finalUpdateError.message}`);
    return new Response(JSON.stringify({ ok: false, error: finalUpdateError.message }), { status: 500 });
  }

  timings.totalMs = Date.now() - fnStart;
  console.log(`[${runId}] done: demo_slug=${demoSlug}, htmlChars=${html.length}, retried=${retried}, timings=${JSON.stringify(timings)}`);
  return new Response(
    JSON.stringify({ ok: true, leadId: lead.id, demoSlug, storagePath, htmlChars: html.length, retried, timings }),
    { headers: { "Content-Type": "application/json" } },
  );
});
