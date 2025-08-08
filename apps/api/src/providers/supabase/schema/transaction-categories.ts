import { sql } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  text, 
  boolean,
  integer,
  timestamp, 
  jsonb, 
  index,
  pgEnum
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "../utils";
import { transactionTypeEnum } from "./financial-transactions";

export const transactionCategories = pgTable(
  'transaction_categories',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    
    // Category identification
    name: varchar('name', { length: 100 }).notNull().unique(),
    displayName: varchar('display_name', { length: 150 }).notNull(), // Spanish display name
    
    // Category hierarchy
    parentCategoryId: varchar('parent_category_id', { length: 191 }),
    level: integer('level').notNull().default(0), // 0 = top level, 1 = subcategory, etc.
    sortOrder: integer('sort_order').notNull().default(0),
    
    // Transaction type association
    transactionType: transactionTypeEnum('transaction_type').notNull(),
    
    // Category details
    description: text('description'),
    icon: varchar('icon', { length: 50 }), // Icon identifier for UI
    color: varchar('color', { length: 7 }), // Hex color code
    
    // Chilean-specific attributes
    isChileanSpecific: boolean('is_chilean_specific').notNull().default(true),
    siiCategory: varchar('sii_category', { length: 100 }), // SII tax category mapping
    
    // Configuration
    isActive: boolean('is_active').notNull().default(true),
    isSystemCategory: boolean('is_system_category').notNull().default(true), // Pre-defined vs user-created
    
    // Keywords for automatic classification
    keywords: jsonb('keywords'), // Array of Spanish keywords for classification
    patterns: jsonb('patterns'), // Regex patterns for merchant/description matching
    
    // Audit trail
    createdAt: timestamp('created_at').notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  },
  (table) => ({
    // Indexes for efficient querying
    nameIndex: index('transaction_categories_name_index').on(table.name),
    typeIndex: index('transaction_categories_type_index').on(table.transactionType),
    parentIndex: index('transaction_categories_parent_index').on(table.parentCategoryId),
    levelIndex: index('transaction_categories_level_index').on(table.level),
    activeIndex: index('transaction_categories_active_index').on(table.isActive),
    
    // Composite indexes
    typeActiveIndex: index('transaction_categories_type_active_index').on(table.transactionType, table.isActive),
    parentLevelIndex: index('transaction_categories_parent_level_index').on(table.parentCategoryId, table.level),
    
    // GIN indexes for JSONB
    keywordsIndex: index('transaction_categories_keywords_index').using('gin', table.keywords),
    patternsIndex: index('transaction_categories_patterns_index').using('gin', table.patterns),
  })
);

// Zod schemas for validation
export const insertTransactionCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  displayName: z.string().min(1, "Display name is required").max(150),
  parentCategoryId: z.string().optional(),
  level: z.number().int().min(0).default(0),
  sortOrder: z.number().int().default(0),
  transactionType: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex code").optional(),
  isChileanSpecific: z.boolean().default(true),
  siiCategory: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  isSystemCategory: z.boolean().default(true),
  keywords: z.array(z.string()).optional(),
  patterns: z.array(z.string()).optional(),
});

export const updateTransactionCategorySchema = insertTransactionCategorySchema.partial();

// Select schema for API responses
export const selectTransactionCategorySchema = createSelectSchema(transactionCategories);

// Types for TypeScript
export type NewTransactionCategoryParams = z.infer<typeof insertTransactionCategorySchema>;
export type UpdateTransactionCategoryParams = z.infer<typeof updateTransactionCategorySchema>;
export type TransactionCategory = typeof transactionCategories.$inferSelect;

