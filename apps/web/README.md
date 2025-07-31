# Typeform Onboarding con React + Bun

Una aplicación de onboarding estilo Typeform con interfaz de chatbot, construida con React puro, Vite y Bun como gestor de paquetes.

## 🚀 Características

- **Pantalla de bienvenida** con opciones de login y registro
- **Sistema de autenticación** simulado
- **Onboarding interactivo** de 3 pasos estilo Typeform
- **Interfaz de chatbot** personalizada
- **Diseño responsive** mobile-first
- **Modo oscuro** por defecto
- **Componentes shadcn/ui** para una UI consistente
- **Textos en español neutro**

## 🛠️ Tecnologías

- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Estilos utilitarios
- **shadcn/ui** - Componentes de UI
- **Lucide React** - Iconos
- **Bun** - Gestor de paquetes y runtime

## 📦 Instalación

### Prerrequisitos

Asegúrate de tener [Bun](https://bun.sh) instalado:

\`\`\`bash
curl -fsSL https://bun.sh/install | bash
\`\`\`

### Configuración del proyecto

1. **Instalar dependencias:**
\`\`\`bash
bun install
\`\`\`

2. **Ejecutar en desarrollo:**
\`\`\`bash
bun run dev
\`\`\`

3. **Construir para producción:**
\`\`\`bash
bun run build
\`\`\`

4. **Preview del build:**
\`\`\`bash
bun run preview
\`\`\`

## 🎯 Comandos de Bun

### Gestión de dependencias
\`\`\`bash
# Instalar todas las dependencias
bun install

# Agregar una nueva dependencia
bun add <paquete>

# Agregar dependencia de desarrollo
bun add -d <paquete>

# Remover dependencia
bun remove <paquete>

# Actualizar dependencias
bun update
\`\`\`

### Scripts de desarrollo
\`\`\`bash
# Servidor de desarrollo (Vite)
bun run dev

# Construir aplicación
bun run build

# Preview de producción
bun run preview

# Linting
bun run lint
\`\`\`

## 🏗️ Estructura del proyecto

\`\`\`
src/
├── components/
│   └── ui/           # Componentes shadcn/ui
├── lib/
│   └── utils.ts      # Utilidades (cn function)
├── App.tsx           # Componente principal
├── main.tsx          # Punto de entrada
└── index.css         # Estilos globales
├── index.html        # HTML template
├── package.json      # Configuración del proyecto
├── vite.config.js    # Configuración de Vite
└── tailwind.config.js # Configuración de Tailwind
\`\`\`

## 🎨 Flujo de la aplicación

1. **Pantalla de bienvenida** - Opciones "Ingresar" o "Registrarse"
2. **Login** - Formulario de autenticación (demo)
3. **Registro** - Onboarding de 3 pasos:
   - Nombre del usuario
   - Objetivo principal
   - Nivel de experiencia
4. **Chat** - Interfaz de chatbot personalizada

## 🌙 Características de UI

- **Modo oscuro por defecto** aplicado en el HTML
- **Diseño mobile-first** con breakpoints responsivos
- **Componentes accesibles** con soporte para lectores de pantalla
- **Animaciones suaves** y transiciones
- **Validación de formularios** en tiempo real

## 🔧 Personalización

### Cambiar tema
Edita `index.html` para cambiar el tema por defecto:

\`\`\`html
<html lang="es" class="light"> <!-- Cambiar "dark" por "light" -->
\`\`\`

### Agregar nuevas preguntas
Modifica el array `slides` en `src/App.tsx`:

\`\`\`tsx
const slides = [
  // Agregar nuevas preguntas aquí
  {
    id: 3,
    icon: NewIcon,
    title: "¿Nueva pregunta?",
    subtitle: "Descripción de la pregunta",
    field: "newField" as keyof OnboardingData,
    type: "select",
    options: ["Opción 1", "Opción 2"]
  }
]
\`\`\`

## 🚀 Despliegue

### Vercel (Recomendado)
\`\`\`bash
# Instalar Vercel CLI
bun add -g vercel

# Desplegar
vercel
\`\`\`

### Netlify
\`\`\`bash
# Build command: bun run build
# Publish directory: dist
\`\`\`

### Otros proveedores
El proyecto genera archivos estáticos en la carpeta `dist/` que pueden ser servidos desde cualquier servidor web.

## 📝 Notas sobre la Stack

### React + Vite
- **Hot Module Replacement** ultra rápido
- **Build optimizado** para producción
- **TypeScript** integrado sin configuración

### Bun
- **Velocidad**: 3x más rápido que npm
- **Compatibilidad**: 100% compatible con paquetes de npm
- **Runtime**: Puede ejecutar JavaScript/TypeScript directamente

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
