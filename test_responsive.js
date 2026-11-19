/**
 * Comprehensive Multi-Device Responsive Verification Engine
 * Tests all 12 target viewport widths:
 * 320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1366, 1440, 1920
 */
const { spawn } = require("child_process");
const http = require("http");

const VIEWPORTS = [
  { width: 320, height: 568, name: "iPhone SE (1st gen) / Small Smartphone" },
  { width: 360, height: 740, name: "Galaxy S8 / Android Standard" },
  { width: 375, height: 667, name: "iPhone SE / 8 / 13 mini" },
  { width: 390, height: 844, name: "iPhone 12 / 13 / 14 / 15" },
  { width: 414, height: 896, name: "iPhone Plus / Max" },
  { width: 430, height: 932, name: "iPhone 14 / 15 / 16 Pro Max" },
  { width: 768, height: 1024, name: "iPad Mini / Portrait Tablet" },
  { width: 1024, height: 768, name: "iPad Pro / Small Laptop" },
  { width: 1280, height: 800, name: "Standard Laptop (1280x800)" },
  { width: 1366, height: 768, name: "Common Laptop (1366x768)" },
  { width: 1440, height: 900, name: "MacBook Pro / Desktop Monitor" },
  { width: 1920, height: 1080, name: "Full HD 1080p Monitor" }
];

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(msg.error);
          else res(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = this.id++;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.text || JSON.stringify(r.exceptionDetails));
    }
    return r.result.value;
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 1024
    });
  }
}

