import {useState} from "react"
import {ArrowRight, Star, Target, User} from "lucide-react"
import {Button} from "../ui/button.tsx"
import {Input} from "../ui/input.tsx"
import {Card, CardContent} from "../ui/card.tsx"
import {Badge} from "../ui/badge.tsx"
import {Progress} from "../ui/progress.tsx"
import type {OnboardingData, ScreenProps, SlideData} from "../../types"

interface RegisterScreenProps extends ScreenProps {
    onComplete: (data: OnboardingData) => void
}

const slides: SlideData[] = [
    {
        id: 0,
        icon: User,
        title: "¿Cuál es tu nombre?",
        subtitle: "Nos encantaría saber cómo llamarte",
        field: "name",
        type: "input",
    },
    {
        id: 1,
        icon: Target,
        title: "¿Cuál es tu objetivo principal?",
        subtitle: "Ayúdanos a entender qué buscas lograr",
        field: "goal",
        type: "select",
        options: ["Aprender algo nuevo", "Mejorar mis habilidades", "Iniciar un proyecto", "Obtener consejos"],
    },
    {
        id: 2,
        icon: Star,
        title: "¿Cuál es tu nivel de experiencia?",
        subtitle: "Esto nos ayuda a personalizar nuestras respuestas",
        field: "experience",
        type: "select",
        options: ["Principiante completo", "Algo de experiencia", "Intermedio", "Avanzado"],
    },
]

export function RegisterScreen({onStateChange, onComplete}: RegisterScreenProps) {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        name: "",
        goal: "",
        experience: "",
    })

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
            onComplete(onboardingData)
        }
    }

    const canProceed = () => {
        const currentField = slides[currentSlide].field
        return onboardingData[currentField].trim() !== ""
    }

    const progressValue = ((currentSlide + 1) / slides.length) * 100
    const currentSlideData = slides[currentSlide]
    const Icon = currentSlideData.icon

    return (
        <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
            <div className="mx-auto max-w-2xl">
                {/* Progress Section */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <Badge variant="outline"
                               className="text-xs sm:text-sm border-border text-foreground">
                            Pregunta {currentSlide + 1} de {slides.length}
                        </Badge>
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {Math.round(progressValue)}%
            </span>
                    </div>
                    <Progress value={progressValue} className="h-2 sm:h-3"/>
                </div>

                {/* Main Card */}
                <Card className="shadow-xl border-border/50 backdrop-blur-sm">
                    <CardContent className="p-6 sm:p-8 lg:p-10">
                        {/* Icon and Title */}
                        <div className="text-center mb-6 sm:mb-8">
                            <div
                                className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full mb-4 sm:mb-6 shadow-lg">
                                <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground"/>
                            </div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-foreground">
                                {currentSlideData.title}
                            </h1>
                            <p className="text-muted-foreground text-base sm:text-lg lg:text-xl">
                                {currentSlideData.subtitle}
                            </p>
                        </div>

                        {/* Input Section */}
                        <div className="space-y-4 sm:space-y-6">
                            {currentSlideData.type === "input" ? (
                                <Input
                                    value={onboardingData[currentSlideData.field]}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    placeholder="Escribe tu respuesta aquí..."
                                    className="text-base sm:text-lg p-4 sm:p-6 text-center border-2 focus:border-primary min-h-[56px] bg-background"
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
                                                    : "hover:bg-accent hover:text-accent-foreground hover:border-primary/50 border-border"
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
                                    className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    {currentSlide === slides.length - 1 ? "Comenzar a chatear" : "Continuar"}
                                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5"/>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Navigation Hint */}
                <div className="text-center mt-4 sm:mt-6">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Presiona Enter o toca Continuar para proceder
                    </p>
                    <Button
                        onClick={() => onStateChange("welcome")}
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs hover:bg-accent hover:text-accent-foreground"
                    >
                        Volver al inicio
                    </Button>
                </div>
            </div>
        </div>
    )
}