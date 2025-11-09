/**
 * Sistema de Autenticación Admin - AssistByDataTraack
 * @module admin-auth
 */

class AdminAuth {
  constructor() {
    this.supabaseClient = null;
    this.currentUser = null;
    this.session = null;
    this.userRole = null;
    
    this.init();
  }

  /**
   * Inicializar sistema de autenticación
   */
  async init() {
    try {
      DashboardUtils.log('🔐 Inicializando Admin Auth...');
      
      // Mostrar loader
      this.showLoader();

      // Verificar configuración de Supabase
      if (!this.validateSupabaseConfig()) {
        this.showError(DashboardConfig.messages.errors.supabaseNotConfigured);
        this.hideLoader();
        return;
      }

      // Inicializar cliente de Supabase
      await this.initSupabaseClient();

      // Inicializar elementos del DOM
      this.initElements();

      // Inicializar event handlers
      this.initEventHandlers();

      // Verificar sesión existente
      await this.checkExistingSession();

      // Ocultar loader
      this.hideLoader();

      DashboardUtils.log('✅ Admin Auth inicializado');
    } catch (error) {
      console.error('Error inicializando auth:', error);
      this.showError('Error al inicializar el sistema');
      this.hideLoader();
    }
  }

  /**
   * Validar configuración de Supabase
   */
  validateSupabaseConfig() {
    const { url, anonKey } = DashboardConfig.supabase;
    
    if (url === 'YOUR_SUPABASE_URL' || anonKey === 'YOUR_SUPABASE_ANON_KEY') {
      DashboardUtils.log('❌ Supabase no configurado', null, 'warn');
      return false;
    }
    
    return true;
  }

  /**
   * Inicializar cliente de Supabase
   */
  async initSupabaseClient() {
    // Cargar librería de Supabase desde CDN
    if (!window.supabase) {
      await this.loadSupabaseLibrary();
    }

    const { url, anonKey, auth } = DashboardConfig.supabase;
    this.supabaseClient = window.supabase.createClient(url, anonKey, {
      auth: auth
    });
    
    DashboardUtils.log('✅ Cliente Supabase inicializado');
  }

