import {useEffect, useRef, useState} from "react"
import {Bot, Send, User} from "lucide-react"
import {Button} from "../ui/button.tsx"
import {Input} from "../ui/input.tsx"
import {Card, CardContent, CardHeader} from "../ui/card.tsx"
import {Badge} from "../ui/badge.tsx"
import {ScrollArea} from "../ui/scroll-area.tsx"
import {Separator} from "../ui/separator.tsx"
import {Avatar, AvatarFallback} from "../ui/avatar.tsx"
import type {ChatMessageRequest, Message, OnboardingData, ScreenProps} from "@/types"
import {ChatService} from "@/services/chat.service.ts"

interface ChatScreenProps extends ScreenProps {
    onboardingData?: OnboardingData
    initialMessages?: Message[]
}

export function ChatScreen({onStateChange, onboardingData, initialMessages = []}: ChatScreenProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [newMessage, setNewMessage] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto scroll to bottom when messages change
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end"
            })
        }
    }

    // Scroll to bottom when messages update
    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return

        const userMessage: Message = {
            id: messages.length + 1,
            text: newMessage,
            sender: "user",
            timestamp: new Date(),
            type: "text",
        }

        setMessages((prev) => [...prev, userMessage])
        const currentMessage = newMessage
        setNewMessage("")
        setIsLoading(true)

        try {
            // Create the request object
            const messageRequest: ChatMessageRequest = {
                message: currentMessage
            }

            // Send message to backend and get streaming response
            const stream = await ChatService.sendMessage(messageRequest)
            const reader = stream.getReader()
            const decoder = new TextDecoder()

            // Create initial bot message
            const botMessage: Message = {
                id: messages.length + 2,
                text: "",
                sender: "bot",
                timestamp: new Date(),
                type: "text",
            }

            setMessages((prev) => [...prev, botMessage])
            setIsLoading(false)

            // Read streaming response
            let accumulated = ""
            while (true) {
                const {done, value} = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, {stream: true})
                accumulated += chunk

                // Update the bot message with accumulated text
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === botMessage.id
                            ? {...msg, text: accumulated}
                            : msg
                    )
                )
            }
        } catch (error) {
            console.error("Error sending message:", error)

            // Show error message
            const errorMessage: Message = {
                id: messages.length + 2,
                text: "Lo siento, hubo un error al enviar tu mensaje. Por favor, inténtalo de nuevo.",
                sender: "bot",
                timestamp: new Date(),
                type: "text",
            }

            setMessages((prev) => [...prev, errorMessage])
            setIsLoading(false)
        }
    }

    const handleReset = () => {
        onStateChange("welcome")
    }

    return (
        <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
            <div
                className="mx-auto max-w-4xl h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)]">
                <Card className="h-full flex flex-col shadow-xl border-border/50 backdrop-blur-sm">
                    <CardHeader className="pb-4 space-y-0 bg-card/50">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shadow-md">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                    <Bot className="h-4 w-4 sm:h-5 sm:w-5"/>
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg sm:text-xl font-semibold truncate text-foreground">
                                    Asistente de Chat
                                </h2>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                    {onboardingData?.name ? `¡Hola, ${onboardingData.name}!` : "¡Bienvenido de vuelta!"}
                                </p>
                            </div>
                            <Badge variant="secondary"
                                   className="text-xs bg-secondary text-secondary-foreground">
                                En línea
                            </Badge>
                        </div>
                    </CardHeader>

                    <Separator className="bg-border"/>

                    <ScrollArea className="flex-1 p-4 sm:p-6">
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div key={message.id}
                                     className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
                                    <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm">
                                        <AvatarFallback
                                            className={
                                                message.sender === "user"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                            }
                                        >
                                            {message.sender === "user" ?
                                                <User className="h-4 w-4"/> :
                                                <Bot className="h-4 w-4"/>}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div
                                        className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${message.sender === "user" ? "items-end" : "items-start"}`}>
                                        {/* Text content */}
                                        {message.text && (
                                            <div
                                                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl text-sm sm:text-base shadow-sm ${
                                                    message.sender === "user"
                                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                                        : "bg-muted text-muted-foreground rounded-bl-md"
                                                }`}
                                            >
                                                <p className="leading-relaxed">{message.text}</p>
                                            </div>
                                        )}

                                        {/* Component content */}
                                        {message.component && (
                                            <div
                                                className={`mt-2 ${message.text ? "mt-2" : ""} w-full max-w-none`}>
                                                {message.component}
                                            </div>
                                        )}

                                        <span className="text-xs text-muted-foreground mt-1 px-1">
                      {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                      })}
                    </span>
                                    </div>
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm">
                                        <AvatarFallback className="bg-muted text-muted-foreground">
                                            <Bot className="h-4 w-4"/>
                                        </AvatarFallback>
                                    </Avatar>
                                    <div
                                        className="flex items-center space-x-1 px-4 py-3 bg-muted rounded-2xl rounded-bl-md">
                                        <div
                                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div
                                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div
                                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}

                            {/* Scroll anchor - invisible element to scroll to */}
                            <div ref={messagesEndRef}/>
                        </div>
                    </ScrollArea>

                    <Separator className="bg-border"/>

                    <CardContent className="p-4 sm:p-6 bg-card/50">
                        <div className="flex gap-2 sm:gap-3">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Escribe tu mensaje..."
                                onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
                                disabled={isLoading}
                                className="flex-1 min-h-[44px] text-base bg-background border-input focus:border-ring focus:ring-ring"
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={isLoading || !newMessage.trim()}
                                size="icon"
                                className="h-[44px] w-[44px] flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                <Send className="h-4 w-4"/>
                            </Button>
                        </div>
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
    )
}