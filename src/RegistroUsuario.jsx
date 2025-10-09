import React, { useState } from 'react';
import {
  Container, Box, Grid, Typography, TextField, Button, Alert,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

function RegistroUsuario() {
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
      setMessage('Error al registrar el usuario.');
      setVariant('error');
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
        <Typography component="h1" variant="h5" gutterBottom>
          Registrar Usuario
        </Typography>

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

export default RegistroUsuario;