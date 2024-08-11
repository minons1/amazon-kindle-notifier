import { chromium } from 'playwright-extra'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'

export async function startScraper() {
  // init browser
  const stealth = stealthPlugin()
  chromium.use(stealth)

  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chrome',
    timeout: 30000
  })

  // load data
  const data = require('../../data/links.json') as { title: string, url: string }[]

  for (const item of data) {
    try {
      const page = browser.pages()[0]
      await page.goto(item.url, { waitUntil: 'domcontentloaded' })

      if (!page.locator('#title')) {
        console.log('Title locator not found')
        continue
      }

      if (!page.locator('#tmm-grid-swatch-KINDLE')) {
        console.log('Kindle card locator not found')
        continue
      }
  
      console.log(
        item.url, '---\n',
        'Data found:', await page.locator('#title').textContent(), '\n',
        'Price:', await page.locator('#tmm-grid-swatch-KINDLE').locator('.slot-price > span').textContent()
      )
    } catch (error) {

      console.log('Failed when opening', item.title)
    }
    
  }

  console.log('Done, closing browser')
  await browser.close()
}