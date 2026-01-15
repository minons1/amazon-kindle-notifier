import { BrowserContext, Page } from 'playwright-core'
import { chromium } from 'playwright-extra'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import { TelegramService } from '../Service/Telegram'
import axios from 'axios'
import { GeminiService } from '../Service/Gemini'

type Data = {
  title: string,
  url: string
}

type Result = Data & {
  price?: string | null,
  error?: string
}

export async function startScraper() {
  console.log('=== Amazon Kindle Notifier Started ===')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log(`Headless mode: ${process.env.HEADLESS === 'true'}`)

  // init browser
  console.log('Initializing browser context...')
  const browser = await initBrowserContext(process.env.HEADLESS === 'true')
  console.log('Browser initialized successfully')

  // load data
  const data = require('../../data/links.json') as Data[]
  console.log(`Loaded ${data.length} books to monitor`)

  const results = [] as Result[]

  for (const [index, item] of data.entries()) {
    console.log(`\n[${index + 1}/${data.length}] Processing: ${item.title}`)
    const result = await processItem(browser, item)

    results.push(result)
    console.log(`[${index + 1}/${data.length}] Completed: ${result.error ? 'FAILED' : 'SUCCESS'}`)
  }

  console.log('\n=== Scraping Complete ===')
  console.log(`Total books processed: ${results.length}`)
  console.log(`Successful: ${results.filter(r => !r.error).length}`)
  console.log(`Failed: ${results.filter(r => r.error).length}`)

  console.log('\nFormatting and sending Telegram message...')
  const message = await formatMessage(results)

  await TelegramService.get.sendMessage(message)
  console.log('Telegram message sent successfully')

  console.log('\nDone, closing browser')
  await browser.close()
  console.log('=== Amazon Kindle Notifier Finished ===')
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
    console.log(`  → Navigating to URL: ${item.url}`)
    await page.goto(item.url, { waitUntil: 'domcontentloaded' })
    console.log('  → Page loaded successfully')

    if (await page.locator('#captchacharacters').isVisible()) {
      console.log('  ⚠️  Captcha detected, attempting to solve...')

      await trySolveCaptcha(page)
      console.log('  ✓ Captcha solved successfully')
    }

    // Check for "Continue shopping" button on challenge/validation pages
    if (await page.getByText('Continue shopping').isVisible()) {
      console.log('  ⚠️  Challenge page detected, clicking "Continue shopping" button...')
      await handleContinueShopping(page)
      console.log('  ✓ Challenge page handled successfully')
    }

    if (!page.locator('#title')) {
      throw new Error('Title locator not found')
    }

    if (!page.locator('#tmm-grid-swatch-KINDLE')) {
      throw new Error('Kindle card locator not found')
    }

    console.log('  → Extracting price and title...')
    const price = await page.locator('#tmm-grid-swatch-KINDLE').locator('.slot-price > span').textContent({ timeout: 10_000 })
    const title = await page.locator('#title').textContent({ timeout: 10_000 }) || result.title

    result['price'] = price
    result['title'] = title

    console.log(`  ✓ Data extracted --> Title: ${title}, Price: ${price}`)
  } catch (error: any) {
    console.error(`  ✗ Failed when processing item: ${item.url}`)
    console.error(`  ✗ Error: ${error?.message || '[no error message]'}`)

    console.log('  → Sending screenshot to Telegram...')
    await TelegramService.get.sendPhoto(await page.screenshot({ fullPage: true }), 'image/jpeg')
    console.log(await page.innerHTML('body'))

    result['error'] = `Error when processing item ${error?.message || '[no error message]'}`
  }

  return result
}

async function formatMessage(results: Result[]) {
  let formattedMessage = `*Amazon Notifier Bot ${new Date().toString()}*\n\n`

  for (const [index, result] of results.entries()) {
    formattedMessage += `${index + 1}. ${result.title} ==> ${result.error ? result.error.replace(/\n/, ' ') : result.price}\n${result.url}\n`
  }

  formattedMessage += `\n\n- natural learner\nest. 2018 @minonz1`

  return formattedMessage
}

async function trySolveCaptcha(page: Page) {
  try {
    const imageUrl = await page.locator('form').locator('img').getAttribute('src', { timeout: 10_000 })
    console.log(imageUrl)

    if (!imageUrl) {
      throw new Error('Captcha Image url not found')
    }

    const image = await axios.get(imageUrl, { responseType: 'arraybuffer' })

    const imageBuffer = Buffer.from(image.data)

    // await TelegramService.get.sendPhoto(imageBuffer, 'image/jpeg')

    const captchaPossibleSolution = await GeminiService.get.solveCaptcha(imageBuffer)

    if (!captchaPossibleSolution) {
      throw new Error('Gemini repsonse is empty')
    }

    console.log('Pressing captcha input element')
    await page.locator('#captchacharacters').click()
    await page.waitForTimeout(500)

    console.log('inserting captcha input')
    await page.locator('#captchacharacters').pressSequentially(captchaPossibleSolution, { delay: 150 })
    await page.waitForTimeout(1000)

    console.log('Clicking Continue shopping button')
    await page.getByText('Continue shopping').click()

    await page.waitForLoadState('domcontentloaded')

  } catch (error: any) {
    console.error('Failed when solving captcha', error?.message)

    throw new Error('Failed when solving captcha')
  }
}

async function handleContinueShopping(page: Page) {
  try {
    console.log('  → Clicking "Continue shopping" button...')
    await page.getByText('Continue shopping').click({ timeout: 5_000 })

    console.log('  → Waiting for page to load...')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Additional wait for dynamic content

  } catch (error: any) {
    console.error('  ✗ Failed when handling challenge page:', error?.message)
    throw new Error(`Failed to handle challenge page: ${error?.message}`)
  }
}