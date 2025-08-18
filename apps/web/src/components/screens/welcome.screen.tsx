import {Bot, LogIn, UserPlus} from "lucide-react"
import {Button} from "../ui/button.tsx"
import {Card, CardContent} from "../ui/card.tsx"
import type {ScreenProps} from "../../types"

export function WelcomeScreen({onStateChange}: ScreenProps) {
    return (
        <div
            className="min-h-screen bg-background flex flex-col items-center justify-center p-3 sm:p-4 lg:p-6 text-center">
            <Card className="w-full max-w-md shadow-xl border-border/50 backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8 text-center">
                    <div className="mb-6 sm:mb-8">
                        <div
                            className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full mb-4 sm:mb-6 shadow-lg">
                            <Bot className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground"/>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 text-foreground">Finapsis</h1>
                        <p className="text-muted-foreground text-base sm:text-lg">
                            Bienvenid@!<br/>
                            Comienza tu educación financiera aquí
                        </p>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                        <Button
                            onClick={() => onStateChange("login")}
                            variant="default"
                            size="lg"
                            className="w-full min-h-[56px] text-base sm:text-lg shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            <LogIn className="mr-2 h-5 w-5"/>
                            Ingresar a mi cuenta
                        </Button>

                        <Button
                            onClick={() => onStateChange("register")}
                            variant="outline"
                            size="lg"
                            className="w-full min-h-[56px] text-base sm:text-lg border-border hover:bg-accent hover:text-accent-foreground transition-all duration-200"
                        >
                            <UserPlus className="mr-2 h-5 w-5"/>
                            Registrarme como usuario
                        </Button>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground mt-6">
                        Al continuar usando Finapsis, aceptas estos <button
                        onClick={() => onStateChange("terms")}
                        className="font-semibold text-primary hover:text-primary/80 underline underline-offset-2 transition-colors duration-200"
                    >términos y condiciones</button>
                        {" "}y nuestra{" "}
                        <button
                            onClick={() => onStateChange("privacy")}
                            className="font-semibold text-primary hover:text-primary/80 underline underline-offset-2 transition-colors duration-200"
                        >
                            Políticas de Privacidad
                        </button>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
