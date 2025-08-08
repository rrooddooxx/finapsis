import { Bot } from 'grammy'
import './workers/reminder.worker'
import { sendFileToBackend, sendMsg } from './utils';
import { Menu } from '@grammyjs/menu'

const TELEGRAM_TOKEN = Bun.env.TELEGRAM_BOT_TOKEN!
const API_URL = Bun.env.API_URL ?? 'http://localhost:3000'

const bot = new Bot(TELEGRAM_TOKEN)

const userContexts = new Map()

// Create a simple menu.
const menu = new Menu("my-menu-identifier")
  .text("💬 Pedir consejo financiero", (ctx) => ctx.reply("💡 Cuéntame tu objetivo o duda financiera (ahorro, inversión, deudas, presupuesto...) y te daré un consejo personalizado. 🤝")).row()
  .text("⏰ Crear un recordatorio", (ctx) => ctx.reply("⏰ ¿Qué necesitas que te recuerde y cuándo? Por ejemplo: 'pagar tarjeta el 5 de cada mes a las 10:00'"))
  .text("🧾 Registrar un gasto", (ctx) => ctx.reply("🧾 Sube tu recibo/boleta o escribe el monto y la categoría. Ejemplo: 'gasto $12.990 en supermercado'"))
  .text("💰 Registrar un ingreso", (ctx) => ctx.reply("💰 Sube tu comprobante de ingreso o escribe el monto y la fuente. Ejemplo: 'ingreso $10.000 de sueldo'"))
// Make it interactive.
bot.use(menu);

bot.command('start', (ctx) => {
  ctx.reply('👋 ¡Hola! Soy tu asistente financiero personal. Estoy aquí para ayudarte a organizar tu dinero, ahorrar y mantener tus finanzas bajo control.',);
  ctx.reply('📌 Estas son las cosas que puedo hacer por ti:', {
    reply_markup: menu
  });
});

bot.command('menu', (ctx) => {
  ctx.reply('📋 Elige una opción de abajo o escríbeme directamente tu consulta.', {
    reply_markup: menu
  });
});

bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id
  const userMessage = ctx.message.text;

  if (userMessage.startsWith('/')) return;

  try {
    await ctx.replyWithChatAction('typing')

    if(!userContexts.has(userId)){
      userContexts.set(userId, [])
    }

    const context = userContexts.get(userId)

    const fullText = await sendMsg({ message: userMessage, ctx })

    context.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: (typeof fullText === 'string' ? fullText : '') }
    )
  } catch (error) {
    console.error('Error processing message: ', error)

    await ctx.reply('Ups, ocurrió un error al procesar tu mensaje. 🙈 Intenta de nuevo en unos segundos.')
  }
})

bot.on("message:file", async (ctx) => {
  const file = await ctx.getFile()
  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`

  const { message } = await sendFileToBackend({ fileUrl, ctx })

  await ctx.reply(message)
})

bot.catch((err) => {
  console.error('Bot error: ', err)
})

bot.start()