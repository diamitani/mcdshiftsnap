const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

async function findAndClick(driver, locators) {
    for (const locator of locators) {
        try {
            const element = await driver.findElement(locator);
            await element.click();
            return true;
        } catch (e) {}
    }
    return false;
}

async function findAndFill(driver, locators, text) {
    for (const locator of locators) {
        try {
            const element = await driver.findElement(locator);
            await element.sendKeys(text);
            return true;
        } catch (e) {}
    }
    return false;
}


(async () => {
    let driver = null;
    try {
        console.log("Launching browser with Selenium...");
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().addArguments('--headless', '--window-size=1600,1000'))
            .build();

        const loginUrl = 'https://gas.mcd.com/adfs/ls/?binding=urn%3aoasis%3anames%3atc%3aSAML%3a2.0%3abindings%3aHTTP-Redirect&SAMLRequest=fZJRb9owEMe%2FimVpj8GBlpJZJIgRTUNq1wjYHvZSGftCLTk28zmwffs6gWxMmvpyZ518%2F%2Fv5%2Fp4vfjWGnMCjdjan41FKCVjplLaHnLahTjK6KOYoGnPkyza82g38bAEDWZc5fVEzeJjWAImq92lyr%2B6mSQbqYzJTe6lm2b6u05qS74P8pJNfI7awthiEDbGUTqZJmiXj6W6c8fsHPkl%2FUFLGCdqK0He9hnBEzthB4KiRaiRdw4SqkRlklHx2XkJPltNaGIRuQiUQ9Qn%2BVCrvgpPOfNL2%2BjJvuROokVvRAPIg%2BXb59MgjId9fLiH%2FsttVSfW83VGyRATf4aycxbYBvwV%2F0hK%2BbR7%2FAiK6DlCYEDWD1xIvrLphxh20Zd2IDeAxakAUCt4ZA549rcqXavNcLq6T80j34U70fDH3hDEHGUMnEVPkjHEgjccb1uioRd5b9v5Dj9et0IKQ3mLee%2BNvFN4XEMNWaDHs4Hw%2B%2F28Hc3ajP%2Fynr%2FHKuqyc0fI3WRrjzisPIkTbgm%2Bja6y4tP3784o3&RelayState=#d7e65fee-dfb0-4d35-8ed9-7dbcd78bff0f';
        const username = process.env.MCD_USERNAME || 'Ed147384';
        const password = process.env.MCD_PASSWORD || '#Ilovebigmacandfries';
        const roleLabel = "McDonald's Corporate";

        console.log("1) Opening login URL");
        await driver.get(loginUrl);

        console.log("2) Handling Country & Language modal if present");
        try {
            await driver.wait(until.elementLocated(By.xpath('//*[text()="Country and Language"]')), 5000);
            const saveButton = await driver.findElement(By.xpath('//button[contains(., "Save")]'));
            await saveButton.click();
        } catch (e) {
            console.log("Country & Language modal not found.");
        }

        console.log(`3) Clicking role tile: ${roleLabel}`);
        const roleLocators = [
            By.xpath(`//button[contains(., "${roleLabel}")]`),
            By.xpath(`//a[contains(., "${roleLabel}")]`)
        ];
        await findAndClick(driver, roleLocators);
        await driver.sleep(800);

        console.log("4) Filling username");
        const userLocators = [
            By.xpath('//input[contains(@aria-label, "Username")]'),
            By.xpath('//input[@name="username"]'),
            By.xpath('//input[contains(@placeholder, "Username")]')
        ];
        if (!await findAndFill(driver, userLocators, username)) throw new Error("Username field not found.");

        console.log("5) Filling password");
        const passLocators = [
            By.xpath('//input[@type="password"]'),
            By.xpath('//input[contains(@aria-label, "Password")]')
        ];
        if (!await findAndFill(driver, passLocators, password)) throw new Error("Password field not found.");
        await driver.sleep(400);

        console.log("6) Clicking Login");
        const loginLocators = [
            By.xpath('//button[contains(., "Login")]'),
            By.xpath('//button[@type="submit"]')
        ];
        if (!await findAndClick(driver, loginLocators)) {
            await driver.findElement(By.xpath('//input[@type="password"]')).sendKeys(Key.ENTER);
        }

        console.log('7) Checking for "Continue to eRestaurant"');
        try {
            const continueButton = await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Continue to eRestaurant")]')), 10000);
            await continueButton.click();
        } catch (e) {
            console.log('"Continue to eRestaurant" not found.');
        }

        console.log("8) Waiting for Daily Activity home page");
        await driver.wait(until.elementLocated(By.xpath('//*[text()="Daily Activity Report"]')), 30000);

        console.log("9) Clicking PDF button");
        const originalWindow = await driver.getWindowHandle();
        const pdfButton = await driver.findElement(By.xpath('//button[contains(., "PDF")]'));
        await pdfButton.click();
        
        console.log("Switching to new window...");
        await driver.wait(async () => (await driver.getAllWindowHandles()).length === 2, 10000);
        const windows = await driver.getAllWindowHandles();
        const newWindow = windows.find(handle => handle !== originalWindow);
        await driver.switchTo().window(newWindow);

        console.log("10) Waiting for PDF report to load");
        const generatingPDFLocator = By.xpath('//*[contains(text(), "Generating PDF...")]');
        await driver.wait(until.stalenessOf(await driver.findElement(generatingPDFLocator)), 45000);
        await driver.wait(until.elementLocated(By.xpath('//*[text()="Daily Activity Report"]')), 15000);

        console.log("11) Capturing screenshot");
        const screenshot = await driver.takeScreenshot();
        fs.writeFileSync('screenshot.png', screenshot, 'base64');
        console.log("Screenshot of the PDF report saved as screenshot.png");

    } catch (error) {
        console.error("Automation failed:", error);
        if (driver) {
            const debugShot = await driver.takeScreenshot();
            fs.writeFileSync('debug-screenshot-selenium.png', debugShot, 'base64');
            console.log("A debug screenshot was saved as debug-screenshot-selenium.png");
        }
    } finally {
        if (driver) {
            console.log("Closing browser...");
            await driver.quit();
        }
    }
})();
