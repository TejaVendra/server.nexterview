import {chromium} from 'playwright'


let browser;

export async function initBrowser(){
    browser = await chromium.launch({
        headless:true,
    });
}



export async function scrapePorfolio(url){
    const page = await browser.newPage();

    try {

        await page.goto(url,{
            waitUntil:"domcontentloaded",
            timeout:15000,
        });
        const text = await page.locator("body").innerText();

        return text;
        
    } finally {
        await page.close();
    }
}