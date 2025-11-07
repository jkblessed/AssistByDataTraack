/**
 * AplicaciÃ³n Principal - Sistema de Control de Asistencias
 * @module app
 */

class AttendanceApp {
  constructor() {
    this.form = null;
    this.photoData = {};
    this.timestamps = {};
    this.location = null;
    this.isSubmitting = false;
    
    this.init();
  }

  /**
   * Inicializar la aplicaciÃ³n
   */
  async init() {
    try {
      // Mostrar loader de pÃ¡gina
      this.showPageLoader();
      
      // Esperar a que el DOM estÃ© listo
      await this.domReady();
      
      // Inicializar elementos del DOM
      this.initElements();
      
      // Cargar configuraciÃ³n de clientes
      this.loadClients();
      
      // Inicializar manejadores de eventos
      this.initEventHandlers();
      
      // Inicializar mÃ³dulos
      await this.initModules();
      
      // Cargar datos guardados
      this.loadSavedData();
      
      // Ocultar loader de pÃ¡gina
      await this.hidePageLoader();
      
      if (Config.dev.enableLogs) {
        console.log('âœ… AplicaciÃ³n inicializada correctamente');
      }
    } catch (error) {
      console.error('Error inicializando aplicaciÃ³n:', error);
      this.showError('Error al inicializar la aplicaciÃ³n');
    }
  }

  /**
   * Esperar a que el DOM estÃ© listo
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
    
    // Agregar opciones de configuraciÃ³n
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
    // Evento de envÃ­o del formulario
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Evento de reintentar ubicaciÃ³n
    if (this.retryLocationBtn) {
      this.retryLocationBtn.addEventListener('click', () => this.retryLocation());
    }
    
    // Eventos de captura de fotos
    const photoContainers = document.querySelectorAll('.photo-upload-container');
    photoContainers.forEach(container => {
      const photoId = container.dataset.photoId;
      const removeBtn = container.querySelector('.photo-remove');
      
      // Click en el botón contenedor para capturar foto
      container.addEventListener('click', (e) => {
        // Si el click fue en el botón de eliminar, no hacer nada
        if (e.target.closest('.photo-remove')) return;
        
        // Si ya tiene foto, no abrir selector
        if (container.classList.contains('has-photo')) return;
        
        // Crear input dinámicamente
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        // Manejar selección de archivo
        input.addEventListener('change', (changeEvent) => {
          this.handlePhotoCapture(changeEvent, photoId);
        });
        
        // Disparar click en el input
        input.click();
      });
      
      // Botón de eliminar foto
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removePhoto(photoId);
        });
      }
    });
    
    // ValidaciÃ³n en tiempo real
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
   * Inicializar mÃ³dulos
   */
  async initModules() {
    // Inicializar geolocalizaciÃ³n
    if (Config.features.enableLocation) {
      await this.initLocation();
    }
    
    // Inicializar service worker para PWA
    if (Config.pwa.enabled && 'serviceWorker' in navigator) {
      this.initServiceWorker();
    }
  }

  /**
   * Inicializar geolocalizaciÃ³n
   */
  async initLocation() {
    if (!navigator.geolocation) {
      this.updateLocationStatus('error', 'GeolocalizaciÃ³n no soportada');
      this.disableSubmitButton('GeolocalizaciÃ³n requerida');
      return;
    }
    
    this.updateLocationStatus('loading', 'Obteniendo ubicaciÃ³n...');
    this.retryLocationBtn.style.display = 'none';
    
    try {
      const position = await this.getCurrentPosition();
      this.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      
      this.updateLocationStatus('success', 'UbicaciÃ³n obtenida', 
        `Lat: ${this.location.latitude.toFixed(6)}, Lng: ${this.location.longitude.toFixed(6)}`
      );
      
      // Habilitar botÃ³n de envÃ­o
      this.enableSubmitButton();
      this.retryLocationBtn.style.display = 'none';
      
    } catch (error) {
      console.error('Error obteniendo ubicaciÃ³n:', error);
      let errorMessage = 'No se pudo obtener la ubicaciÃ³n';
      
      if (error.code === 1) {
        errorMessage = 'Permiso de ubicaciÃ³n denegado';
      } else if (error.code === 2) {
        errorMessage = 'UbicaciÃ³n no disponible';
      } else if (error.code === 3) {
        errorMessage = 'Tiempo de espera agotado';
      }
      
      this.updateLocationStatus('error', errorMessage);
      this.disableSubmitButton('UbicaciÃ³n requerida para enviar');
      this.retryLocationBtn.style.display = 'flex';
    }
  }

  /**
   * Reintentar obtener ubicaciÃ³n
   */
  async retryLocation() {
    if (Config.dev.enableLogs) {
      console.log('ðŸ”„ Reintentando obtener ubicaciÃ³n...');
    }
    await this.initLocation();
  }

  /**
   * Deshabilitar botÃ³n de envÃ­o
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
   * Habilitar botÃ³n de envÃ­o
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
   * Obtener posiciÃ³n actual con Promise
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
   * Actualizar estado de ubicaciÃ³n en UI
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
   * Manejar captura de foto
   */
  async handlePhotoCapture(event, photoId) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      // Validar tamaÃ±o
      if (!Utils.validateFileSize(file)) {
        this.showError(Config.messages.errors.photoSize);
        event.target.value = '';
        return;
      }
      
