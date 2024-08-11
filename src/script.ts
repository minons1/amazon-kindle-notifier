import 'dotenv/config'
import axios from 'axios'
import { TelegramService } from './Service/Telegram'
import { GeminiService } from './Service/Gemini'

(async () => {
  await TelegramService.build()
  await GeminiService.build()

  const response = await axios.get('https://images-na.ssl-images-amazon.com/captcha/usvmgloq/Captcha_qyqdhajsar.jpg', {responseType: 'arraybuffer'})

  const imgBuf = response.data

  await TelegramService.get.sendPhoto(Buffer.from(imgBuf), 'image/jpeg')

  await GeminiService.get.solveCaptcha(imgBuf)
})()