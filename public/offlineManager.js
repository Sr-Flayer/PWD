// offlineManager.js - Gestor unificado para funcionalidad offline

class OfflineManager {
  constructor() {
    this.dbName = 'OfflineDB';
    this.dbVersion = 1;
    this.db = null;
    this.retryDelay = 5000;
    this.maxRetries = 3;
  }

  // Inicializar IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Object store para usuarios
        if (!db.objectStoreNames.contains('usuarios')) {
          db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
        }
        
        // Object store para POSTs fallidos
        if (!db.objectStoreNames.contains('failedPosts')) {
          db.createObjectStore('failedPosts', { keyPath: 'id', autoIncrement: true });
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Guardar POST fallido
  async saveFailedPost(postData) {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('failedPosts', 'readwrite');
      const store = transaction.objectStore('failedPosts');
      
      const failedPost = {
        ...postData,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: this.maxRetries
      };
      
      const request = store.add(failedPost);
      request.onsuccess = () => {
        console.log('POST fallido guardado:', failedPost);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener todos los POSTs fallidos
  async getAllFailedPosts() {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('failedPosts', 'readonly');
      const store = transaction.objectStore('failedPosts');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar POST fallido
  async deleteFailedPost(id) {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('failedPosts', 'readwrite');
      const store = transaction.objectStore('failedPosts');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Actualizar contador de reintentos
  async updateRetryCount(id, retryCount) {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('failedPosts', 'readwrite');
      const store = transaction.objectStore('failedPosts');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const post = getRequest.result;
        if (post) {
          post.retryCount = retryCount;
          const putRequest = store.put(post);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Post not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Procesar POSTs fallidos
  async processFailedPosts() {
    try {
      const failedPosts = await this.getAllFailedPosts();
      console.log(`Procesando ${failedPosts.length} POSTs fallidos`);

      for (const post of failedPosts) {
        await this.processPost(post);
      }
    } catch (error) {
      console.error('Error procesando POSTs fallidos:', error);
    }
  }

  // Procesar un POST individual
  async processPost(post) {
    try {
      const newRetryCount = post.retryCount + 1;
      await this.updateRetryCount(post.id, newRetryCount);

      const response = await fetch(post.url, {
        method: post.method,
        headers: post.headers,
        body: post.body
      });

      if (response.ok) {
        console.log(`POST exitoso para ID ${post.id}`);
        await this.deleteFailedPost(post.id);
        return { success: true };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error procesando POST ${post.id}:`, error);
      
      const newRetryCount = post.retryCount + 1;
      if (newRetryCount >= post.maxRetries) {
        console.log(`Eliminando POST ${post.id} después de ${post.maxRetries} intentos fallidos`);
        await this.deleteFailedPost(post.id);
      }
      
      return { success: false, error: error.message };
    }
  }

  // Registrar tarea de sincronización
  async registerSyncTask() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-failed-posts');
        console.log('Tarea de sincronización registrada');
      } catch (error) {
        console.error('Error registrando tarea de sincronización:', error);
      }
    }
  }

  // Obtener conteo de POSTs pendientes
  async getPendingCount() {
    try {
      const failedPosts = await this.getAllFailedPosts();
      return failedPosts.length;
    } catch (error) {
      console.error('Error obteniendo conteo de POSTs pendientes:', error);
      return 0;
    }
  }
}

// Crear instancia global
const offlineManager = new OfflineManager();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.offlineManager = offlineManager;
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfflineManager;
}