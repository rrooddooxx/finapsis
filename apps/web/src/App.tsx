"use client"

import {useState} from "react"
import type {AppState, LoginData, Message, OnboardingData} from "./types"
import {ChatScreen} from "@/components/screens/chat.screen.tsx";
import {RegisterScreen} from "@/components/screens/register.screen.tsx";
import {LoginScreen} from "@/components/ui/LoginScreen.tsx";
import {WelcomeScreen} from "@/components/screens/welcome.screen.tsx";
import {TermsScreen} from "@/components/screens/terms.screen.tsx";
import {PrivacyScreen} from "@/components/screens/privacy.screen.tsx";

function App() {
    const [appState, setAppState] = useState<AppState>("welcome")
    const [userEmail, setUserEmail] = useState<string>("")
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
            type: "text",
        },
    ])
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (loginData: LoginData) => {
        setIsLoading(true)

        await new Promise((resolve) => setTimeout(resolve, 1500))

        if (loginData.email && loginData.password.length >= 6) {
            setUserEmail(loginData.email)
            setAppState("chat")
            const loginWelcomeMessage: Message = {
                id: messages.length + 1,
                text: `¡Bienvenido de vuelta! Me alegra verte otra vez. ¿En qué puedo ayudarte hoy?`,
                sender: "bot",
                timestamp: new Date(),
                type: "text",
            }
            setMessages([loginWelcomeMessage])
        }

        setIsLoading(false)
    }

    const handleRegisterComplete = (data: OnboardingData) => {
        setOnboardingData(data)
        setAppState("chat")
        const welcomeMessage: Message = {
            id: messages.length + 1,
            text: `¡Encantado de conocerte, ${data.name}! Veo que quieres ${data.goal.toLowerCase()} y tienes un nivel ${data.experience.toLowerCase()}. ¿Cómo puedo ayudarte hoy?`,
            sender: "bot",
            timestamp: new Date(),
            type: "text",
        }
        setMessages((prev) => [...prev, welcomeMessage])
    }

    const handleStateChange = (state: AppState) => {
        setAppState(state)

        if (state === "welcome") {
            setOnboardingData({name: "", goal: "", experience: ""})
            setMessages([
                {
                    id: 1,
                    text: "¡Bienvenido! Estoy aquí para ayudarte a comenzar. ¿En qué puedo asistirte?",
                    sender: "bot",
                    timestamp: new Date(),
                    type: "text",
                },
            ])
        }
    }

    switch (appState) {
        case "welcome":
            return <WelcomeScreen onStateChange={handleStateChange}/>

        case "login":
            return (
                <LoginScreen
                    onStateChange={handleStateChange}
                    onLogin={handleLogin}
                    isLoading={isLoading}
                />
            )

        case "register":
            return (
                <RegisterScreen
                    onStateChange={handleStateChange}
                    onComplete={handleRegisterComplete}
                />
            )

        case "chat":
            return (
                <ChatScreen
                    onStateChange={handleStateChange}
                    onboardingData={onboardingData}
                    userEmail={userEmail}
                />
            )

        case "terms":
            return <TermsScreen onStateChange={handleStateChange}/>

        case "privacy":
            return <PrivacyScreen onStateChange={handleStateChange}/>

        default:
            return <WelcomeScreen onStateChange={handleStateChange}/>
    }
}

export default App