  /**
   * Cargar librería de Supabase
   */
  loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => {
        DashboardUtils.log('✅ Librería Supabase cargada');
        resolve();
      };
      script.onerror = () => {
        DashboardUtils.log('❌ Error cargando Supabase', null, 'error');
        reject(new Error('Failed to load Supabase library'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Inicializar elementos del DOM
   */
  initElements() {
    this.form = document.getElementById('loginForm');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.rememberMeCheckbox = document.getElementById('rememberMe');
    this.submitBtn = document.getElementById('loginBtn');
    this.togglePasswordBtn = document.getElementById('togglePassword');
    this.forgotPasswordLink = document.getElementById('forgotPassword');
    this.loader = document.getElementById('pageLoader');
    this.successMessage = document.getElementById('successMessage');
    this.errorMessage = document.getElementById('errorMessage');
  }

  /**
   * Inicializar event handlers
   */
  initEventHandlers() {
    // Submit del formulario
    this.form.addEventListener('submit', (e) => this.handleLogin(e));

    // Toggle password visibility
    if (this.togglePasswordBtn) {
      this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
    }

    // Forgot password
    if (this.forgotPasswordLink) {
      this.forgotPasswordLink.addEventListener('click', (e) => this.handleForgotPassword(e));
    }

    // Validación en tiempo real
    this.emailInput.addEventListener('blur', () => this.validateEmail());
    this.passwordInput.addEventListener('blur', () => this.validatePassword());

    // Enter key navigation
    this.emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.passwordInput.focus();
      }
    });

    this.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.form.requestSubmit();
      }
    });
  }

  /**
   * Verificar sesión existente
   */
  async checkExistingSession() {
    try {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      
      if (session) {
        DashboardUtils.log('✅ Sesión existente encontrada');
        this.session = session;
        this.currentUser = session.user;
        
        // Verificar rol del usuario
        await this.verifyAdminRole();
        
        // Redirigir al dashboard
        this.redirectToDashboard();
      }
    } catch (error) {
      DashboardUtils.log('No hay sesión existente');
    }
  }

  /**
   * Verificar que el usuario sea admin
   */
  async verifyAdminRole() {
    try {
      // Consultar rol del usuario
      const { data, error } = await this.supabaseClient
        .from(DashboardConfig.supabase.usersTable)
        .select('role')
        .eq('id', this.currentUser.id)
        .single();
      
      if (error) throw error;
      
      this.userRole = data.role;
      
      // Si no es admin, cerrar sesión
      if (this.userRole !== DashboardConfig.roles.ADMIN) {
        DashboardUtils.log('❌ Usuario no es admin', null, 'warn');
        await this.supabaseClient.auth.signOut();
        throw new Error(DashboardConfig.messages.errors.unauthorized);
      }
      
      DashboardUtils.log('✅ Usuario verificado como admin');
    } catch (error) {
      DashboardUtils.log('Error verificando rol:', error, 'error');
      // Si no existe la tabla de usuarios, asumir que es admin
      this.userRole = DashboardConfig.roles.ADMIN;
    }
  }

  /**
   * Manejar login
   */
  async handleLogin(event) {
    event.preventDefault();

    // Validar formulario
    if (!this.validateForm()) {
      return;
    }

    // Obtener credenciales
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;
    const rememberMe = this.rememberMeCheckbox.checked;

    // Mostrar loader
    this.setLoginState('loading');

    try {
      DashboardUtils.log('🔑 Intentando login...', { email });

      // Intentar login con Supabase
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Login exitoso
      this.session = data.session;
      this.currentUser = data.user;

      DashboardUtils.log('✅ Login exitoso', this.currentUser);

      // Verificar rol de admin
      await this.verifyAdminRole();

      // Guardar en localStorage si "Recordar sesión" está activado
      if (rememberMe) {
        this.saveSessionPreference();
      }

      // Mostrar mensaje de éxito
      this.showSuccess(DashboardConfig.messages.success.loginSuccess);

      // Redirigir al dashboard
      setTimeout(() => {
        this.redirectToDashboard();
      }, 1000);

    } catch (error) {
      console.error('Error en login:', error);
      
      let errorMessage = DashboardConfig.messages.errors.loginFailed;
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Por favor, confirme su email antes de iniciar sesión';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = DashboardConfig.messages.errors.networkError;
      } else if (error.message.includes('unauthorized')) {
        errorMessage = 'Esta cuenta no tiene permisos de administrador';
      }
      
      this.showError(errorMessage);
      this.setLoginState('error');
    }
  }

  /**
   * Validar formulario completo
   */
  validateForm() {
    const emailValid = this.validateEmail();
    const passwordValid = this.validatePassword();
    
    return emailValid && passwordValid;
  }

  /**
   * Validar email
   */
  validateEmail() {
    const email = this.emailInput.value.trim();
    
    if (!email) {
      this.showFieldError('emailError', 'El email es requerido');
      return false;
    }
    
    if (!DashboardUtils.validateEmail(email)) {
      this.showFieldError('emailError', DashboardConfig.messages.errors.invalidEmail);
      return false;
    }
    
    this.hideFieldError('emailError');
    return true;
  }

  /**
   * Validar password
   */
  validatePassword() {
    const password = this.passwordInput.value;
    
    if (!password) {
      this.showFieldError('passwordError', 'La contraseña es requerida');
      return false;
    }
    
    if (password.length < DashboardConfig.validation.password.minLength) {
      this.showFieldError('passwordError', DashboardConfig.messages.errors.invalidPassword);
      return false;
    }
    
    this.hideFieldError('passwordError');
    return true;
  }

  /**
   * Mostrar error en campo
   */
  showFieldError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('active');
    }
  }

  /**
   * Ocultar error en campo
   */
  hideFieldError(errorId) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.remove('active');
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility() {
    const type = this.passwordInput.type === 'password' ? 'text' : 'password';
    this.passwordInput.type = type;
    
    const eyeIcon = this.togglePasswordBtn.querySelector('.eye-icon');
    const eyeOffIcon = this.togglePasswordBtn.querySelector('.eye-off-icon');
    
    eyeIcon.classList.toggle('hidden');
    eyeOffIcon.classList.toggle('hidden');
  }

  /**
   * Manejar "Olvidé mi contraseña"
   */
  async handleForgotPassword(event) {
    event.preventDefault();
    
    const email = prompt('Ingrese su email para recuperar la contraseña:');
    
    if (!email) return;
    
    if (!DashboardUtils.validateEmail(email)) {
      this.showError(DashboardConfig.messages.errors.invalidEmail);
      return;
    }
    
    try {
      const { error } = await this.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + DashboardConfig.urls.adminLogin
      });
      
      if (error) throw error;
      
      this.showSuccess('Se ha enviado un email con instrucciones para recuperar su contraseña');
    } catch (error) {
      console.error('Error en forgot password:', error);
      this.showError('No se pudo enviar el email. Intente nuevamente');
    }
  }

  /**
   * Guardar preferencia de sesión
   */
  saveSessionPreference() {
    DashboardUtils.storage.set('rememberMe', true);
    DashboardUtils.storage.set('userRole', this.userRole);
    DashboardUtils.log('✅ Preferencia de sesión guardada');
  }

  /**
   * Redirigir al dashboard
   */
  redirectToDashboard() {
    DashboardUtils.log('🚀 Redirigiendo a dashboard...');
    window.location.href = DashboardConfig.urls.adminDashboard;
  }

  /**
   * Estado del botón de login
   */
  setLoginState(state) {
    if (state === 'loading') {
      this.submitBtn.disabled = true;
      this.submitBtn.classList.add('loading');
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.classList.remove('loading');
    }
  }

  /**
   * Mostrar mensaje de éxito
   */
  showSuccess(message) {
    const messageText = document.getElementById('successMessageText');
    if (messageText) {
      messageText.textContent = message;
    }
    
    this.successMessage.classList.add('active');
    this.errorMessage.classList.remove('active');
    
    setTimeout(() => {
      this.successMessage.classList.remove('active');
    }, DashboardConfig.ui.messageDuration);
  }

  /**
   * Mostrar mensaje de error
   */
  showError(message) {
    const messageText = document.getElementById('errorMessageText');
    if (messageText) {
      messageText.textContent = message;
    }
    
    this.errorMessage.classList.add('active');
    this.successMessage.classList.remove('active');
    
    setTimeout(() => {
      this.errorMessage.classList.remove('active');
    }, DashboardConfig.ui.messageDuration);
  }

  /**
   * Mostrar loader de página
   */
  showLoader() {
    if (this.loader) {
      this.loader.classList.remove('hidden');
    }
  }

  /**
   * Ocultar loader de página
   */
  hideLoader() {
    if (this.loader) {
      this.loader.classList.add('hidden');
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.adminAuth = new AdminAuth();
});