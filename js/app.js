/**
 * Aplicación Principal - Sistema de Control de Asistencias
 * @module app
 * VERSIÓN MEJORADA CON FIX PARA FOTOS EN MÓVILES
 */

class AttendanceApp {
  constructor() {
    this.form = null;
    this.photoData = {};
    this.timestamps = {};
    this.location = null;
    this.isSubmitting = false;
    this.debugMode = true; // Activar para ver logs detallados
    
    this.init();
  }

  /**
   * Inicializar la aplicación
   */
  async init() {
    try {
      // Mostrar loader de página
      this.showPageLoader();
      
      // Esperar a que el DOM esté listo
      await this.domReady();
      
      // Inicializar elementos del DOM
      this.initElements();
      
      // Cargar configuración de clientes
      this.loadClients();
      
      // Inicializar manejadores de eventos
      this.initEventHandlers();
      
      // Inicializar módulos
      await this.initModules();
      
      // Cargar datos guardados
      this.loadSavedData();
      
      // Ocultar loader de página
      await this.hidePageLoader();
      
      this.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
      console.error('Error inicializando aplicación:', error);
      this.showError('Error al inicializar la aplicación');
    }
  }

  /**
   * Log mejorado para debugging
   */
  log(message, data = null) {
    if (this.debugMode || Config.dev.enableLogs) {
      console.log(`[AttendanceApp] ${message}`, data || '');
    }
  }