// Predefined Chilean categories configuration
export const chileanExpenseCategories = [
  // Transportation - Transporte
  {
    name: 'transporte',
    displayName: 'Transporte',
    transactionType: 'EXPENSE' as const,
    description: 'Gastos relacionados con movilización y transporte',
    icon: 'car',
    color: '#3B82F6',
    keywords: ['metro', 'micro', 'bus', 'taxi', 'uber', 'cabify', 'didi', 'beat', 'bencina', 'gasolina', 'diesel', 'parafina', 'peaje', 'estacionamiento', 'transantiago', 'red', 'scoot', 'lime', 'costanera norte', 'autopista central', 'tag'],
    patterns: ['METRO.*', 'TRANSANTIAGO.*', 'COPEC.*', 'SHELL.*', 'PETROBRAS.*', 'ENEX.*', 'UBER.*', 'CABIFY.*', 'DIDI.*', 'BEAT.*', 'AUTOPISTA.*', 'COSTANERA NORTE.*'],
    subcategories: [
      { name: 'combustible', displayName: 'Combustible', keywords: ['bencina', 'gasolina', 'diesel', 'copec', 'shell', 'petrobras', 'enex'] },
      { name: 'transporte_publico', displayName: 'Transporte Público', keywords: ['metro', 'micro', 'bus', 'transantiago', 'red', 'tren central'] },
      { name: 'taxi_rideshare', displayName: 'Taxi y Rideshare', keywords: ['taxi', 'uber', 'cabify', 'didi', 'beat'] },
      { name: 'peajes_estacionamiento', displayName: 'Peajes y Estacionamiento', keywords: ['estacionamiento', 'parking', 'peaje', 'tag', 'costanera norte', 'autopista central'] }
    ]
  },
  
  // Utilities - Servicios Básicos
  {
    name: 'servicios_basicos',
    displayName: 'Servicios Básicos',
    transactionType: 'EXPENSE' as const,
    description: 'Servicios públicos y básicos del hogar',
    icon: 'home',
    color: '#EF4444',
    keywords: ['luz', 'agua', 'gas', 'internet', 'telefono', 'cable', 'enel', 'cge', 'chilectra', 'aguas andinas', 'esval', 'essbio', 'metrogas', 'lipigas', 'abascal', 'movistar', 'entel', 'claro', 'wom', 'vtr', 'directv', 'gastos comunes'],
    patterns: ['ENEL.*', 'CGE.*', 'CHILECTRA.*', 'AGUAS ANDINAS.*', 'ESVAL.*', 'ESSBIO.*', 'METROGAS.*', 'LIPIGAS.*', 'MOVISTAR.*', 'ENTEL.*', 'CLARO.*', 'WOM.*', 'VTR.*', 'DIRECTV.*', 'GASTOS COMUNES.*'],
    subcategories: [
      { name: 'electricidad', displayName: 'Electricidad', keywords: ['luz', 'electricidad', 'enel', 'cge', 'chilectra'] },
      { name: 'agua', displayName: 'Agua', keywords: ['agua', 'aguas andinas', 'esval', 'essbio'] },
      { name: 'gas', displayName: 'Gas', keywords: ['gas', 'metrogas', 'lipigas', 'abascal'] },
      { name: 'internet_telefono', displayName: 'Internet y Teléfono', keywords: ['internet', 'telefono', 'movistar', 'entel', 'claro', 'wom', 'vtr', 'directv'] },
      { name: 'gastos_comunes', displayName: 'Gastos Comunes', keywords: ['gastos comunes', 'gasto comun'] }
    ]
  },
  
  // Food - Alimentación
  {
    name: 'alimentacion',
    displayName: 'Alimentación',
    transactionType: 'EXPENSE' as const,
    description: 'Gastos en comida y bebidas',
    icon: 'utensils',
    color: '#10B981',
    keywords: ['supermercado', 'restaurante', 'comida', 'almuerzo', 'desayuno', 'cena', 'jumbo', 'lider', 'santa isabel', 'tottus', 'unimarc', 'acuenta', 'mcdonalds', 'burger king', 'subway', 'pedidosya', 'rappi', 'uber eats', 'starbucks', 'dunkin', 'juan valdez'],
    patterns: ['JUMBO.*', 'LIDER.*', 'SANTA ISABEL.*', 'TOTTUS.*', 'UNIMARC.*', 'ACUENTA.*', 'MCDONALDS.*', 'BURGER KING.*', 'SUBWAY.*', 'PEDIDOSYA.*', 'RAPPI.*', 'UBER EATS.*', 'STARBUCKS.*', 'DUNKIN.*'],
    subcategories: [
      { name: 'supermercado', displayName: 'Supermercado', keywords: ['jumbo', 'lider', 'santa isabel', 'tottus', 'unimarc', 'acuenta', 'supermercado'] },
      { name: 'restaurantes', displayName: 'Restaurantes', keywords: ['restaurante', 'comida', 'almuerzo', 'cena', 'fuente de soda'] },
      { name: 'comida_rapida', displayName: 'Comida Rápida', keywords: ['mcdonalds', 'burger king', 'subway', 'dominos', 'papa johns', 'kfc', 'wendys', 'doggis'] },
      { name: 'delivery', displayName: 'Delivery', keywords: ['pedidos ya', 'uber eats', 'rappi', 'delivery', 'justo', 'cornershop'] },
      { name: 'cafe_snacks', displayName: 'Café y Snacks', keywords: ['starbucks', 'dunkin', 'juan valdez', 'cafeteria', 'helado', 'emporio la rosa'] }
    ]
  },

  // Shopping - Compras y Tiendas
  {
    name: 'compras',
    displayName: 'Compras y Tiendas',
    transactionType: 'EXPENSE' as const,
    description: 'Gastos en bienes, productos y tiendas por departamento.',
    icon: 'shopping-bag',
    color: '#6366F1',
    keywords: [
        'compra', 'tienda', 'retail', 'mercado libre', 'falabella', 'ripley', 'paris', 'la polar', 'hites', 'corona',
        'sodimac', 'easy', 'dafiti', 'linio', 'amazon', 'aliexpress', 'shein', 'zara', 'h&m', 'nike', 'adidas', 'pc factory'
    ],
    patterns: [
        'MERCADO LIBRE.*', 'FALABELLA.*', 'RIPLEY.*', 'PARIS.*', 'LA POLAR.*', 'HITES.*', 'CORONA.*',
        'SODIMAC.*', 'EASY.*', 'DAFITI.*', 'LINIO.*', 'AMAZON.*', 'ALIEXPRESS.*', 'SHEIN.*', 'PCFACTORY.*'
    ],
    subcategories: [
      { name: 'tienda_departamento', displayName: 'Grandes Tiendas', keywords: ['falabella', 'ripley', 'paris', 'la polar', 'hites', 'corona', 'johnson'] },
      { name: 'electronica', displayName: 'Electrónica y Tecnología', keywords: ['electronica', 'computador', 'celular', 'telefono', 'tv', 'tablet', 'sd card', 'tarjeta sd', 'pc factory', 'wei', 'spdigital', 'maconline', 'reiftstore', 'pcfactory'] },
      { name: 'ropa_accesorios', displayName: 'Ropa y Accesorios', keywords: ['ropa', 'zapatos', 'accesorios', 'vestuario', 'zara', 'h&m', 'nike', 'adidas', 'dafiti', 'shein', 'feria'] },
      { name: 'hogar_mejoramiento', displayName: 'Hogar y Mejoramiento', keywords: ['muebles', 'decoracion', 'electrodomesticos', 'casa', 'sodimac', 'easy', 'ikea', 'construmart', 'imperial'] },
      { name: 'libros_hobbies', displayName: 'Libros y Hobbies', keywords: ['libros', 'libreria', 'antartica', 'lapiz lopez', 'hobbies', 'juguetes', 'microplay', 'weplay'] },
      { name: 'compras_online', displayName: 'Compras Online', keywords: ['mercado libre', 'linio', 'amazon', 'aliexpress', 'wish', 'ebay', 'buscalibre'] }
    ]
  },
  
  // Healthcare - Salud
  {
    name: 'salud',
    displayName: 'Salud',
    transactionType: 'EXPENSE' as const,
    description: 'Gastos médicos y de salud',
    icon: 'heart',
    color: '#F59E0B',
    keywords: ['medico', 'doctor', 'clinica', 'hospital', 'farmacia', 'medicina', 'consulta', 'examenes', 'salud colmena', 'isapre', 'fonasa', 'cruz verde', 'salcobrand', 'ahumada'],
    patterns: ['CLINICA.*', 'HOSPITAL.*', 'FARMACIA.*', 'SALUD COLMENA.*', 'ISAPRE.*', 'CRUZ VERDE.*', 'SALCOBRAND.*', 'AHUMADA.*'],
    subcategories: [
      { name: 'consultas_medicas', displayName: 'Consultas Médicas', keywords: ['medico', 'doctor', 'consulta', 'especialista', 'integramedica'] },
      { name: 'medicamentos', displayName: 'Medicamentos', keywords: ['farmacia', 'medicina', 'medicamento', 'salcobrand', 'cruz verde', 'farmacias ahumada'] },
      { name: 'examenes', displayName: 'Exámenes', keywords: ['examenes', 'laboratorio', 'rayos x', 'ecografia'] },
      { name: 'seguros_salud', displayName: 'Seguros de Salud', keywords: ['isapre', 'fonasa', 'seguro', 'colmena', 'consalud', 'cruzblanca', 'banmedica'] }
    ]
  },
  
  // Education - Educación
  {
    name: 'educacion',
    displayName: 'Educación',
    transactionType: 'EXPENSE' as const,
    description: 'Gastos en educación y capacitación',
    icon: 'book',
    color: '#8B5CF6',
    keywords: ['colegio', 'universidad', 'instituto', 'curso', 'capacitacion', 'libros', 'matricula', 'mensualidad', 'arancel', 'preuniversitario'],
    patterns: ['UNIVERSIDAD.*', 'INSTITUTO.*', 'COLEGIO.*', 'PREUNIVERSITARIO.*'],
    subcategories: [
      { name: 'matriculas_aranceles', displayName: 'Matrículas y Aranceles', keywords: ['matricula', 'arancel', 'colegiatura'] },
      { name: 'materiales_educativos', displayName: 'Materiales Educativos', keywords: ['libros', 'cuadernos', 'materiales', 'fotocopias', 'libreria antartica'] },
      { name: 'cursos_capacitacion', displayName: 'Cursos y Capacitación', keywords: ['curso', 'capacitacion', 'seminario', 'taller', 'udemy', 'coursera'] }
    ]
  },
  
  // Entertainment - Entretenimiento
  {
    name: 'entretenimiento',
    displayName: 'Entretenimiento',
    transactionType: 'EXPENSE' as const,
    description: 'Gastos en ocio y entretenimiento',
    icon: 'film',
    color: '#EC4899',
    keywords: ['cine', 'teatro', 'concierto', 'netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'youtube premium', 'juegos', 'entretenimiento', 'fiesta', 'bar', 'pub'],
    patterns: ['NETFLIX.*', 'SPOTIFY.*', 'AMAZON PRIME.*', 'DISNEY.*', 'CINE.*', 'CINEMARK.*', 'CINEHOYTS.*', 'YOUTUBE.*'],
    subcategories: [
      { name: 'streaming', displayName: 'Streaming', keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'youtube premium', 'crunchyroll'] },
      { name: 'cine_eventos', displayName: 'Cine y Eventos', keywords: ['cine', 'teatro', 'concierto', 'espectaculo', 'cinemark', 'cinehoyts', 'puntoticket'] },
      { name: 'deportes_gym', displayName: 'Deportes y Gimnasio', keywords: ['gimnasio', 'gym', 'deporte', 'futbol', 'tenis', 'smartfit', 'pacific fitness'] },
      { name: 'salidas', displayName: 'Salidas', keywords: ['bar', 'pub', 'discoteca', 'fiesta'] }
    ]
  }
];

