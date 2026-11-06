(function () {
  const endpoint = '/api/cliente/notificaciones';
  let publicKey = '';

  function bytes(base64url) {
    const padded = (base64url + '='.repeat((4 - base64url.length % 4) % 4))
      .replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
  }

  async function request(path, options = {}) {
    const response = await fetch(endpoint + path, { credentials: 'same-origin', cache: 'no-store', ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'No se pudo guardar el cambio.');
    return data;
  }

  function status(message) {
    const element = document.getElementById('pushStatus');
    if (element) element.textContent = message;
  }

  async function refresh() {
    const button = document.getElementById('pushToggle');
    if (!button) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      button.disabled = true;
      status('Este navegador no admite notificaciones push.');
      return;
    }
    try {
      const config = await request('/config');
      publicKey = config.publicKey || '';
      if (!config.available) {
        button.disabled = true;
        status('Las notificaciones aún no están disponibles.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      button.dataset.enabled = subscription ? '1' : '0';
      status(subscription ? 'Activadas en este dispositivo. Toca para desactivar.' : 'Toca para recibir avisos en este dispositivo.');
    } catch (_) {
      button.disabled = true;
      status('No se pudo comprobar el estado de las notificaciones.');
    }
  }

  async function toggle() {
    const button = document.getElementById('pushToggle');
    if (!button || button.disabled) return;
    button.disabled = true;
    status('Guardando preferencia…');
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await request('/subscription', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': obtenerTokenCSRF() },
          body: JSON.stringify(subscription.toJSON()),
        });
        await subscription.unsubscribe();
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          status('Permiso denegado. Puedes cambiarlo en los ajustes del navegador.');
          return;
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: bytes(publicKey),
        });
        try {
          await request('/subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': obtenerTokenCSRF() },
            body: JSON.stringify(subscription.toJSON()),
          });
        } catch (error) {
          await subscription.unsubscribe();
          throw error;
        }
      }
    } catch (error) {
      status(error.message || 'No se pudo cambiar la preferencia.');
      button.disabled = false;
      return;
    }
    button.disabled = false;
    await refresh();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pushToggle')?.addEventListener('click', toggle);
    refresh();
  });
})();
