import { ArrowLeft, FileText } from "lucide-react"
import { Button } from "../ui/button.tsx"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx"
import { Separator } from "../ui/separator.tsx"
import { ScrollArea } from "../ui/scroll-area.tsx"
import type { ScreenProps } from "@/types"

export function TermsScreen({ onStateChange }: ScreenProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStateChange("welcome")}
                        className="h-10 w-10 p-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">Términos y Condiciones</h1>
                        <p className="text-sm text-muted-foreground">Finapsis - Asistente Financiero</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-4">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Introduction */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Términos y Condiciones de Uso – Finapsis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>Última actualización:</strong> 18/08/2025
                            </p>
                            <p className="text-muted-foreground">
                                Bienvenido(a) a Finapsis (“la Aplicación”), un asistente financiero digital diseñado para ayudarte a registrar tus finanzas personales, recibir consejos financieros y planificar metas de manera simple y accesible.
                            </p>
                            <p className="text-muted-foreground">
                                Al utilizar nuestra Aplicación, aceptas los presentes <strong>Términos y Condiciones de Uso</strong> (“Términos”). Te pedimos leerlos cuidadosamente.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                1. Aceptación de los Términos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>
                                Al registrarte o utilizar la Aplicación, confirmas que has leído, entendido y aceptado estos Términos. Si no estás de acuerdo, debes abstenerte de usar la Aplicación.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                2. Definiciones
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Usuario:</strong> Persona que accede y utiliza la Aplicación.</li>
                                <li><strong>Contenido:</strong> Información, datos, textos, gráficos u otros materiales disponibles en la Aplicación.</li>
                                <li><strong>Servicios:</strong> Funcionalidades de la Aplicación, incluyendo registro de movimientos, metas financieras y consejos digitales.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                3. Uso de la Aplicación
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>La Aplicación se destina únicamente a <strong>uso personal y no comercial.</strong></li>
                                <li>El Usuario se compromete a usar la Aplicación de forma lícita, sin infringir derechos de terceros ni disposiciones legales vigentes.</li>
                                <li>El acceso a ciertos servicios puede requerir registro y creación de cuenta, siendo responsabilidad del Usuario mantener la confidencialidad de sus credenciales.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                4. Alcance de la Información
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>La Aplicación <strong>no sustituye asesoría financiera, legal ni contable profesional.</strong></li>
                                <li>Los consejos, recordatorios o sugerencias entregados son de carácter <strong>informativo y referencial.</strong></li>
                                <li>El Usuario es responsable de las decisiones financieras que adopte.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                5. Privacidad y Protección de Datos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>El tratamiento de datos personales se regirá por la <strong>Política de Privacidad</strong> de la Aplicación.</li>
                                <li>El Usuario autoriza a que sus datos sean tratados con el fin de entregar los servicios descritos.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                6. Limitación de Responsabilidad
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>La Aplicación no garantiza la exactitud absoluta de los cálculos, proyecciones o información mostrada.</li>
                                <li>No nos hacemos responsables por pérdidas económicas, daños o perjuicios derivados del uso de la Aplicación.</li>
                                <li>La disponibilidad del servicio puede verse interrumpida temporalmente por mantenimiento, mejoras o fallas técnicas.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                7. Propiedad Intelectual
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Todos los derechos de propiedad intelectual sobre el software, logotipos, marcas y contenidos pertenecen a Finapsis @.</li>
                                <li>El Usuario no adquiere ningún derecho de propiedad sobre los mismos por el uso de la Aplicación.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                8. Modificaciones
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>
                                Podemos modificar estos Términos en cualquier momento. La versión actualizada se publicará en la Aplicación y entrará en vigencia desde su publicación.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                9. Terminación
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>El Usuario puede dejar de usar la Aplicación en cualquier momento.</li>
                                <li>Podemos suspender o cancelar el acceso de un Usuario en caso de incumplimiento de estos Términos.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                10. Ley Aplicable y Jurisdicción
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>
                                Estos Términos se regirán por las leyes de Chile. Cualquier conflicto será sometido a los tribunales competentes de la ciudad de Santiago.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Important Disclaimers */}
                    <Card className="border-orange-200 bg-orange-50">
                        <CardHeader>
                            <CardTitle className="text-orange-800">Descargo de Responsabilidad Importante</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-medium text-orange-800 mb-2">No Somos Asesores Financieros Certificados</h4>
                                <p className="text-sm text-orange-700 mb-3">
                                    Finapsis proporciona información educativa y asistencia automatizada. No constituye asesoramiento financiero profesional.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-medium text-orange-800 mb-2">Decisiones Financieras</h4>
                                <p className="text-sm text-orange-700 mb-3">
                                    Todas las decisiones financieras son tu responsabilidad. Te recomendamos consultar con un asesor certificado para decisiones importantes.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-medium text-orange-800 mb-2">Limitación de Responsabilidad</h4>
                                <p className="text-sm text-orange-700">
                                    Finapsis no se hace responsable de pérdidas financieras derivadas del uso de nuestros servicios.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h4 className="font-medium mb-2">Contacto</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                                Si tienes preguntas sobre estos términos, puedes contactarnos a:
                            </p>
                            <p className="text-sm font-medium">📧 finappsis@gmail.com</p>
                        </CardContent>
                    </Card>

                    <Separator />

                    {/* Footer */}
                    <div className="text-center pb-8">
                        <p className="text-xs text-muted-foreground mb-4">
                            Al continuar usando Finapsis, aceptas estos términos y condiciones.
                        </p>
                        <Button
                            onClick={() => onStateChange("welcome")}
                            className="w-full sm:w-auto"
                        >
                            Volver al Inicio
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
