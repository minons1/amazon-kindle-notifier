import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai'

export class GeminiService {
  private static instance: GeminiService

  private genAI: GoogleGenerativeAI
  private model: GenerativeModel
  private modelName = 'gemini-1.5-flash'

  private constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    this.model = this.genAI.getGenerativeModel({ model: this.modelName })
  }

  public static async build() {
    if (!this.instance) {
      this.instance = new GeminiService()
    }

    return this.instance
  }

  static get get() {
    if (!this.instance) {
      throw new Error('GeminiService is not initialized')
    }

    return this.instance
  }

  public async solveCaptcha(image: Buffer) {
    const result = await this.model.generateContent([
      {
        inlineData: {
          data: image.toString('base64'),
          mimeType: 'image/jpeg'
        }
      },
      {
        text: 'Give me the letters written in the image, do not add any explanations. just the letters in the image'
      }
    ])

    const textResult = result.response.text()

    console.log('Gemini result: ', result.response.text())

    // clean text result
    return textResult.replace(/[^A-Z]/g, '')
  }

}