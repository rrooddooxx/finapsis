"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { ArrowRight, Send, User, Target, Star, Bot, LogIn, UserPlus, Eye, EyeOff } from "lucide-react"

interface OnboardingData {
  name: string
  goal: string
  experience: string
}

interface Message {
  id: number
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

interface LoginData {
  email: string
  password: string
}

type AppState = "welcome" | "login" | "register" | "chat"

export default function OnboardingFlow() {
  const [appState, setAppState] = useState<AppState>("welcome")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
  })
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    name: "",
    goal: "",
    experience: "",
  })
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "¡Bienvenido! Estoy aquí para ayudarte a comenzar. ¿En qué puedo asistirte?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const slides = [
    {
      id: 0,
      icon: User,
      title: "¿Cuál es tu nombre?",
      subtitle: "Nos encantaría saber cómo llamarte",
      field: "name" as keyof OnboardingData,
      type: "input",
    },
    {
      id: 1,
      icon: Target,
      title: "¿Cuál es tu objetivo principal?",
      subtitle: "Ayúdanos a entender qué buscas lograr",
      field: "goal" as keyof OnboardingData,
      type: "select",
      options: ["Aprender algo nuevo", "Mejorar mis habilidades", "Iniciar un proyecto", "Obtener consejos"],
    },
    {
      id: 2,
      icon: Star,
      title: "¿Cuál es tu nivel de experiencia?",
      subtitle: "Esto nos ayuda a personalizar nuestras respuestas",
      field: "experience" as keyof OnboardingData,
      type: "select",
      options: ["Principiante completo", "Algo de experiencia", "Intermedio", "Avanzado"],
    },
  ]

  const handleInputChange = (value: string) => {
    const currentField = slides[currentSlide].field
    setOnboardingData((prev) => ({
      ...prev,
      [currentField]: value,
    }))
  }

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      setAppState("chat")
      const welcomeMessage: Message = {
        id: messages.length + 1,
        text: `¡Encantado de conocerte, ${onboardingData.name}! Veo que quieres ${onboardingData.goal.toLowerCase()} y tienes un nivel ${onboardingData.experience.toLowerCase()}. ¿Cómo puedo ayudarte hoy?`,
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, welcomeMessage])
    }
  }

  const handleLogin = async () => {
    setIsLoading(true)

    // Simular autenticación
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Validación simple para demo
    if (loginData.email && loginData.password.length >= 6) {
      setAppState("chat")
      const loginWelcomeMessage: Message = {
        id: messages.length + 1,
        text: `¡Bienvenido de vuelta! Me alegra verte otra vez. ¿En qué puedo ayudarte hoy?`,
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages([loginWelcomeMessage])
    }

    setIsLoading(false)
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const userMessage: Message = {
      id: messages.length + 1,
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setNewMessage("")

    setTimeout(() => {
      const botMessage: Message = {
        id: messages.length + 2,
        text: "¡Gracias por tu mensaje! Este es un chatbot de demostración. En una aplicación real, esto se conectaría a un servicio de IA para proporcionar respuestas útiles basadas en tus preferencias de registro.",
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    }, 1000)
  }

  const canProceed = () => {
    const currentField = slides[currentSlide].field
    return onboardingData[currentField].trim() !== ""
  }

  const canLogin = () => {
    return loginData.email.trim() !== "" && loginData.password.length >= 6
  }

  const progressValue = ((currentSlide + 1) / slides.length) * 100

  // Pantalla de bienvenida
  if (appState === "welcome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 lg:p-6">
        <Card className="w-full max-w-md border-border/50 shadow-2xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full mb-4 sm:mb-6">
                <Bot className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">¡Bienvenido!</h1>
              <p className="text-muted-foreground text-base sm:text-lg">Comienza tu experiencia con nosotros</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <Button
                onClick={() => setAppState("login")}
                variant="default"
                size="lg"
                className="w-full min-h-[56px] text-base sm:text-lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Ingresar
              </Button>

              <Button
                onClick={() => setAppState("register")}
                variant="outline"
                size="lg"
                className="w-full min-h-[56px] text-base sm:text-lg"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Registrarse
              </Button>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground mt-6">¿Primera vez aquí? Regístrate para comenzar</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Pantalla de login
  if (appState === "login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 lg:p-6">
        <Card className="w-full max-w-md border-border/50 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full mb-4">
              <LogIn className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Iniciar Sesión</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Ingresa tus credenciales para continuar</p>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@ejemplo.com"
                value={loginData.email}
                onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                className="min-h-[48px] text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={loginData.password}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                  className="min-h-[48px] text-base pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleLogin}
                disabled={!canLogin() || isLoading}
                size="lg"
                className="w-full min-h-[56px] text-base sm:text-lg"
              >
                {isLoading ? "Ingresando..." : "Ingresar"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>

              <Button onClick={() => setAppState("welcome")} variant="ghost" size="sm" className="w-full">
                Volver
              </Button>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              ¿No tienes cuenta?{" "}
              <button onClick={() => setAppState("register")} className="text-primary hover:underline">
                Regístrate aquí
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Chat interface
  if (appState === "chat") {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
        <div className="mx-auto max-w-4xl h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)]">
          <Card className="h-full flex flex-col border-border/50 shadow-2xl">
            <CardHeader className="pb-4 space-y-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold truncate">Asistente de Chat</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {onboardingData.name ? `¡Hola, ${onboardingData.name}!` : "¡Bienvenido de vuelta!"}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  En línea
                </Badge>
              </div>
            </CardHeader>

            <Separator />

            <ScrollArea className="flex-1 p-4 sm:p-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback
                        className={message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}
                      >
                        {message.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${message.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl text-sm sm:text-base ${
                          message.sender === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        <p className="leading-relaxed">{message.text}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 px-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <CardContent className="p-4 sm:p-6">
              <div className="flex gap-2 sm:gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 min-h-[44px] text-base"
                />
                <Button onClick={handleSendMessage} size="icon" className="h-[44px] w-[44px] flex-shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => {
                    setAppState("welcome")
                    setCurrentSlide(0)
                    setOnboardingData({ name: "", goal: "", experience: "" })
                    setLoginData({ email: "", password: "" })
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
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

  // Onboarding flow (registro)
  const currentSlideData = slides[currentSlide]
  const Icon = currentSlideData.icon

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="mx-auto max-w-2xl">
        {/* Progress Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <Badge variant="outline" className="text-xs sm:text-sm">
              Pregunta {currentSlide + 1} de {slides.length}
            </Badge>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="h-2 sm:h-3" />
        </div>

        {/* Main Card */}
        <Card className="border-border/50 shadow-2xl">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            {/* Icon and Title */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full mb-4 sm:mb-6">
                <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3">{currentSlideData.title}</h1>
              <p className="text-muted-foreground text-base sm:text-lg lg:text-xl">{currentSlideData.subtitle}</p>
            </div>

            {/* Input Section */}
            <div className="space-y-4 sm:space-y-6">
              {currentSlideData.type === "input" ? (
                <Input
                  value={onboardingData[currentSlideData.field]}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  className="text-base sm:text-lg p-4 sm:p-6 text-center border-2 focus:border-primary min-h-[56px]"
                  autoFocus
                />
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {currentSlideData.options?.map((option) => (
                    <Button
                      key={option}
                      variant={onboardingData[currentSlideData.field] === option ? "default" : "outline"}
                      className={`w-full p-4 sm:p-6 text-left justify-start text-base sm:text-lg min-h-[56px] sm:min-h-[64px] transition-all duration-200 ${
                        onboardingData[currentSlideData.field] === option
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "hover:bg-muted/50 hover:border-primary/50"
                      }`}
                      onClick={() => handleInputChange(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              )}

              {/* Continue Button */}
              <div className="flex justify-center pt-4 sm:pt-6">
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  size="lg"
                  className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentSlide === slides.length - 1 ? "Comenzar a chatear" : "Continuar"}
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Hint */}
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-xs sm:text-sm text-muted-foreground">Presiona Enter o toca Continuar para proceder</p>
          <Button onClick={() => setAppState("welcome")} variant="ghost" size="sm" className="mt-2 text-xs">
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}
