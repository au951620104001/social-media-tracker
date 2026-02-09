const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function getFollowerCounts(url, type) {
  if (!url) return 0;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Set user agent to something common
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log(`Scraping ${type}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    let count = 0;

    if (type === 'instagram') {
      // Try to find in title first (e.g., "Username (@handle) • Instagram photos and videos")
      // Better: find in meta description
      const description = await page.evaluate(() => {
        const meta = document.querySelector('meta[property="og:description"]');
        return meta ? meta.content : null;
      });

      if (description) {
        // Format: "1,234 Followers, 123 Following..."
        const match = description.match(/([\d,.]+)\s*Followers/i);
        if (match) {
          count = parseCount(match[1]);
        }
      }
    } else if (type === 'facebook') {
      // Find "followers" text in the page content
      const content = await page.evaluate(() => document.body.innerText);
      const match = content.match(/([\d,.]+)\s*followers/i);
      if (match) {
        count = parseCount(match[1]);
      }
    } else if (type === 'linkedin') {
      // LinkedIn public pages often show "123 followers"
      const content = await page.evaluate(() => document.body.innerText);
      const match = content.match(/([\d,.]+)\s*followers/i);
      if (match) {
        count = parseCount(match[1]);
      }
    }

    await browser.close();
    console.log(`Found count for ${type}: ${count}`);
    return count;

  } catch (error) {
    console.error(`Error scraping ${type} at ${url}:`, error.message);
    await browser.close();
    return 0;
  }
}

function parseCount(countStr) {
  if (!countStr) return 0;
  // Convert 1.2K to 1200, 1M to 1000000, etc.
  let cleanStr = countStr.replace(/,/g, '').toLowerCase();
  let num = parseFloat(cleanStr);
  if (cleanStr.includes('k')) num *= 1000;
  if (cleanStr.includes('m')) num *= 1000000;
  return Math.round(num);
}

module.exports = { getFollowerCounts };
