import type { Context } from "grammy";

const API_URL = Bun.env.API_URL ?? "http://localhost:3000";

export function formatMessage(
  message: string,
  scheduledFor: string,
  isRecurring: boolean
): string {
  const date = new Date(scheduledFor);
  const timeString = date.toLocaleString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const recurringText = isRecurring
    ? "\n🔄 <i>Recordatorio recurrente</i>"
    : "";

  return `
🔔 <b>¡Recordatorio!</b>

📝 <b>${message}</b>

⏰ <i>Programado para: ${timeString}</i>${recurringText}

<i>¿Ya lo completaste? ✅</i>
  `.trim();
}

export const sendMsg = async ({
  message,
  ctx,
}: {
  message: string;
  ctx: Context;
}) => {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/plain",
    },
    body: JSON.stringify({ message: message }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${errorBody}`);
  }

  const fullText = await res.text();

  if (!fullText || fullText.trim().length === 0) {
    await ctx.reply("Lo siento, no obtuve respuesta de la API.");
  } else {
    // Telegram limita ~4096 caracteres por mensaje; usamos margen de seguridad
    const chunks = chunkString(fullText, 4000);
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  }
};

export function chunkString(input: string, maxLength: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < input.length; index += maxLength) {
    chunks.push(input.slice(index, index + maxLength));
  }
  return chunks;
}

export const sendFileToBackend = async ({
  fileUrl,
  ctx,
}: {
  fileUrl: string;
  ctx: Context;
}) => {
  const res = await fetch(`${API_URL}/api/files/upload-messaging`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": "anonymous@test.com",
    },
    body: JSON.stringify({
      fileUrl: fileUrl,
      chatId: ctx.chat?.id,
      telegramUser: ctx.from?.username,
    }),
  });

  if (!res.ok) {
    console.error("Error uploading file");
    return {
      message:
        "Lo siento, ocurrió un error al subir tu archivo 📎. Por favor, inténtalo nuevamente en unos segundos.",
    };
  }

  return {
    message:
      "✅ ¡Listo! Tu archivo se subió correctamente y comenzaremos el análisis. Te avisaré cuando tenga resultados. 🔍",
  };
};
