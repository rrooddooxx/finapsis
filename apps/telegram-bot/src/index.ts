import { Bot } from 'grammy'

const bot = new Bot(Bun.env.TELEGRAM_BOT_TOKEN!)

const userContexts = new Map()

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

    const messages = [
      { role: 'system', content: '' },
      ...context,
      { role: 'user', content: userMessage}
    ]

    const response = {
      text: 'Hola, como estas?',
      content: 'Hola, como estas?'
    }

    console.log(response.text)
    console.log(response.content)

    await ctx.reply(response.text)

    context.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: response.text }
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