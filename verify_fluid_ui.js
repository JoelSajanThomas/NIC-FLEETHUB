const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function fetchJson(url) {
  return new Promise((res, rej) => {
    http.get(url, r => {
      let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }
  async init() {
    return new Promise((res, rej) => {
      this.ws.onopen = () => res();
      this.ws.onerror = rej;
      this.ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { r, j } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) j(msg.error);
          else r(msg.result);
        }
      };
    });
  }
  send(method, params = {}) {
    return new Promise((r, j) => {
      const id = this.id++;
      this.callbacks.set(id, { r, j });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return res.result ? res.result.value : null;
  }
  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 1024 });
  }
}

async function run() {
  console.log("🚀 Starting Chrome in headless mode for Responsive & Fluid UI Audit...");
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--no-sandbox",
    "--disable-gpu",
    "about:blank"
  ]);
  await sleep(1500);

  let passedAll = true;

  try {
    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const page = targets.find(t => t.type === "page");
    const client = new CDPClient(page.webSocketDebuggerUrl);
    await client.init();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    const viewports = [
      { name: "Galaxy Fold (Closed)", w: 280, h: 653 },
      { name: "iPhone SE (1st gen)", w: 320, h: 568 },
      { name: "Android Compact", w: 360, h: 780 },
      { name: "iPhone SE (2nd/3rd gen)", w: 375, h: 667 },
      { name: "iPhone 12/13/14", w: 390, h: 844 },
      { name: "iPhone XR/11", w: 414, h: 896 },
      { name: "iPhone 15 Pro Max", w: 430, h: 932 },
      { name: "Surface Duo Single", w: 540, h: 720 },
      { name: "Small Tablet / Phablet", w: 600, h: 960 },
      { name: "Galaxy Fold (Open)", w: 717, h: 512 },
      { name: "iPad Mini (Portrait)", w: 768, h: 1024 },
      { name: "iPad Air (Portrait)", w: 820, h: 1180 },
      { name: "iPad / Laptop (Landscape)", w: 1024, h: 768 },
      { name: "13-inch Laptop", w: 1280, h: 800 },
      { name: "15-inch Laptop", w: 1366, h: 768 },
      { name: "Desktop Monitor", w: 1440, h: 900 },
      { name: "Full HD Desktop", w: 1920, h: 1080 },
      { name: "Ultrawide QHD Display", w: 2560, h: 1440 },
      { name: "Mobile Landscape (iPhone 8)", w: 667, h: 375 },
      { name: "Mobile Landscape (iPhone 14)", w: 844, h: 390 }
    ];

    // =========================================================================
    // PART 1: HOMEPAGE FLUIDITY & NAVIGATION VERIFICATION
    // =========================================================================
    console.log("\n========================================================");
    console.log("   PART 1: HOMEPAGE RESPONSIVE AUDIT & MENU VERIFICATION");
    console.log("========================================================");

    await client.send("Page.navigate", { url: "http://127.0.0.1:5000/" });
    await sleep(1500);

    for (const vp of viewports) {
      await client.setViewport(vp.w, vp.h);
      await sleep(150);

      const check = await client.evaluate(`
        (() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const hasOverflow = docW > winW + 1;

          const brand = document.querySelector('#hd .brand');
          const nav = document.querySelector('#hd .pn');
          const mn = document.querySelector('#hd #mn');
          const si = document.querySelector('#hd .si');
          const clk = document.querySelector('#hd .clk');

          const getBox = el => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const cs = window.getComputedStyle(el);
            return {
              display: cs.display,
              left: Math.round(r.left),
              right: Math.round(r.right),
              width: Math.round(r.width),
              height: Math.round(r.height),
              visible: cs.display !== 'none' && cs.visibility !== 'hidden'
            };
          };

          const bBox = getBox(brand);
          const nBox = getBox(nav);
          const mBox = getBox(mn);
          const sBox = getBox(si);

          // Menu button positioning check
          let menuStatus = "OK";
          if (winW >= 1024) {
            // Desktop: mn MUST be hidden, nav MUST be visible
            if (mBox && mBox.visible) menuStatus = "FAIL: Mobile menu button visible on desktop";
            if (!nBox || !nBox.visible) menuStatus = "FAIL: Desktop nav hidden";
          } else {
            // Mobile: mn MUST be visible, nav MUST be hidden
            if (!mBox || !mBox.visible) menuStatus = "FAIL: Mobile menu button hidden on mobile";
            if (mBox && mBox.right > winW + 1) menuStatus = "FAIL: Mobile menu button pushed offscreen (right=" + mBox.right + ", winW=" + winW + ")";
            if (nBox && nBox.visible) menuStatus = "FAIL: Desktop nav visible on mobile";
          }

          return {
            winW,
            docW,
            hasOverflow,
            menuStatus,
            bBox,
            mBox,
            sBox,
            nBox
          };
        })()
      `);

      const statusIcon = !check.hasOverflow && check.menuStatus === "OK" ? "✅ PASS" : "❌ FAIL";
      if (check.hasOverflow || check.menuStatus !== "OK") passedAll = false;

      console.log(`[${statusIcon}] ${vp.name} (${vp.w}x${vp.h}): overflow=${check.hasOverflow ? "YES (" + check.docW + "px)" : "NO"} | menu=${check.menuStatus}`);
      if (check.mBox && check.mBox.visible) {
        console.log(`       Menu Button: left=${check.mBox.left}px, right=${check.mBox.right}px (viewport: 0..${vp.w}px)`);
      }
    }

    // Test Mobile Menu Overlay open/close on mobile
    console.log("\n--- Testing Mobile Menu (#nm) Drawer Interaction ---");
    await client.setViewport(375, 667);
    await sleep(100);

    const drawerTest = await client.evaluate(`
      (() => {
        const mn = document.querySelector('#hd #mn');
        if (mn) mn.click();
        const nm = document.querySelector('#nm');
        const isOpen = nm.classList.contains('open');
        const nmRect = nm.getBoundingClientRect();
        
        // Close
        const closeBtn = document.querySelector('[data-x="nm"]');
        if (closeBtn) closeBtn.click();
        const isClosed = !nm.classList.contains('open');

        return { isOpen, isClosed, nmWidth: nmRect.width };
      })()
    `);
    console.log(`  Drawer Open Test: ${drawerTest.isOpen ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Drawer Close Test: ${drawerTest.isClosed ? "✅ PASS" : "❌ FAIL"}`);
    if (!drawerTest.isOpen || !drawerTest.isClosed) passedAll = false;

    // =========================================================================
    // PART 2: CONSOLE APPLICATION AUDIT & MULTI-VIEWPORT VERIFICATION
    // =========================================================================
    console.log("\n========================================================");
    console.log("   PART 2: CONSOLE APPLICATION RESPONSIVE AUDIT");
    console.log("========================================================");

    await client.send("Page.navigate", { url: "http://127.0.0.1:5000/app" });
    await sleep(1500);

    // Login as admin
    await client.evaluate(`
      (async () => {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "admin12345" })
        });
        const d = await res.json();
        if (d.token) {
          localStorage.setItem("fleethub_token", d.token);
          await window.boot();
        }
      })()
    `);
    await sleep(1200);

    for (const vp of viewports) {
      await client.setViewport(vp.w, vp.h);
      await sleep(150);

      const check = await client.evaluate(`
        (() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const winH = window.innerHeight;
          const isLandscapeSmall = winH <= 500 && winW > winH;
          const hasOverflow = docW > winW + 1;

          const dHeader = document.querySelector('.top.desktop-header');
          const dNav = document.querySelector('.nav.desktop-nav');
          const mHeader = document.querySelector('.mobile-header');
          const mBottom = document.querySelector('.mobile-bottom-nav');
          const btnMenu = document.querySelector('#btnMobileMenu');

          const isVisible = el => {
            if (!el) return false;
            const cs = window.getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden';
          };

          const getBox = el => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {
              left: Math.round(r.left),
              right: Math.round(r.right),
              width: Math.round(r.width),
              height: Math.round(r.height)
            };
          };

          let status = "OK";
          if (winW >= 1024) {
            if (!isVisible(dHeader)) status = "FAIL: Desktop header hidden";
            if (!isVisible(dNav)) status = "FAIL: Desktop nav hidden";
            if (isVisible(mHeader)) status = "FAIL: Mobile header visible on desktop";
            if (isVisible(mBottom)) status = "FAIL: Mobile bottom nav visible on desktop";
          } else {
            if (!isVisible(mHeader)) status = "FAIL: Mobile header hidden on mobile";
            if (isVisible(dHeader)) status = "FAIL: Desktop header visible on mobile";
            if (isVisible(dNav)) status = "FAIL: Desktop nav visible on mobile";

            // Landscape check
            if (isLandscapeSmall) {
              if (isVisible(mBottom)) status = "FAIL: Mobile bottom nav should be hidden in phone landscape";
            } else {
              if (!isVisible(mBottom)) status = "FAIL: Mobile bottom nav should be visible in phone portrait";
            }
          }

          const hBox = isVisible(mHeader) ? getBox(mHeader) : getBox(dHeader);

          return {
            winW,
            winH,
            hasOverflow,
            docW,
            status,
            hBox,
            mBottomVisible: isVisible(mBottom)
          };
        })()
      `);

      const statusIcon = !check.hasOverflow && check.status === "OK" ? "✅ PASS" : "❌ FAIL";
      if (check.hasOverflow || check.status !== "OK") passedAll = false;

      console.log(`[${statusIcon}] ${vp.name} (${vp.w}x${vp.h}): overflow=${check.hasOverflow ? "YES (" + check.docW + "px)" : "NO"} | header/nav=${check.status}`);
      if (check.hBox) {
        console.log(`       Header bounds: left=${check.hBox.left}px, right=${check.hBox.right}px (viewport: 0..${vp.w}px)`);
      }
    }

    // Test Console Drawer Open & Close
    console.log("\n--- Testing Console Mobile Drawer Interaction ---");
    await client.setViewport(375, 667);
    await sleep(100);

    const cDrawerTest = await client.evaluate(`
      (() => {
        const btn = document.querySelector('#btnMobileMenu');
        if (btn) btn.click();
        const drawer = document.querySelector('#drawerOverlay');
        const isOpen = drawer.classList.contains('open');

        // Close drawer
        const closeBtn = document.querySelector('[data-close-drawer]');
        if (closeBtn) closeBtn.click();
        const isClosed = !drawer.classList.contains('open');

        return { isOpen, isClosed };
      })()
    `);
    console.log(`  Console Drawer Open Test: ${cDrawerTest.isOpen ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Console Drawer Close Test: ${cDrawerTest.isClosed ? "✅ PASS" : "❌ FAIL"}`);
    if (!cDrawerTest.isOpen || !cDrawerTest.isClosed) passedAll = false;

    // Test Modal Rendering in Portrait & Landscape
    console.log("\n--- Testing Modal Dialog Fluidity (Portrait & Landscape) ---");
    const modalTest = await client.evaluate(`
      (() => {
        const dlg = document.createElement("dialog");
        dlg.className = "dlg";
        dlg.innerHTML = \`
          <div style="display:flex;flex-direction:column;height:100%">
            <div class="dlg-header"><h3>Fluid Modal Test</h3><button class="dlg-close-btn" data-c>✕</button></div>
            <div class="dlg-body"><p>Testing responsive fluid modal bounds and layout.</p></div>
            <div class="dlg-footer"><button class="btn" data-c>OK</button></div>
          </div>
        \`;
        document.body.appendChild(dlg);
        dlg.showModal();

        const r = dlg.getBoundingClientRect();
        const dlgBox = {
          left: Math.round(r.left),
          right: Math.round(r.right),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          width: Math.round(r.width),
          height: Math.round(r.height)
        };
        dlg.close();
        dlg.remove();

        return {
          fits: dlgBox.right <= window.innerWidth && dlgBox.left >= 0,
          dlgBox
        };
      })()
    `);
    console.log(`  Modal Bounds Test: ${modalTest && modalTest.fits ? "✅ PASS" : "❌ FAIL"} (left=${modalTest?.dlgBox?.left}, right=${modalTest?.dlgBox?.right}, winW=375)`);
    if (!modalTest || !modalTest.fits) passedAll = false;

    console.log("\n========================================================");
    if (passedAll) {
      console.log("🎉 ALL RESPONSIVE, FLUIDITY & ADAPTIVE TESTS PASSED PERFECTLY!");
    } else {
      console.log("⚠️ SOME RESPONSIVE TESTS FAILED. PLEASE REVIEW LOGS.");
    }
    console.log("========================================================\n");

  } catch (err) {
    console.error("Error running verification:", err);
    passedAll = false;
  } finally {
    chrome.kill();
    process.exit(passedAll ? 0 : 1);
  }
}

run();
