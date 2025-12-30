#!/usr/bin/env tsx
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports
const { classifyNetworkRequests } = await import(path.join(__dirname, '../src/analyzer/network-classifier.js'));

const app = express();
app.use(cors());
app.use(express.json());

// POST /api/analyze
app.post('/api/analyze', async (req, res) => {
  let browser = null;

  try {
    const { url, device = 'desktop', timeout = 30000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`\n[API] Analyzing ${url} (${device})...`);

    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: device === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
        : undefined
    });
    const page = await context.newPage();

    // Collect network requests
    const requests: any[] = [];
    page.on('request', req => {
      requests.push({
        url: req.url(),
        method: req.method(),
        type: req.resourceType(),
      });
    });

    console.log('[API] Navigating to page...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('[API] Waiting for page to fully load...');
    await page.waitForTimeout(5000);

    console.log(`[API] Captured ${requests.length} network requests`);

    // Poll for ad-tech detection (up to 30 seconds)
    console.log('[API] Polling for ad-tech APIs...');
    const adTechData = await page.evaluate(`(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const safe = (fn) => { try { return fn(); } catch { return null; } };

      const data = {
        pbjs: { present: false, config: null, bidResponses: null, version: null, bidders: [], adUnits: 0 },
        gam: { present: false, slots: null, targeting: null },
        managedServices: {
          adthrive: false,
          freestar: false,
          raptive: false,
          mediavine: false,
          ezoic: false,
          adpushup: false,
          adapex: false,
          pubguru: false,
          vuukle: false
        },
        customWrappers: [],
        attempts: 0
      };

      const started = Date.now();
      while (Date.now() - started < 30000) {
        data.attempts++;
        const w = window;

        // Prebid.js detection
        const pbjs = w.pbjs;
        if (pbjs && !data.pbjs.present) {
          data.pbjs.present = true;
          data.pbjs.version = safe(() => pbjs.version);
          data.pbjs.config = safe(() => pbjs.getConfig && pbjs.getConfig());
          data.pbjs.bidResponses = safe(() => pbjs.getBidResponses && pbjs.getBidResponses());
          data.pbjs.bidders = safe(() => pbjs.getBidderCodes && pbjs.getBidderCodes()) || [];
          data.pbjs.adUnits = safe(() => pbjs.adUnits && pbjs.adUnits.length) || 0;
        }

        // Google Ad Manager detection
        const gt = w.googletag;
        if (gt && !data.gam.present) {
          data.gam.present = true;
          const pubads = safe(() => gt.pubads && gt.pubads());
          const slots = safe(() => pubads && pubads.getSlots && pubads.getSlots().map((s) => ({
            adUnitPath: safe(() => s.getAdUnitPath && s.getAdUnitPath()),
            elementId: safe(() => s.getSlotElementId && s.getSlotElementId()),
            sizes: safe(() => s.getSizes && s.getSizes().map((sz) => sz.toString()))
          })));
          data.gam.slots = slots || [];
          data.gam.targeting = safe(() => pubads && pubads.getTargeting && pubads.getTargeting());
        }

        // Managed services detection
        data.managedServices.adthrive ||= !!w.adthrive;
        data.managedServices.freestar ||= !!(w.freestar || w._fsprebid || w.pubfig);
        data.managedServices.raptive ||= !!w.raptive;
        data.managedServices.mediavine ||= !!w.mediavine;
        data.managedServices.ezoic ||= !!(w.ezoic || w.ezstandalone);
        data.managedServices.adpushup ||= !!w.adpushup;
        data.managedServices.adapex ||= !!w.aaw;
        data.managedServices.pubguru ||= !!w.pubguru;
        data.managedServices.vuukle ||= !!w._vuuklehb;

        // Custom wrapper detection
        const keys = safe(() => Object.keys(w)) || [];
        const likely = ["getConfig", "getBidResponses", "requestBids", "setConfig", "que"];
        const wrappers = keys.slice(0, 500).flatMap((k) => {
          const v = w[k];
          if (!v || (typeof v !== "object" && typeof v !== "function")) return [];
          const methods = likely.filter((m) => typeof v[m] === "function" || (m === "que" && Array.isArray(v.que)));
          return methods.length ? [{ key: k, methods }] : [];
        });
        data.customWrappers = wrappers;

        // Break if we found something
        const anyManagedService = Object.values(data.managedServices).some(v => v);
        if (data.pbjs.present || data.gam.present || anyManagedService) {
          break;
        }

        await sleep(2000);
      }

      return data;
    })()`);


    console.log(`[API] Detection complete after ${adTechData.attempts} attempts`);

    await browser.close();
    browser = null;

    // Classify vendors
    const classification = classifyNetworkRequests(requests);

    const result = {
      url,
      timestamp: new Date().toISOString(),
      device,
      vendors: classification.vendors,
      vendor_count: classification.vendors.length,
      ssp_count: classification.ssp_count,
      managed_service: classification.managed_service,
      categories: classification.categories,
      prebid: {
        detected: adTechData.pbjs.present,
        config: adTechData.pbjs.config,
        bid_responses: adTechData.pbjs.bidResponses,
        version: adTechData.pbjs.version,
        bidders: adTechData.pbjs.bidders,
        adUnits: adTechData.pbjs.adUnits
      },
      gam: {
        detected: adTechData.gam.present,
        slots: adTechData.gam.slots,
        targeting: adTechData.gam.targeting,
      },
      managed_services_detected: adTechData.managedServices,
      custom_wrappers: adTechData.customWrappers,
      network: {
        total_requests: requests.length,
        classified_requests: classification.vendors.length,
      },
      detection_attempts: adTechData.attempts
    };

    console.log(`[API] Analysis complete: ${result.vendor_count} vendors detected\n`);

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('[API] Analysis failed:', error.message);

    if (browser) {
      await browser.close();
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Ad-Tech Analyzer API Server (Playwright Mode) running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/analyze - Full ad-tech analysis`);
  console.log(`  GET  /health - Health check\n`);
});
