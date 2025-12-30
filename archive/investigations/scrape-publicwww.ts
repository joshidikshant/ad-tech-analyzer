import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  try {
    // console.log('Navigating...');
    await page.goto('https://publicwww.com/websites/pubfig.js/', { waitUntil: 'domcontentloaded' });
    // console.log('Waiting...');
    await page.waitForTimeout(3000);

    const content = await page.content();
    const $ = cheerio.load(content);

    const domains: string[] = [];
    
    // PublicWWW typically puts results in a table
    $('table tr td a').each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      
      // Filter out likely non-result links
      if (href && !href.startsWith('/')) { 
         // If it's an external link, it might be the site.
         // Or if the text looks like a domain.
         if (text.includes('.') && !text.includes('publicwww')) {
             domains.push(text);
         }
      } else if (href && href.startsWith('http')) {
           if (text.includes('.') && !text.includes('publicwww')) {
             domains.push(text);
         }
      }
    });

    // Fallback: look for generic links if table structure isn't as expected
    if (domains.length === 0) {
        $('a').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            // Check if text looks like a domain
            if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(text) && !text.includes('publicwww') && !text.includes('Sign in') && !text.includes('Pricing')) {
                 // Verify it's not a navigation link
                 if (href && !href.startsWith('/')) {
                     domains.push(text);
                 }
            }
        });
    }

    // Deduplicate and take top 5
    const uniqueDomains = [...new Set(domains)];
    
    // console.log(`Found ${uniqueDomains.length} domains.`);
    
    uniqueDomains.slice(0, 5).forEach(d => console.log(d));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
