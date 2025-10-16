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


  // Efectos
  useEffect(() => {
    checkPendingPosts();

    // Limpiar suscripciones push existentes
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          // Obtener suscripción actual
          const subscription = await reg.pushManager.getSubscription();
          if (subscription) {
            // Cancelar suscripción existente
            await subscription.unsubscribe();
            console.log("Suscripción push cancelada");
          }
        } catch (error) {
          console.log("No había suscripción push activa");
        }
      });
    }
    
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