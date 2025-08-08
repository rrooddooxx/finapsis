import { Bot } from 'grammy'
import './workers/reminder.worker'

const bot = new Bot(Bun.env.TELEGRAM_BOT_TOKEN!)

const userContexts = new Map()

const API_URL = Bun.env.API_URL ?? 'http://localhost:3000'

function chunkString(input: string, maxLength: number): string[] {
  const chunks: string[] = []
  for (let index = 0; index < input.length; index += maxLength) {
    chunks.push(input.slice(index, index + maxLength))
  }
  return chunks
}

bot.command('start', (ctx) => {
  ctx.reply('Hello! 👋 I\'m an AI assistant. Send me any message and I\'ll respond with helpful information!');
});

bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id
  const chatId = ctx.chat.id
  const userMessage = ctx.message.text;

  if (userMessage.startsWith('/')) return;

  try {
    await ctx.replyWithChatAction('typing')

    if(!userContexts.has(userId)){
      userContexts.set(userId, [])
    }

    const context = userContexts.get(userId)

    // Llamada a la API que retorna stream; acumulamos todo el texto antes de responder
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
      },
      body: JSON.stringify({ message: userMessage }),
    })

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      throw new Error(`API error ${res.status}: ${errorBody}`)
    }

    const fullText = await res.text()

    if (!fullText || fullText.trim().length === 0) {
      await ctx.reply('Lo siento, no obtuve respuesta de la API.')
    } else {
      // Telegram limita ~4096 caracteres por mensaje; usamos margen de seguridad
      const chunks = chunkString(fullText, 4000)
      for (const chunk of chunks) {
        await ctx.reply(chunk)
      }
    }

    context.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: (typeof fullText === 'string' ? fullText : '') }
    )
  } catch (error) {
    console.error('Error processing message: ', error)

    await ctx.reply('Sorry, ocurrió un error')
  }
})

bot.catch((err) => {
  console.error('Bot error: ', err)
})

bot.start()