# Sistema de Sincronización Offline para POSTs Fallidos

## Descripción

Este sistema implementa un mecanismo robusto y simplificado para manejar POSTs fallidos cuando no hay conexión a internet, guardándolos en IndexedDB y creando tareas asíncronas para su posterior sincronización.

## Características Implementadas

### 1. **Manejo de POSTs Fallidos**
- Cuando un POST falla (sin conexión o error de red), se guarda automáticamente en IndexedDB
- Se crea una tarea asíncrona para reintentar el envío
- El usuario recibe notificación de que el registro se guardó localmente

### 2. **Sistema Unificado OfflineManager**
- **Archivo**: `public/offlineManager.js`
- Clase `OfflineManager` que maneja toda la funcionalidad offline
- Maneja reintentos con contador de intentos
- Máximo 3 intentos por POST
- Procesamiento automático al restablecer conexión

### 3. **Service Worker con Sincronización**
- **Archivo**: `public/sw.js`
- Listener de sincronización para `sync-failed-posts`
- Procesa POSTs guardados en IndexedDB
- Elimina registros exitosos y mantiene fallidos para reintento

### 4. **Interfaz de Usuario Mejorada**
- **Archivo**: `src/App.jsx`
- Indicador de estado de conexión (En línea/Sin conexión)
- Contador de POSTs pendientes de sincronización
- Mensajes informativos para el usuario

### 5. **IndexedDB Simplificado**
- **Archivo**: `public/offlineManager.js` (incluye IndexedDB)
- Dos object stores: `usuarios` y `failedPosts`
- Funciones integradas para manejar POSTs fallidos
- Sistema unificado sin dependencias externas

## Flujo de Funcionamiento

### Cuando un POST Falla:

1. **Detección de Error**: El sistema detecta si no hay conexión o hay error de red
2. **Guardado Local**: Se guarda el POST en IndexedDB con metadatos (timestamp, contador de reintentos)
3. **Tarea Asíncrona**: Se crea una tarea asíncrona para reintentar el envío
4. **Notificación**: Se informa al usuario que el registro se guardó localmente
5. **Sincronización**: El service worker procesa los POSTs guardados cuando hay conexión

### Procesamiento de Tareas:

1. **Procesamiento Automático**: Cada 30 segundos se procesan tareas pendientes
2. **Reintentos Inteligentes**: Backoff exponencial para evitar sobrecarga del servidor
3. **Límite de Reintentos**: Máximo 3 intentos por POST
4. **Limpieza**: Se eliminan tareas exitosas o que excedieron el límite de reintentos

## Archivos Modificados/Creados

### Archivos Existentes Modificados:
- `src/App.jsx` - Integración de funcionalidad offline simplificada
- `public/sw.js` - Listener de sincronización mejorado
- `index.html` - Inclusión del script offlineManager

### Archivos Nuevos Creados:
- `public/offlineManager.js` - Sistema unificado para funcionalidad offline
- `OFFLINE_SYNC_README.md` - Esta documentación

### Archivos de Soporte (opcionales):
- `public/indexedDB.js` - Funciones originales de IndexedDB (mantenido para compatibilidad)
- `public/asyncTasks.js` - Sistema de tareas asíncronas (no utilizado en la versión final)

## Uso

### Para el Usuario:
1. Llenar el formulario de registro
2. Si hay conexión: el registro se envía normalmente
3. Si no hay conexión: se guarda localmente y se sincroniza automáticamente cuando se restablezca la conexión
4. Ver el contador de POSTs pendientes en la interfaz

### Para el Desarrollador:
- El sistema funciona automáticamente sin configuración adicional
- Los logs se muestran en la consola del navegador
- Se puede monitorear el estado de las tareas asíncronas

## Beneficios

1. **Experiencia de Usuario Mejorada**: No se pierden registros por falta de conexión
2. **Robustez**: Sistema de reintentos inteligente
3. **Transparencia**: El usuario sabe cuándo hay registros pendientes
4. **Eficiencia**: Procesamiento automático sin intervención manual
5. **Escalabilidad**: Maneja múltiples POSTs fallidos simultáneamente

## Consideraciones Técnicas

- **Compatibilidad**: Requiere navegadores que soporten Service Workers e IndexedDB
- **Persistencia**: Los datos se mantienen entre sesiones del navegador
- **Rendimiento**: Procesamiento asíncrono no bloquea la interfaz
- **Seguridad**: Los datos se mantienen localmente hasta sincronización exitosa