      // Validar tipo
      if (!Utils.validateFileType(file)) {
        this.showError(Config.messages.errors.photoType);
        event.target.value = '';
        return;
      }
      
      // Comprimir imagen si estÃ¡ habilitado
      let imageData;
      if (Config.features.enableCompression) {
        imageData = await Utils.compressImage(file);
      } else {
        imageData = await Utils.fileToBase64(file);
      }
      
      // Agregar timestamp si estÃ¡ habilitado
      const timestamp = Utils.formatDateTime();
      if (Config.features.enableTimestamps) {
        imageData = await Utils.addTimestampToImage(imageData, timestamp);
      }
      
      // Guardar datos
      this.photoData[photoId] = imageData;
      this.timestamps[photoId] = timestamp;
      
      // Actualizar UI
      this.updatePhotoUI(photoId, imageData, timestamp);
      
      // Mostrar mensaje de Ã©xito
      if (Config.dev.enableLogs) {
        console.log(`âœ… Foto ${photoId} capturada`);
      }
      
    } catch (error) {
      console.error('Error procesando foto:', error);
      this.showError('Error al procesar la foto');
      event.target.value = '';
    }
  }

  /**
   * Actualizar UI de foto
   */
  updatePhotoUI(photoId, imageData, timestamp) {
    const container = document.querySelector(`[data-photo-id="${photoId}"]`);
    const preview = container.querySelector('.photo-preview');
    const timestampElement = container.querySelector('.photo-timestamp');
    
    // Actualizar preview
    preview.src = imageData;
    
    // Actualizar timestamp
    if (timestampElement) {
      timestampElement.textContent = timestamp;
    }
    
    // Marcar como foto capturada
    container.classList.add('has-photo');
  }

  /**
   * Eliminar foto
   */
  removePhoto(photoId) {
    const container = document.querySelector(`[data-photo-id="${photoId}"]`);
    const preview = container.querySelector('.photo-preview');
    
    // Limpiar datos
    delete this.photoData[photoId];
    delete this.timestamps[photoId];
    
    // Limpiar UI
    preview.src = '';
    container.classList.remove('has-photo');
    
    if (Config.dev.enableLogs) {
      console.log(`ðŸ—‘ï¸ Foto ${photoId} eliminada`);
    }
  }

  /**
   * Validar campo individual
   */
  validateField(field) {
    const errorElement = document.getElementById(`${field.id}Error`);
    if (!errorElement) return true;
    
    let isValid = true;
    let errorMessage = '';
    
    // ValidaciÃ³n segÃºn tipo de campo
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
    
    // Validar ubicaciÃ³n
    if (!this.location || !this.location.latitude || !this.location.longitude) {
      this.showError('La ubicaciÃ³n es requerida. Por favor, active el GPS y presione "Reintentar"');
      // Hacer scroll hasta la secciÃ³n de ubicaciÃ³n
      document.getElementById('locationStatus').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      isValid = false;
    }
    
    return isValid;
  }

  /**
   * Manejar envÃ­o del formulario
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    // Prevenir doble envÃ­o
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
      
      // UbicaciÃ³n
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
   * Manejar envÃ­o exitoso
   */
  handleSubmitSuccess(response) {
    // Guardar estadÃ­sticas
    this.updateStatistics();
    
    // Mostrar mensaje de Ã©xito
    this.showSuccess(Config.messages.success.submissionComplete);
    
    // Guardar Ãºltima sumisiÃ³n
    Utils.storage.set(Config.storage.keys.lastSubmission, {
      date: new Date().toISOString(),
      id: response.id || Utils.generateId()
    });
    
    // Limpiar formulario despuÃ©s de un delay
    setTimeout(() => {
      this.resetForm();
    }, Config.ui.resetDelay);
    
    if (Config.dev.enableLogs) {
      console.log('âœ… Asistencia enviada:', response);
    }
  }

  /**
   * Manejar error de envÃ­o
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
   * Establecer estado del botÃ³n de envÃ­o
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
    
    // Reiniciar ubicaciÃ³n
    if (Config.features.enableLocation) {
      this.initLocation();
    }
    
    // Ocultar mensajes
    this.hideMessages();
  }

  /**
   * Mostrar mensaje de Ã©xito
   */
  showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    const messageText = successElement.querySelector('p');
    
    if (messageText) {
      messageText.textContent = message;
    }
    
    successElement.classList.add('active');
    
    // Auto-ocultar despuÃ©s de un tiempo
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
    
    // Auto-ocultar despuÃ©s de un tiempo
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
   * Actualizar estadÃ­sticas
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
    
    // Guardar nombre y cliente para prÃ³xima vez
    Utils.storage.set(Config.storage.keys.userName, document.getElementById('fullName').value);
    Utils.storage.set(Config.storage.keys.preferredClient, client);
  }

  /**
   * Mostrar loader de pÃ¡gina
   */
  showPageLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
      loader.classList.remove('hidden');
    }
  }

  /**
   * Ocultar loader de pÃ¡gina
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

// Inicializar aplicaciÃ³n cuando el DOM estÃ© listo
document.addEventListener('DOMContentLoaded', () => {
  window.attendanceApp = new AttendanceApp();
});

// Exportar clase para testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AttendanceApp;
}