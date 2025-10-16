// pushNotifications.js - Manejo de notificaciones push

class PushNotificationManager {
  constructor() {
    this.vapidPublicKey = 'BFTlx30Q3G-uysw8dTloMA0mlCNMeTfqlvbRHQZJYXxDN0K8z5VdaU4PplJv8DiSkb6ZhWSFDg5wsLxIXihvLnc';
    this.serverUrl = 'https://api-condominios-noti.onrender.com';
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.subscription = null;
  }

  // Verificar si las notificaciones están soportadas
  isNotificationSupported() {
    return this.isSupported && 'Notification' in window;
  }

  // Solicitar permisos de notificación
  async requestNotificationPermission() {
    if (!this.isNotificationSupported()) {
      throw new Error('Las notificaciones no están soportadas en este navegador');
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      throw new Error('Los permisos de notificación han sido denegados');
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Convertir clave VAPID a formato Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Suscribirse a notificaciones push
  async subscribeToPushNotifications() {
    try {
      // Verificar soporte
      if (!this.isNotificationSupported()) {
        throw new Error('Las notificaciones push no están soportadas');
      }

      // Solicitar permisos
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) {
        throw new Error('Permisos de notificación denegados');
      }

      // Obtener registro del service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Verificar si ya existe una suscripción
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('Ya existe una suscripción:', subscription);
        this.subscription = subscription;
        return subscription;
      }

      // Crear nueva suscripción
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('Nueva suscripción creada:', subscription);
      this.subscription = subscription;
      
      // Enviar suscripción al servidor
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Error suscribiéndose a notificaciones push:', error);
      throw error;
    }
  }

  // Desuscribirse de notificaciones push
  async unsubscribeFromPushNotifications() {
    try {
      if (!this.subscription) {
        const registration = await navigator.serviceWorker.ready;
        this.subscription = await registration.pushManager.getSubscription();
      }

      if (this.subscription) {
        const success = await this.subscription.unsubscribe();
        if (success) {
          console.log('Desuscripción exitosa');
          this.subscription = null;
          
          // Notificar al servidor que se desuscribió
          await this.removeSubscriptionFromServer();
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error desuscribiéndose de notificaciones push:', error);
      throw error;
    }
  }

  // Enviar suscripción al servidor
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch(`${this.serverUrl}/api/subscribe-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      console.log('Suscripción enviada al servidor:', result);
      return result;
    } catch (error) {
      console.error('Error enviando suscripción al servidor:', error);
      throw error;
    }
  }

  // Remover suscripción del servidor
  async removeSubscriptionFromServer() {
    try {
      const response = await fetch(`${this.serverUrl}/api/unsubscribe-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      console.log('Suscripción removida del servidor');
      return true;
    } catch (error) {
      console.error('Error removiendo suscripción del servidor:', error);
      // No lanzar error aquí, ya que la desuscripción local fue exitosa
      return false;
    }
  }

  // Verificar estado de la suscripción
  async getSubscriptionStatus() {
    try {
      if (!this.isNotificationSupported()) {
        return {
          supported: false,
          permission: 'unsupported',
          subscribed: false,
          subscription: null
        };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      return {
        supported: true,
        permission: Notification.permission,
        subscribed: !!subscription,
        subscription: subscription
      };
    } catch (error) {
      console.error('Error obteniendo estado de suscripción:', error);
      return {
        supported: false,
        permission: 'error',
        subscribed: false,
        subscription: null
      };
    }
  }

  // Enviar notificación de prueba
  async sendTestNotification() {
    try {
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) {
        throw new Error('Permisos de notificación denegados');
      }

      const notification = new Notification('Condominio - Prueba', {
        body: 'Esta es una notificación de prueba del sistema de condominios',
        icon: '/icons/favicon-32x32.png',
        badge: '/icons/favicon-16x16.png',
        tag: 'test-notification'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
      throw error;
    }
  }
}

// Crear instancia global
const pushNotificationManager = new PushNotificationManager();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.pushNotificationManager = pushNotificationManager;
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PushNotificationManager;
}