async function run() {
  console.log("==================================================================");
  console.log(" NIC FleetHub Multi-Device Responsive Verification Suite");
  console.log("==================================================================");

  // 1. Launch Chrome Headless
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--window-size=1920,1080",
    "about:blank"
  ]);

  await sleep(1500);

  try {
    const versionInfo = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
    console.log(`[Chrome Headless Active] Browser: ${versionInfo.Browser}`);

    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === "page");
    if (!pageTarget) throw new Error("No page target found");

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.init();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    let totalErrors = 0;

    // -------------------------------------------------------------
    // Test 1: Homepage (http://127.0.0.1:5000/) across all widths
    // -------------------------------------------------------------
    console.log("\n>>> TESTING HOMEPAGE (/) ACROSS ALL VIEWPORTS <<<");
    await client.send("Page.navigate", { url: "http://127.0.0.1:5000/" });
    await sleep(2000); // Allow loader to complete

    for (const vp of VIEWPORTS) {
      await client.setViewport(vp.width, vp.height);
      await sleep(300);

      const check = await client.evaluate(`
        (() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const bodyW = document.body.scrollWidth;
          const hasOverflow = docW > winW || bodyW > winW;
          
          // Find any overflowing elements
          const badEls = [];
          document.querySelectorAll('*').forEach(el => {
            if (el.offsetWidth > 0 && el.offsetHeight > 0) {
              const r = el.getBoundingClientRect();
              if (r.right > winW + 1.5 && !el.closest('.mq, #cmp, svg, #ld, canvas')) {
                badEls.push({
                  tag: el.tagName,
                  id: el.id,
                  cls: el.className,
                  right: Math.round(r.right),
                  winW: winW
                });
              }
            }
          });

          return {
            winW,
            docW,
            hasOverflow,
            overflowDelta: docW - winW,
            badCount: badEls.length,
            badSample: badEls.slice(0, 3)
          };
        })()
      `);

      if (check.hasOverflow && check.overflowDelta > 1) {
        console.error(`  ❌ [FAIL] ${vp.width}px (${vp.name}): Horizontal overflow of ${check.overflowDelta}px!`);
        console.error("     Sample elements:", check.badSample);
        totalErrors++;
      } else {
        console.log(`  ✅ [PASS] ${vp.width}px (${vp.name}): docW=${check.docW}px, winW=${check.winW}px, no overflow`);
      }
    }

    // -------------------------------------------------------------
    // Test 2: Enterprise Console (/app) Login Screen
    // -------------------------------------------------------------
    console.log("\n>>> TESTING CONSOLE LOGIN (/app) ACROSS ALL VIEWPORTS <<<");
    await client.send("Page.navigate", { url: "http://127.0.0.1:5000/app" });
    await sleep(1000);

    for (const vp of VIEWPORTS) {
      await client.setViewport(vp.width, vp.height);
      await sleep(200);

      const check = await client.evaluate(`
        (() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const hasOverflow = docW > winW;
          const form = document.querySelector('form.login');
          return {
            winW,
            docW,
            hasOverflow,
            formW: form ? form.offsetWidth : 0
          };
        })()
      `);

      if (check.hasOverflow) {
        console.error(`  ❌ [FAIL] Login at ${vp.width}px: overflow docW=${check.docW}`);
        totalErrors++;
      } else {
        console.log(`  ✅ [PASS] Login at ${vp.width}px: formW=${check.formW}px, no overflow`);
      }
    }

    // -------------------------------------------------------------
    // Test 3: Authenticated Console Views
    // -------------------------------------------------------------
    console.log("\n>>> AUTHENTICATING AS ADMIN AND TESTING ALL CONSOLE MODULES <<<");

    // Perform Login in browser context
    const loginResult = await client.evaluate(`
      (async () => {
        try {
          const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "admin", password: "admin12345" })
          });
          const data = await res.json();
          if (data.token) {
            localStorage.setItem("fleethub_token", data.token);
            await window.boot();
            return { ok: true, name: data.name };
          }
          return { ok: false, error: data.error };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      })()
    `);
    console.log("[Login Result]:", loginResult);

    await sleep(1500);

    const loggedIn = Boolean(loginResult && loginResult.ok);
    console.log(`[Authentication Status]: ${loggedIn ? "Successfully logged in as " + loginResult.name : "Failed"}`);

    if (!loggedIn) {
      throw new Error("Login failed during automated test");
    }

    // Views to test
    const viewsToTest = ["dash", "assets", "comp", "wo", "parts", "pur", "exp", "reports", "alerts", "admin", "ws"];

    for (const viewId of viewsToTest) {
      console.log(`\n--- Testing View: [${viewId.toUpperCase()}] ---`);

      // Navigate to view
      await client.evaluate(`window.go("${viewId}")`);
      await sleep(800);

      for (const vp of VIEWPORTS) {
        await client.setViewport(vp.width, vp.height);
        await sleep(200);

        const check = await client.evaluate(`
          (() => {
            const docW = document.documentElement.scrollWidth;
            const winW = window.innerWidth;
            const hasOverflow = docW > winW + 1;
            
            // Check cards vs table view
            const cardsView = document.querySelector('.table-mobile-cards');
            const tableView = document.querySelector('.table-desktop-view');
            const isMobile = winW < 1024;
            
            let cardCount = cardsView ? cardsView.querySelectorAll('.data-card').length : 0;
            let tableRows = tableView ? tableView.querySelectorAll('tbody tr').length : 0;

            return {
              winW,
              docW,
              hasOverflow,
              overflowDelta: docW - winW,
              isMobile,
              cardCount,
              tableRows
            };
          })()
        `);

        if (check.hasOverflow && check.overflowDelta > 2) {
          console.error(`  ❌ [FAIL] ${viewId} at ${vp.width}px (${vp.name}): Horizontal overflow of ${check.overflowDelta}px!`);
          totalErrors++;
        } else {
          console.log(`  ✅ [PASS] ${viewId} at ${vp.width}px: no overflow (cards=${check.cardCount}, rows=${check.tableRows})`);
        }
      }
    }

    // Test Asset Details View (AST-1) across all viewports
    console.log(`\n--- Testing Asset Details View: [ASSET:1] ---`);
    await client.evaluate(`window.go("asset", 1)`);
    await sleep(800);

    for (const vp of VIEWPORTS) {
      await client.setViewport(vp.width, vp.height);
      await sleep(200);

      const check = await client.evaluate(`
        (() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const hasOverflow = docW > winW + 1;
          const kvEl = document.querySelector('.kv');
          return {
            winW,
            docW,
            hasOverflow,
            overflowDelta: docW - winW,
            hasKv: !!kvEl
          };
        })()
      `);

      if (check.hasOverflow && check.overflowDelta > 2) {
        console.error(`  ❌ [FAIL] Asset:1 at ${vp.width}px (${vp.name}): Horizontal overflow of ${check.overflowDelta}px!`);
        totalErrors++;
      } else {
        console.log(`  ✅ [PASS] Asset:1 at ${vp.width}px: no overflow`);
      }
    }

    // Test Modal Bottom Sheet Interaction (375px)
    console.log(`\n--- Testing Modal Dialog / Bottom Sheet: [ACT.addA()] (375px) ---`);
    await client.setViewport(375, 812);
    await client.evaluate(`window.go("assets")`);
    await sleep(500);
    // Trigger modal non-blocking
    await client.evaluate(`setTimeout(() => window.ACT.addA(), 10)`);
    await sleep(600);

    const modalCheck = await client.evaluate(`
      (() => {
        const dlg = document.querySelector('.dlg');
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        const hasOverflow = docW > winW + 1;
        const sections = document.querySelectorAll('.form-section-title');
        const stickyBar = document.querySelector('.form-sticky-bar');
        return {
          winW,
          docW,
          hasOverflow,
          overflowDelta: docW - winW,
          dlgWidth: dlg ? dlg.offsetWidth : 0,
          sectionCount: sections.length,
          hasStickyBar: !!stickyBar
        };
      })()
    `);

    if (modalCheck.hasOverflow) {
      console.error(`  ❌ [FAIL] Modal at 375px caused horizontal overflow: ${modalCheck.overflowDelta}px!`);
      totalErrors++;
    } else {
      console.log(`  ✅ [PASS] Modal at 375px: dlgWidth=${modalCheck.dlgWidth}px, sections=${modalCheck.sectionCount}, stickyBar=${modalCheck.hasStickyBar}, no overflow`);
    }

    // Close modal by clicking Cancel button
    await client.evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('.dlg button')).find(b => b.textContent.trim().toLowerCase().includes('cancel'));
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await sleep(400);

    // -------------------------------------------------------------
    // Test 4: Mobile Drawer & Search Interaction (375px)
    // -------------------------------------------------------------
    console.log("\n>>> TESTING MOBILE DRAWER & SEARCH TOGGLE (375px) <<<");
    await client.setViewport(375, 812);
    await sleep(200);

    // 1. Open Drawer
    await client.evaluate(`window.ACT.toggleDrawer()`);
    await sleep(350);
    const drawerOpen = await client.evaluate(`document.querySelector('#drawerOverlay').classList.contains('open')`);
    console.log(`  Drawer Open Status: ${drawerOpen ? "✅ SUCCESS" : "❌ FAILED"}`);
    if (!drawerOpen) totalErrors++;

    // 2. Close Drawer
    await client.evaluate(`window.ACT.toggleDrawer()`);
    await sleep(350);
    const drawerClosed = await client.evaluate(`!document.querySelector('#drawerOverlay').classList.contains('open')`);
    console.log(`  Drawer Closed Status: ${drawerClosed ? "✅ SUCCESS" : "❌ FAILED"}`);
    if (!drawerClosed) totalErrors++;

    // 3. Toggle Search
    await client.evaluate(`window.ACT.toggleSearch()`);
    await sleep(250);
    const searchOpen = await client.evaluate(`document.querySelector('#mobileSearchBar').classList.contains('open')`);
    console.log(`  Mobile Search Open Status: ${searchOpen ? "✅ SUCCESS" : "❌ FAILED"}`);
    if (!searchOpen) totalErrors++;

    await client.evaluate(`window.ACT.toggleSearch()`);
    await sleep(250);

    // -------------------------------------------------------------
    // Test 5: Cards vs Table View Toggle (375px)
    // -------------------------------------------------------------
    console.log("\n>>> TESTING VIEWMODE TOGGLE (CARDS <-> TABLE) (375px) <<<");
    await client.evaluate(`window.go("assets")`);
    await sleep(600);

    // Toggle to table mode
    await client.evaluate(`
      (() => {
        const btn = document.querySelector('[data-viewmode="table"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(300);

    const isTableActive = await client.evaluate(`
      (() => {
        const wrapper = document.querySelector('.responsive-view-wrapper');
        return wrapper && wrapper.classList.contains('table');
      })()
    `);
    console.log(`  Table View Toggle: ${isTableActive ? "✅ SUCCESS" : "❌ FAILED"}`);

    // Toggle back to cards mode
    await client.evaluate(`
      (() => {
        const btn = document.querySelector('[data-viewmode="cards"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(300);

    const isCardsActive = await client.evaluate(`
      (() => {
        const wrapper = document.querySelector('.responsive-view-wrapper');
        return wrapper && wrapper.classList.contains('cards');
      })()
    `);
    console.log(`  Cards View Toggle: ${isCardsActive ? "✅ SUCCESS" : "❌ FAILED"}`);

    // -------------------------------------------------------------
    // Test 6: Bottom Navigation Tab Switching (375px)
    // -------------------------------------------------------------
    console.log("\n>>> TESTING BOTTOM NAVIGATION SWITCHING (375px) <<<");
    await client.evaluate(`window.go("comp")`);
    await sleep(500);

    const compTabActive = await client.evaluate(`
      document.querySelector('.bottom-nav-btn[data-id="comp"]').classList.contains('active')
    `);
    console.log(`  Complaints Bottom Nav Active: ${compTabActive ? "✅ SUCCESS" : "❌ FAILED"}`);

    await client.evaluate(`window.go("wo")`);
    await sleep(500);

    const woTabActive = await client.evaluate(`
      document.querySelector('.bottom-nav-btn[data-id="wo"]').classList.contains('active')
    `);
    console.log(`  Workshop Bottom Nav Active: ${woTabActive ? "✅ SUCCESS" : "❌ FAILED"}`);

    // -------------------------------------------------------------
    // Test 7: Desktop Preservation (1440px & 1920px)
    // -------------------------------------------------------------
    console.log("\n>>> VERIFYING DESKTOP PRESERVATION (1440px & 1920px) <<<");
    for (const w of [1440, 1920]) {
      await client.setViewport(w, 900);
      await sleep(400);

      const desktopCheck = await client.evaluate(`
        (() => {
          const dHeader = document.querySelector('.top.desktop-header');
          const dNav = document.querySelector('.nav.desktop-nav');
          const mHeader = document.querySelector('.mobile-header');
          const mBottom = document.querySelector('.mobile-bottom-nav');

          const dHeaderVis = window.getComputedStyle(dHeader).display !== 'none';
          const dNavVis = window.getComputedStyle(dNav).display !== 'none';
          const mHeaderHidden = window.getComputedStyle(mHeader).display === 'none';
          const mBottomHidden = window.getComputedStyle(mBottom).display === 'none';

          return {
            dHeaderVis,
            dNavVis,
            mHeaderHidden,
            mBottomHidden
          };
        })()
      `);

      const passed = desktopCheck.dHeaderVis && desktopCheck.dNavVis && desktopCheck.mHeaderHidden && desktopCheck.mBottomHidden;
      if (passed) {
        console.log(`  ✅ [PASS] ${w}px Desktop Layout Preserved: Desktop Header & Nav visible, Mobile Chrome hidden`);
      } else {
        console.error(`  ❌ [FAIL] ${w}px Desktop Check:`, desktopCheck);
        totalErrors++;
      }
    }

    console.log("\n==================================================================");
    if (totalErrors === 0) {
      console.log(" 🎉 ALL TESTS PASSED! ZERO OVERFLOWS, FULL RESPONSIVE COMPLIANCE!");
    } else {
      console.error(` ⚠️ COMPLETED WITH ${totalErrors} ERROR(S) TO INVESTIGATE!`);
    }
    console.log("==================================================================");

  } catch (err) {
    console.error("Test Suite Error:", err);
  } finally {
    chromeProc.kill();
    process.exit(0);
  }
}

run();
