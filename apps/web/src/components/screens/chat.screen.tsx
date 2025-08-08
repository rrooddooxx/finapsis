import {useEffect, useRef, useState} from "react"
import {Bot, Send, User} from "lucide-react"
import {Button} from "../ui/button.tsx"
import {Input} from "../ui/input.tsx"
import {Card, CardContent, CardHeader} from "../ui/card.tsx"
import {Badge} from "../ui/badge.tsx"
import {ScrollArea} from "../ui/scroll-area.tsx"
import {Separator} from "../ui/separator.tsx"
import {Avatar, AvatarFallback} from "../ui/avatar.tsx"
import type {OnboardingData, ScreenProps} from "@/types"
import {useChat} from "@ai-sdk/react"
import {DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls} from "ai"

interface ChatScreenProps extends ScreenProps {
    onboardingData?: OnboardingData
    userEmail?: string
}

export function ChatScreen({onStateChange, onboardingData, userEmail}: ChatScreenProps) {
    const [input, setInput] = useState("")
    const messagesEndRef = useRef<HTMLDivElement>(null)


    const {messages, sendMessage, status} = useChat({
        transport: new DefaultChatTransport({
            api: `${import.meta.env.VITE_BACKEND_API_URL}/api/chat/ui`,
            headers: {
                'X-User-Email': userEmail || 'demo-user'
            }
        }),
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls
    })


    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end"
            })
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, status])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || status !== 'ready') return

        const currentMessage = input
        setInput("")

        await sendMessage({text: currentMessage})
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
                            {messages.map((message) => {
                                if (message.role === "assistant" &&
                                    (!message.parts || message.parts.length === 0 ||
                                        !message.parts.some(part => part.type === 'text' && part.text && part.text.trim().length > 0))) {
                                    return null
                                }

                                return (
                                    <div key={message.id}
                                         className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                                        <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm">
                                            <AvatarFallback
                                                className={
                                                    message.role === "user"
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-muted-foreground"
                                                }
                                            >
                                                {message.role === "user" ?
                                                    <User className="h-4 w-4"/> :
                                                    <Bot className="h-4 w-4"/>}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div
                                            className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                                            <div
                                                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl text-sm sm:text-base shadow-sm ${
                                                    message.role === "user"
                                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                                        : "bg-muted text-muted-foreground rounded-bl-md"
                                                }`}
                                            >
                                                <p className="leading-relaxed">
                                                    {message.parts?.map((part, index) =>
                                                        part.type === 'text' ? <span
                                                            key={index}>{part.text}</span> : null
                                                    )}
                                                </p>
                                            </div>

                                            <span
                                                className="text-xs text-muted-foreground mt-1 px-1">
                                                {new Date(Date.now()).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}

                            {(status === 'submitted' || (status === 'streaming' &&
                                messages.length > 0 &&
                                messages[messages.length - 1]?.role === 'assistant' &&
                                !messages[messages.length - 1]?.parts?.some(part =>
                                    part.type === 'text' && part.text && part.text.trim().length > 0
                                ))) && (
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
                            <div ref={messagesEndRef}/>
                        </div>
                    </ScrollArea>

                    <Separator className="bg-border"/>

                    <CardContent className="p-4 sm:p-6 bg-card/50">
                        <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe tu mensaje..."
                                disabled={status !== 'ready'}
                                className="flex-1 min-h-[44px] text-base bg-background border-input focus:border-ring focus:ring-ring"
                            />
                            <Button
                                type="submit"
                                disabled={status !== 'ready' || !input.trim()}
                                size="icon"
                                className="h-[44px] w-[44px] flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                <Send className="h-4 w-4"/>
                            </Button>
                        </form>
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