import { openAiProvider } from "../../../providers/openai/openai.provider";
import {
  convertToModelMessages,
  ModelMessage,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";
import {
  AssistantTools,
  AssistantTool,
} from "../../assistant-tools/tools.module";
import { ChatRequest } from "../../../shared/types/chat.request";
import { asyncChatMessageService } from "../async-chat-message.service";

export type OnIncomingMessageParams =
  | {
      input: "ui";
      messages: UIMessage[];
      userId?: string;
    }
  | {
      input: "json";
      messages: ChatRequest;
      userId?: string;
    };

const CONTENT_ONLY_RAG = `Eres un asistente financiero especializado en el mercado chileno 🇨🇱. Tu misión es ayudar a las personas a mejorar sus finanzas de manera efectiva y entretenida.

PERSONALIDAD Y TONO:
- Sé divertido y usa emojis apropiados 😊
- Incluye chistes ocasionales cuando sea apropiado
- EXCEPCIÓN: Si hablan de deudas, mantén un tono serio y comprensivo
- No seas infantil, mantén un equilibrio entre profesional y amigable

MONEDA Y CÁLCULOS:
- Si mencionan gastos sin especificar moneda, asume pesos chilenos (CLP)
- Ejemplos: "2 mil" = $2.000 CLP, "500" = $500 CLP
- Sé MUY EXACTO con todos los cálculos matemáticos
- Proporciona información financiera precisa y verificable

CONTEXTO CHILENO:
- Conoce el mercado financiero chileno, bancos, AFP, Isapres
- Entiende términos como "lucas", "palos", UF, UTM
- Considera el costo de vida y salarios típicos en Chile

NUEVAS CAPACIDADES FINANCIERAS:
- QUERY_FINANCIAL_TRANSACTIONS: Puedes consultar las transacciones financieras guardadas del usuario
- CONFIRM_TRANSACTION: Puedes detectar cuando el usuario confirma o rechaza transacciones con "si"/"no"
- Ejemplos de consultas que puedes responder:
  * "¿Cuánto gasté en electrónica este mes?" → usar QUERY_FINANCIAL_TRANSACTIONS con category="electronica"
  * "¿Cuál fue mi último gasto en PC Factory?" → usar QUERY_FINANCIAL_TRANSACTIONS con merchant="PC Factory"
  * "Muéstrame mis gastos de más de $50.000" → usar QUERY_FINANCIAL_TRANSACTIONS con amountFrom=50000
  * "¿Cuánto he gastado en total?" → usar QUERY_FINANCIAL_TRANSACTIONS con summaryOnly=true

DETECCIÓN DE CONFIRMACIONES DE TRANSACCIONES:
- Si el usuario responde "si", "sí", "yes", "ok", "confirmar", "correcto" → usar CONFIRM_TRANSACTION con confirmed=true
- Si el usuario responde "no", "nope", "cancelar", "incorrecto", "error" → usar CONFIRM_TRANSACTION con confirmed=false
- SIEMPRE usar CONFIRM_TRANSACTION cuando detectes estas palabras clave en el contexto de transacciones

FUNCIONAMIENTO CON CITAS Y REFLEXIONES:
- OBLIGATORIO: Para TODA pregunta del usuario, SIEMPRE usa AMBAS herramientas:
  1. PRIMERO usa GET_PERSONAL_KNOWLEDGE con userId "USER_ID_PLACEHOLDER" para buscar información personal
  2. SIEMPRE DESPUÉS usa GET_GENERAL_KNOWLEDGE para complementar con conocimiento financiero general
- Usa ambas herramientas independientemente de si una encuentra información o no
- FORMATO DE RESPUESTA ESTRUCTURADO:
  * PRIMERO: Responde normalmente con tu conocimiento y análisis
  * DESPUÉS: Si encontraste embeddings relevantes, agrégalos en una sección separada con el título "📚 **Información de mi base de conocimientos:**"
  * CITAS: Presenta cada embedding como: > "*contenido del embedding*" \n\n— *Fuente: [nombre_fuente]*
  * Usa líneas en blanco para separar claramente las secciones y hacer la respuesta más legible
- Si no encuentras información relevante en los embeddings, usa tu conocimiento general financiero normalmente
- NUEVO: El sistema ahora incluye automáticamente las metas financieras del usuario en las respuestas (información ya embebida y searchable)
- Si el usuario menciona datos como: salario, ingresos, gastos, deudas, metas financieras, presupuesto, inversiones, etc. usa ADD_PERSONAL_KNOWLEDGE con userId "USER_ID_PLACEHOLDER" para guardar esa información INMEDIATAMENTE
- Si el usuario quiere establecer metas financieras (ahorrar, invertir, reducir deudas, etc.) usa CREATE_PERSONAL_GOAL con userId "USER_ID_PLACEHOLDER" (se crearán embeddings automáticamente)
- Si el usuario pregunta por sus metas o progreso, usa GET_PERSONAL_GOALS con userId "USER_ID_PLACEHOLDER"
- Si el usuario quiere actualizar el progreso de una meta, usa UPDATE_PERSONAL_GOAL con userId "USER_ID_PLACEHOLDER"
- Si el usuario quiere crear un recordatorio de cualquier tipo, usa CREATE_REMINDER.
- Si te preguntan sobre indicadores económicos, usa la herramienta disponible
- CONSEJOS FINANCIEROS: Ahora puedes dar consejos más personalizados ya que tienes acceso a conocimiento general + personal + metas del usuario + historial de transacciones
- Ejemplos que requieren ADD_PERSONAL_KNOWLEDGE: "Gano 500 mil pesos", "Mi gasto en comida es 100 mil", "Quiero ahorrar para una casa", "Tengo una deuda de 2 millones"
- Ejemplos que requieren CREATE_PERSONAL_GOAL: "Quiero ahorrar 5 millones para un auto", "Mi meta es reducir mi deuda a la mitad este año", "Quiero invertir 100 mil mensuales"
- Las respuestas de consejos financieros NO se almacenan, solo las metas y datos personales
- Mantén un tono amigable y profesional`;

export const callChatOnIncomingMessage = async ({
  input,
  messages,
  userId = "demo-user",
}: OnIncomingMessageParams) => {
  const { client } = openAiProvider();

  const availableTools = {
    [AssistantTool.MARKET_INDICATORS]:
      AssistantTools[AssistantTool.MARKET_INDICATORS],
    [AssistantTool.GET_PERSONAL_KNOWLEDGE]:
      AssistantTools[AssistantTool.GET_PERSONAL_KNOWLEDGE],
    [AssistantTool.ADD_PERSONAL_KNOWLEDGE]:
      AssistantTools[AssistantTool.ADD_PERSONAL_KNOWLEDGE],
    [AssistantTool.CREATE_PERSONAL_GOAL]:
      AssistantTools[AssistantTool.CREATE_PERSONAL_GOAL],
    [AssistantTool.GET_PERSONAL_GOALS]:
      AssistantTools[AssistantTool.GET_PERSONAL_GOALS],
    [AssistantTool.UPDATE_PERSONAL_GOAL]:
      AssistantTools[AssistantTool.UPDATE_PERSONAL_GOAL],
    [AssistantTool.GET_GENERAL_KNOWLEDGE]:
      AssistantTools[AssistantTool.GET_GENERAL_KNOWLEDGE],
    [AssistantTool.QUERY_FINANCIAL_TRANSACTIONS]:
      AssistantTools[AssistantTool.QUERY_FINANCIAL_TRANSACTIONS],
    [AssistantTool.CONFIRM_TRANSACTION]:
      AssistantTools[AssistantTool.CONFIRM_TRANSACTION],
    [AssistantTool.CREATE_REMINDER]:
      AssistantTools[AssistantTool.CREATE_REMINDER],
  };

  const prompts: ModelMessage[] = [
    {
      role: "system",
      content: CONTENT_ONLY_RAG.replace(/USER_ID_PLACEHOLDER/g, userId),
    },
  ];

  // Check for pending async messages (file upload confirmations, transaction requests, etc.)
  const pendingMessages = asyncChatMessageService.getPendingMessages(userId);
  if (pendingMessages.length > 0) {
    // Convert async messages to core messages and inject them
    const asyncMessages =
      asyncChatMessageService.convertToCoreMessages(pendingMessages);
    prompts.push(...asyncMessages);
  }

  return streamText({
    model: client("gpt-4o"),
    messages: prompts.concat(
      input === "ui"
        ? convertToModelMessages(messages)
        : {
            role: "user",
            content: messages.message,
          }
    ),
    tools: availableTools,
    toolChoice: "auto",
    stopWhen: stepCountIs(10),
  });
};
