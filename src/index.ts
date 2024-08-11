import 'dotenv/config'
import { startScraper } from './App/Scraper'


(async () => {

  await startScraper()
})()