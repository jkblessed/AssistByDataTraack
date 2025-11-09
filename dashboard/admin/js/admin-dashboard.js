/**
 * Admin Dashboard - AssistByDataTraack
 * @module admin-dashboard
 */

class AdminDashboard {
  constructor() {
    this.supabaseClient = null;
    this.currentUser = null;
    this.session = null;
    this.data = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.itemsPerPage = 50;
    this.sortColumn = 'timestamp';
    this.sortDirection = 'desc';
    this.map = null;
    this.markers = [];
    
    this.init();
  }

  /**
   * Inicializar dashboard
   */
  async init() {
    try {
      DashboardUtils.log('🚀 Inicializando Admin Dashboard...');
      
      // Mostrar loader
      this.showLoader();

      // Inicializar Supabase
      await this.initSupabase();

      // CRÍTICO: Verificar autenticación
      await this.checkAuth();

      // Inicializar elementos del DOM
      this.initElements();

      // Inicializar event handlers
      this.initEventHandlers();

      // Cargar datos
      await this.loadData();

      // Inicializar mapa
      this.initMap();

      // Ocultar loader
      this.hideLoader();

      DashboardUtils.log('✅ Dashboard inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando dashboard:', error);
      this.handleInitError(error);
    }
  }

  /**
   * Inicializar Supabase
   */
  async initSupabase() {
    const { url, anonKey } = DashboardConfig.supabase;
    
    if (!window.supabase) {
      throw new Error('Librería de Supabase no cargada');
    }
    
    this.supabaseClient = window.supabase.createClient(url, anonKey);
    DashboardUtils.log('✅ Supabase inicializado');
  }

  /**
   * Verificar autenticación (CRÍTICO)
   */
  async checkAuth() {
    try {
      // Obtener sesión actual
      const { data: { session }, error } = await this.supabaseClient.auth.getSession();
      
      if (error || !session) {
        DashboardUtils.log('❌ No hay sesión activa', null, 'warn');
        this.redirectToLogin();
        return;
      }
      
      this.session = session;
      this.currentUser = session.user;
      
      DashboardUtils.log('✅ Sesión válida', this.currentUser);
      
      // Verificar rol de admin
      await this.verifyAdminRole();
      
      // Actualizar UI con info del usuario
      this.updateUserInfo();
      
    } catch (error) {
      DashboardUtils.log('Error verificando auth:', error, 'error');
      this.redirectToLogin();
    }
  }

  /**
   * Verificar rol de admin
   */
  async verifyAdminRole() {
    try {
      const { data, error } = await this.supabaseClient
        .from(DashboardConfig.supabase.usersTable)
        .select('role')
        .eq('id', this.currentUser.id)
        .single();
      
      if (error) {
        // Si no existe la tabla, asumir admin (desarrollo)
        DashboardUtils.log('⚠️ Tabla users no existe, asumiendo admin', null, 'warn');
        return;
      }
      
      if (data.role !== DashboardConfig.roles.ADMIN) {
        DashboardUtils.log('❌ Usuario no es admin', null, 'error');
        throw new Error('No autorizado');
      }
      
      DashboardUtils.log('✅ Usuario verificado como admin');
    } catch (error) {
      // En desarrollo, permitir acceso
      if (DashboardConfig.dev.debug) {
        DashboardUtils.log('⚠️ Modo desarrollo, permitiendo acceso');
        return;
      }
      throw error;
    }
  }

