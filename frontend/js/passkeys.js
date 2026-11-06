/* WebAuthn client helpers shared by the login and client app. */
window.MFPasskeys = (() => {
  const fromB64Url = value => {
    const base64 = String(value).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    const raw = atob(base64);
    return Uint8Array.from(raw, char => char.charCodeAt(0)).buffer;
  };
  const toB64Url = value => {
    const bytes = new Uint8Array(value);
    let raw = '';
    for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
    return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };
  const decodeOptions = options => {
    options.challenge = fromB64Url(options.challenge);
    if (options.user?.id) options.user.id = fromB64Url(options.user.id);
    for (const field of ['allowCredentials', 'excludeCredentials']) {
      if (options[field]) options[field] = options[field].map(item => ({ ...item, id: fromB64Url(item.id) }));
    }
    return options;
  };
  const post = async (url, body = {}) => {
    const response = await fetch(url, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': readCsrf() },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'No se pudo completar el acceso con passkey.');
    return data;
  };
  const readCsrf = () => {
    const item = document.cookie.split('; ').find(cookie => cookie.startsWith('client_csrf='));
    return item ? decodeURIComponent(item.slice('client_csrf='.length)) : '';
  };
  const credentialJson = credential => {
    const result = {
      id: credential.id,
      rawId: toB64Url(credential.rawId),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment || null,
      clientExtensionResults: credential.getClientExtensionResults?.() || {},
      response: {}
    };
    const response = credential.response;
    result.response.clientDataJSON = toB64Url(response.clientDataJSON);
    if (response.attestationObject) {
      result.response.attestationObject = toB64Url(response.attestationObject);
      result.response.transports = response.getTransports?.() || [];
    } else {
      result.response.authenticatorData = toB64Url(response.authenticatorData);
      result.response.signature = toB64Url(response.signature);
      result.response.userHandle = response.userHandle ? toB64Url(response.userHandle) : null;
    }
    return result;
  };
  const deviceName = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/i.test(ua)) return 'iPhone o iPad';
    if (/Android/i.test(ua)) return 'Android';
    if (/Windows/i.test(ua)) return 'Windows Hello';
    if (/Mac/i.test(ua)) return 'Mac';
    return 'Este dispositivo';
  };
  const supported = () => window.isSecureContext && !!window.PublicKeyCredential && !!navigator.credentials;

  async function register() {
    if (!supported()) throw new Error('Este navegador no permite passkeys. Actualízalo o usa el acceso por correo.');
    const { options } = await post('/api/auth/passkeys/register/options', { device_name: deviceName() });
    let credential;
    try { credential = await navigator.credentials.create({ publicKey: decodeOptions(options) }); }
    catch (error) {
      if (error.name === 'NotAllowedError') throw new Error('Registro cancelado. Puedes activarlo cuando quieras desde Más.');
      if (error.name === 'InvalidStateError') throw new Error('Este dispositivo ya tiene una passkey para la cuenta.');
      throw error;
    }
    if (!credential) throw new Error('El dispositivo no creó la passkey.');
    const payload = credentialJson(credential);
    payload.device_name = deviceName();
    return post('/api/auth/passkeys/register/verify', payload);
  }

  async function login() {
    if (!supported()) throw new Error('Este navegador no permite passkeys. Puedes entrar con el código enviado a tu correo.');
    const { options } = await post('/api/auth/passkeys/login/options');
    let credential;
    try { credential = await navigator.credentials.get({ publicKey: decodeOptions(options) }); }
    catch (error) {
      if (error.name === 'NotAllowedError') throw new Error('No se completó el acceso. Prueba de nuevo o entra con tu correo.');
      throw error;
    }
    if (!credential) throw new Error('No se seleccionó una passkey.');
    return post('/api/auth/passkeys/login/verify', credentialJson(credential));
  }

  return { supported, register, login, deviceName };
})();
