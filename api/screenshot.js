const playwright = require('playwright');

module.exports = async (req, res) => {
    let browser = null;
    let page = null;
    try {
        console.log("Launching browser...");
        browser = await playwright.chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 1600, height: 1000 },
            timezoneId: 'America/Chicago',
        });
        page = await context.newPage();

        const loginUrl = 'https://gas.mcd.com/adfs/ls/?binding=urn%3aoasis%3anames%3atc%3aSAML%3a2.0%3abindings%3aHTTP-Redirect&SAMLRequest=fZJRb9owEMe%2FimVpj8GBlpJZJIgRTUNq1wjYHvZSGftCLTk28zmwffs6gWxMmvpyZ518%2F%2Fv5%2Fp4vfjWGnMCjdjan41FKCVjplLaHnLahTjK6KOYoGnPkyza82g38bAEDWZc5fVEzeJjWAImq92lyr%2B6mSQbqYzJTe6lm2b6u05qS74P8pJNfI7awthiEDbGUTqZJmiXj6W6c8fsHPkl%2FUFLGCdqK0He9hnBEzthB4KiRaiRdw4SqkRlklHx2XkJPltNaGIRuQiUQ9Qn%2BVCrvgpPOfNL2%2BjJvuROokVvRAPIg%2BXb59MgjId9fLiH%2FsttVSfW83VGyRATf4aycxbYBvwV%2F0hK%2BbR7%2FAiK6DlCYEDWD1xIvrLphxh20Zd2IDeAxakAUCt4ZA549rcqXavNcLq6T80j34U70fDH3hDEHGUMnEVPkjHEgjccb1uioRd5b9v5Dj9et0IKQ3mLee%2BNvFN4XEMNWaDHs4Hw%2B%2F28Hc3ajP%2Fynr%2FHKuqyc0fI3WRrjzisPIkTbgm%2Bja6y4tP3784o3&RelayState=#d7e65fee-dfb0-4d35-8ed9-7dbcd78bff0f';
        const username = process.env.MCD_USERNAME;
        const password = process.env.MCD_PASSWORD;
        const roleLabel = "McDonald's Corporate";
        const countryLabel = "US";
        const languageLabel = "English";

        if (!username || !password) {
            throw new Error("Missing MCD_USERNAME or MCD_PASSWORD environment variables.");
        }

        console.log("1) Opening login URL");
        await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

        console.log("2) Handling Country & Language modal if present");
        try {
            await page.waitForSelector('text=Country and Language', { timeout: 5000 });
            const combos = page.getByRole("combobox");
            if (await combos.count() >= 1) {
                try { await combos.nth(0).selectOption({ label: countryLabel }); } catch (e) {}
            }
            if (await combos.count() >= 2) {
                try { await combos.nth(1).selectOption({ label: languageLabel }); } catch (e) {}
            }
            try {
                await page.getByRole("button", { name: "Save", exact: false }).click({ timeout: 2000 });
            } catch (e) {
                await page.click('text=Save', { timeout: 2000 });
            }
        } catch (e) {
            console.log("Country & Language modal not found.");
        }

        console.log(`3) Clicking role tile: ${roleLabel}`);
        const roleLocators = [
            () => page.getByRole("button", { name: roleLabel, exact: false }).click({ timeout: 2500 }),
            () => page.getByRole("link", { name: roleLabel, exact: false }).click({ timeout: 2500 }),
            () => page.click(`text=${roleLabel}`, { timeout: 2500 }),
        ];
        let tileClicked = false;
        for (const clickFn of roleLocators) {
            try { await clickFn(); tileClicked = true; break; } catch (e) {}
        }
        if (!tileClicked) console.log("Role tile not clicked (maybe already selected).");
        await page.waitForTimeout(800);

        console.log("4) Filling username");
        const userLocators = [
            () => page.getByLabel("Username", { exact: false }).fill(username),
            () => page.getByRole("textbox", { name: "Username", exact: false }).fill(username),
            () => page.fill('input[placeholder*="Username" i]', username),
            () => page.fill('input[name="username"]', username),
            () => page.fill('input[id*="user" i]', username),
        ];
        let userFilled = false;
        for (const fillFn of userLocators) {
            try { await fillFn(); userFilled = true; break; } catch (e) {}
        }
        if (!userFilled) throw new Error("Username field not found.");

        console.log("5) Filling password");
        const passLocators = [
            () => page.getByLabel("Password", { exact: false }).fill(password),
            () => page.getByRole("textbox", { name: "Password", exact: false }).fill(password),
            () => page.fill('input[placeholder*="Password" i]', password),
            () => page.fill('input[type="password"]', password),
        ];
        let passFilled = false;
        for (const fillFn of passLocators) {
            try { await fillFn(); passFilled = true; break; } catch (e) {}
        }
        if (!passFilled) throw new Error("Password field not found.");
        await page.waitForTimeout(400);

        console.log("6) Clicking Login");
        const loginLocators = [
            () => page.getByRole("button", { name: "Login", exact: false }).first().click({ timeout: 1500 }),
            () => page.locator('button:has-text("Login")').first().click({ timeout: 1500 }),
            () => page.locator('button[type="submit"], input[type="submit"]').first().click({ timeout: 1500 }),
        ];
        let loginClicked = false;
        for (const clickFn of loginLocators) {
            try { await clickFn(); loginClicked = true; break; } catch (e) {}
        }
        if (!loginClicked) {
            try { await page.keyboard.press("Enter"); loginClicked = true; } catch (e) {}
        }
        if (!loginClicked) throw new Error("Login button not found.");

        console.log('7) Checking for "Continue to eRestaurant"');
        try {
            await page.waitForSelector('text=Continue to eRestaurant', { timeout: 10000 });
            await page.click('text=Continue to eRestaurant');
        } catch (e) {
            console.log('"Continue to eRestaurant" not found.');
        }

        console.log("8) Waiting for Daily Activity home page");
        await page.waitForSelector('text="Daily Activity Report"', { timeout: 30000 });
        await page.waitForLoadState("networkidle");

        console.log("9) Clicking PDF button and waiting for new page");
        const pagePromise = context.waitForEvent('page');
        await page.getByRole('button', { name: 'PDF' }).click();
        const newPage = await pagePromise;
        await newPage.waitForLoadState('domcontentloaded');

        console.log("10) Waiting for 'Generating PDF...' text to disappear...");
        try {
            await newPage.getByText("Generating PDF...", { exact: false }).waitFor({ state: "hidden", timeout: 120000 });
            console.log("'Generating PDF...' text has disappeared.");
        } catch (e) {
            console.log("Warning: 'Generating PDF...' text did not disappear within timeout.");
        }
        
        console.log("11) Adding a 15-second fixed delay for rendering...");
        await newPage.waitForTimeout(15000);

        console.log("12) Capturing full-page screenshot of PDF view");
        await newPage.waitForLoadState("networkidle");
        const screenshotBuffer = await newPage.screenshot({ fullPage: true, type: 'png' });
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', screenshotBuffer.length);
        res.status(200).send(screenshotBuffer);

    } catch (error) {
        console.error("Automation failed:", error);
        if (page) {
            const debugBuffer = await page.screenshot({ fullPage: true });
            res.setHeader('Content-Type', 'image/png');
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
