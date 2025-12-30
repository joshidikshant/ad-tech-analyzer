import { chromium } from 'playwright';

(async () => {
  // Launch browser (headless: false for visibility/debugging)
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture Console Logs
  page.on('console', msg => {
    if (['error', 'warning'].includes(msg.type()))
      console.log(`[CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Capture Network Requests
  page.on('request', req => {
    if (/adthrive|prebid|googletag|gpt\.js/i.test(req.url()))
      console.log(`[NETWORK] ${req.method()} ${req.url()}`);
  });

  console.log('Navigating to osxdaily.com...');
  await page.goto('https://osxdaily.com/2025/12/16/first-beta-of-ios-26-3-macos-tahoe-26-3-released-for-testing/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  const start = Date.now();
  console.log('Starting polling (60s)...');

  // Poll for globals every 5s
  while (Date.now() - start < 60000) {
    const findings = await page.evaluate(() => {
      const w = window as any;
      return {
        pbjs: w.pbjs ? { loaded: true, version: w.pbjs.version } : undefined,
        googletag: w.googletag?.pubads ? { loaded: true, pubadsReady: !!w.googletag.pubads } : undefined,
        adthrive: !!w.adthrive,
        cafemedia: !!w.cafemedia
      };
    });
    console.log(`[${new Date().toISOString()}] Globals:`, JSON.stringify(findings));
    await new Promise(r => setTimeout(r, 5000));
  }

  await browser.close();
})();
