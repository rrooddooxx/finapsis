import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, Send, Upload, User } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Card, CardContent, CardHeader } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Separator } from "../ui/separator.tsx";
import { Avatar, AvatarFallback } from "../ui/avatar.tsx";
import type { OnboardingData, ScreenProps, UploadFileResponse } from "@/types";
import { ChatService } from "@/services/chat.service";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import ReactMarkdown from "react-markdown";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";

interface ChatScreenProps extends ScreenProps {
  onboardingData?: OnboardingData;
  userEmail?: string;
}

export function ChatScreen({
  onStateChange,
  onboardingData,
  userEmail,
}: ChatScreenProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);

  const { messages, sendMessage, status, setMessages, append } = useChat({
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_BACKEND_API_URL}/api/chat/ui`,
      headers: {
        "X-User-Email": userEmail || "demo-user",
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  // Handle real-time system messages (file upload confirmations, transaction confirmations)
  const handleRealtimeMessage = useCallback((realtimeMessage: any) => {
    console.log('🎯 ChatScreen received real-time message:', realtimeMessage);
    console.log('🎯 Current messages before adding:', messages.length);
    console.log('🎯 Message structure:', {
      id: realtimeMessage.id,
      role: realtimeMessage.role,
      content: realtimeMessage.content,
      createdAt: realtimeMessage.createdAt
    });
    
    // Ensure the message has the correct structure for @ai-sdk/react with parts
    const formattedMessage = {
      id: realtimeMessage.id,
      role: realtimeMessage.role as 'assistant',
      content: realtimeMessage.content,
      createdAt: realtimeMessage.createdAt || new Date(),
      // Add parts structure that the rendering expects
      parts: [
        {
          type: 'text' as const,
          text: realtimeMessage.content,
        }
      ]
    };
    
    // Check if message already exists to prevent duplicates
    const exists = messages.some(msg => msg.id === formattedMessage.id);
    if (exists) {
      console.log('⚠️ Message already exists, skipping:', formattedMessage.id);
      return;
    }
    
    // Use append method from useChat to add the message properly
    console.log('🚀 Using append to add message:', formattedMessage);
    append({
      role: 'assistant',
      content: realtimeMessage.content,
      id: realtimeMessage.id,
    });
    
    // Auto-scroll to show the new system message
    setTimeout(() => scrollToBottom(), 200);
  }, []); // Remove setMessages dependency to prevent issues

  // Set up real-time chat connection
  const { isConnected } = useRealtimeChat({
    userEmail,
    onMessage: handleRealtimeMessage,
    enabled: !!userEmail,
  });

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "ready") return;

    if (selectedFile) {
      setIsUploading(true);
      setUploadInfo("Subiendo archivo...");
      try {
        const result: UploadFileResponse = await ChatService.uploadFile({
          file: selectedFile,
          userEmail: userEmail || "demo-user",
        });
        if (result.success) {
          setUploadInfo("Archivo subido correctamente");
          setSelectedFile(null);
          setInput("");
        } else {
          setUploadInfo(result.error || "Error al subir archivo");
        }
      } catch (error) {
        setUploadInfo("Error inesperado al subir archivo");
        console.error(error);
      } finally {
        setIsUploading(false);
        const inputEl = document.getElementById(
          "file-upload-input"
        ) as HTMLInputElement | null;
        if (inputEl) inputEl.value = "";
      }
      return;
    }

    if (!input.trim()) return;
    const currentMessage = input;
    setInput("");
    await sendMessage({ text: currentMessage });
  };

  const handleReset = () => {
    onStateChange("welcome");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadInfo(null);
    if (file) {
      const sizeKb = Math.ceil(file.size / 1024);
      setInput(`Archivo: ${file.name} (${sizeKb} KB)`);
    } else {
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="mx-auto max-w-4xl h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)]">
        <Card className="h-full flex flex-col shadow-xl border-border/50 backdrop-blur-sm">
          <CardHeader className="pb-4 space-y-0 bg-card/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shadow-md">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold truncate text-foreground">
                  Asistente de Chat
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {onboardingData?.name
                    ? `¡Hola, ${onboardingData.name}!`
                    : "¡Bienvenido de vuelta!"}
                </p>
              </div>
              <Badge
                variant={isConnected ? "default" : "secondary"}
                className={`text-xs ${isConnected ? "bg-green-500 text-white" : "bg-secondary text-secondary-foreground"}`}
              >
                {isConnected ? "🔔 Tiempo Real" : "💬 Chat"}
              </Badge>
            </div>
          </CardHeader>

          <Separator className="bg-border" />

          <ScrollArea className="flex-1 p-4 sm:p-6">
            <div className="space-y-4">
              {messages.map((message) => {
                if (
                  message.role === "assistant" &&
                  (!message.parts ||
                    message.parts.length === 0 ||
                    !message.parts.some(
                      (part) =>
                        part.type === "text" &&
                        part.text &&
                        part.text.trim().length > 0
                    ))
                ) {
                  return null;
                }

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm">
                      <AvatarFallback
                        className={
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                        message.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl text-sm sm:text-base shadow-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-muted-foreground rounded-bl-md"
                        }`}
                      >
                        <div className="leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:m-0 prose-p:leading-relaxed">
                          {message.parts?.map((part, index) =>
                            part.type === "text" ? (
                              <ReactMarkdown
                                key={index}
                                components={{
                                  // Customize blockquote styling for citations
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-primary/30 bg-muted/30 pl-4 py-2 my-3 italic rounded-r-lg">
                                      {children}
                                    </blockquote>
                                  ),
                                  // Style strong text (bold)
                                  strong: ({ children }) => (
                                    <strong className="font-bold text-primary">
                                      {children}
                                    </strong>
                                  ),
                                  // Style em text (italic)
                                  em: ({ children }) => (
                                    <em className="italic text-muted-foreground">
                                      {children}
                                    </em>
                                  ),
                                  // Style paragraphs
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0">{children}</p>
                                  ),
                                  // Style lists
                                  ul: ({ children }) => (
                                    <ul className="list-disc list-inside mb-2 space-y-1">
                                      {children}
                                    </ul>
                                  ),
                                  // Style horizontal rules
                                  hr: () => (
                                    <hr className="border-border my-4" />
                                  ),
                                }}
                              >
                                {part.text}
                              </ReactMarkdown>
                            ) : null
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-muted-foreground mt-1 px-1">
                        {new Date(Date.now()).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {(status === "submitted" ||
                (status === "streaming" &&
                  messages.length > 0 &&
                  messages[messages.length - 1]?.role === "assistant" &&
                  !messages[messages.length - 1]?.parts?.some(
                    (part) =>
                      part.type === "text" &&
                      part.text &&
                      part.text.trim().length > 0
                  ))) && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center space-x-1 px-4 py-3 bg-muted rounded-2xl rounded-bl-md">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <Separator className="bg-border" />

          <CardContent className="p-4 sm:p-6 bg-card/50">
            <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                disabled={status !== "ready" || !!selectedFile}
                className="flex-1 min-h-[44px] text-base bg-background border-input focus:border-ring focus:ring-ring"
              />
              <div className="flex items-center gap-2">
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-[44px] w-[44px] flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200"
                  onClick={() =>
                    document.getElementById("file-upload-input")?.click()
                  }
                  disabled={isUploading}
                  variant="outline"
                  title={isUploading ? "Subiendo..." : "Seleccionar archivo"}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="submit"
                disabled={
                  status !== "ready" || (!selectedFile && !input.trim())
                }
                size="icon"
                className="h-[44px] w-[44px] flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {uploadInfo && (
              <div className="mt-2 text-xs text-muted-foreground">
                {uploadInfo}
              </div>
            )}
            {uploadInfo && (
              <div className="mt-2 text-xs text-muted-foreground">
                {uploadInfo}
              </div>
            )}
            <div className="flex justify-center mt-4">
              <Button
                onClick={handleReset}
                variant="ghost"
                size="sm"
                className="text-xs hover:bg-accent hover:text-accent-foreground"
              >
                Cerrar sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
