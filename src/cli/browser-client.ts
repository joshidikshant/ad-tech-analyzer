import { chromium, Browser, Page, CDPSession } from 'playwright';

export interface NetworkRequest {
  url: string;
  method: string;
  resourceType: string;
  status?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
}

export class BrowserClient {
  private browser?: Browser;
  private page?: Page;
  private cdpSession?: CDPSession;
  private networkRequests: NetworkRequest[] = [];

  async launch(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    this.page = await context.newPage();

    // Enable CDP session for low-level network monitoring
    this.cdpSession = await context.newCDPSession(this.page);
    await this.cdpSession.send('Network.enable');
    await this.cdpSession.send('Runtime.enable');

    // Capture all network requests
    this.page.on('requestfinished', async (request) => {
      const response = await request.response();
      this.networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        status: response?.status(),
        requestHeaders: await request.allHeaders(),
        responseHeaders: response ? await response.allHeaders() : undefined,
      });
    });
  }

  async navigateTo(url: string, timeout: number = 30000): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    try {
      // Navigate with timeout
      await this.page.goto(url, {
        timeout,
        waitUntil: 'domcontentloaded', // Don't wait for full load (ads can delay)
      });
    } catch (error) {
      // Timeout is expected for ad-heavy sites, continue anyway
      if (!error.message.includes('Timeout')) {
        throw error;
      }
    }
  }

  async waitForPageLoad(ms: number = 10000): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async evaluateScript<T = any>(script: string): Promise<T | null> {
    if (!this.page) throw new Error('Browser not launched');

    try {
      const result = await this.page.evaluate(script);
      return result as T;
    } catch (error) {
      return null;
    }
  }

  async queryAdTechAPIs(): Promise<any> {
    if (!this.page) throw new Error('Browser not launched');

    const script = `
      (() => {
        const w = window;
        const safe = (fn) => { try { return fn(); } catch { return null; } };

        return {
          pbjs: {
            present: !!w.pbjs,
            version: safe(() => w.pbjs?.version),
            config: safe(() => w.pbjs?.getConfig?.()),
            adUnits: safe(() => w.pbjs?.adUnits?.map(au => au.code)),
            bidResponses: safe(() => w.pbjs?.getBidResponses?.()),
            bidders: safe(() => {
              const config = w.pbjs?.getConfig?.();
              return config?.s2sConfig?.map(s => s.bidders)?.flat() || [];
            }),
          },
          gam: {
            present: !!w.googletag,
            version: safe(() => w.googletag?.getVersion?.()),
            slots: safe(() => {
              const pubads = w.googletag?.pubads?.();
              return pubads?.getSlots?.()?.map(slot => ({
                adUnitPath: slot.getAdUnitPath(),
                sizes: slot.getSizes()?.map(s => s.width && s.height ? [s.width, s.height] : null),
                targeting: slot.getTargetingKeys?.()?.reduce((acc, key) => {
                  acc[key] = slot.getTargeting(key);
                  return acc;
                }, {})
              }));
            }),
            targeting: safe(() => {
              const pubads = w.googletag?.pubads?.();
              const keys = pubads?.getTargetingKeys?.() || [];
              return keys.reduce((acc, key) => {
                acc[key] = pubads?.getTargeting(key);
                return acc;
              }, {});
            }),
          },
          amazon: {
            present: !!w.apstag,
            version: safe(() => w.apstag?.VERSION),
          },
          customWrappers: safe(() => {
            const wrappers = [];
            if (w.adthrive || w.cafemedia) wrappers.push({ key: 'adthrive', name: 'AdThrive/Raptive' });
            if (w.Mediavine) wrappers.push({ key: 'mediavine', name: 'Mediavine' });
            if (w.ramp) wrappers.push({ key: 'ramp', name: 'Ramp (formerly Ezoic)' });
            if (w.__vm_add) wrappers.push({ key: 'vidazoo', name: 'Vidazoo' });
            return wrappers;
          }),
          attempts: 1,
        };
      })()
    `;

    return await this.evaluateScript(script);
  }

  getNetworkRequests(): NetworkRequest[] {
    return this.networkRequests;
  }

  async close(): Promise<void> {
    if (this.cdpSession) {
      await this.cdpSession.detach().catch(() => { });
    }
    if (this.page) {
      await this.page.close().catch(() => { });
    }
    if (this.browser) {
      await this.browser.close().catch(() => { });
    }
  }
}
