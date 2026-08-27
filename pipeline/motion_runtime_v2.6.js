// motion_runtime.js v2.6 -- adds yearInit (self-updating copyright year,
// data-current-year hook) on top of v2.5's deterministic smooth-scroll CSS.
// Everything else identical to v2.4/v2.5.

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

  function heroInit() {
    var hero = document.querySelector("[data-hero]");
    if (!hero || prefersReduced) return;
    var title = hero.querySelector("h1") || hero.querySelector(".hero-title");
    var bg = hero.querySelector(".hero-bg");
    var startTime = (window.performance && performance.now) ? performance.now() : Date.now();
    hero.style.willChange = "transform";
    if (bg && bg.tagName === "VIDEO") {
      bg.play().catch(function () {});
    }
    function frame() {
      var r = hero.getBoundingClientRect();
      var pct;
      if (r.bottom < 0 || r.top > window.innerHeight * 2) { pct = r.bottom < 0 ? 1 : 0; }
      else pct = Math.min(1, Math.max(0, -r.top / window.innerHeight));
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var elapsed = (now - startTime) / 1000;
      var idleZoom = 1 + Math.min(elapsed / 25, 1) * 0.06;
      if (title) {
        title.style.transform = "scale(" + (1 + pct * 0.15) + ") translateY(" + pct * 40 + "px)";
        title.style.opacity = String(Math.max(0, 1 - pct * 1.1));
      }
      if (bg && bg !== hero) {
        bg.style.transform = "translateY(" + pct * 60 + "px) scale(" + (idleZoom + pct * 0.08) + ")";
      }
      raf(frame);
    }
    raf(frame);
  }

  function mediaInit() {
    var stages = document.querySelectorAll("[data-media-sequence]");
    if (!stages.length) return;
    stages.forEach(function (stage) {
      var items = Array.prototype.slice.call(stage.querySelectorAll(".ms-item:not(.ms-ui)"));
      if (!items.length) return;
      if (prefersReduced) { items[0].classList.add("ms-active"); return; }
      var scrollLen = Math.min(items.length * 0.8, 4) * window.innerHeight;
      var progressBar = stage.querySelector(".ms-progress");
      function update(y) {
        var r = stage.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, -r.top / scrollLen));
        var idx = Math.min(items.length - 1, Math.floor(p * items.length));
        items.forEach(function (it, i) { it.classList.toggle("ms-active", i === idx); });
        var activeVid = items[idx] && items[idx].querySelector("video");
        items.forEach(function (it) {
          var v = it.querySelector("video");
          if (v && v !== activeVid) v.pause();
        });
        if (activeVid && activeVid.paused) { activeVid.play().catch(function () {}); }
        if (progressBar) progressBar.style.width = (p * 100).toFixed(1) + "%";
      }
      onScrollRegister(update);
      update(0);
    });
  }

  function splitInit() {
    if (prefersReduced) return;
    var els = document.querySelectorAll("[data-split-text]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        el.classList.add("split-ready");
        var chars = el.querySelectorAll(".char");
        chars.forEach(function (c, i) { c.style.transitionDelay = (30 + i * 18) + "ms"; });
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
      '[data-split-text] .ms-word{display:inline-block;white-space:nowrap}' +
      '[data-split-text] .char{display:inline-block;overflow:hidden;' +
      'transform:translateY(115%);transition:transform .6s cubic-bezier(.2,.7,.25,1)}' +
      '[data-split-text].split-ready .char{transform:translateY(0)}'
    );
  }

  function revealInit() {
    if (prefersReduced) return;
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

  function progressInit() {
    var bar = document.querySelector("[data-progress]");
    if (!bar) return;
    onScrollRegister(function (y) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0).toFixed(2) + "%";
    });
  }

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

  function kenBurnsCssInit() {
    injectCss(
      "@media (prefers-reduced-motion: no-preference){" +
      ".ken-burns{animation:mrv2-kenburns 14s ease-in-out infinite alternate;" +
      "will-change:transform}" +
      "@keyframes mrv2-kenburns{0%{transform:scale(1)}100%{transform:scale(1.08)}}" +
      "}"
    );
  }

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
      if (e.target.closest && e.target.closest("a, button, .btn")) { ring.classList.add("mrv2-cursor-hover"); }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest("a, button, .btn")) { ring.classList.remove("mrv2-cursor-hover"); }
    });
    injectCss(
      ".mrv2-custom-cursor,.mrv2-custom-cursor a,.mrv2-custom-cursor button{cursor:none}" +
      ".mrv2-cursor-dot{position:fixed;top:0;left:0;width:6px;height:6px;margin:-3px;" +
      "border-radius:50%;background:#1B4332;mix-blend-mode:difference;pointer-events:none;" +
      "z-index:10000;transition:transform .05s linear}" +
      ".mrv2-cursor-ring{position:fixed;top:0;left:0;width:32px;height:32px;margin:-16px;" +
      "border-radius:50%;border:1.5px solid rgba(27,67,50,.8);mix-blend-mode:difference;" +
      "pointer-events:none;z-index:10000;" +
      "transition:width .2s ease,height .2s ease,margin .2s ease}" +
      ".mrv2-cursor-ring.mrv2-cursor-hover{width:52px;height:52px;margin:-26px}"
    );
  }

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
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
  }

  function mobileMenuInit() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var target = document.querySelector("[data-menu-target]");
    if (!toggle || !target) return;
    toggle.addEventListener("click", function () {
      var isOpen = target.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  function claimModalInit() {
    var modal = document.querySelector("[data-claim-modal]");
    if (!modal) return;
    var triggers = document.querySelectorAll("[data-claim-trigger]");
    function openModal(e) {
      if (e) e.preventDefault();
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
    function closeModal() {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
    triggers.forEach(function (t) { t.addEventListener("click", openModal); });
    var closeEls = modal.querySelectorAll("[data-claim-close]");
    closeEls.forEach(function (c) { c.addEventListener("click", closeModal); });
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("active")) closeModal();
    });
  }

  function yearInit() {
    var els = document.querySelectorAll("[data-current-year]");
    var y = new Date().getFullYear();
    els.forEach(function (el) { el.textContent = y; });
  }

  function injectCss(css) {
    var existing = document.getElementById("mrv2-css");
    if (existing) { existing.textContent += css; return; }
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
    yearInit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
