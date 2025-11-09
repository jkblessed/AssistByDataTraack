/**
 * Configuración Global del Dashboard - AssistByDataTraack
 * @module shared-config
 * Compartido entre admin y client dashboards
 */

const DashboardConfig = {
  /**
   * Configuración de Supabase
   */
  supabase: {
    // URL de tu proyecto Supabase
    url: 'https://goocbnubttmwgdoreolr.supabase.co',
    
    // Anon Key (clave pública)
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvb2NibnVidHRtd2dkb3Jlb2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODMyNzMsImV4cCI6MjA3ODA1OTI3M30.qOzvOdm0e_LgjDvyGqhXMBCsgEwVI1hyVIJCP1OzVHY',
    
    // Nombre de la tabla de asistencias
    tableName: 'asistencias',
    
    // Nombre de la tabla de usuarios (con roles)
    usersTable: 'users',
    
    // Configuración de Auth
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  },

  /**
   * Configuración de URLs
   */
  urls: {
    // Admin
    adminLogin: '/dashboard/admin/login.html',
    adminDashboard: '/dashboard/admin/dashboard.html',
    
    // Client
    clientLogin: '/dashboard/client/login.html',
    clientDashboard: '/dashboard/client/dashboard.html',
    
    // Otros
    form: '/index.html',
    home: '/'
  },

  /**
   * Roles de usuario
   */
  roles: {
    ADMIN: 'admin',
    CLIENT: 'client'
  },

  /**
   * Configuración de sesión
   */
  session: {
    // Tiempo de expiración de sesión (milisegundos)
    timeout: 24 * 60 * 60 * 1000, // 24 horas
    
    // Keys para localStorage
    storageKey: 'datatraack_session',
    userKey: 'datatraack_user',
    roleKey: 'datatraack_role',
    
    // Refrescar token automáticamente
    autoRefresh: true
  },

  /**
   * Configuración de la tabla de datos
   */
  table: {
    // Número de items por página
    itemsPerPage: 50,
    
    // Mapeo de columnas: Supabase (español) → Dashboard (inglés)
    columnMapping: {
      id: 'id',
      timestamp: 'created_at',
      nombre: 'full_name',
      cliente: 'client',
      numeroTienda: 'store_number',
      latitud: 'latitude',
      longitud: 'longitude',
      precision: 'accuracy',
      foto1: 'photo1_url',
      foto2: 'photo2_url',
      foto3: 'photo3_url',
      ticket: 'ticket_url',
      fecha: 'date',
      hora: 'time'
    },
    
    // Columnas disponibles
    columns: [
      { key: 'created_at', label: 'Fecha', sortable: true, filterable: true },
      { key: 'full_name', label: 'Nombre', sortable: true, filterable: true },
      { key: 'client', label: 'Cliente', sortable: true, filterable: true },
      { key: 'store_number', label: 'Tienda', sortable: true, filterable: true },
      { key: 'photos', label: 'Fotos', sortable: false, filterable: false },
      { key: 'location', label: 'Ubicación', sortable: false, filterable: false }
    ],
    
    // Formato de fecha
    dateFormat: {
      locale: 'es-MX',
      options: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
    }
  },

  /**
   * Configuración del mapa
   */
  map: {
    // Proveedor de mapas
    provider: 'leaflet',
    
    // Centro inicial del mapa
    defaultCenter: {
      lat: 23.6345, // Centro de México
      lng: -102.5528
    },
    
    // Zoom inicial
    defaultZoom: 5,
    
    // Tile layer
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    
    // Configuración de marcadores
    markers: {
      defaultColor: '#667eea',
      clusterRadius: 80
    }
  },

  /**
   * Configuración de exportación
   */
  export: {
    // Formato por defecto
    defaultFormat: 'xlsx',
    
    // Nombre base para archivos
    baseFilename: 'asistencias_datatraack',
    
    // Incluir timestamp en nombre
    includeTimestamp: true,
    
    // Columnas a exportar
    columns: [
      'created_at',
      'full_name',
      'client',
      'store_number',
      'latitude',
      'longitude',
      'photo1_url',
      'photo2_url',
      'photo3_url',
      'ticket_url'
    ]
  },

  /**
   * Configuración de UI
   */
  ui: {
    // Duración de mensajes (ms)
    messageDuration: 3000,
    
    // Duración de tooltips (ms)
    tooltipDelay: 300,
    
    // Animaciones
    animationDuration: 300,
    
    // Tema
    theme: 'dark',
    
    // Mostrar avatares
    showAvatars: true,
    
    // Compact mode
    compactMode: false
  },

  /**
   * Configuración de desarrollo
   */
  dev: {
    // Modo debug
    debug: false,
    
    // Logs en consola
    enableLogs: true,
    
    // Modo demo (sin Supabase real)
    demoMode: false,
    
    // Datos de prueba
    mockData: false
  },

  /**
   * Mensajes del sistema
   */
  messages: {
    errors: {
      invalidEmail: 'Por favor, ingrese un correo válido',
      invalidPassword: 'La contraseña debe tener al menos 6 caracteres',
      loginFailed: 'Credenciales inválidas',
      networkError: 'Error de conexión. Verifique su internet',
      sessionExpired: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente',
      unauthorized: 'No tiene permisos para acceder a esta página',
      supabaseNotConfigured: 'Supabase no está configurado. Configure sus credenciales en dashboard/shared/js/config.js',
      loadDataFailed: 'Error al cargar los datos',
      exportFailed: 'Error al exportar los datos',
      noData: 'No hay datos disponibles',
      invalidRole: 'Rol de usuario inválido'
    },
    success: {
      loginSuccess: 'Inicio de sesión exitoso',
      logoutSuccess: 'Sesión cerrada correctamente',
      dataLoaded: 'Datos cargados correctamente',
      exportSuccess: 'Datos exportados exitosamente'
    },
    info: {
      loggingIn: 'Iniciando sesión...',
      loggingOut: 'Cerrando sesión...',
      loading: 'Cargando...',
      exporting: 'Exportando datos...',
      noResults: 'No se encontraron resultados'
    },
    confirm: {
      logout: '¿Está seguro que desea cerrar sesión?',
      deleteSession: '¿Desea eliminar todos los datos de sesión?'
    }
  },

  /**
   * Validación
   */
  validation: {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      minLength: 3,
      maxLength: 255
    },
    password: {
      minLength: 6,
      maxLength: 128
    }
  },

  /**
   * Estadísticas
   */
  stats: {
    // Métricas a mostrar
    metrics: [
      'totalToday',
      'totalWeek',
      'totalMonth',
      'topClient',
      'topEmployee'
    ],
    
    // Refrescar cada X segundos
    refreshInterval: 60000 // 1 minuto
  }
};

// Congelar configuración
Object.freeze(DashboardConfig);

// Exportar
window.DashboardConfig = DashboardConfig;

// Validar configuración en desarrollo
if (DashboardConfig.dev.debug && DashboardConfig.dev.enableLogs) {
  console.log('🔧 Dashboard Config cargado:', DashboardConfig);
  
  // Advertir si Supabase no está configurado
  if (DashboardConfig.supabase.url === 'YOUR_SUPABASE_URL') {
    console.warn('⚠️ ADVERTENCIA: Supabase no está configurado.');
    console.warn('   Configure sus credenciales en: dashboard/shared/js/config.js');
  }
}