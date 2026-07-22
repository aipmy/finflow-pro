import { chromium } from "playwright";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
dotenv.config();

export async function getUsageData(dashboardId = "335", msisdn = "") {
  const email = process.env.IOH_EMAIL;
  const password = process.env.IOH_PASSWORD;

  if (!email || !password) {
    throw new Error("IOH_EMAIL or IOH_PASSWORD not set in .env");
  }

  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", msg => console.log("BROWSER LOG:", msg.text()));

  try {
    console.log("Navigating directly to login page...");
    await page.goto("https://ide.ioh.co.id/portal/users/sign_in", { waitUntil: "networkidle" });

    console.log("Filling credentials...");
    await page.waitForSelector('input[type="email"], input[name="email"], input[name="username"]', { timeout: 10000 }).catch(() => null);

    const emailInput = await page.$('input[type="email"], input[name="email"], input[name="user[email]"], input[name="username"]');
    if (emailInput) {
      await emailInput.fill(email);
      await page.fill('input[type="password"], input[name="password"], input[name="user[password]"]', password);

      // Submit
      await page.click('button[type="submit"], input[type="submit"]');

      console.log("Waiting for login to complete...");
      await page.waitForNavigation({ waitUntil: "networkidle" });
    } else {
      console.log("Email input not found, maybe already logged in or different UI.");
    }

    // Go to dashboard
    let dashboardUrl = `https://ide.ioh.co.id/portal/customers/dashboards/${dashboardId}/usage`;
    console.log(`Fetching dashboard from: ${dashboardUrl}`);
    await page.goto(dashboardUrl, { waitUntil: "networkidle" });

    let content = await page.content();
    console.log("Parsing dashboard table page 1...");
    let $ = cheerio.load(content);

    const contacts = [];

    function extractContactsFromPage() {
      $('tbody[data-controller="msisdn-expand"]').each((i, el) => {
        const msisdnAttr = $(el).attr("data-sort-msisdn");
        if (msisdn && msisdnAttr !== msisdn) return;

        const name = $(el).attr("data-sort-name");
        const group = $(el).attr("data-sort-group");
        const activationId = $(el).attr("data-sort-default");

        if (msisdnAttr) {
          contacts.push({
            msisdn: msisdnAttr,
            lokasi: name,
            grup: group,
            activationId: activationId
          });
        }
      });
    }

    // Extract first page
    extractContactsFromPage();

    // Detect pagination
    let totalPages = 1;
    let pageParamName = "page";
    $("a").each((i, el) => {
      const href = $(el).attr("href") || "";
      const match = href.match(/[\?&](page_\d+)=(\d+)/);
      if (match) {
        pageParamName = match[1];
        const pageNum = parseInt(match[2], 10);
        if (pageNum > totalPages) {
          totalPages = pageNum;
        }
      }
    });

    console.log(`Detected pagination: parameter=${pageParamName}, totalPages=${totalPages}`);

    // If msisdn is specified and already found in page 1, skip fetching other pages
    const hasTargetMsisdn = () => msisdn && contacts.some(c => c.msisdn === msisdn);

    // Fetch pages 2 to totalPages if target msisdn is not yet found
    for (let p = 2; p <= totalPages; p++) {
      if (hasTargetMsisdn()) {
        console.log(`Target MSISDN ${msisdn} found. Stopping pagination loop.`);
        break;
      }

      const pageUrl = `https://ide.ioh.co.id/portal/customers/dashboards/${dashboardId}/usage?${pageParamName}=${p}`;
      console.log(`Fetching dashboard page ${p}/${totalPages} from: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: "networkidle" });

      const pageContent = await page.content();
      $ = cheerio.load(pageContent);
      extractContactsFromPage();
    }
    console.log(`Found ${contacts.length} numbers to fetch usage for.`);
    const results = [];
    const apiContext = page.context().request;

    for (const contact of contacts) {
      console.log(`Fetching usage data for ${contact.msisdn} (${contact.lokasi}) [ID: ${contact.activationId}]...`);
      const usageUrl = `https://ide.ioh.co.id/portal/customers/dashboards/${dashboardId}/usage?is_parent=true&msisdn=${contact.msisdn}`;

      try {
        const response = await apiContext.get(usageUrl, {
          headers: {
            "Turbo-Frame": `usage-data-${contact.activationId}`,
            "Accept": "text/html, application/xhtml+xml"
          }
        });
        const usageHtml = await response.text();

        const $usage = cheerio.load(usageHtml);
        const usageText = $usage.text().replace(/\s+/g, " ").trim();

        // Extract using regex
        const kuotaMatch = usageText.match(/Kuota Data\s+([\d.]+\s*\/\s*[\d.]+\s*[A-Z]+)/i);
        const sisaMatch = usageText.match(/Sisa Kuota Tersedia\s+([\d.]+\s*[A-Z]+)/i);

        // Also let's extract voice & SMS since we see them in the UI screenshot
        // Kuota Telepon e.g. "0 / 60 Min" or "Sisa Kuota Tersedia 60 Min"
        const voiceMatch = usageText.match(/Kuota Telepon\s+([\d.]+\s*\/\s*[\d.]+\s*[A-Za-z]+)/i);
        const sisaVoiceMatch = usageText.match(/Kuota Telepon\s+.*Sisa Kuota Tersedia\s+([\d.]+\s*[A-Za-z]+)/i);
        
        const smsMatch = usageText.match(/Kuota SMS\s+([\d.]+\s*\/\s*[\d.]+\s*[A-Za-z]+)/i);
        const sisaSmsMatch = usageText.match(/Kuota SMS\s+.*Sisa Kuota Tersedia\s+([\d.]+\s*[A-Za-z]+)/i);

        results.push({
          msisdn: contact.msisdn,
          lokasi: contact.lokasi,
          grup: contact.grup,
          kuota_digunakan: kuotaMatch ? kuotaMatch[1] : "Tidak Ditemukan",
          sisa_kuota: sisaMatch ? sisaMatch[1] : "Tidak Ditemukan",
          voice_digunakan: voiceMatch ? voiceMatch[1] : "0 / 60 Min",
          sisa_voice: sisaVoiceMatch ? sisaVoiceMatch[1] : "60 Min",
          sms_digunakan: smsMatch ? smsMatch[1] : "0 / 60 SMS",
          sisa_sms: sisaSmsMatch ? sisaSmsMatch[1] : "60 SMS",
        });
      } catch (err) {
        console.error(`Failed to fetch usage for ${contact.msisdn}:`, err.message);
        results.push({
          msisdn: contact.msisdn,
          lokasi: contact.lokasi,
          grup: contact.grup,
          error: "Gagal mengambil data penggunaan"
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error in scraper:", error);
    throw error;
  } finally {
    await browser.close();
  }
}
