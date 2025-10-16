import React, { useState, useEffect } from 'react';
import {
  Container, Box, Grid, Typography, TextField, Button, Alert,
  FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';

// Función p
// ara esperar a que offlineManager esté disponible
const waitForOfflineManager = async () => {
  let attempts = 0;
  const maxAttempts = 50; // 5 segundos máximo
  
  while (!window.offlineManager && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!window.offlineManager) {
    throw new Error('offlineManager no se pudo cargar');
  }
};

function App() {
  const [nombre, setNombre] = useState('');
  const [nombreError, setNombreError] = useState(false);

  const [apellido, setApellido] = useState('');
  const [apellidoError, setApellidoError] = useState(false);

  const [telefono, setTelefono] = useState('+52');
  const [telefonoError, setTelefonoError] = useState(false);

  const [departamento, setDepartamento] = useState('');
  const [departamentoError, setDepartamentoError] = useState(false);

  const [contra, setContra] = useState('');
  const [contraError, setContraError] = useState(false);

  const [rol, setRol] = useState('');
  const [rolError, setRolError] = useState(false);

  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('success');
  const [pendingPosts, setPendingPosts] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Funciones para manejar IndexedDB y sincronización
  const saveFailedPost = async (postData) => {
    try {
      // Esperar a que offlineManager esté disponible
      await waitForOfflineManager();
      
      // Guardar POST fallido
      await window.offlineManager.saveFailedPost({
        url: 'https://api-condominios-noti.onrender.com/api/insertar_usuario',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      
      // Registrar tarea de sincronización
      await window.offlineManager.registerSyncTask();
      setPendingPosts(prev => prev + 1);
    } catch (error) {
      console.error('Error guardando POST fallido:', error);
    }
  };

  const checkPendingPosts = async () => {
    try {
      // Esperar a que offlineManager esté disponible
      await waitForOfflineManager();
      
      // Obtener conteo de POSTs pendientes
      const pendingCount = await window.offlineManager.getPendingCount();
      setPendingPosts(pendingCount);
    } catch (error) {
      console.error('Error verificando POSTs pendientes:', error);
    }
  };

  const processPendingTasks = async () => {
    try {
      // Esperar a que offlineManager esté disponible
      await waitForOfflineManager();
      
      // Procesar POSTs pendientes
      await window.offlineManager.processFailedPosts();
      
      // Actualizar conteo después del procesamiento
      await checkPendingPosts();
    } catch (error) {
      console.error('Error procesando tareas pendientes:', error);
    }
  };

  // Funciones para manejar notificaciones push
  const waitForPushManager = async () => {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (!window.pushNotificationManager && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.pushNotificationManager) {
      throw new Error('pushNotificationManager no se pudo cargar');
    }
  };

  const checkNotificationStatus = async () => {
    try {
      await waitForPushManager();
      const status = await window.pushNotificationManager.getSubscriptionStatus();
      
      setNotificationSupported(status.supported);
      setNotificationPermission(status.permission);
      setIsSubscribed(status.subscribed);
      
      return status;
    } catch (error) {
      console.error('Error verificando estado de notificaciones:', error);
      setNotificationSupported(false);
    }
  };

  const handleSubscribeToNotifications = async () => {
    try {
      await waitForPushManager();
      await window.pushNotificationManager.subscribeToPushNotifications();
      
      setMessage('¡Notificaciones push activadas exitosamente!');
      setVariant('success');
      setIsSubscribed(true);
      setNotificationPermission('granted');
      
      // Verificar estado actualizado
      await checkNotificationStatus();
    } catch (error) {
      console.error('Error suscribiéndose a notificaciones:', error);
      setMessage(`Error activando notificaciones: ${error.message}`);
      setVariant('error');
    }
  };

  const handleUnsubscribeFromNotifications = async () => {
    try {
      await waitForPushManager();
      await window.pushNotificationManager.unsubscribeFromPushNotifications();
      
      setMessage('Notificaciones push desactivadas');
      setVariant('info');
      setIsSubscribed(false);
      
      // Verificar estado actualizado
      await checkNotificationStatus();
    } catch (error) {
      console.error('Error desuscribiéndose de notificaciones:', error);
      setMessage(`Error desactivando notificaciones: ${error.message}`);
      setVariant('error');
    }
  };

  const handleTestNotification = async () => {
    try {
      await waitForPushManager();
      await window.pushNotificationManager.sendTestNotification();
      
      setMessage('Notificación de prueba enviada');
      setVariant('success');
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
      setMessage(`Error enviando notificación de prueba: ${error.message}`);
      setVariant('error');
    }
  };

  const handleTestPushNotification = async () => {
    try {
      // Simular notificación push sin backend
      const registration = await navigator.serviceWorker.ready;
      
      // Crear notificación push simulada
      const notificationData = {
        title: '🏢 Condominio - Nuevo Usuario Registrado',
        body: 'Se ha registrado un nuevo usuario en el departamento 302',
        icon: '/icons/favicon-32x32.png',
        badge: '/icons/favicon-16x16.png',
        tag: 'user-registered',
        requireInteraction: true,
        data: {
          type: 'user_registered',
          department: '302',
          timestamp: new Date().toISOString()
        },
        actions: [
          {
            action: 'view',
            title: 'Ver Usuario',
            icon: '/icons/favicon-16x16.png'
          },
          {
            action: 'close',
            title: 'Cerrar',
            icon: '/icons/favicon-16x16.png'
          }
        ]
      };
      
      await registration.showNotification(notificationData.title, notificationData);
      
      setMessage('Notificación push simulada enviada');
      setVariant('success');
    } catch (error) {
      console.error('Error enviando notificación push simulada:', error);
      setMessage(`Error: ${error.message}`);
      setVariant('error');
    }
  };

  const handleTestMultipleNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Crear múltiples notificaciones de prueba
      const notifications = [
        {
          title: '🔧 Mantenimiento Programado',
          body: 'El elevador estará fuera de servicio mañana de 9:00 a 12:00',
          tag: 'maintenance-1'
        },
        {
          title: '💰 Recordatorio de Pago',
          body: 'Tu cuota mensual vence en 3 días',
          tag: 'payment-reminder'
        },
        {
          title: '🚨 Alerta de Seguridad',
          body: 'Se reportó actividad sospechosa en el estacionamiento',
          tag: 'security-alert'
        }
      ];
      
      // Enviar notificaciones con delay
      for (let i = 0; i < notifications.length; i++) {
        setTimeout(async () => {
          await registration.showNotification(notifications[i].title, {
            ...notifications[i],
            icon: '/icons/favicon-32x32.png',
            badge: '/icons/favicon-16x16.png',
            requireInteraction: true
          });
        }, i * 2000); // 2 segundos entre cada notificación
      }
      
      setMessage('3 notificaciones de prueba programadas');
      setVariant('success');
    } catch (error) {
      console.error('Error enviando múltiples notificaciones:', error);
      setMessage(`Error: ${error.message}`);
      setVariant('error');
    }
  };


  // Efectos
  useEffect(() => {
    checkPendingPosts();
    checkNotificationStatus();
    
    const handleOnline = () => {
      setIsOnline(true);
      // Cuando se restablece la conexión, procesar tareas pendientes
      processPendingTasks();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Verificar tareas pendientes periódicamente
    const interval = setInterval(checkPendingPosts, 10000); // Cada 10 segundos
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Validaciones simples
  const validateNombre = () => setNombreError(!nombre.trim());
  const validateApellido = () => setApellidoError(!apellido.trim());
  const validateTelefono = () => setTelefonoError(!telefono.trim());
  const validateDepartamento = () => setDepartamentoError(!departamento.trim());
  const validateContra = () => setContraError(!contra.trim());
  const validateRol = () => setRolError(!rol.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();

    validateNombre();
    validateApellido();
    validateTelefono();
    validateDepartamento();
    validateContra();
    validateRol();

    // Verificar si hay errores
    if (
      !nombre.trim() ||
      !apellido.trim() ||
      !telefono.trim() ||
      !departamento.trim() ||
      !contra.trim() ||
      !rol.trim()
    ) {
      setMessage('Por favor, completa todos los campos.');
      setVariant('error');
      return;
    }

    try {
      const response = await fetch('https://api-condominios-noti.onrender.com/api/insertar_usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido, telefono, departamento, contra, rol }),
      });

      if (response.ok) {
        setMessage('Usuario registrado exitosamente.');
        setVariant('success');
        setNombre('');
        setApellido('');
        setTelefono('+52');
        setDepartamento('');
        setContra('');
        setRol('');
      } else {
        const data = await response.json();
        setMessage(data.message || 'Error al registrar el usuario.');
        setVariant('error');
      }
    } catch (error) {
      console.error('Error al enviar el usuario:', error);
      
      // Si no hay conexión o hay error de red, guardar en IndexedDB
      if (!navigator.onLine || error.name === 'TypeError') {
        try {
          await saveFailedPost({ nombre, apellido, telefono, departamento, contra, rol });
          setMessage('Sin conexión. El usuario se guardará localmente y se sincronizará cuando se restablezca la conexión.');
          setVariant('warning');
          setNombre('');
          setApellido('');
          setTelefono('+52');
          setDepartamento('');
          setContra('');
          setRol('');
        } catch (dbError) {
          console.error('Error guardando en IndexedDB:', dbError);
          setMessage('Error al registrar el usuario y no se pudo guardar localmente.');
          setVariant('error');
        }
      } else {
        setMessage('Error al registrar el usuario.');
        setVariant('error');
      }
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography component="h1" variant="h5">
            Registrar Usuario
          </Typography>
          <Chip 
            label={isOnline ? 'En línea' : 'Sin conexión'} 
            color={isOnline ? 'success' : 'error'} 
            size="small" 
          />
          {pendingPosts > 0 && (
            <Chip 
              label={`${pendingPosts} pendientes`} 
              color="warning" 
              size="small" 
            />
          )}
        </Box>

        {/* Sección de notificaciones push */}
        {notificationSupported && (
          <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Notificaciones Push
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {!isSubscribed ? (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleSubscribeToNotifications}
                  disabled={notificationPermission === 'denied'}
                >
                  Activar Notificaciones
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={handleUnsubscribeFromNotifications}
                >
                  Desactivar Notificaciones
                </Button>
              )}
              
              <Button
                variant="outlined"
                color="info"
                size="small"
                onClick={handleTestNotification}
                disabled={notificationPermission !== 'granted'}
              >
                Prueba Básica
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={handleTestPushNotification}
                disabled={notificationPermission !== 'granted'}
              >
                Prueba Push
              </Button>
              
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={handleTestMultipleNotifications}
                disabled={notificationPermission !== 'granted'}
              >
                Múltiples Notificaciones
              </Button>
              
              <Chip 
                label={isSubscribed ? 'Notificaciones activas' : 'Notificaciones inactivas'} 
                color={isSubscribed ? 'success' : 'default'} 
                size="small" 
              />
            </Box>
            
            {notificationPermission === 'denied' && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                Los permisos de notificación están bloqueados. Por favor, habilítalos en la configuración del navegador.
              </Typography>
            )}
          </Box>
        )}

        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="nombre"
                label="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={validateNombre}
                error={nombreError}
                helperText={nombreError && 'El campo es obligatorio.'}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="apellido"
                label="Apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                onBlur={validateApellido}
                error={apellidoError}
                helperText={apellidoError && 'El campo es obligatorio.'}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="telefono"
                label="No. Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                onBlur={validateTelefono}
                error={telefonoError}
                helperText={telefonoError && 'El campo es obligatorio.'}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="departamento"
                label="Departamento"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                onBlur={validateDepartamento}
                error={departamentoError}
                helperText={departamentoError && 'El campo es obligatorio.'}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="contra"
                type="password"
                label="Contraseña"
                value={contra}
                onChange={(e) => setContra(e.target.value)}
                onBlur={validateContra}
                error={contraError}
                helperText={contraError && 'El campo es obligatorio.'}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="rol-label">Rol</InputLabel>
                <Select
                  labelId="rol-label"
                  id="rol"
                  value={rol}
                  label="Rol"
                  onChange={(e) => setRol(e.target.value)}
                  onBlur={validateRol}
                  error={rolError}
                >
                  <MenuItem value="usuario">Usuario</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                  <MenuItem value="dueno">Dueño</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
            Registrar
          </Button>
        </Box>


        {message && (
          <Alert severity={variant} sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
      </Box>
    </Container>
  );
}

export default App;