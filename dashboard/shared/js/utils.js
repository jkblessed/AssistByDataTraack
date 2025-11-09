/**
 * Utilidades Compartidas - AssistByDataTraack Dashboard
 * @module shared-utils
 */

const DashboardUtils = {
  /**
   * Formatear fecha
   */
  formatDate(date, options = {}) {
    try {
      const defaultOptions = {
        ...DashboardConfig.table.dateFormat.options,
        ...options
      };
      
      return new Intl.DateTimeFormat(
        DashboardConfig.table.dateFormat.locale,
        defaultOptions
      ).format(new Date(date));
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return date;
    }
  },

  /**
   * Formatear fecha relativa (hace X tiempo)
   */
  formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    
    return this.formatDate(date);
  },

  /**
   * Validar email
   */
  validateEmail(email) {
    return DashboardConfig.validation.email.pattern.test(email);
  },

  /**
   * Escapar HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Debounce
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
   * Throttle
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
   * Sleep/delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Generar ID único
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Copiar al portapapeles
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback
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
  },

  /**
   * Descargar archivo
   */
  downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Formatear número
   */
  formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  },

  /**
   * Storage helpers
   */
  storage: {
    set(key, value) {
      try {
        const prefixedKey = `${DashboardConfig.session.storageKey}_${key}`;
        localStorage.setItem(prefixedKey, JSON.stringify({
          value,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error guardando en localStorage:', error);
      }
    },

    get(key, defaultValue = null) {
      try {
        const prefixedKey = `${DashboardConfig.session.storageKey}_${key}`;
        const item = localStorage.getItem(prefixedKey);
        
        if (!item) return defaultValue;
        
        const { value } = JSON.parse(item);
        return value;
      } catch (error) {
        console.error('Error leyendo localStorage:', error);
        return defaultValue;
      }
    },

    remove(key) {
      try {
        const prefixedKey = `${DashboardConfig.session.storageKey}_${key}`;
        localStorage.removeItem(prefixedKey);
      } catch (error) {
        console.error('Error eliminando de localStorage:', error);
      }
    },

    clear() {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(DashboardConfig.session.storageKey)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error('Error limpiando localStorage:', error);
      }
    }
  },

  /**
   * Mostrar notificación toast
   */
  showToast(message, type = 'info', duration = 3000) {
    // Obtener o crear contenedor
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <svg class="toast-icon" viewBox="0 0 24 24">
          ${this.getToastIcon(type)}
        </svg>
        <span>${this.escapeHtml(message)}</span>
      </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Obtener icono para toast
   */
  getToastIcon(type) {
    const icons = {
      success: '<path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
      error: '<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>',
      warning: '<path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
      info: '<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>'
    };
    return icons[type] || icons.info;
  },

  /**
   * Confirmar acción
   */
  async confirm(message) {
    return window.confirm(message);
  },

  /**
   * Detectar dispositivo móvil
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  },

  /**
   * Obtener parámetros de URL
   */
  getUrlParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  },

  /**
   * Log de desarrollo
   */
  log(message, data = null, type = 'log') {
    if (DashboardConfig.dev.enableLogs) {
      const prefix = '[Dashboard]';
      if (data) {
        console[type](prefix, message, data);
      } else {
        console[type](prefix, message);
      }
    }
  }
};

// Exportar
window.DashboardUtils = DashboardUtils;

// Log de inicialización
DashboardUtils.log('✅ Utilidades cargadas');