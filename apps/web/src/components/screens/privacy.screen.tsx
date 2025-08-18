import { ArrowLeft, Shield, Database, Lock, Eye, Users, Settings } from "lucide-react"
import { Button } from "../ui/button.tsx"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx"
import { Separator } from "../ui/separator.tsx"
import { ScrollArea } from "../ui/scroll-area.tsx"
import type { ScreenProps } from "@/types"

export function PrivacyScreen({ onStateChange }: ScreenProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
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
                        <h1 className="text-lg font-semibold">Políticas de Privacidad</h1>
                        <p className="text-sm text-muted-foreground">Finapsis - Asistente Financiero</p>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="max-w-2xl mx-auto space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Política de Privacidad – Finapsis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>Fecha de última actualización: 18/08/2025</strong>
                            </p>
                            <p className="text-muted-foreground">
                                En Finapsis (“la Aplicación”, “nosotros”), valoramos y protegemos tu privacidad. Esta Política explica cómo recopilamos, usamos, almacenamos y protegemos tus datos personales cuando utilizas nuestros servicios.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                1. Datos que Recopilamos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p>
                                    Cuando utilizas la Aplicación, podemos recopilar las siguientes categorías de datos:
                                </p>
                                <br/>
                                <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                                    <li><strong>Datos de registro:</strong> nombre, correo electrónico, número de teléfono, contraseña u otros datos que nos entregues al crear una cuenta.</li>
                                    <li><strong>Datos financieros ingresados por el usuario:</strong> registros de ingresos, gastos, deudas, metas financieras y documentos (ej. fotos de boletas).</li>
                                    <li><strong>Datos de uso:</strong> información sobre cómo interactúas con la Aplicación (funcionalidades utilizadas, frecuencia, preferencias).</li>
                                    <li><strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo, sistema operativo, identificadores únicos de dispositivo y datos de conexión.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                2. Finalidad del Tratamiento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p>
                                    Utilizamos tus datos personales para:
                                </p>
                                <br/>
                                <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                                    <li>Proveer los servicios de la Aplicación (registro de movimientos, metas, recordatorios, consejos financieros).</li>
                                    <li>Personalizar tu experiencia y ofrecer recomendaciones adaptadas.</li>
                                    <li>Cumplir con obligaciones legales y normativas vigentes.</li>
                                    <li>Realizar análisis internos y mejoras de los servicios.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                3. Bases Legales del Tratamiento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p>
                                    El tratamiento de tus datos se sustenta en:
                                </p>
                                <br/>
                                <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                                    <li>Consentimiento: al registrarte y aceptar esta Política.</li>
                                    <li>Ejecución de contrato: para prestarte los servicios de la Aplicación.</li>
                                    <li>Cumplimiento legal: cuando la normativa financiera, tributaria o de protección de datos lo requiera.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                4. Compartición de Datos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-medium text-green-800 mb-2">💚 Nunca Vendemos tus Datos</h4>
                                <p className="text-sm text-green-700">
                                    No venderemos ni comercializaremos tus datos personales.
                                </p>
                            </div>

                            <div>
                                <p>
                                    Podemos compartir datos únicamente en los siguientes casos:
                                </p>
                                <br/>
                                <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                                    <li>Con <strong>proveedores de servicios tecnológicos</strong> (ej. hosting, almacenamiento en la nube, procesamiento de pagos), siempre bajo acuerdos de confidencialidad.</li>
                                    <li>Con autoridades competentes, cuando sea requerido por ley o proceso judicial.</li>
                                    <li>Con tu consentimiento expreso, en caso de integraciones con terceros (ej. bancos, fintechs, herramientas externas).</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                5. Seguridad de la Información
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p>
                                    Adoptamos medidas técnicas y organizativas adecuadas para proteger tus datos contra accesos no autorizados, pérdida, alteración o divulgación indebida.
                                </p>
                                <br/>
                                <p>
                                    Sin embargo, reconoces que **ningún sistema es 100% seguro** y que existen riesgos inherentes a la transmisión de datos por internet.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                6. Conservación de los Datos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p>
                                    Mantendremos tus datos personales mientras tengas una cuenta activa o mientras sea necesario para cumplir con los fines descritos.
                                </p>
                                <br/>
                                <p>
                                    Una vez eliminada tu cuenta, tus datos serán eliminados o anonimizados, salvo aquellos que debamos conservar por obligaciones legales.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                7. Derechos del Usuario
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p>
                                    Tienes derecho a:
                                </p>
                                <br/>
                                <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                                    <li>Acceder a tus datos personales.</li>
                                    <li>Rectificar datos incorrectos o incompletos.</li>
                                    <li>Solicitar la eliminación de tus datos (“derecho al olvido”).</li>
                                    <li>Limitar u oponerte al tratamiento de tus datos.</li>
                                    <li>Solicitar la portabilidad de tus datos en un formato estructurado.</li>
                                </ul>
                                <br/>
                                <p>
                                    Para ejercer estos derechos, escríbenos a 📧 finappsis@gmail.com.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                8. Menores de Edad
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p>
                                    Nuestros servicios no están dirigidos a menores de 18 años. Si un menor nos proporciona datos, los eliminaremos en cuanto tengamos conocimiento.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                9. Cambios en esta Política
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p>
                                    Podemos actualizar esta Política en cualquier momento. La nueva versión será publicada en la Aplicación y entrará en vigencia desde su publicación.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="text-blue-800">Integración con Telegram</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-medium text-blue-800 mb-2">Procesamiento de Mensajes</h4>
                                <p className="text-sm text-blue-700 mb-3">
                                    Solo procesamos mensajes que contengan información financiera relevante (recibos, gastos, consultas sobre dinero).
                                </p>
                            </div>

                            <div>
                                <h4 className="font-medium text-blue-800 mb-2">No Almacenamos Conversaciones Completas</h4>
                                <p className="text-sm text-blue-700">
                                    Únicamente guardamos los datos financieros extraídos, no el historial completo de chat.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h4 className="font-medium mb-2">Contacto</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                                Si tienes dudas o solicitudes respecto a esta Política, puedes contactarnos en:
                            </p>
                            <p className="text-sm font-medium">📧 finappsis@gmail.com</p>
                        </CardContent>
                    </Card>


                    <Separator />

                    {/* Footer */}
                    <div className="text-center pb-8">
                        <p className="text-xs text-muted-foreground mb-4">
                            Nos comprometemos a mantener la transparencia total sobre el uso de tus datos.
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
