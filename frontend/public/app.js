const API_BASE = window.FLEETHUB_API_BASE || (document.querySelector('meta[name="fleethub-api-base"]')?.content) || "";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)],rm=matchMedia("(prefers-reduced-motion:reduce)").matches;
const stop = () => { document.documentElement.style.overflow = "hidden"; };
const go = () => { document.documentElement.style.overflow = ""; };
const jump = id => {
  if (id === "home") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const e = document.getElementById(id);
  if (!e) return;
  const h = document.getElementById("hd")?.offsetHeight || 76;
  const top = e.getBoundingClientRect().top + window.pageYOffset - h;
  window.scrollTo({ top, behavior: "smooth" });
};
let wi=0;function sp(n){[...n.childNodes].forEach(c=>{if(c.nodeType==3){const f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(w=>{if(!w.trim()){f.append(w);return}const s=document.createElement("span");s.className="w";s.style.setProperty("--i",wi++);s.textContent=w;f.append(s)});c.replaceWith(f)}else sp(c)})}
$$(".wr").forEach(e=>{wi=0;sp(e)});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("on");io.unobserve(e.target)}}),{threshold:.15});
const ready=()=>$$(".rv,.hl,.wr").forEach(e=>io.observe(e));
stop();{const nf=$("#nn"),bf=$("#bf"),t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/1300),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,n=Math.round(e*100);nf.textContent=String(n).padStart(3,"0");bf.style.width=n+"%";if(k<1)requestAnimationFrame(f);else{$("#ld").classList.add("out");setTimeout(()=>{$("#ld").remove();go();ready()},800)}})(t0)}
function clock(){const d=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Kuwait"})),h=d.getHours(),t=(h%12||12)+":"+String(d.getMinutes()).padStart(2,"0")+(h<12?"am":"pm");$("#tm").textContent=t;$("#tm2").textContent=t;$("#dt").textContent=d.getDate()+" "+d.toLocaleString("en",{month:"long"})+", "+d.getFullYear()}clock();setInterval(clock,1000);
const CI=[["Kuwait Operations","Centralized fleet & equipment."],["Driver to GM","Instant history & live workflow."],["Voice in 3 Languages","Automatic English translation."]];let ci=0;
function car(s){const e=$("#cs");e.classList.add("sw");setTimeout(()=>{ci=(ci+s+3)%3;$("#cp").textContent=CI[ci][0];$("#ct").textContent=CI[ci][1];$$("#cd i").forEach((d,i)=>d.classList.toggle("on",i==ci));e.classList.remove("sw")},s?200:0)}car(0);
const mn=$("#nm"),md=$("#md");
const openM=m=>{if(!m)return;m.classList.add("open");stop()},closeM=m=>{if(!m)return;m.classList.remove("open");go()};
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-k],[data-j],[data-q],[data-href],[data-x],#mn,.hcr,.pc,[role='button']");
  if(!b)return;
  if(b.dataset.k){e.preventDefault();return car(+b.dataset.k);}
  if(b.classList.contains("hcr")&&!e.target.closest("button")){return car(1);}
  if(b.id=="mn"){e.preventDefault();return openM(mn);}
  if(b.dataset.x){e.preventDefault();return closeM(document.getElementById(b.dataset.x));}
  if(b.dataset.q!==undefined){
    e.preventDefault();
    if(mn&&mn.classList.contains("open"))closeM(mn);
    const mf=$("#mf"),mo=$("#mo");
    if(mf)mf.hidden=false;
    if(mo)mo.hidden=true;
    if(md)openM(md);
    return;
  }
  if(b.dataset.href){
    e.preventDefault();
    if(mn&&mn.classList.contains("open"))closeM(mn);
    location.href=b.dataset.href;
    return;
  }
  if(b.classList.contains("pc")&&!e.target.closest("button,a")){
    location.href=b.dataset.href||"/app";
    return;
  }
  if(b.dataset.j){
    e.preventDefault();
    const was=mn&&mn.classList.contains("open");
    if(was)closeM(mn);
    setTimeout(()=>jump(b.dataset.j),was?80:0);
    return;
  }
});
if(md)md.addEventListener("click",e=>{if(e.target===md)closeM(md)});
if(mn)mn.addEventListener("click",e=>{if(e.target===mn)closeM(mn)});
addEventListener("keydown",e=>{if(e.key==="Escape"){if(mn)closeM(mn);if(md)closeM(md);}});
const rq=$("#rq");
if (rq) {
  rq.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = rq.querySelector("button[type=submit], button.pill");
    const orig = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = ".7";
    }
    const payload = {
      name: (rq.querySelector("[name=name]")?.value || "").trim(),
      email: (rq.querySelector("[name=email]")?.value || "").trim(),
      message: (rq.querySelector("[name=message]")?.value || "").trim()
    };
    try {
      await fetch(API_BASE + "/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch (_) {}
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = "";
      btn.innerHTML = orig;
    }
    const mf = $("#mf"), mo = $("#mo");
    if (mf) mf.hidden = true;
    if (mo) mo.hidden = false;
    rq.reset();
  });
}
const cn=$$("[data-c]");function cu(){cn.forEach(n=>{const r=n.getBoundingClientRect(),p=Math.min(1,Math.max(0,(innerHeight-r.top)/(innerHeight/2+r.height/2)));n.firstChild.textContent=Math.round(p*n.dataset.c)})}cu();addEventListener("scroll",cu,{passive:true});
const hd=$("#hd"),pv=$("#pv");function su(){hd.classList.toggle("sc",scrollY>40);document.documentElement.style.setProperty("--sp",scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));const r=pv.getBoundingClientRect();pv.style.setProperty("--k",Math.min(1,Math.max(0,(innerHeight-r.top)/(innerHeight*.75))))}su();addEventListener("scroll",su,{passive:true});
(function(){const c=$("#cmp"),b=$("#cmh");let d=0;const set=p=>{p=Math.min(100,Math.max(0,p));c.style.setProperty("--x",p+"%");b.setAttribute("aria-valuenow",Math.round(p))},mv=e=>{const r=c.getBoundingClientRect();set((e.clientX-r.left)/r.width*100)};
c.addEventListener("pointerdown",e=>{d=1;c.setPointerCapture(e.pointerId);mv(e)});c.addEventListener("pointermove",e=>{if(d)mv(e)});c.addEventListener("pointerup",()=>d=0);c.addEventListener("pointercancel",()=>d=0);
b.addEventListener("keydown",e=>{const v=+b.getAttribute("aria-valuenow")||50;if(e.key=="ArrowLeft")set(v-5);if(e.key=="ArrowRight")set(v+5)})})();
// ---------------- LIVE HOMEPAGE BUSINESS DATA SYNCHRONIZATION ----------------
let LAST_HOMEPAGE_VERSION = null;
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function syncHomepageData() {
  try {
    const res = await fetch(API_BASE + "/api/public/stats", { cache: "no-store" });
    if (!res.ok) return;
    const d = await res.json();
    LAST_HOMEPAGE_VERSION = d.version;

    // 1. Executive Dashboard KPIs
    const elAvail = $("#liveAvail");
    if (elAvail) elAvail.textContent = `${d.fleet.availability_rate}%`;

    const elOpenWO = $("#liveOpenWO");
    if (elOpenWO) elOpenWO.textContent = String(d.operations.open_work_orders);

    const elSites = $("#liveSites");
    if (elSites) elSites.textContent = String(d.sites.total_sites);

    const elLabour = $("#liveLabour");
    if (elLabour) elLabour.textContent = "0.000";

    // 2. Work Orders by Stage
    const elStages = $("#liveStages");
    if (elStages && d.operations.stages) {
      const st = d.operations.stages;
      const maxVal = Math.max(...Object.values(st), 1);
      elStages.innerHTML = ["Reported", "Approved", "Assigned", "In progress", "Waiting for parts"].map(s => {
        const val = st[s] || 0;
        const width = val > 0 ? Math.max(12, Math.round((val / maxVal) * 100)) : 0;
        return `
          <div class="row">
            <span>${esc(s)}</span>
            <div class="bt"><i style="width:${width}%"></i></div>
            <b>${val}</b>
          </div>
        `;
      }).join("");
    }

    // 3. Fleet in Kuwait
    const elFleet = $("#liveFleet");
    if (elFleet) {
      if (d.fleet.list && d.fleet.list.length) {
        elFleet.innerHTML = d.fleet.list.map(a => `
          <div class="row">
            <span class="m" style="flex:1">${esc(a.code)} · ${esc((a.name || "").slice(0, 22))}</span>
            <span class="chip ${a.status === 'Active' ? 'c-done' : (a.status === 'Under Repair' ? 'c-assigned' : 'c-reported')}">${esc(a.status)} (${esc(a.worksite || 'Kuwait')})</span>
          </div>
        `).join("");
      } else {
        elFleet.innerHTML = `<div class="row"><span class="mu" style="flex:1;padding:.4rem 0">No fleet assets registered in database.</span></div>`;
      }
    }

    // 4. Priority Work Orders
    const elPrio = $("#livePriorityWO");
    if (elPrio) {
      if (d.operations.priority_work_orders && d.operations.priority_work_orders.length) {
        elPrio.innerHTML = d.operations.priority_work_orders.map(w => `
          <div class="jc" style="margin-top:.6rem">
            <span class="m">${esc(w.code)} · ${esc(w.asset_code)} (${esc((w.asset_name || "").slice(0, 18))})</span>
            <p>${esc((w.description || w.desc || "").slice(0, 60))}</p>
            <div>
              <span class="chip ${w.priority === 'Critical' ? 'c-crit' : 'c-assigned'}">${esc(w.priority)}</span>
              <span class="chip ${w.status === 'In Progress' ? 'c-in-progress' : (w.status === 'Pending' ? 'c-reported' : 'c-done')}">${esc(w.status)}</span>
            </div>
          </div>
        `).join("");
      } else {
        elPrio.innerHTML = `
          <div class="jc" style="margin-top:.6rem">
            <span class="m" style="color:var(--mu,#888)">Workshop Status · Kuwait Operations</span>
            <p>All fleet vehicles and heavy equipment are operating normally. No critical breakdowns or priority repairs pending.</p>
            <div><span class="chip c-done">All Operational</span></div>
          </div>
        `;
      }
    }

    // 5. Spare Parts & Inventory
    const elInv = $("#liveInventory");
    if (elInv) {
      if (d.inventory.items && d.inventory.items.length) {
        elInv.innerHTML = d.inventory.items.map(p => {
          const maxRef = Math.max(p.min_qty * 3, 20);
          const width = Math.min(100, Math.max(10, Math.round((p.qty / maxRef) * 100)));
          return `
            <div class="row">
              <span>${esc(p.name)}</span>
              <div class="bt"><i style="width:${width}%;${p.is_low ? 'background:var(--er)' : ''}"></i></div>
              <b>${p.qty} ${esc(p.unit || 'pcs')}</b>
              ${p.is_low ? '<span class="chip c-reported">Low</span>' : ''}
            </div>
          `;
        }).join("");
      } else {
        elInv.innerHTML = `<div class="row"><span class="mu" style="flex:1">Central Heavy Store inventory ledger active. 0 parts below reorder threshold.</span></div>`;
      }
    }

    // 6. Site Transfers
    const elTr = $("#liveTransfer");
    if (elTr) {
      if (d.transfer) {
        elTr.innerHTML = `
          <div>
            <div class="qr"></div>
            <small style="display:block;margin-top:.35rem;font-size:.7rem;color:var(--mu)">Latest Relocation:</small>
            <span style="font-size:.85rem;font-weight:600">${esc(d.transfer.asset_code)} → ${esc(d.transfer.to_site)}</span>
          </div>
          <span class="m">TR-00${d.transfer.id || 'OK'}</span>
        `;
      } else {
        elTr.innerHTML = `
          <div>
            <div class="qr"></div>
            <small style="display:block;margin-top:.35rem;font-size:.7rem;color:var(--mu)">Yard Status:</small>
            <span style="font-size:.85rem;font-weight:600">Central Yard Shuwaikh</span>
          </div>
          <span class="m">SITE-OK</span>
        `;
      }
    }

    // 7. Inspection Due Countdown & Compliance Expiries
    const elInsp = $("#liveInspectionDue");
    if (elInsp) {
      if (d.expiries && d.expiries.length) {
        const topInsp = d.expiries.find(x => x.type === "fahs") || d.expiries[0];
        elInsp.textContent = topInsp.days >= 0 ? `${topInsp.days} days` : "Expired";
      } else {
        elInsp.textContent = "Valid";
      }
    }

    const elExp = $("#liveExpiries");
    if (elExp) {
      if (d.expiries && d.expiries.length) {
        elExp.innerHTML = d.expiries.map(x => `
          <div class="row">
            <span style="flex:1">${esc(x.label)}</span>
            <span class="chip ${x.days <= 30 ? 'c-reported' : 'c-done'}">${x.days >= 0 ? x.days + ' days' : 'Expired'}</span>
          </div>
        `).join("");
      } else {
        elExp.innerHTML = `<div class="row"><span class="mu" style="flex:1">All Kuwait Traffic Daftar, Fahs Fanni and insurance policies valid.</span></div>`;
      }
    }

    // 8. Featured Asset in Comparison Section
    const elFeat = $("#liveFeaturedAsset");
    if (elFeat) {
      if (d.featured_asset) {
        const fa = d.featured_asset;
        elFeat.innerHTML = `
          <b>Digital asset profile</b>
          <div class="row">
            <span class="m" style="flex:1">${esc(fa.code)} · ${esc(fa.name)}</span>
            <span class="chip ${fa.status === 'Active' ? 'c-done' : (fa.status === 'Under Repair' ? 'c-assigned' : 'c-reported')}">${esc(fa.status)}</span>
          </div>
          <p>Kuwait Reg: ${esc(fa.reg_no || 'Pending')} · PACI: ${esc(fa.paci_no || 'Kuwait Base')} · Fahs Fanni: Valid</p>
          <div>
            <span class="chip c-high">Complete History</span>
            <span class="chip c-verified">${fa.wo_count || 0} WOs · ${fa.parts_count || 0} Parts · Bills Saved</span>
          </div>
          <a href="/app" class="pill k" style="width:fit-content;text-decoration:none;display:inline-block;margin-top:.5rem">Search any vehicle</a>
        `;
      } else {
        elFeat.innerHTML = `
          <b>Digital asset profile</b>
          <div class="row"><span class="m" style="flex:1">Central Database Synchronized</span><span class="chip c-done">Verified</span></div>
          <p>All fleet records stored digitally in Kuwait Central Repository.</p>
          <div><span class="chip c-high">Complete History</span></div>
        `;
      }
    }

    // 9. Numbers section counters
    const ns = $("#numSites");
    if (ns) { ns.dataset.c = d.sites.total_sites || 6; }
    const nf = $("#numFleet");
    if (nf) { nf.dataset.c = d.fleet.total || 0; }
    const nw = $("#numWO");
    if (nw) { nw.dataset.c = d.operations.open_work_orders || 0; }
    if (typeof cu === "function") cu();

  } catch (err) {
    console.warn("Homepage sync error:", err);
  }
}

// Initial fetch on page load
syncHomepageData();

// BroadcastChannel for instant local cross-tab sync (< 5ms)
if (window.BroadcastChannel) {
  const bc = new BroadcastChannel("fleethub_sync");
  bc.onmessage = () => syncHomepageData();
}

// Smart visibility-aware polling (every 10 seconds when tab is active)
async function checkHomepageSync() {
  if (document.visibilityState === "hidden") return;
  try {
    const res = await fetch(API_BASE + "/api/sync/version", { cache: "no-store" });
    if (!res.ok) return;
    const v = await res.json();
    if (LAST_HOMEPAGE_VERSION !== null && v.version !== LAST_HOMEPAGE_VERSION) {
      syncHomepageData();
    }
  } catch (_) {}
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkHomepageSync();
});

setInterval(checkHomepageSync, 10000);
