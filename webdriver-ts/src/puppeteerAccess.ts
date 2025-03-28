import * as puppeteer from "puppeteer-core";
import { Page } from "puppeteer-core";
import { BenchmarkOptions, wait } from "./common.js";

export async function checkElementNotExists(page: Page, selector: string) {
  let start = Date.now();
  for (let k = 0; k < 10; k++) {
    let sel = await page.$(selector);
    if (!sel) {
      return;
    }
    console.log("checkElementNotExists element found");
    await sel.dispose();
    await wait(k < 3 ? 10 : 1000);
  }
  console.log("checkElementNotExists waited " + (Date.now() - start) + " but no luck");
  throw `checkElementNotExists failed for ${selector};`;
}

export async function checkElementExists(page: Page, selector: string) {
  let start = Date.now();
  for (let k = 0; k < 10; k++) {
    let sel = await page.$(selector);
    if (sel) {
      await sel.dispose();
      return sel;
    }
    console.log(`checkElementExists element ${selector} not found`);
    await wait(k < 3 ? 10 : 1000);
  }
  console.log("checkElementExists waited " + (Date.now() - start) + " but no luck");
  throw `checkElementExists failed for ${selector};`;
}

export async function clickElement(page: Page, selector: string) {
  let elem = await page.$(selector);
  if (!elem.asElement()) throw `clickElementByXPath ${selector} failed. Element was not found.`;
  await elem.click();
  await elem.dispose();
}

export async function checkElementContainsText(page: Page, selector: string, expectedText: string): Promise<void> {
  let start = Date.now();
  let txt;
  for (let k = 0; k < 10; k++) {
    let elem = await page.$(selector);
    if (elem) {
      txt = await elem.evaluate((e: any) => e?.innerText);
      if (txt === undefined) console.log("WARNING: checkElementContainsText was undefined");
      if (txt) {
        let result = txt.includes(expectedText);
        await elem.dispose();
        if (result) return;
      }
    }
    await wait(k < 3 ? 10 : 1000);
  }
  console.log("checkElementExists waited " + (Date.now() - start) + " but no luck");
  throw `checkElementContainsText ${selector} failed. expected ${expectedText}, but was ${txt}`;
}

export async function checkElementHasClass(page: Page, selector: string, className: string): Promise<void> {
  let clazzes;
  for (let k = 0; k < 10; k++) {
    let elem = await page.$(selector);
    if (elem) {
      let clazzes = await elem.evaluate((e: any) => e?.classList);
      if (clazzes === undefined) console.log("WARNING: checkElementHasClass was undefined");
      if (clazzes) {
        let result = Object.values(clazzes).includes(className);
        await elem.dispose();
        if (result) return;
      }
    }
    await wait(k < 3 ? 10 : 1000);
  }
  throw `checkElementHasClass ${selector} failed. expected ${className}, but was ${clazzes}`;
}

export async function checkCountForSelector(page: Page, selector: string, expectedCount: number): Promise<void> {
  let elems = await page.$$(selector);
  if (elems) {
    if (expectedCount !== elems.length) {
      throw `checkCountForSelector ${selector} failed. expected ${expectedCount}, but ${elems.length} were found`;
    }
  } else {
    if (expectedCount !== 0) {
      throw `checkCountForSelector ${selector} failed. expected ${expectedCount}, but selector was not found`;
    }
  }
}

function browserPath(benchmarkOptions: BenchmarkOptions) {
  if (benchmarkOptions.chromeBinaryPath) return benchmarkOptions.chromeBinaryPath;
  if (process.platform == "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  } else if (process.platform == "linux") {
    return "/usr/bin/google-chrome";
  } else if (/^win/i.test(process.platform)) {
    // eslint-disable-next-line unicorn/prefer-string-raw
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  } else {
    throw new Error("Path to Google Chrome executable must be specified");
  }
}

export async function startBrowser(benchmarkOptions: BenchmarkOptions): Promise<puppeteer.Browser> {
  const width = 1280;
  const height = 800;
  const window_width = width,
    window_height = height;

  const disableFeatures = [
    "Translate", // avoid translation popups
    "PrivacySandboxSettings4", // avoid privacy popup
    "IPH_SidePanelGenericMenuFeature"  // bookmark popup see https://github.com/krausest/js-framework-benchmark/issues/1688
  ];

  const args = [
    `--window-size=${window_width},${window_height}`,
    "--js-flags=--expose-gc",     // needed for gc() function
    "--no-default-browser-check", 
    "--disable-sync",           
    "--no-first-run",     
    "--ash-no-nudges",
    "--disable-extensions",
    `--disable-features=${disableFeatures.join(',')}`
  ];
  if (benchmarkOptions.headless) args.push("--headless=new");

  console.log("browser arguments", args);
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: browserPath(benchmarkOptions),
    args,
    dumpio: false,
    defaultViewport: {
      width,
      height,
    },
  });
  return browser;
}
