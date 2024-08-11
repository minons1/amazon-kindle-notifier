import 'dotenv/config'
import { startScraper } from './App/Scraper'
import { TelegramService } from './Service/Telegram'


(async () => {

  await TelegramService.build()

  await startScraper()
})()