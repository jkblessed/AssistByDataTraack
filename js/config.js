/**
 * Configuración Global del Sistema de Asistencias
 * @module config
 */

const Config = {
  /**
   * Configuración de API
   */
  api: {
    // URL del webhook de n8n - CAMBIAR POR TU URL
    
    webhookUrl: 'https://datatraack.app.n8n.cloud/webhook-test/e61c7618-4764-428c-a78a-06ed77f008c7',
    // Timeout para peticiones (ms)
    timeout: 30000,
    
    // Número de reintentos en caso de fallo
    maxRetries: 3,
    
    // Tiempo entre reintentos (ms)
    retryDelay: 2000
  },

  /**
   * Configuración de Fotos
   */
  photos: {
    // Tamaño máximo de archivo (bytes)
    maxSize: 5 * 1024 * 1024, // 5MB
    
    // Calidad de compresión JPEG (0-1)
    quality: 0.8,
    
    // Dimensiones máximas
    maxWidth: 1920,
    maxHeight: 1920,
    
    // Tipos de archivo permitidos
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    
    // Número de fotos requeridas
    requiredPhotos: 3,
    
    // Configuración de marca de agua
    watermark: {
      enabled: true,
      companyName: 'Sistema de Asistencias',
      showDate: true,
      showTime: true,
      showCompany: true,
      position: 'bottom-left', // bottom-left, bottom-right, top-left, top-right
      fontSize: 'auto', // auto o número específico
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      textColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      showIcons: true // Mostrar íconos de calendario y reloj
    },
    
    // Timestamp formato
    timestampFormat: {
      locale: 'es-MX',
      options: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }
    }
  },

  /**
   * Configuración de Geolocalización
   */
  location: {
    // Opciones para getCurrentPosition
    options: {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    },
    
    // Precisión mínima aceptable (metros)
    minAccuracy: 100,
    
    // Reintentos de ubicación
    maxRetries: 3
  },

  /**
   * Lista de Clientes
   */
  clients: [
    { value: 'walmart', label: 'Walmart' },
    { value: 'target', label: 'Target' },
    { value: 'costco', label: 'Costco' },
    { value: 'home_depot', label: 'Home Depot' },
    { value: 'lowes', label: "Lowe's" },
    { value: 'best_buy', label: 'Best Buy' },
    { value: 'kroger', label: 'Kroger' },
    { value: 'walgreens', label: 'Walgreens' },
    { value: 'cvs', label: 'CVS' },
    { value: 'sams_club', label: "Sam's Club" },
    { value: 'whole_foods', label: 'Whole Foods' },
    { value: 'trader_joes', label: "Trader Joe's" },
    { value: 'otro', label: 'Otro' }
  ],

  /**
   * Configuración de Validación
   */
  validation: {
    // Longitud mínima del nombre
    nameMinLength: 3,
    
    // Longitud máxima del nombre
    nameMaxLength: 100,
    
    // Número de tienda mínimo
    storeNumberMin: 1,
    
    // Número de tienda máximo
    storeNumberMax: 99999,
    
    // Expresiones regulares
    patterns: {
      name: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      storeNumber: /^\d{1,5}$/
    }
  },

  /**
   * Configuración de UI
   */
  ui: {
    // Duración de mensajes de éxito/error (ms)
    messageDuration: 5000,
    
    // Duración de animaciones (ms)
    animationDuration: 300,
    
    // Delay antes de limpiar formulario después de éxito (ms)
    resetDelay: 3000,
    
    // Mostrar loader de página al inicio
    showPageLoader: true,
    
    // Tiempo mínimo de loader de página (ms)
    minLoaderTime: 500
  },

  /**
   * Configuración de Almacenamiento Local
   */
  storage: {
    // Prefijo para las keys en localStorage
    prefix: 'attendance_',
    
    // Keys disponibles
    keys: {
      lastSubmission: 'last_submission',
      userName: 'user_name',
      preferredClient: 'preferred_client',
      statistics: 'statistics'
    },
    
    // Tiempo de expiración de datos en cache (días)
    cacheExpiration: 7
  },

  /**
   * Configuración de PWA
   */
  pwa: {
    // Habilitar características PWA
    enabled: true,
    
    // Nombre de la app
    appName: 'Control de Asistencias',
    
    // Descripción corta
    shortName: 'Asistencias',
    
    // Color de tema
    themeColor: '#667eea',
    
    // Color de fondo
    backgroundColor: '#ffffff'
  },

  /**
   * Configuración de Desarrollo
   */
  dev: {
    // Modo debug
    debug: false,
    
    // Mostrar logs en consola
    enableLogs: true,
    
    // Simular envío sin hacer petición real
    mockSubmit: false,
    
    // Delay simulado para testing (ms)
    mockDelay: 2000
  },

  /**
   * Mensajes del Sistema
   */
  messages: {
    errors: {
      nameRequired: 'Por favor, ingrese su nombre completo',
      nameInvalid: 'El nombre solo puede contener letras y espacios',
      nameLength: 'El nombre debe tener entre 3 y 100 caracteres',
      clientRequired: 'Por favor, seleccione un cliente',
      storeRequired: 'Por favor, ingrese el número de tienda',
      storeInvalid: 'El número de tienda debe ser un número válido',
      photosRequired: 'Por favor, capture todas las fotos requeridas',
      ticketRequired: 'Por favor, capture la foto del ticket',
      photoSize: 'La foto es muy grande. Máximo 5MB',
      photoType: 'Formato de imagen no válido',
      locationFailed: 'No se pudo obtener la ubicación',
      submitFailed: 'Error al enviar. Por favor, intente nuevamente',
      networkError: 'Error de conexión. Verifique su internet',
      timeout: 'La solicitud tardó demasiado tiempo',
      serverError: 'Error del servidor. Intente más tarde'
    },
    success: {
      photoUploaded: 'Foto capturada correctamente',
      locationObtained: 'Ubicación obtenida',
      submissionComplete: '¡Asistencia registrada exitosamente!',
      photoRemoved: 'Foto eliminada'
    },
    info: {
      obtainingLocation: 'Obteniendo ubicación...',
      submitting: 'Enviando asistencia...',
      compressingPhoto: 'Procesando foto...',
      retrying: 'Reintentando...'
    }
  },

  /**
   * Feature Flags
   */
  features: {
    // Habilitar geolocalización
    enableLocation: true,
    
    // Hacer ubicación obligatoria para enviar
    requireLocation: true,
    
    // Habilitar compresión de imágenes
    enableCompression: true,
    
    // Habilitar timestamps en fotos
    enableTimestamps: true,
    
    // Habilitar validación en tiempo real
    enableRealtimeValidation: true,
    
    // Habilitar auto-guardado
    enableAutosave: false,
    
    // Habilitar modo offline
    enableOfflineMode: false,
    
    // Habilitar analytics
    enableAnalytics: false
  }
};

// Congelar configuración para evitar modificaciones
Object.freeze(Config);

// Exportar para uso en otros módulos
window.Config = Config;

// Log de configuración en modo desarrollo
if (Config.dev.debug && Config.dev.enableLogs) {
  console.log('🔧 Configuración cargada:', Config);
}