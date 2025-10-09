// asyncTasks.js - Manejo de tareas asíncronas para POSTs fallidos

class AsyncTaskManager {
  constructor() {
    this.retryDelay = 5000; // 5 segundos
    this.maxRetries = 3;
    this.isProcessing = false;
  }

  // Crear una tarea asíncrona para reintentar POSTs
  async createRetryTask(postData) {
    return new Promise((resolve, reject) => {
      const task = {
        id: Date.now() + Math.random(),
        data: postData,
        retryCount: 0,
        maxRetries: this.maxRetries,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Guardar en IndexedDB
      this.saveTaskToIndexedDB(task)
        .then(() => {
          console.log(`Tarea asíncrona creada: ${task.id}`);
          resolve(task);
        })
        .catch(error => {
          console.error('Error creando tarea asíncrona:', error);
          reject(error);
        });
    });
  }

  // Procesar tareas pendientes
  async processPendingTasks() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const tasks = await this.getPendingTasks();
      console.log(`Procesando ${tasks.length} tareas pendientes`);

      for (const task of tasks) {
        await this.processTask(task);
        // Delay entre tareas para evitar sobrecarga
        await this.delay(1000);
      }
    } catch (error) {
      console.error('Error procesando tareas pendientes:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Procesar una tarea individual
  async processTask(task) {
    try {
      console.log(`Procesando tarea ${task.id}, intento ${task.retryCount + 1}`);
      
      const response = await fetch(task.data.url, {
        method: task.data.method,
        headers: task.data.headers,
        body: task.data.body
      });

      if (response.ok) {
        console.log(`Tarea ${task.id} completada exitosamente`);
        await this.deleteTask(task.id);
        return { success: true, task };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error procesando tarea ${task.id}:`, error);
      
      const newRetryCount = task.retryCount + 1;
      
      if (newRetryCount >= task.maxRetries) {
        console.log(`Tarea ${task.id} excedió el número máximo de reintentos`);
        await this.deleteTask(task.id);
        return { success: false, task, error: 'Max retries exceeded' };
      } else {
        // Actualizar contador de reintentos y programar siguiente intento
        await this.updateTaskRetryCount(task.id, newRetryCount);
        this.scheduleRetry(task, newRetryCount);
        return { success: false, task, error: error.message };
      }
    }
  }

  // Programar reintento con delay exponencial
  scheduleRetry(task, retryCount) {
    const delay = this.retryDelay * Math.pow(2, retryCount - 1); // Backoff exponencial
    console.log(`Programando reintento para tarea ${task.id} en ${delay}ms`);
    
    setTimeout(() => {
      this.processTask(task);
    }, delay);
  }

  // Funciones de IndexedDB para tareas
  async saveTaskToIndexedDB(task) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("AsyncTasksDB", 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("tasks")) {
          db.createObjectStore("tasks", { keyPath: "id" });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("tasks", "readwrite");
        const store = transaction.objectStore("tasks");
        store.add(task);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingTasks() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("AsyncTasksDB", 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("tasks", "readonly");
        const store = transaction.objectStore("tasks");
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const tasks = getAllRequest.result.filter(task => task.status === 'pending');
          resolve(tasks);
        };
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async updateTaskRetryCount(taskId, retryCount) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("AsyncTasksDB", 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("tasks", "readwrite");
        const store = transaction.objectStore("tasks");
        
        const getRequest = store.get(taskId);
        getRequest.onsuccess = () => {
          const task = getRequest.result;
          if (task) {
            task.retryCount = retryCount;
            const putRequest = store.put(task);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            reject(new Error('Task not found'));
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTask(taskId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("AsyncTasksDB", 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("tasks", "readwrite");
        const store = transaction.objectStore("tasks");
        const deleteRequest = store.delete(taskId);
        
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Utilidad para delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Iniciar procesamiento automático
  startAutoProcessing() {
    // Procesar tareas cada 30 segundos
    setInterval(() => {
      this.processPendingTasks();
    }, 30000);
    
    // Procesar inmediatamente al iniciar
    this.processPendingTasks();
  }
}

// Crear instancia global
const asyncTaskManager = new AsyncTaskManager();

// Iniciar procesamiento automático cuando se carga el script
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    asyncTaskManager.startAutoProcessing();
  });
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AsyncTaskManager;
} else if (typeof window !== 'undefined') {
  window.AsyncTaskManager = AsyncTaskManager;
  window.asyncTaskManager = asyncTaskManager;
}
