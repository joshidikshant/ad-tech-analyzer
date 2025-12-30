import { chromium, Route, Request } from 'playwright';

const BRIDGE_JS = String.raw`;(function(){
  try {
    var w = window;
    var now = function(){ return Date.now(); };
    var safeStr = function(x){ try { return typeof x === 'string' ? x : JSON.stringify(x); } catch(e){ return String(x); } };
    var safeErr = function(e){ try { return (e && e.message) ? e.message : safeStr(e); } catch(_) { return 'unknown'; } };

    if (!w.__adTechSnapshot) {
      w.__adTechSnapshot = {
        version: 'mitm-bridge@1',
        timestamp: null,
        error: null,
        hooks: {
          installedAt: now(),
          gptCmdHooked: false,
          gptEventsHooked: false,
          prebidHooked: false,
          prebidWrappers: [],
          lastPbjsHookAttemptAt: 0,
          lastGptHookAttemptAt: 0
        },
        gam: {
          slotsDefined: [],
          events: [],
          targeting: null,
          eventLog: { polls: [], lastLength: 0 },
          refresh: { slotRequestCounts: {}, cycles: [], totalRefreshes: 0 },
          race: { findings: [], lastAnalyzedAt: null }
        },
        prebid: { events: [], eventLog: null, lastEventLogAt: 0 },
        debug: { cmdPushCalls: [], notes: [] }
      };
    }
    var snap = w.__adTechSnapshot;

    var pushErrorOnce = function(msg){
      if (snap && snap.error == null) snap.error = msg;
    };

    var getSlotKey = function(slotLike){
      try {
        if (slotLike && typeof slotLike.getSlotElementId === 'function') {
          var el = slotLike.getSlotElementId();
          if (el) return String(el);
        }
      } catch(e) {}
      try {
        if (slotLike && typeof slotLike.getAdUnitPath === 'function') {
          var p = slotLike.getAdUnitPath();
          if (p) return String(p);
        }
      } catch(e) {}
      return null;
    };

    var summarizeSlot = function(slotLike){
      var out = {};
      try { if (slotLike && typeof slotLike.getSlotElementId === 'function') out.elementId = slotLike.getSlotElementId(); } catch(e) {}
      try { if (slotLike && typeof slotLike.getAdUnitPath === 'function') out.adUnitPath = slotLike.getAdUnitPath(); } catch(e) {}
      try {
        if (slotLike && typeof slotLike.getSlotId === 'function') {
          var id = slotLike.getSlotId();
          if (id && typeof id.getId === 'function') out.slotId = id.getId();
        }
      } catch(e) {}
      try {
        var sizes = (slotLike && typeof slotLike.getSizes === 'function') ? slotLike.getSizes() : null;
        if (Array.isArray(sizes)) {
          var parsed = [];
          for (var i=0;i<sizes.length;i++){
            var s = sizes[i];
            var x = (s && typeof s.getWidth === 'function') ? s.getWidth() : (s ? s.width : undefined);
            var y = (s && typeof s.getHeight === 'function') ? s.getHeight() : (s ? s.height : undefined);
            if (typeof x === 'number' && typeof y === 'number') parsed.push([x,y]);
          }
          if (parsed.length) out.sizes = parsed;
        }
      } catch(e) {}
      return out;
    };

    // HTL-style: hook googletag.cmd.push so anything queued runs with our visibility.
    var hookGoogletagCmdPush = function(){
      try {
        snap.hooks.lastGptHookAttemptAt = now();
        if (!w.googletag) w.googletag = { cmd: [] };
        if (!w.googletag.cmd) w.googletag.cmd = [];

        // Only hook once
        if (w.googletag.cmd && w.googletag.cmd.__adtech_hooked) {
          snap.hooks.gptCmdHooked = true;
          return true;
        }

        var cmd = w.googletag.cmd;
        var origPush = cmd.push ? cmd.push.bind(cmd) : null;

        var wrappedPush = function(){
          try {
            snap.debug.cmdPushCalls.push({ t: now(), name: 'googletag.cmd.push', data: { argc: arguments.length } });
          } catch(e) {}
          // Execute immediately if it's a function (common GPT pattern)
          try {
            if (arguments.length === 1 && typeof arguments[0] === 'function') {
              try { arguments[0](); } catch(e) {
                snap.debug.notes.push({ t: now(), type: 'cmd_fn_error', msg: safeErr(e) });
              }
              return cmd.length; // mimic Array#push-ish
            }
          } catch(e) {}
          if (origPush) return origPush.apply(null, arguments);
          try { return Array.prototype.push.apply(cmd, arguments); } catch(e) { return cmd.length; }
        };

        // Replace push on the actual array object
        cmd.push = wrappedPush;
        cmd.__adtech_hooked = true;

        snap.hooks.gptCmdHooked = true;

        // Drain any queued functions that may already exist
        try {
          for (var i=0;i<cmd.length;i++){
            var item = cmd[i];
            if (typeof item === 'function') {
              try { item(); } catch(e) {
                snap.debug.notes.push({ t: now(), type: 'queued_cmd_fn_error', msg: safeErr(e) });
              }
            }
          }
        } catch(e) {}

        return true;
      } catch(e) {
        pushErrorOnce('hookGoogletagCmdPush failed: ' + safeErr(e));
        return false;
      }
    };

    var hookGptEvents = function(){
      try {
        snap.hooks.lastGptHookAttemptAt = now();
        if (!w.googletag || typeof w.googletag.pubads !== 'function') return false;
        var pubads = w.googletag.pubads();
        if (!pubads || typeof pubads.addEventListener !== 'function') return false;

        if (pubads.__adtech_events_hooked) {
          snap.hooks.gptEventsHooked = true;
          return true;
        }

        var onSlotRequested = function(ev){
          try {
            var slot = ev && ev.slot;
            var key = getSlotKey(slot) || 'unknown';
            var rec = { t: now(), name: 'slotRequested', slot: summarizeSlot(slot), raw: { slotKey: key } };
            snap.gam.events.push(rec);

            var counts = snap.gam.refresh.slotRequestCounts;
            var prev = counts[key] || 0;
            counts[key] = prev + 1;
            if (counts[key] > 1) {
              snap.gam.refresh.totalRefreshes += 1;
              snap.gam.refresh.cycles.push({ t: now(), slotKey: key, requestCount: counts[key] });
            }
          } catch(e) {
            snap.debug.notes.push({ t: now(), type: 'slotRequested_error', msg: safeErr(e) });
          }
        };

        var onSlotRenderEnded = function(ev){
          try {
            var slot = ev && ev.slot;
            var key = getSlotKey(slot) || 'unknown';
            var rec = {
              t: now(),
              name: 'slotRenderEnded',
              slot: summarizeSlot(slot),
              isEmpty: ev ? ev.isEmpty : undefined,
              creativeId: ev ? ev.creativeId : undefined,
              lineItemId: ev ? ev.lineItemId : undefined,
              advertiserId: ev ? ev.advertiserId : undefined,
              campaignId: ev ? ev.campaignId : undefined,
              size: ev ? ev.size : undefined,
              raw: { slotKey: key }
            };
            snap.gam.events.push(rec);

            // Race-condition heuristic: render before any request count observed
            var counts = snap.gam.refresh.slotRequestCounts;
            var seenReq = counts[key] || 0;
            if (seenReq === 0) {
              snap.gam.race.findings.push({ t: now(), type: 'renderBeforeRequest', slotKey: key, detail: 'slotRenderEnded before slotRequested count observed' });
            }
          } catch(e) {
            snap.debug.notes.push({ t: now(), type: 'slotRenderEnded_error', msg: safeErr(e) });
          }
        };

        // Install listeners
        try { pubads.addEventListener('slotRequested', onSlotRequested); } catch(e) {}
        try { pubads.addEventListener('slotRenderEnded', onSlotRenderEnded); } catch(e) {}
        try { pubads.addEventListener('impressionViewable', function(ev){
          try {
            var slot = ev && ev.slot;
            snap.gam.events.push({ t: now(), name: 'impressionViewable', slot: summarizeSlot(slot), raw: {} });
          } catch(e) {}
        }); } catch(e) {}

        pubads.__adtech_events_hooked = true;
        snap.hooks.gptEventsHooked = true;
        return true;
      } catch(e) {
        pushErrorOnce('hookGptEvents failed: ' + safeErr(e));
        return false;
      }
    };

    var discoverPrebidInstances = function(){
      var found = [];
      try {
        var names = Object.getOwnPropertyNames(w);
        for (var i=0;i<names.length;i++){
          var name = names[i];
          var obj;
          try { obj = w[name]; } catch(e) { continue; }
          if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) continue;
          try {
            if (typeof obj.requestBids === 'function' && typeof obj.onEvent === 'function' && typeof obj.addAdUnits === 'function') {
              found.push({ name: String(name), obj: obj });
            }
          } catch(e) {}
        }
      } catch(e) {}
      return found;
    };

    var hookPrebid = function(){
      try {
        snap.hooks.lastPbjsHookAttemptAt = now();
        var wrappers = discoverPrebidInstances();
        if (!wrappers || !wrappers.length) return false;

        if (!snap.hooks.prebidWrappers) snap.hooks.prebidWrappers = [];

        var hookedAny = false;
        var names = ['auctionInit','auctionEnd','bidWon','bidResponse'];

        for (var wi=0;wi<wrappers.length;wi++){
          var wrapperName = wrappers[wi] && wrappers[wi].name;
          var pbjs = wrappers[wi] && wrappers[wi].obj;
          if (!pbjs) continue;

          if (pbjs.__adtech_hooked) {
            hookedAny = true;
            if (wrapperName && snap.hooks.prebidWrappers.indexOf(wrapperName) === -1) snap.hooks.prebidWrappers.push(wrapperName);
            continue;
          }

          if (typeof pbjs.onEvent === 'function') {
            for (var i=0;i<names.length;i++){
              (function(evName, wrappedPbjs, wrappedName){
                try {
                  wrappedPbjs.onEvent(evName, function(data){
                    try {
                      snap.prebid.events.push({
                        t: now(),
                        name: evName,
                        wrapper: wrappedName,
                        auctionId: data && data.auctionId,
                        adUnitCode: data && (data.adUnitCode || data.adUnit || data.adUnitId),
                        bidder: data && (data.bidder || (data.bid && data.bid.bidder)),
                        cpm: data && (data.cpm || (data.bid && data.bid.cpm)),
                        currency: data && (data.currency || (data.bid && data.bid.currency)),
                        status: data && data.status,
                        timeToRespond: data && data.timeToRespond,
                        raw: (data && typeof data === 'object') ? data : { value: data }
                      });
                    } catch(e) {}
                  });
                } catch(e) {}
              })(names[i], pbjs, wrapperName);
            }
          }

          // Best-effort: wrap requestBids (applies even if onEvent isn't wired internally)
          try {
            if (typeof pbjs.requestBids === 'function' && !pbjs.__adtech_wrapped_requestBids) {
              var orig = pbjs.requestBids.bind(pbjs);
              pbjs.requestBids = function(opts){
                try { snap.prebid.events.push({ t: now(), name: 'requestBids', wrapper: wrapperName, raw: { opts: opts ? (opts.timeout ? { timeout: opts.timeout } : {}) : {} } }); } catch(e) {}
                return orig(opts);
              };
              pbjs.__adtech_wrapped_requestBids = true;
            }
          } catch(e) {}

          pbjs.__adtech_hooked = true;
          hookedAny = true;
          if (wrapperName && snap.hooks.prebidWrappers.indexOf(wrapperName) === -1) snap.hooks.prebidWrappers.push(wrapperName);
        }

        if (hookedAny) snap.hooks.prebidHooked = true;
        return hookedAny;
      } catch(e) {
        pushErrorOnce('hookPrebid failed: ' + safeErr(e));
        return false;
      }
    };

    // Poll GPT getEventLog() every 5s
    var startEventLogPolling = function(){
      try {
        if (w.__adtech_eventlog_poll_started) return;
        w.__adtech_eventlog_poll_started = true;

        setInterval(function(){
          try {
            snap.timestamp = now();
            if (!w.googletag || typeof w.googletag.pubads !== 'function') return;
            var pubads = w.googletag.pubads();
            if (!pubads || typeof pubads.getEventLog !== 'function') return;

            var log = pubads.getEventLog();
            var len = Array.isArray(log) ? log.length : (log && typeof log.length === 'number' ? log.length : null);
            var prev = snap.gam.eventLog.lastLength || 0;
            var delta = (typeof len === 'number') ? (len - prev) : null;

            snap.gam.eventLog.polls.push({
              t: now(),
              ok: true,
              length: (typeof len === 'number') ? len : undefined,
              delta: (typeof delta === 'number') ? delta : undefined,
              sampleTypes: (Array.isArray(log) ? log.slice(-5).map(function(x){ return x && x.eventType ? String(x.eventType) : typeof x; }) : undefined)
            });

            if (typeof len === 'number') snap.gam.eventLog.lastLength = len;
          } catch(e) {
            try { snap.gam.eventLog.polls.push({ t: now(), ok: false, error: safeErr(e) }); } catch(_) {}
          }
        }, 5000);
      } catch(e) {
        pushErrorOnce('startEventLogPolling failed: ' + safeErr(e));
      }
    };

    // Retry hooks for late-loading scripts / race conditions
    hookGoogletagCmdPush();
    startEventLogPolling();

    var attempts = 0;
    var maxAttempts = 120; // ~2 minutes at 1s
    var timer = setInterval(function(){
      attempts++;
      try { hookGoogletagCmdPush(); } catch(e) {}
      try { hookGptEvents(); } catch(e) {}
      try { hookPrebid(); } catch(e) {}
      if (attempts >= maxAttempts) clearInterval(timer);
    }, 1000);
  } catch(e) {
    try {
      window.__adTechSnapshot = window.__adTechSnapshot || {};
      window.__adTechSnapshot.error = 'bridge_init_failed: ' + (e && e.message ? e.message : String(e));
    } catch(_) {}
  }
})();`;

