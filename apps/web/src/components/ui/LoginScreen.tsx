import { useState } from "react"
import { ArrowRight, Eye, EyeOff, LogIn } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { Card, CardContent, CardHeader } from "./card"
import { Label } from "./label"
import type { LoginData, ScreenProps } from "../../types"

interface LoginScreenProps extends ScreenProps {
  onLogin: (loginData: LoginData) => Promise<void>
}

export function LoginScreen({ onStateChange, onLogin, isLoading }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
  })

  const canLogin = () => {
    return loginData.email.trim() !== "" && loginData.password.length >= 6
  }

  const handleLogin = async () => {
    if (canLogin()) {
      await onLogin(loginData)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <Card className="w-full max-w-md shadow-xl border-border/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full mb-4 shadow-lg">
            <LogIn className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground"/>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Iniciar Sesión</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Ingresa tus credenciales para continuar
          </p>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm sm:text-base text-foreground">
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@ejemplo.com"
              value={loginData.email}
              onChange={(e) => setLoginData((prev) => ({
                ...prev,
                email: e.target.value
              }))}
              className="min-h-[48px] text-base bg-background border-input focus:border-ring focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm sm:text-base text-foreground">
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={loginData.password}
                onChange={(e) => setLoginData((prev) => ({
                  ...prev,
                  password: e.target.value
                }))}
                className="min-h-[48px] text-base pr-12 bg-background border-input focus:border-ring focus:ring-ring"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleLogin}
              disabled={!canLogin() || isLoading}
              size="lg"
              className="w-full min-h-[56px] text-base sm:text-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isLoading ? "Ingresando..." : "Ingresar"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5"/>}
            </Button>

            <Button
              onClick={() => onStateChange("welcome")}
              variant="ghost"
              size="sm"
              className="w-full hover:bg-accent hover:text-accent-foreground"
            >
              Volver
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            ¿No tienes cuenta?{" "}
            <button
              onClick={() => onStateChange("register")}
              className="text-primary hover:underline transition-colors duration-200"
            >
              Regístrate aquí
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}