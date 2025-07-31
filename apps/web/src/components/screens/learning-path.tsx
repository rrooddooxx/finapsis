"use client"
import {Card, CardContent, CardHeader, CardTitle} from "../ui/card.tsx"
import {Button} from "../ui/button.tsx"
import {Badge} from "../ui/badge.tsx"
import {Progress} from "../ui/progress.tsx"
import {BookOpen, CheckCircle2, Lock, Play} from "lucide-react"

interface LearningModule {
    id: string
    title: string
    description: string
    duration: string
    difficulty: "beginner" | "intermediate" | "advanced"
    status: "locked" | "available" | "in-progress" | "completed"
    progress?: number
}

interface LearningPathProps {
    title: string
    modules: LearningModule[]
    onModuleStart?: (moduleId: string) => void
    className?: string
}

const difficultyColors = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const statusIcons = {
    locked: Lock,
    available: BookOpen,
    "in-progress": Play,
    completed: CheckCircle2,
}

export function LearningPath({title, modules, onModuleStart, className}: LearningPathProps) {
    const completedModules = modules.filter((m) => m.status === "completed").length
    const totalProgress = (completedModules / modules.length) * 100

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4"/>
                        {title}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                        {completedModules}/{modules.length} completados
                    </Badge>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progreso general</span>
                        <span className="font-medium">{Math.round(totalProgress)}%</span>
                    </div>
                    <Progress value={totalProgress} className="h-2"/>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {modules.map((module, index) => {
                    const StatusIcon = statusIcons[module.status]
                    const isDisabled = module.status === "locked"

                    return (
                        <div
                            key={module.id}
                            className={`p-3 rounded-lg border transition-colors ${
                                isDisabled ? "bg-muted/50 opacity-60" : "bg-card hover:bg-accent/50"
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className={`p-1 rounded-full ${
                                        module.status === "completed"
                                            ? "bg-green-100 dark:bg-green-900"
                                            : module.status === "in-progress"
                                                ? "bg-blue-100 dark:bg-blue-900"
                                                : module.status === "available"
                                                    ? "bg-primary/10"
                                                    : "bg-muted"
                                    }`}
                                >
                                    <StatusIcon
                                        className={`h-3 w-3 ${
                                            module.status === "completed"
                                                ? "text-green-600 dark:text-green-400"
                                                : module.status === "in-progress"
                                                    ? "text-blue-600 dark:text-blue-400"
                                                    : module.status === "available"
                                                        ? "text-primary"
                                                        : "text-muted-foreground"
                                        }`}
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium">{module.title}</h4>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline"
                                                   className={`text-xs ${difficultyColors[module.difficulty]}`}>
                                                {module.difficulty}
                                            </Badge>
                                            <span
                                                className="text-xs text-muted-foreground">{module.duration}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{module.description}</p>

                                    {module.status === "in-progress" && module.progress !== undefined && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span
                                                    className="text-muted-foreground">Progreso</span>
                                                <span
                                                    className="font-medium">{module.progress}%</span>
                                            </div>
                                            <Progress value={module.progress} className="h-1"/>
                                        </div>
                                    )}

                                    {module.status === "available" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs bg-transparent"
                                            onClick={() => onModuleStart?.(module.id)}
                                        >
                                            Comenzar módulo
                                        </Button>
                                    )}

                                    {module.status === "in-progress" && (
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="h-7 text-xs"
                                            onClick={() => onModuleStart?.(module.id)}
                                        >
                                            Continuar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