export const chileanIncomeCategories = [
  // Salary - Sueldo
  {
    name: 'sueldo',
    displayName: 'Sueldo',
    transactionType: 'INCOME' as const,
    description: 'Ingresos por trabajo dependiente',
    icon: 'briefcase',
    color: '#059669',
    keywords: ['sueldo', 'salario', 'remuneracion', 'liquidacion', 'haberes', 'empresa'],
    patterns: ['SUELDO.*', 'REMUNERACION.*', 'LIQUIDACION.*']
  },
  
  // Freelance - Trabajo Independiente
  {
    name: 'trabajo_independiente',
    displayName: 'Trabajo Independiente',
    transactionType: 'INCOME' as const,
    description: 'Ingresos por trabajo independiente o freelance',
    icon: 'user',
    color: '#0D9488',
    keywords: ['honorarios', 'freelance', 'independiente', 'servicios', 'consultoria', 'boleta'],
    patterns: ['HONORARIOS.*', 'SERVICIOS.*', 'CONSULTORIA.*']
  },
  
  // Business - Negocio
  {
    name: 'negocio',
    displayName: 'Negocio',
    transactionType: 'INCOME' as const,
    description: 'Ingresos por actividad comercial',
    icon: 'store',
    color: '#0369A1',
    keywords: ['ventas', 'negocio', 'comercio', 'empresa', 'factura', 'ingreso'],
    patterns: ['VENTAS.*', 'FACTURA.*', 'COMERCIO.*']
  },
  
  // Investment - Inversiones
  {
    name: 'inversiones',
    displayName: 'Inversiones',
    transactionType: 'INCOME' as const,
    description: 'Ingresos por inversiones y rentas',
    icon: 'trending-up',
    color: '#7C3AED',
    keywords: ['dividendos', 'intereses', 'inversion', 'renta', 'deposito plazo', 'acciones'],
    patterns: ['DIVIDENDOS.*', 'INTERESES.*', 'RENTA.*']
  },
  
  // Other Income - Otros Ingresos
  {
    name: 'otros_ingresos',
    displayName: 'Otros Ingresos',
    transactionType: 'INCOME' as const,
    description: 'Otros tipos de ingresos',
    icon: 'plus-circle',
    color: '#65A30D',
    keywords: ['regalo', 'bono', 'subsidio', 'devolucion', 'reembolso', 'premio'],
    patterns: ['BONO.*', 'SUBSIDIO.*', 'DEVOLUCION.*']
  }
];