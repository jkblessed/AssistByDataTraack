/**
 * Export Manager - AssistByDataTraack
 * @module exports
 * Maneja exportación de datos a Excel y CSV
 */

const ExportManager = {
  /**
   * Exportar datos a Excel
   */
  async exportToExcel(data) {
    try {
      // Cargar librería SheetJS si no está disponible
      if (!window.XLSX) {
        await this.loadSheetJS();
      }

      // Preparar datos
      const exportData = this.prepareDataForExport(data);

      // Crear workbook
      const wb = window.XLSX.utils.book_new();
      const ws = window.XLSX.utils.json_to_sheet(exportData);

      // Configurar anchos de columna
      const colWidths = [
        { wch: 20 }, // Fecha
        { wch: 30 }, // Nombre
        { wch: 20 }, // Cliente
        { wch: 15 }, // Tienda
        { wch: 15 }, // Latitud
        { wch: 15 }, // Longitud
        { wch: 50 }, // Foto 1
        { wch: 50 }, // Foto 2
        { wch: 50 }, // Foto 3
        { wch: 50 }  // Ticket
      ];
      ws['!cols'] = colWidths;

      // Agregar hoja al workbook
      window.XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');

      // Generar archivo
      const filename = this.generateFilename('xlsx');
      window.XLSX.writeFile(wb, filename);

      DashboardUtils.log('✅ Exportación Excel completada');
      return true;

    } catch (error) {
      console.error('Error exportando a Excel:', error);
      throw error;
    }
  },

  /**
   * Exportar datos a CSV
   */
  async exportToCsv(data) {
    try {
      // Preparar datos
      const exportData = this.prepareDataForExport(data);

      // Obtener headers
      const headers = Object.keys(exportData[0] || {});

      // Crear CSV
      let csv = headers.join(',') + '\n';

      exportData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escapar comas y comillas
          if (value.toString().includes(',') || value.toString().includes('"')) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        });
        csv += values.join(',') + '\n';
      });

      // Descargar archivo
      const filename = this.generateFilename('csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, filename);

      DashboardUtils.log('✅ Exportación CSV completada');
      return true;

    } catch (error) {
      console.error('Error exportando a CSV:', error);
      throw error;
    }
  },

  /**
   * Preparar datos para exportación
   */
  prepareDataForExport(data) {
    return data.map(item => ({
      'Fecha': DashboardUtils.formatDate(item.timestamp || item.created_at || item.fecha),
      'Nombre Completo': item.nombre || item.full_name || '',
      'Cliente': item.cliente || item.client || '',
      'Tienda': item.numeroTienda || item.store_number || '',
      'Latitud': item.latitud || item.latitude || '',
      'Longitud': item.longitud || item.longitude || '',
      'Foto 1': item.foto1 || item.photo1_url || '',
      'Foto 2': item.foto2 || item.photo2_url || '',
      'Foto 3': item.foto3 || item.photo3_url || '',
      'Ticket': item.ticket || item.ticket_url || '',
      'Precisión GPS': item.precision || item.accuracy ? `${item.precision || item.accuracy}m` : '',
      'Hora': item.hora || item.time || ''
    }));
  },

  /**
   * Generar nombre de archivo
   */
  generateFilename(extension) {
    const { baseFilename, includeTimestamp } = DashboardConfig.export;
    const timestamp = includeTimestamp 
      ? `_${new Date().toISOString().split('T')[0]}_${Date.now()}`
      : '';
    
    return `${baseFilename}${timestamp}.${extension}`;
  },

  /**
   * Cargar librería SheetJS
   */
  loadSheetJS() {
    return new Promise((resolve, reject) => {
      if (window.XLSX) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
      script.onload = () => {
        DashboardUtils.log('✅ SheetJS cargado');
        resolve();
      };
      script.onerror = () => {
        DashboardUtils.log('❌ Error cargando SheetJS', null, 'error');
        reject(new Error('Failed to load SheetJS library'));
      };
      document.head.appendChild(script);
    });
  },

  /**
   * Descargar blob
   */
  downloadBlob(blob, filename) {
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
   * Exportar datos filtrados (método auxiliar)
   */
  exportFiltered(data, format = 'xlsx') {
    if (format === 'xlsx') {
      return this.exportToExcel(data);
    } else if (format === 'csv') {
      return this.exportToCsv(data);
    } else {
      throw new Error('Formato no soportado');
    }
  }
};

// Exportar globalmente
window.ExportManager = ExportManager;

DashboardUtils.log('✅ Export Manager cargado');