  /**
   * Esperar a que el DOM esté listo
   */
  domReady() {
    return new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Inicializar elementos del DOM
   */
  initElements() {
    this.form = document.getElementById('attendanceForm');
    this.submitBtn = document.getElementById('submitBtn');
    this.successMessage = document.getElementById('successMessage');
    this.errorMessage = document.getElementById('errorMessage');
    this.locationStatus = document.getElementById('locationStatus');
    this.locationCoords = document.getElementById('locationCoords');
    this.retryLocationBtn = document.getElementById('retryLocationBtn');
  }

  /**
   * Cargar lista de clientes
   */
  loadClients() {
    const clientSelect = document.getElementById('client');
    
    // Limpiar opciones existentes
    clientSelect.innerHTML = '<option value="">Seleccione un cliente</option>';
    
    // Agregar opciones de configuración
    Config.clients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.value;
      option.textContent = client.label;
      clientSelect.appendChild(option);
    });
  }

  /**
   * Inicializar manejadores de eventos
   */
  initEventHandlers() {
    // Evento de envío del formulario
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Evento de reintentar ubicación
    if (this.retryLocationBtn) {
      this.retryLocationBtn.addEventListener('click', () => this.retryLocation());
    }
    
    // Eventos de captura de fotos - MEJORADO
    const photoContainers = document.querySelectorAll('.photo-upload-container');
    photoContainers.forEach(container => {
      const photoId = container.dataset.photoId;
      const input = container.querySelector('.photo-input');
      const removeBtn = container.querySelector('.photo-remove');
      
      this.log(`Configurando contenedor de foto: ${photoId}`);
      
      // Click en el contenedor
      container.addEventListener('click', (e) => {
        if (!e.target.closest('.photo-remove') && !container.classList.contains('has-photo')) {
          this.log(`Click en contenedor ${photoId}, abriendo selector de archivos`);
          input.click();
        }
      });
      
      // Cambio en el input de archivo - MEJORADO
      input.addEventListener('change', async (e) => {
        this.log(`Evento change detectado para ${photoId}`, {
          filesLength: e.target.files.length,
          hasFile: !!e.target.files[0]
        });
        
        await this.handlePhotoCapture(e, photoId);
      });
      
      // Botón de eliminar foto
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removePhoto(photoId);
        });
      }
    });
    
    // Validación en tiempo real
    if (Config.features.enableRealtimeValidation) {
      const inputs = this.form.querySelectorAll('input[required], select[required]');
      inputs.forEach(input => {
        input.addEventListener('blur', () => this.validateField(input));
        input.addEventListener('invalid', (e) => {
          e.preventDefault();
          this.validateField(input);
        });
      });
    }
  }

  /**
   * Inicializar módulos
   */
  async initModules() {
    // Inicializar geolocalización
    if (Config.features.enableLocation) {
      await this.initLocation();
    }
    
    // Inicializar service worker para PWA
    if (Config.pwa.enabled && 'serviceWorker' in navigator) {
      this.initServiceWorker();
    }
  }

  /**
   * Inicializar geolocalización
   */
  async initLocation() {
    if (!navigator.geolocation) {
      this.updateLocationStatus('error', 'Geolocalización no soportada');
      this.disableSubmitButton('Geolocalización requerida');
      return;
    }
    
    this.updateLocationStatus('loading', 'Obteniendo ubicación...');
    this.retryLocationBtn.style.display = 'none';
    
    try {
      const position = await this.getCurrentPosition();
      this.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      
      this.updateLocationStatus('success', 'Ubicación obtenida', 
        `Lat: ${this.location.latitude.toFixed(6)}, Lng: ${this.location.longitude.toFixed(6)}`
      );
      
      // Habilitar botón de envío
      this.enableSubmitButton();
      this.retryLocationBtn.style.display = 'none';
      
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      let errorMessage = 'No se pudo obtener la ubicación';
      
      if (error.code === 1) {
        errorMessage = 'Permiso de ubicación denegado';
      } else if (error.code === 2) {
        errorMessage = 'Ubicación no disponible';
      } else if (error.code === 3) {
        errorMessage = 'Tiempo de espera agotado';
      }
      
      this.updateLocationStatus('error', errorMessage);
      this.disableSubmitButton('Ubicación requerida para enviar');
      this.retryLocationBtn.style.display = 'flex';
    }
  }

  /**
   * Reintentar obtener ubicación
   */
  async retryLocation() {
    this.log('🔄 Reintentando obtener ubicación...');
    await this.initLocation();
  }

  /**
   * Deshabilitar botón de envío
   */
  disableSubmitButton(reason) {
    this.submitBtn.disabled = true;
    this.submitBtn.innerHTML = `
      <span class="btn-text">${reason}</span>
    `;
    this.submitBtn.style.opacity = '0.5';
    this.submitBtn.style.cursor = 'not-allowed';
  }

  /**
   * Habilitar botón de envío
   */
  enableSubmitButton() {
    this.submitBtn.disabled = false;
    this.submitBtn.innerHTML = `
      <span class="btn-text">Enviar Asistencia</span>
      <span class="btn-loader"></span>
    `;
    this.submitBtn.style.opacity = '1';
    this.submitBtn.style.cursor = 'pointer';
  }

  /**
   * Obtener posición actual con Promise
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        Config.location.options
      );
    });
  }

  /**
   * Actualizar estado de ubicación en UI
   */
  updateLocationStatus(status, text, coords = '') {
    const statusElement = document.getElementById('locationStatus');
    const statusText = statusElement.querySelector('.location-status-text');
    const coordsElement = document.getElementById('locationCoords');
    
    // Actualizar clases
    statusElement.classList.remove('success', 'error');
    if (status === 'success') {
      statusElement.classList.add('success');
    } else if (status === 'error') {
      statusElement.classList.add('error');
    }
    
    // Actualizar texto
    statusText.textContent = text;
    coordsElement.textContent = coords;
  }

  /**
   * Manejar captura de foto - VERSIÓN MEJORADA
   */
  async handlePhotoCapture(event, photoId) {
    this.log(`📸 Iniciando captura de foto ${photoId}`);
    
    const file = event.target.files[0];
    
    if (!file) {
      this.log(`⚠️ No se seleccionó ningún archivo para ${photoId}`);
      return;
    }
    
    this.log(`📁 Archivo seleccionado para ${photoId}:`, {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    try {
      // Mostrar indicador de procesamiento
      this.showProcessingIndicator(photoId);
      
      // Validar tamaño
      if (!Utils.validateFileSize(file)) {
        this.log(`❌ Archivo muy grande: ${file.size} bytes`);
        this.showError(Config.messages.errors.photoSize);
        event.target.value = '';
        this.hideProcessingIndicator(photoId);
        return;
      }
      
      // Validar tipo
      if (!Utils.validateFileType(file)) {
        this.log(`❌ Tipo de archivo no válido: ${file.type}`);
        this.showError(Config.messages.errors.photoType);
        event.target.value = '';
        this.hideProcessingIndicator(photoId);
        return;
      }
      
      this.log(`✅ Validaciones pasadas para ${photoId}`);
      
      // Procesar imagen con fallback
      let imageData;
      try {
        if (Config.features.enableCompression) {
          this.log(`🔄 Comprimiendo imagen ${photoId}...`);
          imageData = await Utils.compressImage(file);
          this.log(`✅ Imagen comprimida ${photoId}`);
        } else {
          this.log(`🔄 Convirtiendo a Base64 ${photoId}...`);
          imageData = await Utils.fileToBase64(file);
          this.log(`✅ Convertido a Base64 ${photoId}`);
        }
      } catch (compressionError) {
        // Fallback si falla la compresión
        this.log(`⚠️ Error en compresión, usando fallback para ${photoId}:`, compressionError);
        imageData = await Utils.fileToBase64(file);
        this.log(`✅ Fallback exitoso ${photoId}`);
      }
      
      // Agregar timestamp si está habilitado
      const timestamp = Utils.formatDateTime();
      if (Config.features.enableTimestamps) {
        try {
          this.log(`🔄 Agregando timestamp a ${photoId}...`);
          imageData = await Utils.addTimestampToImage(imageData, timestamp);
          this.log(`✅ Timestamp agregado a ${photoId}`);
        } catch (timestampError) {
          // Si falla el timestamp, usar la imagen sin timestamp
          this.log(`⚠️ Error agregando timestamp a ${photoId}, continuando sin él:`, timestampError);
        }
      }
      
      // Guardar datos
      this.photoData[photoId] = imageData;
      this.timestamps[photoId] = timestamp;
      
      this.log(`💾 Datos guardados para ${photoId}`);
      
      // Actualizar UI
      this.updatePhotoUI(photoId, imageData, timestamp);
      
      // Ocultar indicador de procesamiento
      this.hideProcessingIndicator(photoId);
      
      // Mostrar mensaje de éxito
      this.log(`✅ Foto ${photoId} capturada exitosamente`);
      
      // Mostrar confirmación visual
      this.showToast(`Foto ${photoId} capturada correctamente`, 'success');
      
    } catch (error) {
      console.error(`Error procesando foto ${photoId}:`, error);
      this.log(`❌ Error fatal procesando ${photoId}:`, error);
      
      // Ocultar indicador de procesamiento
      this.hideProcessingIndicator(photoId);
      
      // Mostrar error específico
      let errorMessage = 'Error al procesar la foto';
      if (error.message) {
        errorMessage += ': ' + error.message;
      }
      this.showError(errorMessage);
      
      // Limpiar input
      event.target.value = '';
    }
  }

  /**
   * Mostrar indicador de procesamiento
   */
  showProcessingIndicator(photoId) {
    const container = document.querySelector(`[data-photo-id="${photoId}"]`);
    if (container) {
      // Agregar clase de procesamiento
      container.classList.add('processing');
      
      // Agregar spinner
      const placeholder = container.querySelector('.photo-placeholder');
      if (placeholder) {
        placeholder.innerHTML = `
          <div class="processing-spinner"></div>
          <span class="photo-label">Procesando...</span>
        `;
      }
    }
  }

  /**
   * Ocultar indicador de procesamiento
   */
  hideProcessingIndicator(photoId) {
    const container = document.querySelector(`[data-photo-id="${photoId}"]`);
    if (container) {
      container.classList.remove('processing');
      
      // Restaurar placeholder original si no hay foto
      if (!container.classList.contains('has-photo')) {
        const placeholder = container.querySelector('.photo-placeholder');
        if (placeholder) {
          placeholder.innerHTML = `
            <svg class="camera-icon" viewBox="0 0 24 24">
              <path d="M12 15.2A3.2 3.2 0 1 1 15.2 12 3.2 3.2 0 0 1 12 15.2zm0-4.8A1.6 1.6 0 1 0 13.6 12 1.6 1.6 0 0 0 12 10.4z"/>
              <path d="M20 4h-3.17L15 2H9L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H4V6h4.05l1.83-2h4.24l1.83 2H20v12z"/>
            </svg>
            <span class="photo-label">Foto ${photoId}</span>
            <span class="photo-hint">Toque para capturar</span>
          `;
        }
      }
    }
  }

  /**
   * Mostrar notificación toast
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    }, 10);
    
    // Remover después de 3 segundos
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Actualizar UI de foto
   */
  updatePhotoUI(photoId, imageData, timestamp) {
    this.log(`🎨 Actualizando UI para ${photoId}`);
    
    const container = document.querySelector(`[data-photo-id="${photoId}"]`);
    if (!container) {
      this.log(`❌ No se encontró contenedor para ${photoId}`);
      return;
    }
    
    const preview = container.querySelector('.photo-preview');
    const timestampElement = container.querySelector('.photo-timestamp');
    
    // Actualizar preview
    if (preview) {
      preview.src = imageData;
      preview.onload = () => {
        this.log(`✅ Preview cargado para ${photoId}`);
      };
      preview.onerror = () => {
        this.log(`❌ Error cargando preview para ${photoId}`);
      };
    }
    
    // Actualizar timestamp
    if (timestampElement) {
      timestampElement.textContent = timestamp;
    }
    
    // Marcar como foto capturada
    container.classList.add('has-photo');
    
    this.log(`✅ UI actualizada para ${photoId}`);
  }

  /**
   * Eliminar foto
   */
  removePhoto(photoId) {
    const container = document.querySelector(`[data-photo-id="${photoId}"]`);
    const input = container.querySelector('.photo-input');
    const preview = container.querySelector('.photo-preview');
    
    // Limpiar datos
    delete this.photoData[photoId];
    delete this.timestamps[photoId];
    
    // Limpiar UI
    input.value = '';
    preview.src = '';
    container.classList.remove('has-photo');
    
    this.log(`🗑️ Foto ${photoId} eliminada`);
    this.showToast(`Foto ${photoId} eliminada`, 'info');
  }

  /**
   * Validar campo individual
   */
  validateField(field) {
    const errorElement = document.getElementById(`${field.id}Error`);
    if (!errorElement) return true;
    
    let isValid = true;
    let errorMessage = '';
    
    // Validación según tipo de campo
    if (field.id === 'fullName') {
      if (!field.value.trim()) {
        errorMessage = Config.messages.errors.nameRequired;
        isValid = false;
      } else if (field.value.length < Config.validation.nameMinLength) {
        errorMessage = Config.messages.errors.nameLength;
        isValid = false;
      } else if (!Config.validation.patterns.name.test(field.value)) {
        errorMessage = Config.messages.errors.nameInvalid;
        isValid = false;
      }
    } else if (field.id === 'client') {
      if (!field.value) {
        errorMessage = Config.messages.errors.clientRequired;
        isValid = false;
      }
    } else if (field.id === 'storeNumber') {
      if (!field.value) {
        errorMessage = Config.messages.errors.storeRequired;
        isValid = false;
      } else if (!Config.validation.patterns.storeNumber.test(field.value)) {
        errorMessage = Config.messages.errors.storeInvalid;
        isValid = false;
      }
    }
    
    // Mostrar/ocultar error
    if (!isValid) {
      errorElement.textContent = errorMessage;
      errorElement.classList.add('active');
      field.classList.add('error');
    } else {
      errorElement.textContent = '';
      errorElement.classList.remove('active');
      field.classList.remove('error');
    }
    
    return isValid;
  }

  /**
   * Validar formulario completo
   */
  validateForm() {
    let isValid = true;
    
    // Validar campos requeridos
    const requiredFields = this.form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    // Validar fotos
    const requiredPhotos = ['1', '2', '3', 'ticket'];
    const missingPhotos = requiredPhotos.filter(id => !this.photoData[id]);
    
    if (missingPhotos.length > 0) {
      if (missingPhotos.includes('ticket')) {
        this.showError(Config.messages.errors.ticketRequired);
      } else {
        this.showError(Config.messages.errors.photosRequired);
      }
      isValid = false;
    }
    
    // Validar ubicación
    if (!this.location || !this.location.latitude || !this.location.longitude) {
      this.showError('La ubicación es requerida. Por favor, active el GPS y presione "Reintentar"');
      // Hacer scroll hasta la sección de ubicación
      document.getElementById('locationStatus').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      isValid = false;
    }
    
    return isValid;
  }

  /**
   * Manejar envío del formulario
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    // Prevenir doble envío
    if (this.isSubmitting) return;
    
    // Validar formulario
    if (!this.validateForm()) {
      return;
    }
    
    this.isSubmitting = true;
    this.setSubmitState('loading');
    
    try {
      // Preparar datos
      const formData = this.prepareFormData();
      
      // Modo mock para desarrollo
      if (Config.dev.mockSubmit) {
        await Utils.sleep(Config.dev.mockDelay);
        this.handleSubmitSuccess({ id: Utils.generateId() });
        return;
      }
      
      // Enviar datos
      const response = await this.submitData(formData);
      
      // Manejar respuesta exitosa
      this.handleSubmitSuccess(response);
      
    } catch (error) {
      console.error('Error enviando formulario:', error);
      this.handleSubmitError(error);
    } finally {
      this.isSubmitting = false;
      this.setSubmitState('default');
    }
  }

  /**
   * Preparar datos del formulario
   */
  prepareFormData() {
    const formData = {
      // Datos personales
      fullName: document.getElementById('fullName').value.trim(),
      client: document.getElementById('client').value,
      storeNumber: document.getElementById('storeNumber').value,
      
      // Fotos
      photos: {
        photo1: this.photoData['1'],
        photo2: this.photoData['2'],
        photo3: this.photoData['3'],
        ticket: this.photoData['ticket']
      },
      
      // Timestamps
      timestamps: this.timestamps,
      
      // Ubicación
      location: this.location || {
        latitude: null,
        longitude: null,
        accuracy: null
      },
      
      // Metadata
      submitTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: navigator.userAgent,
      appVersion: '1.0.0'
    };
    
    return formData;
  }

  /**
   * Enviar datos al servidor
   */
  async submitData(data) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Config.api.timeout);
    
    try {
      const response = await fetch(Config.api.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(Config.messages.errors.timeout);
      }
      
      throw error;
    }
  }

  /**
   * Manejar envío exitoso
   */
  handleSubmitSuccess(response) {
    // Guardar estadísticas
    this.updateStatistics();
    
    // Mostrar mensaje de éxito
    this.showSuccess(Config.messages.success.submissionComplete);
    
    // Guardar última sumisión
    Utils.storage.set(Config.storage.keys.lastSubmission, {
      date: new Date().toISOString(),
      id: response.id || Utils.generateId()
    });
    
    // Limpiar formulario después de un delay
    setTimeout(() => {
      this.resetForm();
    }, Config.ui.resetDelay);
    
    this.log('✅ Asistencia enviada:', response);
  }

  /**
   * Manejar error de envío
   */
  handleSubmitError(error) {
    let errorMessage = Config.messages.errors.submitFailed;
    
    if (error.message.includes('fetch')) {
      errorMessage = Config.messages.errors.networkError;
    } else if (error.message.includes('timeout')) {
      errorMessage = Config.messages.errors.timeout;
    } else if (error.message.includes('500')) {
      errorMessage = Config.messages.errors.serverError;
    }
    
    this.showError(errorMessage);
  }

  /**
   * Establecer estado del botón de envío
   */
  setSubmitState(state) {
    if (state === 'loading') {
      this.submitBtn.disabled = true;
      this.submitBtn.classList.add('loading');
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.classList.remove('loading');
    }
  }

  /**
   * Resetear formulario
   */
  resetForm() {
    // Limpiar formulario
    this.form.reset();
    
    // Limpiar fotos
    this.photoData = {};
    this.timestamps = {};
    
    // Limpiar UI de fotos
    const photoContainers = document.querySelectorAll('.photo-upload-container');
    photoContainers.forEach(container => {
      container.classList.remove('has-photo');
      const preview = container.querySelector('.photo-preview');
      if (preview) preview.src = '';
    });
    
    // Reiniciar ubicación
    if (Config.features.enableLocation) {
      this.initLocation();
    }
    
    // Ocultar mensajes
    this.hideMessages();
  }

  /**
   * Mostrar mensaje de éxito
   */
  showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    const messageText = successElement.querySelector('p');
    
    if (messageText) {
      messageText.textContent = message;
    }
    
    successElement.classList.add('active');
    
    // Auto-ocultar después de un tiempo
    setTimeout(() => {
      successElement.classList.remove('active');
    }, Config.ui.messageDuration);
  }

  /**
   * Mostrar mensaje de error
   */
  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const messageText = document.getElementById('errorMessageText');
    
    if (messageText) {
      messageText.textContent = message;
    }
    
    errorElement.classList.add('active');
    
    // Auto-ocultar después de un tiempo
    setTimeout(() => {
      errorElement.classList.remove('active');
    }, Config.ui.messageDuration);
  }

  /**
   * Ocultar todos los mensajes
   */
  hideMessages() {
    document.getElementById('successMessage').classList.remove('active');
    document.getElementById('errorMessage').classList.remove('active');
  }

  /**
   * Cargar datos guardados
   */
  loadSavedData() {
    // Cargar nombre de usuario si existe
    const savedName = Utils.storage.get(Config.storage.keys.userName);
    if (savedName) {
      document.getElementById('fullName').value = savedName;
    }
    
    // Cargar cliente preferido
    const savedClient = Utils.storage.get(Config.storage.keys.preferredClient);
    if (savedClient) {
      document.getElementById('client').value = savedClient;
    }
  }

  /**
   * Actualizar estadísticas
   */
  updateStatistics() {
    const stats = Utils.storage.get(Config.storage.keys.statistics, {
      totalSubmissions: 0,
      lastSubmission: null,
      clients: {}
    });
    
    const client = document.getElementById('client').value;
    
    stats.totalSubmissions++;
    stats.lastSubmission = new Date().toISOString();
    stats.clients[client] = (stats.clients[client] || 0) + 1;
    
    Utils.storage.set(Config.storage.keys.statistics, stats);
    
    // Guardar nombre y cliente para próxima vez
    Utils.storage.set(Config.storage.keys.userName, document.getElementById('fullName').value);
    Utils.storage.set(Config.storage.keys.preferredClient, client);
  }

  /**
   * Mostrar loader de página
   */
  showPageLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
      loader.classList.remove('hidden');
    }
  }

  /**
   * Ocultar loader de página
   */
  async hidePageLoader() {
    if (Config.ui.showPageLoader) {
      await Utils.sleep(Config.ui.minLoaderTime);
    }
    
    const loader = document.getElementById('pageLoader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.style.display = 'none', 300);
    }
  }

  /**
   * Inicializar Service Worker para PWA
   */
  async initServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado:', registration.scope);
    } catch (error) {
      console.log('Service Worker no pudo ser registrado:', error);
    }
  }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.attendanceApp = new AttendanceApp();
});

// Exportar clase para testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AttendanceApp;
}