  /**
   * Actualizar info del usuario en UI
   */
  updateUserInfo() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl && this.currentUser) {
      userNameEl.textContent = this.currentUser.email?.split('@')[0] || 'Admin';
    }
  }

  /**
   * Redirigir al login
   */
  redirectToLogin() {
    DashboardUtils.showToast('Sesión expirada. Redirigiendo...', 'error');
    setTimeout(() => {
      window.location.href = '../admin/login.html';
    }, 1500);
  }

  /**
   * Inicializar elementos del DOM
   */
  initElements() {
    // Sidebar
    this.sidebar = document.getElementById('sidebar');
    this.sidebarToggle = document.getElementById('sidebarToggle');
    this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
    this.logoutBtn = document.getElementById('logoutBtn');
    
    // Header
    this.refreshBtn = document.getElementById('refreshBtn');
    this.lastUpdateEl = document.getElementById('lastUpdate');
    
    // Stats
    this.statToday = document.getElementById('statToday');
    this.statWeek = document.getElementById('statWeek');
    this.statMonth = document.getElementById('statMonth');
    this.statTotal = document.getElementById('statTotal');
    
    // Filters
    this.searchInput = document.getElementById('searchInput');
    this.filterClient = document.getElementById('filterClient');
    this.filterDate = document.getElementById('filterDate');
    this.clearFiltersBtn = document.getElementById('clearFiltersBtn');
    this.exportExcelBtn = document.getElementById('exportExcelBtn');
    this.exportCsvBtn = document.getElementById('exportCsvBtn');
    
    // Table
    this.tableBody = document.getElementById('tableBody');
    this.dataTable = document.getElementById('dataTable');
    
    // Pagination
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.currentPageEl = document.getElementById('currentPage');
    this.totalPagesEl = document.getElementById('totalPages');
    
    // Map
    this.mapContainer = document.getElementById('map');
    this.toggleMapBtn = document.getElementById('toggleMapBtn');
  }

  /**
   * Inicializar event handlers
   */
  initEventHandlers() {
    // Sidebar toggle (desktop y móvil)
    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
    }
    
    if (this.sidebarToggle) {
      this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
    }
    
    // Cerrar sidebar al hacer click en el overlay (solo móvil)
    if (this.sidebar) {
      this.sidebar.addEventListener('click', (e) => {
        // Si el click fue en el overlay y estamos en móvil
        if (e.target === this.sidebar && window.innerWidth <= 768) {
          this.closeSidebar();
        }
      });
      
      // Cerrar sidebar al hacer click en nav items (solo móvil)
      const navItems = this.sidebar.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        item.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            this.closeSidebar();
          }
        });
      });
    }
    
    // Logout
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }
    
    // Refresh
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.loadData());
    }
    
    // Search
    if (this.searchInput) {
      this.searchInput.addEventListener('input', 
        DashboardUtils.debounce(() => this.applyFilters(), 300)
      );
    }
    
    // Filters
    if (this.filterClient) {
      this.filterClient.addEventListener('change', () => this.applyFilters());
    }
    
    if (this.filterDate) {
      this.filterDate.addEventListener('change', () => this.applyFilters());
    }
    
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
    }
    
    // Export
    if (this.exportExcelBtn) {
      this.exportExcelBtn.addEventListener('click', () => this.exportExcel());
    }
    
    if (this.exportCsvBtn) {
      this.exportCsvBtn.addEventListener('click', () => this.exportCsv());
    }
    
    // Pagination
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prevPage());
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.nextPage());
    }
    
    // Table sort
    if (this.dataTable) {
      const headers = this.dataTable.querySelectorAll('th[data-sort]');
      headers.forEach(header => {
        header.addEventListener('click', () => {
          const column = header.dataset.sort;
          this.sortTable(column);
        });
      });
    }
    
    // Toggle map
    if (this.toggleMapBtn) {
      this.toggleMapBtn.addEventListener('click', () => this.toggleMap());
    }
  }

  /**
   * Cargar datos desde Supabase
   */
  async loadData() {
    try {
      DashboardUtils.log('📊 Cargando datos...');
      
      // Mostrar loader en tabla
      this.showTableLoader();
      
      // Query a Supabase
      const { data, error } = await this.supabaseClient
        .from(DashboardConfig.supabase.tableName)
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      
      // Transformar datos de español a inglés
      this.data = (data || []).map(item => this.transformData(item));
      this.filteredData = [...this.data];
      
      DashboardUtils.log(`✅ ${this.data.length} registros cargados`);
      
      // Actualizar UI
      this.updateStats();
      this.populateFilters();
      this.renderTable();
      this.updateMap();
      this.updateLastUpdate();
      
      DashboardUtils.showToast('Datos cargados correctamente', 'success');
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      DashboardUtils.showToast('Error al cargar datos', 'error');
      this.showTableError();
    }
  }

  /**
   * Transformar datos de Supabase (español) a formato interno (inglés)
   */
  transformData(item) {
    const mapping = DashboardConfig.table.columnMapping;
    const transformed = {};
    
    // Función para limpiar el "=" al inicio (error de n8n)
    const cleanValue = (value) => {
      if (typeof value === 'string' && value.startsWith('=')) {
        return value.substring(1);
      }
      return value;
    };
    
    // Mapear cada campo y limpiar valores
    Object.keys(mapping).forEach(spanishKey => {
      const englishKey = mapping[spanishKey];
      transformed[englishKey] = cleanValue(item[spanishKey]);
    });
    
    // Limpiar todos los campos originales también
    const cleanedItem = {};
    Object.keys(item).forEach(key => {
      cleanedItem[key] = cleanValue(item[key]);
    });
    
    // Crear created_at a partir de timestamp o fecha+hora
    if (cleanedItem.timestamp) {
      transformed.created_at = cleanedItem.timestamp;
    } else if (cleanedItem.fecha && cleanedItem.hora) {
      transformed.created_at = `${cleanedItem.fecha}T${cleanedItem.hora}`;
    }
    
    // Mantener campos originales también (ya limpiados)
    return { ...cleanedItem, ...transformed };
  }

  /**
   * Actualizar estadísticas
   */
  updateStats() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const today = this.data.filter(item => {
      const itemDate = new Date(item.timestamp || item.created_at || item.fecha);
      return itemDate >= todayStart;
    }).length;
    
    const week = this.data.filter(item => {
      const itemDate = new Date(item.timestamp || item.created_at || item.fecha);
      return itemDate >= weekStart;
    }).length;
    
    const month = this.data.filter(item => {
      const itemDate = new Date(item.timestamp || item.created_at || item.fecha);
      return itemDate >= monthStart;
    }).length;
    
    const total = this.data.length;
    
    if (this.statToday) this.statToday.textContent = DashboardUtils.formatNumber(today);
    if (this.statWeek) this.statWeek.textContent = DashboardUtils.formatNumber(week);
    if (this.statMonth) this.statMonth.textContent = DashboardUtils.formatNumber(month);
    if (this.statTotal) this.statTotal.textContent = DashboardUtils.formatNumber(total);
  }

  /**
   * Poblar filtros
   */
  populateFilters() {
    // Obtener clientes únicos (usar ambos nombres de columna)
    const clients = [...new Set(this.data.map(item => item.cliente || item.client))].filter(Boolean).sort();
    
    // Poblar select de clientes
    if (this.filterClient) {
      this.filterClient.innerHTML = '<option value="">Todos los clientes</option>';
      clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client;
        option.textContent = client;
        this.filterClient.appendChild(option);
      });
    }
  }

  /**
   * Aplicar filtros
   */
  applyFilters() {
    let filtered = [...this.data];
    
    // Filtro de búsqueda
    const searchTerm = this.searchInput?.value.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(item =>
        (item.nombre || item.full_name || '').toLowerCase().includes(searchTerm) ||
        (item.cliente || item.client || '').toLowerCase().includes(searchTerm) ||
        (item.numeroTienda || item.store_number || '').toString().includes(searchTerm)
      );
    }
    
    // Filtro de cliente
    const clientFilter = this.filterClient?.value;
    if (clientFilter) {
      filtered = filtered.filter(item => 
        (item.cliente || item.client) === clientFilter
      );
    }
    
    // Filtro de fecha
    const dateFilter = this.filterDate?.value;
    if (dateFilter) {
      const now = new Date();
      let startDate;
      
      if (dateFilter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (dateFilter === 'week') {
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      } else if (dateFilter === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      if (startDate) {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.timestamp || item.created_at || item.fecha);
          return itemDate >= startDate;
        });
      }
    }
    
    this.filteredData = filtered;
    this.currentPage = 1;
    this.renderTable();
    this.updateMap();
    
    DashboardUtils.log(`Filtros aplicados: ${filtered.length} resultados`);
  }

  /**
   * Limpiar filtros
   */
  clearFilters() {
    if (this.searchInput) this.searchInput.value = '';
    if (this.filterClient) this.filterClient.value = '';
    if (this.filterDate) this.filterDate.value = '';
    
    this.filteredData = [...this.data];
    this.currentPage = 1;
    this.renderTable();
    this.updateMap();
    
    DashboardUtils.showToast('Filtros limpiados', 'info');
  }

  /**
   * Ordenar tabla
   */
  sortTable(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    this.filteredData.sort((a, b) => {
      let aVal, bVal;
      
      // Mapear columna a los nombres correctos
      if (column === 'created_at') {
        aVal = a.timestamp || a.created_at || a.fecha;
        bVal = b.timestamp || b.created_at || b.fecha;
      } else if (column === 'full_name') {
        aVal = a.nombre || a.full_name;
        bVal = b.nombre || b.full_name;
      } else if (column === 'client') {
        aVal = a.cliente || a.client;
        bVal = b.cliente || b.client;
      } else if (column === 'store_number') {
        aVal = a.numeroTienda || a.store_number;
        bVal = b.numeroTienda || b.store_number;
      } else {
        aVal = a[column];
        bVal = b[column];
      }
      
      // Convertir a minúsculas para comparar strings
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (this.sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    this.renderTable();
    this.updateSortUI();
  }

  /**
   * Actualizar UI de ordenamiento
   */
  updateSortUI() {
    // Remover clases previas
    const headers = this.dataTable.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
      header.classList.remove('sorted', 'asc', 'desc');
    });
    
    // Agregar clase al header activo
    const activeHeader = this.dataTable.querySelector(`th[data-sort="${this.sortColumn}"]`);
    if (activeHeader) {
      activeHeader.classList.add('sorted', this.sortDirection);
    }
  }

  /**
   * Renderizar tabla
   */
  renderTable() {
    if (!this.tableBody) return;
    
    const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const pageData = this.filteredData.slice(start, end);
    
    if (pageData.length === 0) {
      this.showEmptyState();
      return;
    }
    
    this.tableBody.innerHTML = pageData.map(item => {
      const fecha = item.timestamp || item.created_at || item.fecha;
      const nombre = item.nombre || item.full_name || '';
      const cliente = item.cliente || item.client || '';
      const tienda = (item.numeroTienda || item.store_number || '').toString();
      const lat = item.latitud || item.latitude;
      const lng = item.longitud || item.longitude;
      const foto1 = item.foto1 || item.photo1_url;
      const foto2 = item.foto2 || item.photo2_url;
      const foto3 = item.foto3 || item.photo3_url;
      const ticket = item.ticket || item.ticket_url;
      
      return `
      <tr>
        <td>${DashboardUtils.formatDate(fecha)}</td>
        <td>${DashboardUtils.escapeHtml(nombre)}</td>
        <td>${DashboardUtils.escapeHtml(cliente)}</td>
        <td>${DashboardUtils.escapeHtml(tienda)}</td>
        <td>
          <div class="photo-links">
            ${foto1 ? `<a href="${foto1}" target="_blank" class="photo-link">1</a>` : ''}
            ${foto2 ? `<a href="${foto2}" target="_blank" class="photo-link">2</a>` : ''}
            ${foto3 ? `<a href="${foto3}" target="_blank" class="photo-link">3</a>` : ''}
            ${ticket ? `<a href="${ticket}" target="_blank" class="photo-link">T</a>` : ''}
          </div>
        </td>
        <td>
          ${lat && lng ? `
            <a href="https://www.google.com/maps?q=${lat},${lng}" 
               target="_blank" 
               class="location-link">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}
            </a>
          ` : '<span style="color: var(--glass-text-tertiary);">Sin ubicación</span>'}
        </td>
      </tr>
    `}).join('');
    
    this.updatePagination(totalPages);
  }

  /**
   * Mostrar estado vacío
   */
  showEmptyState() {
    this.tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <h3>No se encontraron resultados</h3>
            <p>Intenta ajustar los filtros o la búsqueda</p>
          </div>
        </td>
      </tr>
    `;
    this.updatePagination(0);
  }

  /**
   * Actualizar paginación
   */
  updatePagination(totalPages) {
    if (this.currentPageEl) this.currentPageEl.textContent = this.currentPage;
    if (this.totalPagesEl) this.totalPagesEl.textContent = totalPages || 1;
    
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentPage === 1;
    }
    
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentPage >= totalPages;
    }
  }

  /**
   * Página anterior
   */
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderTable();
      this.scrollToTop();
    }
  }

  /**
   * Página siguiente
   */
  nextPage() {
    const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderTable();
      this.scrollToTop();
    }
  }

  /**
   * Scroll al inicio
   */
  scrollToTop() {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Inicializar mapa
   */
  initMap() {
    if (!this.mapContainer || !window.L) return;
    
    try {
      const { defaultCenter, defaultZoom, tileLayer, attribution } = DashboardConfig.map;
      
      this.map = window.L.map('map', {
        scrollWheelZoom: false  // Deshabilitar zoom con scroll
      }).setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
      
      window.L.tileLayer(tileLayer, {
        attribution: attribution,
        maxZoom: 18
      }).addTo(this.map);
      
      DashboardUtils.log('✅ Mapa inicializado');
      
      // Actualizar marcadores
      this.updateMap();
    } catch (error) {
      console.error('Error inicializando mapa:', error);
    }
  }

  /**
   * Actualizar marcadores en mapa
   */
  updateMap() {
    if (!this.map) return;
    
    // Limpiar marcadores previos
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
    
    // Agregar nuevos marcadores
    this.filteredData.forEach(item => {
      const lat = item.latitud || item.latitude;
      const lng = item.longitud || item.longitude;
      
      if (lat && lng) {
        const marker = window.L.marker([lat, lng])
          .bindPopup(`
            <strong>${DashboardUtils.escapeHtml(item.nombre || item.full_name || '')}</strong><br>
            Cliente: ${DashboardUtils.escapeHtml(item.cliente || item.client || '')}<br>
            Tienda: ${DashboardUtils.escapeHtml((item.numeroTienda || item.store_number || '').toString())}<br>
            ${DashboardUtils.formatDate(item.timestamp || item.created_at || item.fecha)}
          `)
          .addTo(this.map);
        
        this.markers.push(marker);
      }
    });
    
    // Ajustar vista si hay marcadores
    if (this.markers.length > 0) {
      const group = window.L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  /**
   * Toggle mapa
   */
  toggleMap() {
    if (!this.mapContainer) return;
    
    const isHidden = this.mapContainer.classList.contains('hidden');
    const isExpanded = this.mapContainer.classList.contains('expanded');
    
    if (isHidden) {
      // Si está oculto, mostrar
      this.mapContainer.classList.remove('hidden');
      if (this.toggleMapBtn) {
        const span = this.toggleMapBtn.querySelector('span');
        if (span) span.textContent = 'Ocultar Mapa';
      }
    } else if (!isExpanded) {
      // Si está visible pero no expandido, expandir
      this.mapContainer.classList.add('expanded');
      if (this.toggleMapBtn) {
        const span = this.toggleMapBtn.querySelector('span');
        if (span) span.textContent = 'Contraer Mapa';
      }
    } else {
      // Si está expandido, contraer
      this.mapContainer.classList.remove('expanded');
      if (this.toggleMapBtn) {
        const span = this.toggleMapBtn.querySelector('span');
        if (span) span.textContent = 'Expandir Mapa';
      }
    }
    
    // Invalidar tamaño del mapa cuando cambie
    if (!isHidden && this.map) {
      setTimeout(() => this.map.invalidateSize(), 300);
    }
  }

  /**
   * Exportar Excel
   */
  exportExcel() {
    if (!window.ExportManager) {
      DashboardUtils.showToast('Módulo de exportación no disponible', 'error');
      return;
    }
    
    try {
      window.ExportManager.exportToExcel(this.filteredData);
      DashboardUtils.showToast('Exportando a Excel...', 'success');
    } catch (error) {
      console.error('Error exportando:', error);
      DashboardUtils.showToast('Error al exportar', 'error');
    }
  }

  /**
   * Exportar CSV
   */
  exportCsv() {
    if (!window.ExportManager) {
      DashboardUtils.showToast('Módulo de exportación no disponible', 'error');
      return;
    }
    
    try {
      window.ExportManager.exportToCsv(this.filteredData);
      DashboardUtils.showToast('Exportando a CSV...', 'success');
    } catch (error) {
      console.error('Error exportando:', error);
      DashboardUtils.showToast('Error al exportar', 'error');
    }
  }

  /**
   * Toggle sidebar (móvil y desktop)
   */
  toggleSidebar() {
    if (!this.sidebar) return;
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // Móvil: abrir/cerrar completamente con overlay
      const isOpen = this.sidebar.classList.toggle('open');
      
      // Bloquear/desbloquear scroll del body
      if (isOpen) {
        document.body.classList.add('sidebar-open');
      } else {
        document.body.classList.remove('sidebar-open');
      }
    } else {
      // Desktop: colapsar/expandir
      this.sidebar.classList.toggle('collapsed');
    }
  }

  /**
   * Cerrar sidebar (solo móvil)
   */
  closeSidebar() {
    if (this.sidebar && window.innerWidth <= 768) {
      this.sidebar.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    }
  }

  /**
   * Manejar logout
   */
  async handleLogout() {
    const confirmed = await DashboardUtils.confirm(DashboardConfig.messages.confirm.logout);
    
    if (!confirmed) return;
    
    try {
      await this.supabaseClient.auth.signOut();
      DashboardUtils.storage.clear();
      DashboardUtils.showToast('Sesión cerrada', 'success');
      
      setTimeout(() => {
        window.location.href = '../admin/login.html';
      }, 1000);
      
    } catch (error) {
      console.error('Error en logout:', error);
      DashboardUtils.showToast('Error al cerrar sesión', 'error');
    }
  }

  /**
   * Actualizar última actualización
   */
  updateLastUpdate() {
    if (this.lastUpdateEl) {
      const now = new Date();
      this.lastUpdateEl.textContent = now.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  /**
   * Mostrar loader de página
   */
  showLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.remove('hidden');
  }

  /**
   * Ocultar loader de página
   */
  hideLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.add('hidden');
  }

  /**
   * Mostrar loader en tabla
   */
  showTableLoader() {
    if (this.tableBody) {
      this.tableBody.innerHTML = `
        <tr class="loading-row">
          <td colspan="6">
            <div class="table-loader">
              <div class="spinner-small"></div>
              <span>Cargando datos...</span>
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Mostrar error en tabla
   */
  showTableError() {
    if (this.tableBody) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <h3>Error al cargar datos</h3>
              <p>Por favor, intente nuevamente</p>
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Manejar error de inicialización
   */
  handleInitError(error) {
    this.hideLoader();
    
    if (error.message.includes('auth') || error.message.includes('session')) {
      this.redirectToLogin();
    } else {
      DashboardUtils.showToast('Error al cargar dashboard', 'error');
      
      // Mostrar mensaje en página
      const mainContent = document.getElementById('mainContent');
      if (mainContent) {
        mainContent.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 1rem; color: var(--glass-text-tertiary);">
            <svg viewBox="0 0 24 24" width="80" height="80">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h2 style="color: var(--glass-text);">Error al cargar dashboard</h2>
            <p>Por favor, recargue la página</p>
            <button onclick="window.location.reload()" class="btn btn-secondary">Recargar</button>
          </div>
        `;
      }
    }
  }
}

// Inicializar dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard();
});