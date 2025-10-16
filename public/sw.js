const CACHE_NAME = 'app-cache-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/vite.svg',
  '/index-Cujft3z8.js',
  '/index-D8b4DHJx.css',
  '/RegistroUsuario.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('vite') || event.request.url.startsWith('ws')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(cache => {
        if (event.request.url.startsWith('http')) cache.put(event.request, clone);
      });
      return resp;
    }).catch(() => caches.match('/index.html')))
  );
});

// ------------------ IndexedDB ------------------
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("RegistroDB", 1);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("usuarios")) {
        db.createObjectStore("usuarios", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = e => reject(e.target.error);
  });
}

function getAllUsers() {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction("usuarios", "readonly");
    const store = tx.objectStore("usuarios");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e);
  });
}

function deleteUser(id) {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction("usuarios", "readwrite");
    const store = tx.objectStore("usuarios");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e);
  });
}

// ------------------ Sync ------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-usuarios') {
    event.waitUntil(syncUsuariosPendientes());
  } else if (event.tag === 'sync-failed-posts') {
    event.waitUntil(syncFailedPosts());
  }
});

async function syncUsuariosPendientes() {
  try {
    const usuarios = await getAllUsers();

    for (const usuario of usuarios) {
      try {
        const res = await fetch('https://api-condominios-noti.onrender.com/api/insertar_usuario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(usuario),
        });

        if (res.ok) await deleteUser(usuario.id);
      } catch (err) {
        console.error('Error enviando usuario:', err);
      }
    }

  } catch (err) {
    console.error('Error en sincronización:', err);
  }
}

async function syncFailedPosts() {
  try {
    // Usar el mismo sistema de IndexedDB que el cliente
    const failedPosts = await getAllFailedPosts();
    console.log(`Sincronizando ${failedPosts.length} POSTs fallidos`);

    for (const post of failedPosts) {
      try {
        // Incrementar contador de reintentos
        const newRetryCount = post.retryCount + 1;
        await updateFailedPostRetryCount(post.id, newRetryCount);

        const response = await fetch(post.url, {
          method: post.method,
          headers: post.headers,
          body: post.body,
        });

        if (response.ok) {
          console.log(`POST exitoso para ID ${post.id}`);
          await deleteFailedPost(post.id);
        } else {
          console.log(`POST falló para ID ${post.id}, intento ${newRetryCount}/${post.maxRetries}`);
          
          // Si se excedió el número máximo de reintentos, eliminar el post
          if (newRetryCount >= post.maxRetries) {
            console.log(`Eliminando POST ${post.id} después de ${post.maxRetries} intentos fallidos`);
            await deleteFailedPost(post.id);
          }
        }
      } catch (error) {
        console.error(`Error sincronizando POST ${post.id}:`, error);
        
        // Si se excedió el número máximo de reintentos, eliminar el post
        if (post.retryCount + 1 >= post.maxRetries) {
          console.log(`Eliminando POST ${post.id} después de ${post.maxRetries} intentos fallidos`);
          await deleteFailedPost(post.id);
        }
      }
    }
  } catch (error) {
    console.error('Error POSTs fallidos:', error);
  }
}

// Funciones adicionales para manejar POSTs fallidos
async function getAllFailedPosts() {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction("failedPosts", "readonly");
    const store = tx.objectStore("failedPosts");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e);
  });
}

async function updateFailedPostRetryCount(id, retryCount) {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction("failedPosts", "readwrite");
    const store = tx.objectStore("failedPosts");
    
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

async function deleteFailedPost(id) {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction("failedPosts", "readwrite");
    const store = tx.objectStore("failedPosts");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e);
  });
}
