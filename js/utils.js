/**
 * Utilidades y Funciones Helper
 * @module utils
 * VERSIÓN MEJORADA CON FIX PARA PROCESAMIENTO DE IMÁGENES EN MÓVILES
 */

const Utils = {
  /**
   * Formatear fecha y hora
   * @param {Date} date - Fecha a formatear
   * @param {Object} options - Opciones de formato
   * @returns {string} Fecha formateada
   */
  formatDateTime(date = new Date(), options = {}) {
    try {
      const defaultOptions = {
        locale: 'es-MX',
        ...Config.photos.timestampFormat.options,
        ...options
      };
      
      return new Intl.DateTimeFormat(Config.photos.timestampFormat.locale, defaultOptions)
        .format(date);
    } catch (error) {
      console.error('Error formateando fecha:', error);
      // Fallback simple
      return new Date().toLocaleString('es-MX');
    }
  },

  /**
   * Generar ID único
   * @returns {string} ID único
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Validar email
   * @param {string} email - Email a validar
   * @returns {boolean} True si es válido
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Comprimir imagen - VERSIÓN MEJORADA
   * @param {File|Blob} file - Archivo de imagen
   * @param {Object} options - Opciones de compresión
   * @returns {Promise<string>} Data URL de imagen comprimida
   */
  async compressImage(file, options = {}) {
    const {
      maxWidth = Config.photos.maxWidth,
      maxHeight = Config.photos.maxHeight,
      quality = Config.photos.quality
    } = options;

    return new Promise((resolve, reject) => {
      // Timeout para prevenir bloqueos
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout comprimiendo imagen'));
      }, 15000); // 15 segundos

      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        // Timeout para carga de imagen
        const imgLoadTimeout = setTimeout(() => {
          clearTimeout(timeoutId);
          reject(new Error('Timeout cargando imagen'));
        }, 10000);
        
        img.onload = () => {
          clearTimeout(imgLoadTimeout);
          
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('No se pudo obtener contexto de canvas');
            }
            
            // Calcular nuevas dimensiones
            let { width, height } = img;
            
            console.log(`Dimensiones originales: ${width}x${height}`);
            
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.floor(width * ratio);
              height = Math.floor(height * ratio);
              console.log(`Nuevas dimensiones: ${width}x${height}`);
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Dibujar imagen con interpolación suave
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir a data URL con manejo de errores
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              clearTimeout(timeoutId);
              
              console.log(`Imagen comprimida: ${dataUrl.length} caracteres`);
              resolve(dataUrl);
            } catch (canvasError) {
              clearTimeout(timeoutId);
              console.error('Error en toDataURL:', canvasError);
              reject(new Error('Error convirtiendo canvas a imagen'));
            }
          } catch (error) {
            clearTimeout(timeoutId);
            console.error('Error procesando imagen:', error);
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          clearTimeout(imgLoadTimeout);
          clearTimeout(timeoutId);
          console.error('Error cargando imagen:', error);
          reject(new Error('Error cargando imagen para procesamiento'));
        };
        
        try {
          img.src = e.target.result;
        } catch (error) {
          clearTimeout(imgLoadTimeout);
          clearTimeout(timeoutId);
          reject(new Error('Error estableciendo source de imagen'));
        }
      };
      
      reader.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error('Error leyendo archivo:', error);
        reject(new Error('Error leyendo archivo'));
      };
      
      try {
        reader.readAsDataURL(file);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(new Error('Error iniciando lectura de archivo'));
      }
    });
  },

  /**
   * Agregar timestamp a imagen - VERSIÓN MEJORADA
   * @param {string} imageData - Data URL de la imagen
   * @param {string} timestamp - Timestamp a agregar
   * @returns {Promise<string>} Data URL con timestamp
   */
  async addTimestampToImage(imageData, timestamp) {
    return new Promise((resolve, reject) => {
      // Timeout de seguridad
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout agregando timestamp'));
      }, 10000);

      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('No se pudo obtener contexto de canvas');
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Dibujar imagen
          ctx.drawImage(img, 0, 0);
          
          // Configurar estilo de timestamp
          const padding = Math.max(10, img.width * 0.02);
          const fontSize = Math.max(12, Math.min(20, img.width * 0.03));
          
          // Configurar fuente
          ctx.font = `${fontSize}px Arial, sans-serif`;
          ctx.textBaseline = 'bottom';
          
          // Medir texto
          const textMetrics = ctx.measureText(timestamp);
          const textWidth = textMetrics.width;
          const textHeight = fontSize * 1.5;
          
          // Posición del timestamp (abajo a la izquierda)
          const x = padding;
          const y = img.height - padding;
          
          // Dibujar fondo con borde
          const bgPadding = padding * 0.8;
          const bgX = x - bgPadding;
          const bgY = y - textHeight - bgPadding;
          const bgWidth = textWidth + (bgPadding * 2);
          const bgHeight = textHeight + (bgPadding * 1.5);
          
          // Fondo semi-transparente
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
          
          // Borde sutil
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
          
          // Dibujar texto
          ctx.fillStyle = '#ffffff';
          ctx.fillText(timestamp, x, y - bgPadding);
          
          // Retornar imagen con timestamp
          const resultDataUrl = canvas.toDataURL('image/jpeg', Config.photos.quality);
          clearTimeout(timeoutId);
          resolve(resultDataUrl);
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('Error agregando timestamp:', error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error('Error cargando imagen para timestamp:', error);
        reject(new Error('Error cargando imagen para agregar timestamp'));
      };
      
      try {
        img.src = imageData;
      } catch (error) {
        clearTimeout(timeoutId);
        reject(new Error('Error estableciendo source de imagen'));
      }
    });
  },

  /**
   * Convertir archivo a Base64 - VERSIÓN MEJORADA
   * @param {File} file - Archivo a convertir
   * @returns {Promise<string>} String en Base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      // Timeout de seguridad
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout convirtiendo archivo a Base64'));
      }, 15000);

      const reader = new FileReader();
      
      reader.onload = () => {
        clearTimeout(timeoutId);
        resolve(reader.result);
      };
      
      reader.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error('Error en FileReader:', error);
        reject(new Error('Error leyendo archivo'));
      };
      
      try {
        reader.readAsDataURL(file);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(new Error('Error iniciando lectura de archivo'));
      }
    });
  },

  /**
   * Validar tamaño de archivo
   * @param {File} file - Archivo a validar
   * @param {number} maxSize - Tamaño máximo en bytes
   * @returns {boolean} True si el tamaño es válido
   */
  validateFileSize(file, maxSize = Config.photos.maxSize) {
    if (!file) return false;
    return file.size <= maxSize;
  },

  /**
   * Validar tipo de archivo
   * @param {File} file - Archivo a validar
   * @param {Array} allowedTypes - Tipos permitidos
   * @returns {boolean} True si el tipo es válido
   */
  validateFileType(file, allowedTypes = Config.photos.allowedTypes) {
    if (!file) return false;
    return allowedTypes.includes(file.type);
  },

  /**
   * Debounce function
   * @param {Function} func - Función a ejecutar
   * @param {number} wait - Tiempo de espera en ms
   * @returns {Function} Función con debounce
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   * @param {Function} func - Función a ejecutar
   * @param {number} limit - Límite de tiempo en ms
   * @returns {Function} Función con throttle
   */
  throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Sleep/delay function
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise} Promise que se resuelve después del delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry function con exponential backoff
   * @param {Function} fn - Función a ejecutar
   * @param {number} retries - Número de reintentos
   * @param {number} delay - Delay inicial en ms
   * @returns {Promise} Resultado de la función
   */
  async retry(fn, retries = Config.api.maxRetries, delay = Config.api.retryDelay) {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 1) throw error;
      
      if (Config.dev.enableLogs) {
        console.log(`Reintentando... (${retries - 1} intentos restantes)`);
      }
      
      await this.sleep(delay);
      return this.retry(fn, retries - 1, delay * 2);
    }
  },

  /**
   * LocalStorage wrapper con prefijo
   */
  storage: {
    /**
     * Guardar en localStorage
     * @param {string} key - Clave
     * @param {*} value - Valor a guardar
     */
    set(key, value) {
      try {
        const prefixedKey = Config.storage.prefix + key;
        const data = {
          value,
          timestamp: Date.now()
        };
        localStorage.setItem(prefixedKey, JSON.stringify(data));
      } catch (e) {
        console.error('Error guardando en localStorage:', e);
      }
    },

    /**
     * Obtener de localStorage
     * @param {string} key - Clave
     * @param {*} defaultValue - Valor por defecto
     * @returns {*} Valor almacenado o default
     */
    get(key, defaultValue = null) {
      try {
        const prefixedKey = Config.storage.prefix + key;
        const item = localStorage.getItem(prefixedKey);
        
        if (!item) return defaultValue;
        
        const data = JSON.parse(item);
        
        // Verificar expiración
        const expirationMs = Config.storage.cacheExpiration * 24 * 60 * 60 * 1000;
        if (Date.now() - data.timestamp > expirationMs) {
          this.remove(key);
          return defaultValue;
        }
        
        return data.value;
      } catch (e) {
        console.error('Error leyendo localStorage:', e);
        return defaultValue;
      }
    },

    /**
     * Eliminar de localStorage
     * @param {string} key - Clave
     */
    remove(key) {
      try {
        const prefixedKey = Config.storage.prefix + key;
        localStorage.removeItem(prefixedKey);
      } catch (e) {
        console.error('Error eliminando de localStorage:', e);
      }
    },

    /**
     * Limpiar todo el localStorage del app
     */
    clear() {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(Config.storage.prefix)) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error('Error limpiando localStorage:', e);
      }
    }
  },

  /**
   * Mostrar notificación toast
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación (success, error, info)
   * @param {number} duration - Duración en ms
   */
  showToast(message, type = 'info', duration = 3000) {
    // Crear elemento toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Agregar al DOM
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remover después de duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Detectar dispositivo móvil
   * @returns {boolean} True si es móvil
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  },

  /**
   * Detectar iOS
   * @returns {boolean} True si es iOS
   */
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  },

  /**
   * Formatear bytes a tamaño legible
   * @param {number} bytes - Bytes a formatear
   * @param {number} decimals - Decimales
   * @returns {string} Tamaño formateado
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Sanitizar string para prevenir XSS
   * @param {string} str - String a sanitizar
   * @returns {string} String sanitizado
   */
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Copiar al portapapeles
   * @param {string} text - Texto a copiar
   * @returns {Promise<boolean>} True si se copió correctamente
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        return true;
      } catch (err) {
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }
};

// Exportar para uso en otros módulos
window.Utils = Utils;

// Log de utilidades en modo desarrollo
if (Config.dev.debug && Config.dev.enableLogs) {
  console.log('🔧 Utilidades cargadas (versión mejorada)');
}