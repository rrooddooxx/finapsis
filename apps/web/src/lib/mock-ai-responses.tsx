import type React from "react"
import {Chart, MetricCard} from "../components/ui/chart"
import {TaskList} from "../components/ui/task-list"
import {LearningPath} from "../components/screens/learning-path.tsx"
import {Card, CardContent, CardHeader, CardTitle} from "../components/ui/card"
import {Badge} from "../components/ui/badge"
import {BookOpen, Calendar, Clock, Target, TrendingUp, Users} from "lucide-react"

export interface AIResponse {
    id: string
    text?: string
    component?: React.ReactNode
    type: "text" | "component" | "mixed"
}

// Mock AI responses with generative UI components
export const mockAIResponses: Record<string, AIResponse[]> = {
    // Respuestas para objetivos de aprendizaje
    aprender: [
        {
            id: "learning-1",
            type: "mixed",
            text: "¡Perfecto! He creado un plan de aprendizaje personalizado para ti. Aquí tienes una ruta de aprendizaje estructurada:",
            component: (
                <LearningPath
                    title="Ruta de Aprendizaje Personalizada"
                    modules={[
                        {
                            id: "1",
                            title: "Fundamentos Básicos",
                            description: "Conceptos esenciales para comenzar tu aprendizaje",
                            duration: "2 semanas",
                            difficulty: "beginner",
                            status: "available",
                        },
                        {
                            id: "2",
                            title: "Práctica Intermedia",
                            description: "Ejercicios prácticos para reforzar conocimientos",
                            duration: "3 semanas",
                            difficulty: "intermediate",
                            status: "locked",
                        },
                        {
                            id: "3",
                            title: "Proyecto Final",
                            description: "Aplica todo lo aprendido en un proyecto real",
                            duration: "2 semanas",
                            difficulty: "advanced",
                            status: "locked",
                        },
                    ]}
                    onModuleStart={(id) => console.log(`Iniciando módulo ${id}`)}
                    className="mt-4"
                />
            ),
        },
    ],

    // Respuestas para mejora de habilidades
    mejorar: [
        {
            id: "skills-1",
            type: "mixed",
            text: "Basándome en tu perfil, he analizado tus habilidades actuales. Aquí tienes un resumen de tu progreso:",
            component: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <MetricCard title="Habilidades Técnicas" value="75%" change={12}
                                icon={<Target className="h-4 w-4"/>}/>
                    <MetricCard title="Proyectos Completados" value="8" change={25}
                                icon={<TrendingUp className="h-4 w-4"/>}/>
                    <Chart
                        title="Progreso por Área"
                        data={[
                            {name: "Frontend", value: 80, color: "#3b82f6"},
                            {name: "Backend", value: 65, color: "#10b981"},
                            {name: "DevOps", value: 45, color: "#f59e0b"},
                            {name: "Testing", value: 70, color: "#8b5cf6"},
                        ]}
                        className="md:col-span-2"
                    />
                </div>
            ),
        },
    ],

    // Respuestas para iniciar proyectos
    proyecto: [
        {
            id: "project-1",
            type: "mixed",
            text: "¡Excelente! Te ayudo a organizar tu nuevo proyecto. He creado una lista de tareas para comenzar:",
            component: (
                <TaskList
                    title="Plan de Proyecto - Primeros Pasos"
                    tasks={[
                        {
                            id: "1",
                            title: "Definir objetivos del proyecto",
                            description: "Establecer metas claras y medibles",
                            status: "pending",
                            priority: "high",
                            dueDate: "En 2 días",
                        },
                        {
                            id: "2",
                            title: "Investigar tecnologías",
                            description: "Evaluar herramientas y frameworks necesarios",
                            status: "pending",
                            priority: "medium",
                            dueDate: "En 1 semana",
                        },
                        {
                            id: "3",
                            title: "Crear estructura del proyecto",
                            description: "Configurar repositorio y arquitectura inicial",
                            status: "pending",
                            priority: "medium",
                            dueDate: "En 10 días",
                        },
                        {
                            id: "4",
                            title: "Desarrollar MVP",
                            description: "Crear versión mínima viable del producto",
                            status: "pending",
                            priority: "high",
                            dueDate: "En 3 semanas",
                        },
                    ]}
                    onTaskToggle={(id) => console.log(`Toggling task ${id}`)}
                    className="mt-4"
                />
            ),
        },
    ],

    // Respuestas para obtener consejos
    consejos: [
        {
            id: "advice-1",
            type: "mixed",
            text: "Basándome en tu experiencia, aquí tienes algunos consejos personalizados y métricas de tu progreso:",
            component: (
                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricCard title="Tiempo de Estudio" value="4.5h" change={15}
                                    icon={<Clock className="h-4 w-4"/>}/>
                        <MetricCard title="Días Consecutivos" value="12" change={8}
                                    icon={<Calendar className="h-4 w-4"/>}/>
                        <MetricCard title="Comunidad" value="156" change={22}
                                    icon={<Users className="h-4 w-4"/>}/>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <BookOpen className="h-4 w-4"/>
                                Consejos Personalizados
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div
                                className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                <Badge variant="secondary"
                                       className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                    💡
                                </Badge>
                                <div>
                                    <h4 className="font-medium text-sm">Mantén la consistencia</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Estudiar 30 minutos diarios es más efectivo que 3 horas una
                                        vez por semana.
                                    </p>
                                </div>
                            </div>

                            <div
                                className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                                <Badge
                                    variant="secondary"
                                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                >
                                    🎯
                                </Badge>
                                <div>
                                    <h4 className="font-medium text-sm">Practica con proyectos
                                        reales</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Aplica lo que aprendes en proyectos personales para reforzar
                                        el conocimiento.
                                    </p>
                                </div>
                            </div>

                            <div
                                className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                <Badge
                                    variant="secondary"
                                    className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                                >
                                    🤝
                                </Badge>
                                <div>
                                    <h4 className="font-medium text-sm">Únete a la comunidad</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Participa en foros y grupos para resolver dudas y compartir
                                        experiencias.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ),
        },
    ],

    // Respuestas generales
    general: [
        {
            id: "general-1",
            type: "text",
            text: "¡Hola! Estoy aquí para ayudarte con tu aprendizaje y desarrollo. Puedo crear planes personalizados, mostrar tu progreso, organizar tareas y darte consejos basados en tu experiencia.",
        },
        {
            id: "general-2",
            type: "mixed",
            text: "Aquí tienes un resumen de las áreas en las que puedo ayudarte:",
            component: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400"/>
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">Planes de Aprendizaje</h4>
                                <p className="text-xs text-muted-foreground">Rutas personalizadas
                                    según tu nivel</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                <Target className="h-4 w-4 text-green-600 dark:text-green-400"/>
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">Seguimiento de Progreso</h4>
                                <p className="text-xs text-muted-foreground">Métricas y análisis de
                                    tu avance</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400"/>
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">Organización de Tareas</h4>
                                <p className="text-xs text-muted-foreground">Listas y recordatorios
                                    inteligentes</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                                <Users className="h-4 w-4 text-orange-600 dark:text-orange-400"/>
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">Consejos Personalizados</h4>
                                <p className="text-xs text-muted-foreground">Recomendaciones basadas
                                    en tu perfil</p>
                            </div>
                        </div>
                    </Card>
                </div>
            ),
        },
    ],
}

// Función para obtener respuesta basada en el mensaje del usuario
export function getMockAIResponse(userMessage: string, userGoal?: string): AIResponse {
    const message = userMessage.toLowerCase()

    // Determinar el tipo de respuesta basado en el mensaje y objetivo del usuario
    if (message.includes("aprender") || message.includes("estudiar") || userGoal?.includes("Aprender")) {
        return mockAIResponses.aprender[0]
    }

    if (message.includes("mejorar") || message.includes("habilidad") || userGoal?.includes("Mejorar")) {
        return mockAIResponses.mejorar[0]
    }

    if (message.includes("proyecto") || message.includes("crear") || userGoal?.includes("proyecto")) {
        return mockAIResponses.proyecto[0]
    }

    if (
        message.includes("consejo") ||
        message.includes("ayuda") ||
        message.includes("recomend") ||
        userGoal?.includes("consejos")
    ) {
        return mockAIResponses.consejos[0]
    }

    // Respuesta general alternando entre las opciones disponibles
    const generalResponses = mockAIResponses.general
    const randomIndex = Math.floor(Math.random() * generalResponses.length)
    return generalResponses[randomIndex]
}
