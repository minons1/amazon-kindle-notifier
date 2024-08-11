import { BrowserContext } from 'playwright-core'
import { chromium } from 'playwright-extra'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import { TelegramService } from '../Service/Telegram'

type Data = {
  title: string,
  url: string
}

type Result = Data & {
  price?: string | null,
  error?: string
}

export async function startScraper() {
  // init browser
  const browser = await initBrowserContext(process.env.HEADLESS === 'true')

  // load data
  const data = require('../../data/links.json') as Data[]

  const results = [] as Result[]

  for (const item of data) {
    const result = await processItem(browser, item)

    results.push(result)
  }

  const message = await formatMessage(results)

  await TelegramService.get.sendMessage(message)

  console.log('Done, closing browser')
  await browser.close()
}

async function initBrowserContext(headless: boolean) {
  const stealth = stealthPlugin()
  chromium.use(stealth)

  const browser = await chromium.launchPersistentContext('', {
    headless: headless === true ? true : false,
    channel: 'chrome',
    timeout: 20_000,
    args: [
      ...headless ? ['--headless=new'] : []
    ]
  })

  return browser
}

async function processItem(browser: BrowserContext, item: Data): Promise<Result> {
  let result: Result = { ...item }

  const page = browser.pages()[0]

  try {
    await page.goto(item.url, { waitUntil: 'domcontentloaded' })

    if (await page.locator('#captchacharacters').isVisible()) {
      throw new Error('Captcha detected')
    }

    if (!page.locator('#title')) {
      throw new Error('Title locator not found')
    }

    if (!page.locator('#tmm-grid-swatch-KINDLE')) {
      throw new Error('Kindle card locator not found')
    }

    const price = await page.locator('#tmm-grid-swatch-KINDLE').locator('.slot-price > span').textContent({ timeout: 10_000 })
    const title = await page.locator('#title').textContent({ timeout: 10_000 }) || result.title

    result['price'] = price
    result['title'] = title

    console.log(
      item.url, '---\n',
      'Data found --> Price:', price
    )
  } catch (error: any) {
    console.error('Failed when processing item', item.url)

    await TelegramService.get.sendPhoto(await page.screenshot({ fullPage: true }))
    console.log(await page.innerHTML('body'))

    result['error'] = `Error when processing item ${error?.message}`
  }

  return result
}

async function formatMessage(results: Result[]) {
  let formattedMessage = `*Amazon Notifier Bot ${new Date().toString()}*\n\n`

  for (const [index, result] of results.entries()) {
    formattedMessage += `${index + 1}. ${result.title} ==> ${result.error ? result.error : result.price}\n`
  }

  formattedMessage+= `\n\n- natural learner\nest. 2018 @minonz1`

  return formattedMessage
}