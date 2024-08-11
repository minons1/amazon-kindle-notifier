import 'dotenv/config'
import { startScraper } from './App/Scraper'
import { TelegramService } from './Service/Telegram'
import { GeminiService } from './Service/Gemini'


(async () => {

  await TelegramService.build()

  await GeminiService.build()

  await startScraper()
})()