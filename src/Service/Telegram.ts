import TelegramBot from 'node-telegram-bot-api'

export class TelegramService {
  private static instance: TelegramService
  private bot: TelegramBot
  private chatId: string

  private constructor() {
    if (!process.env.TELEGRAM_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      throw new Error('TELEGRAM_TOKEN || TELEGRAM_CHAT_ID is not set')
    }

    this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN)
    this.chatId = process.env.TELEGRAM_CHAT_ID
  }

  public static async build() {

    if (!this.instance) {
      this.instance = new TelegramService()
    }

    return this.instance
  }

  static get get() {
    if (!this.instance) {
      throw new Error('TelegramService is not initialized')
    }

    return this.instance
  }

  public async sendMessage(msg: string) {
    try {
      await this.bot.sendMessage(this.chatId, msg, {
        parse_mode: 'Markdown'
      })
    } catch (e) {
      console.error('Error sending message to Telegram', e)
    }
  }

  public async sendPhoto(photo: Buffer) {
    try {
      await this.bot.sendPhoto(this.chatId, photo)
    } catch (e) {
      console.error('Error sending photo to Telegram', e)
    }
  }
}