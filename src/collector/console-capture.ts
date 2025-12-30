import { Page } from 'playwright';

/**
 * Console message captured from browser runtime
 */
export interface ConsoleMessage {
  level: string;
  text: string;
  timestamp: number;
  url?: string;
  args?: string[];
}

// Ad-tech keywords to filter console messages
const AD_KEYWORDS = ['prebid', 'googletag', 'gpt', 'consent', 'cmp', 'ezoic', 'freestar'];

// PII patterns to redact
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const UUID_REGEX = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g;

/**
 * Strips PII (emails, UUIDs) from text
 */
function stripPii(input: string): string {
  return input
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(UUID_REGEX, '[REDACTED_UUID]');
}

/**
 * Checks if text contains ad-tech keywords
 */
function matchesAdKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return AD_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Captures console messages from browser page using CDP.
 * Filters for ad-tech keywords and strips PII.
 *
 * NOTE: This sets up a listener that collects messages over the page lifetime.
 * Call this BEFORE page navigation to capture early console output.
 * The returned array will be populated as messages occur.
 *
 * @param page Playwright page to monitor
 * @returns Promise resolving to array of console messages (populated live)
 */
export async function captureConsoleMessages(page: Page): Promise<ConsoleMessage[]> {
  const collected: ConsoleMessage[] = [];

  try {
    // Create CDP session for low-level Runtime events
    const client = await page.context().newCDPSession(page);
    await client.send('Runtime.enable');

    // Listen for console API calls (console.log, warn, error, etc.)
    client.on('Runtime.consoleAPICalled', (event: any) => {
      try {
        // Extract and sanitize arguments
        const args = (event.args || []).map((arg: any) =>
          stripPii(String(arg.value ?? arg.description ?? ''))
        );

        // Combine args into text
        const text = stripPii(args.join(' '));

        // Filter: only capture ad-tech related messages
        if (!matchesAdKeyword(text)) return;

        // Extract source URL from stack trace
        const url = event.stackTrace?.callFrames?.[0]?.url;

        collected.push({
          level: event.type, // 'log', 'warning', 'error', etc.
          text,
          timestamp: event.timestamp || Date.now(),
          url,
          args,
        });
      } catch (err) {
        // Silently ignore parsing errors to avoid breaking listener
        console.warn('[ConsoleCapture] Failed to process message:', err);
      }
    });
  } catch (err) {
    // CDP session failed - return empty array gracefully
    console.warn('[ConsoleCapture] Failed to setup CDP session:', err);
    return [];
  }

  // Return the live-updating array
  // Note: Caller should keep page open until analysis completes
  return collected;
}
