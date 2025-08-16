const playwright = require(process.env.VERCEL ? 'playwright-aws-lambda' : 'playwright');
const { createServer } = require('http');

module.exports = async (req, res) => {
  let browser = null;
  try {
    console.log("Launching browser...");
    const browser = await (process.env.VERCEL
        ? playwright.launchChromium({ headless: true })
        : playwright.chromium.launch({ headless: true }));
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      timezoneId: 'America/Chicago',
    });
    const page = await context.newPage();

    const loginUrl = 'https://gas.mcd.com/adfs/ls/?binding=urn%3aoasis%3anames%3atc%3aSAML%3a2.0%3abindings%3aHTTP-Redirect&SAMLRequest=fZJRb9owEMe%2FimVpj8GBlpJZJIgRTUNq1wjYHvZSGftCLTk28zmwffs6gWxMmvpyZ518%2F%2Fv5%2Fp4vfjWGnMCjdjan41FKCVjplLaHnLahTjK6KOYoGnPkyza82g38bAEDWZc5fVEzeJjWAImq92lyr%2B6mSQbqYzJTe6lm2b6u05qS74P8pJNfI7awthiEDbGUTqZJmiXj6W6c8fsHPkl%2FUFLGCdqK0He9hnBEzthB4KiRaiRdw4SqkRlklHx2XkJPltNaGIRuQiUQ9Qn%2BVCrvgpPOfNL2%2BjJvuROokVvRAPIg%2BXb59MgjId9fLiH%2FsttVSfW83VGyRATf4aycxbYBvwV%2F0hK%2BbR7%2FAiK6DlCYEDWD1xIvrLphxh20Zd2IDeAxakAUCt4ZA549rcqXavNcLq6T80j34U70fDH3hDEHGUMnEVPkjHEgjccb1uioRd5b9v5Dj9et0IKQ3mLee%2BNvFN4XEMNWaDHs4Hw%2B%2F28Hc3ajP%2Fynr%2FHKuqyc0fI3WRrjzisPIkTbgm%2Bja6y4tP3784o3&RelayState=#d7e65fee-dfb0-4d35-8ed9-7dbcd78bff0f';
    const username = process.env.MCD_USERNAME || 'Ed147384';
    const password = process.env.MCD_PASSWORD || '#Ilovebigmacandfries';
    const roleLabel = "McDonald's Corporate";

    console.log("1) Opening login URL...");
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

    console.log("2) Handling Country & Language modal if present...");
    try {
      await page.waitForSelector('text=Country and Language', { timeout: 5000 });
      await page.getByRole("button", { name: "Save", exact: false }).click({ timeout: 2000 });
    } catch (e) {
      console.log("Country & Language modal not found or already saved.");
    }

    console.log(`3) Clicking role tile: ${roleLabel}`);
    try {
      await page.getByRole("button", { name: roleLabel, exact: false }).click({ timeout: 5000 });
    } catch (e) {
        try {
            await page.getByRole("link", { name: roleLabel, exact: false }).click({ timeout: 5000 });
        } catch (e2) {
            console.warn("Role tile not found or already selected.");
        }
    }
    await page.waitForTimeout(1000);

    console.log("4) Filling username...");
    await page.getByLabel("Username", { exact: false }).fill(username);

    console.log("5) Filling password...");
    await page.getByLabel("Password", { exact: false }).fill(password);
    await page.waitForTimeout(500);

    console.log("6) Clicking Login...");
    await page.getByRole("button", { name: "Login", exact: false }).first().click();

    console.log('7) Checking for "Continue to eRestaurant"');
    try {
        await page.waitForSelector('text=Continue to eRestaurant', { timeout: 15000 });
        await page.click('text=Continue to eRestaurant');
    } catch (e) {
        console.log('"Continue to eRestaurant" not found, proceeding.');
    }

    console.log("8) Waiting for Daily Activity home page to load...");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    
    console.log("9) Taking screenshot...");
    const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', screenshotBuffer.length);
    res.status(200).send(screenshotBuffer);

  } catch (error) {
    console.error("Automation failed:", error);
    // Capture a debug screenshot if possible
    if (page) {
        const debugBuffer = await page.screenshot({ fullPage: true, type: 'png' });
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'inline; filename="debug.png"');
        res.status(500).send(debugBuffer);
    } else {
        res.status(500).json({ error: 'An error occurred during automation.', details: error.message });
    }
  } finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
    }
  }
};
