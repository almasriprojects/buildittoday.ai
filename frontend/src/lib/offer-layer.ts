import { TIERS, money } from "@/lib/pricing";

/**
 * The "make this yours" layer, injected into a generated site at serve time.
 *
 * The sites are static HTML in storage, so this is added on the way out rather
 * than baked in — which means it applies to all 43 existing sites and every one
 * generated afterwards, with no regeneration.
 *
 * Everything is namespaced `bit-`. The generated pages already contain
 * `data-claim-modal` and `data-claim-trigger`, but those belong to the
 * *business's own* consultation modal — part of the demo content. Colliding
 * with them would make "Schedule a Consultation" open a sales pitch.
 *
 * No framework, no external requests: this has to survive inside a page whose
 * CSS we do not control.
 */
export function offerLayer(opts: {
  businessName: string;
  demoSlug: string;
  leadId?: string | null;
}): string {
  const { businessName, demoSlug, leadId } = opts;

  const cards = TIERS.map((t) => {
    const feats = t.features
      .slice(0, 4)
      .map((f) => `<li>${esc(f)}</li>`)
      .join("");
    return `
      <div class="bit-card${t.popular ? " bit-pop" : ""}">
        ${t.popular ? '<span class="bit-badge">Recommended</span>' : ""}
        <div class="bit-name">${esc(t.name)}</div>
        <div class="bit-price">${money(t.setup)}</div>
        <div class="bit-mo">then ${money(t.monthly)}/month</div>
        <ul class="bit-feats">${feats}</ul>
        <a class="bit-buy" data-bit-tier="${t.key}"
           href="/claim?slug=${encodeURIComponent(demoSlug)}&tier=${t.key}">
          ${esc(t.cta)}
        </a>
      </div>`;
  }).join("");

  return `
<style>
.bit-bar,.bit-modal,.bit-modal *{box-sizing:border-box}
.bit-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;
  display:flex;align-items:center;gap:14px;justify-content:center;flex-wrap:wrap;
  padding:13px 18px;background:#0F172A;color:#fff;
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14.5px;
  box-shadow:0 -6px 24px rgba(0,0,0,.18);
  transform:translateY(110%);transition:transform .45s cubic-bezier(.4,0,.2,1)}
.bit-bar[data-show]{transform:translateY(0)}
.bit-bar b{font-weight:600}
.bit-bar-cta{background:#14B8A6;color:#042F2C;font-weight:700;
  padding:9px 18px;border-radius:999px;text-decoration:none;white-space:nowrap;cursor:pointer;border:0;
  font-size:14px;font-family:inherit}
.bit-bar-cta:hover{background:#0FA595}
.bit-x{background:none;border:0;color:#94A3B8;font-size:20px;line-height:1;
  cursor:pointer;padding:0 4px;font-family:inherit}
.bit-x:hover{color:#fff}

.bit-modal{position:fixed;inset:0;z-index:2147483600;display:none;
  align-items:center;justify-content:center;padding:20px;
  background:rgba(8,12,20,.72);backdrop-filter:blur(3px);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.bit-modal[data-show]{display:flex}
.bit-panel{background:#fff;color:#0F172A;border-radius:16px;max-width:960px;width:100%;
  max-height:92vh;overflow-y:auto;padding:clamp(22px,4vw,38px);position:relative;
  box-shadow:0 24px 70px rgba(0,0,0,.4)}
.bit-close{position:absolute;top:12px;right:14px;background:none;border:0;
  font-size:27px;line-height:1;color:#94A3B8;cursor:pointer;font-family:inherit}
.bit-close:hover{color:#0F172A}
.bit-eyebrow{font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;
  color:#0D9488;font-weight:700;margin:0 0 8px}
.bit-h{font-size:clamp(1.45rem,3.4vw,2.05rem);font-weight:700;line-height:1.18;
  margin:0 0 10px;letter-spacing:-.01em;color:#0F172A}
.bit-sub{font-size:15px;line-height:1.6;color:#475569;margin:0 0 24px;max-width:62ch}
.bit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:14px}
.bit-card{border:1px solid #E2E8F0;border-radius:12px;padding:20px;position:relative;
  display:flex;flex-direction:column;background:#fff}
.bit-pop{border:2px solid #0D9488}
.bit-badge{position:absolute;top:-10px;left:18px;background:#0D9488;color:#fff;
  font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  padding:3px 9px;border-radius:999px}
.bit-name{font-size:16px;font-weight:700;color:#0F172A}
.bit-price{font-size:29px;font-weight:700;margin:7px 0 1px;color:#0F172A;
  font-variant-numeric:tabular-nums}
.bit-mo{font-size:13px;color:#0D9488;font-weight:600}
.bit-feats{list-style:none;margin:14px 0 18px;padding:0;flex:1;
  font-size:13.5px;line-height:1.5;color:#475569}
.bit-feats li{padding-left:17px;position:relative;margin-bottom:7px}
.bit-feats li::before{content:"";position:absolute;left:0;top:.5em;width:6px;height:6px;
  border-radius:50%;background:#0D9488}
.bit-buy{display:block;text-align:center;background:#0F172A;color:#fff;font-weight:700;
  padding:12px;border-radius:9px;text-decoration:none;font-size:14.5px}
.bit-pop .bit-buy{background:#0D9488}
.bit-buy:hover{opacity:.88}
.bit-foot{margin-top:20px;padding-top:16px;border-top:1px solid #E2E8F0;
  font-size:13px;color:#64748B;line-height:1.55}
@media (prefers-reduced-motion:reduce){.bit-bar{transition:none}}
@media (max-width:520px){.bit-bar{font-size:13.5px;gap:10px;padding:11px 14px}}
</style>

<div class="bit-bar" role="region" aria-label="Own this website">
  <span>This site was built for <b>${esc(businessName)}</b>.</span>
  <button class="bit-bar-cta" data-bit-open>See what it costs</button>
  <button class="bit-x" data-bit-dismiss aria-label="Dismiss">&times;</button>
</div>

<div class="bit-modal" role="dialog" aria-modal="true" aria-labelledby="bit-h">
  <div class="bit-panel">
    <button class="bit-close" data-bit-close aria-label="Close">&times;</button>
    <p class="bit-eyebrow">This site is real, and it's available</p>
    <h2 class="bit-h" id="bit-h">Make it yours, on your own domain.</h2>
    <p class="bit-sub">
      Everything you just scrolled through was built for ${esc(businessName)} — the words, the
      photography, the video. Pick a package and it goes live on your own domain this week.
    </p>
    <div class="bit-grid">${cards}</div>
    <p class="bit-foot">
      You own the code. No contract — cancel the monthly any time and the site stays yours.
      Prefer to talk first? Call <a href="tel:+13055050153" style="color:#0D9488;font-weight:600">(305) 505-0153</a>
      or email <a href="mailto:contact@buildittoday.ai" style="color:#0D9488;font-weight:600">contact@buildittoday.ai</a>.
    </p>
  </div>
</div>

<script>
(function(){
  var SLUG=${JSON.stringify(demoSlug)}, LEAD=${JSON.stringify(leadId ?? null)};
  var bar=document.querySelector('.bit-bar'), modal=document.querySelector('.bit-modal');
  if(!bar||!modal) return;
  var shown=false, dismissed=false, key='bit_seen_'+SLUG;

  try{ if(sessionStorage.getItem(key)==='1') dismissed=true; }catch(e){}

  function track(ev,tier){
    try{
      var b=JSON.stringify({slug:SLUG,lead:LEAD,event:ev,tier:tier||null});
      if(navigator.sendBeacon){
        navigator.sendBeacon('/api/track/offer',new Blob([b],{type:'application/json'}));
      }else{
        fetch('/api/track/offer',{method:'POST',body:b,headers:{'Content-Type':'application/json'},keepalive:true});
      }
    }catch(e){}
  }

  function showBar(){ if(dismissed) return; bar.setAttribute('data-show',''); }
  function openModal(){
    if(modal.hasAttribute('data-show')) return;
    modal.setAttribute('data-show','');
    document.body.style.overflow='hidden';
    if(!shown){ shown=true; track('offer_shown'); }
  }
  function closeModal(){
    modal.removeAttribute('data-show');
    document.body.style.overflow='';
    try{ sessionStorage.setItem(key,'1'); }catch(e){}
  }

  // The bar arrives once they have settled in, not the moment the page paints.
  setTimeout(showBar, 8000);

  // Reaching the bottom is the closest thing to intent we can measure without
  // asking. The timer is only a fallback for someone who skims and stops.
  var auto=setTimeout(function(){ if(!dismissed) openModal(); }, 45000);
  function onScroll(){
    var d=document.documentElement, sc=window.scrollY||d.scrollTop;
    var pct=(sc+window.innerHeight)/Math.max(d.scrollHeight,1);
    if(pct>0.92){
      window.removeEventListener('scroll',onScroll);
      clearTimeout(auto);
      if(!dismissed) openModal();
    }
  }
  window.addEventListener('scroll',onScroll,{passive:true});

  bar.querySelector('[data-bit-open]').addEventListener('click',openModal);
  bar.querySelector('[data-bit-dismiss]').addEventListener('click',function(){
    dismissed=true; bar.removeAttribute('data-show');
    try{ sessionStorage.setItem(key,'1'); }catch(e){}
  });
  modal.querySelector('[data-bit-close]').addEventListener('click',closeModal);
  modal.addEventListener('click',function(e){ if(e.target===modal) closeModal(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeModal(); });

  Array.prototype.forEach.call(modal.querySelectorAll('[data-bit-tier]'),function(a){
    a.addEventListener('click',function(){ track('offer_clicked', a.getAttribute('data-bit-tier')); });
  });
})();
</script>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}
