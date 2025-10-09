// indexedDB.js

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("RegistroDB", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("usuarios")) {
        db.createObjectStore("usuarios", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("failedPosts")) {
        db.createObjectStore("failedPosts", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Funciones para usuarios (mantener compatibilidad)
async function saveUserOffline(usuario) {
  const db = await openDB();
  const tx = db.transaction("usuarios", "readwrite");
  const store = tx.objectStore("usuarios");
  store.add(usuario);
  return tx.complete;
}

async function getAllUsers() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("usuarios", "readonly");
    const store = tx.objectStore("usuarios");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

async function deleteUser(id) {
  const db = await openDB();
  const tx = db.transaction("usuarios", "readwrite");
  const store = tx.objectStore("usuarios");
  store.delete(id);
  return tx.complete;
}

// Funciones para manejar POSTs fallidos
async function saveFailedPost(postData) {
  const db = await openDB();
  const tx = db.transaction("failedPosts", "readwrite");
  const store = tx.objectStore("failedPosts");
  
  const failedPost = {
    ...postData,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3
  };
  
  return new Promise((resolve, reject) => {
    const request = store.add(failedPost);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

async function getAllFailedPosts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("failedPosts", "readonly");
    const store = tx.objectStore("failedPosts");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

async function deleteFailedPost(id) {
  const db = await openDB();
  const tx = db.transaction("failedPosts", "readwrite");
  const store = tx.objectStore("failedPosts");
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

async function updateFailedPostRetryCount(id, retryCount) {
  const db = await openDB();
  const tx = db.transaction("failedPosts", "readwrite");
  const store = tx.objectStore("failedPosts");
  
  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const post = getRequest.result;
      if (post) {
        post.retryCount = retryCount;
        const putRequest = store.put(post);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = (e) => reject(e);
      } else {
        reject(new Error('Post not found'));
      }
    };
    getRequest.onerror = (e) => reject(e);
  });
}

// Función para registrar tarea de sincronización
async function registerSyncTask() {
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

// Función para crear tarea asíncrona usando el AsyncTaskManager
async function createAsyncTask(postData) {
  try {
    // Cargar el script de tareas asíncronas
    const response = await fetch('/asyncTasks.js');
    const script = await response.text();
    eval(script);
    
    // Crear tarea asíncrona
    const task = await window.asyncTaskManager.createRetryTask(postData);
    console.log('Tarea asíncrona creada:', task.id);
    return task;
  } catch (error) {
    console.error('Error creando tarea asíncrona:', error);
    throw error;
  }
}

// Función para procesar tareas pendientes
async function processPendingTasks() {
  try {
    const response = await fetch('/asyncTasks.js');
    const script = await response.text();
    eval(script);
    
    await window.asyncTaskManager.processPendingTasks();
  } catch (error) {
    console.error('Error procesando tareas pendientes:', error);
  }
}

// Hacer funciones disponibles globalmente
if (typeof window !== 'undefined') {
  window.openDB = openDB;
  window.saveUserOffline = saveUserOffline;
  window.getAllUsers = getAllUsers;
  window.deleteUser = deleteUser;
  window.saveFailedPost = saveFailedPost;
  window.getAllFailedPosts = getAllFailedPosts;
  window.deleteFailedPost = deleteFailedPost;
  window.updateFailedPostRetryCount = updateFailedPostRetryCount;
  window.registerSyncTask = registerSyncTask;
  window.createAsyncTask = createAsyncTask;
  window.processPendingTasks = processPendingTasks;
}

// Exportar funciones para uso en App.jsx
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    openDB,
    saveUserOffline,
    getAllUsers,
    deleteUser,
    saveFailedPost,
    getAllFailedPosts,
    deleteFailedPost,
    updateFailedPostRetryCount,
    registerSyncTask,
    createAsyncTask,
    processPendingTasks
  };
}