const ROUTE_PATTERNS = ['**/prebid.js*', '**/gpt.js', '**/googletag/**'];

function usageAndExit(): never {
  console.error('Usage: tsx test-mitm-injection.ts <url>');
  process.exit(2);
}

async function handleMitm(route: Route, request: Request) {
  // Only tamper with script-like resources (best-effort)
  const url = request.url();
  try {
    const response = await route.fetch();
    const status = response.status();
    const headers = { ...response.headers() } as Record<string, string>;

    // Remove content-length since we change body
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === 'content-length') delete headers[k];
    }
    if (!headers['content-type'] && !headers['Content-Type']) {
      headers['content-type'] = 'application/javascript; charset=utf-8';
    }

    const original = await response.text();
    const injected =
      original +
      '\n\n/* --- MITM bridge injected --- */\n' +
      BRIDGE_JS +
      '\n/* --- end injected --- */\n';

    await route.fulfill({
      status,
      headers,
      body: injected,
    });

    console.log('[mitm] injected into', url);
  } catch (e) {
    console.error('[mitm] failed for', url, e);
    await route.continue();
  }
}

async function main() {
  const url = process.argv[2];
  if (!url) usageAndExit();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  const page = await context.newPage();

  // Install MITM interception for each pattern
  for (const pattern of ROUTE_PATTERNS) {
    await page.route(pattern, handleMitm);
  }

  // Extra logging can help confirm injection happened
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') console.log(`[console:${t}]`, msg.text());
  });
  page.on('pageerror', (err) => console.log('[pageerror]', err?.message || String(err)));

  console.log('[mitm] navigating:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const observeMs = 180_000;

  // Scroll to trigger lazy-loaded ads before taking the final snapshot.
  const observeStart = Date.now();
  console.log('[mitm] scrolling to bottom...');
  while (Date.now() - observeStart < observeMs) {
    const state = await page.evaluate(() => {
      const y = window.scrollY || 0;
      const h = window.innerHeight || 0;
      const sh = document.documentElement?.scrollHeight || document.body?.scrollHeight || 0;
      return { y, h, sh };
    });

    const atBottom = state.y + state.h >= state.sh - 5;
    if (atBottom) break;

    const nextY = await page.evaluate(() => {
      window.scrollBy(0, 500);
      return window.scrollY || 0;
    });
    console.log('[mitm] scrolling to', nextY);
    await page.waitForTimeout(2000);
  }

  const elapsed = Date.now() - observeStart;
  const remaining = Math.max(0, observeMs - elapsed);
  console.log('[mitm] observing for 180s...');
  if (remaining > 0) await page.waitForTimeout(remaining);

  const snapshot = await page.evaluate(() => (window as any).__adTechSnapshot || null);

  console.log('--- __adTechSnapshot ---');
  console.log(JSON.stringify(snapshot, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
