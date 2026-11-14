/* WebAuthn and Native Biometric (LocalAuthentication) client helpers shared by login and client app.
   Compatible con la App nativa iOS (Touch ID / Face ID) y navegadores web estándar. */
window.MFPasskeys = (() => {
  let _nativeBioPlugin = null;

  const getBiometricPlugin = () => {
    if (_nativeBioPlugin) return _nativeBioPlugin;
    if (typeof window.Capacitor === 'undefined') return null;

    if (window.Capacitor.Plugins && window.Capacitor.Plugins.BiometricAuth) {
      _nativeBioPlugin = window.Capacitor.Plugins.BiometricAuth;
      return _nativeBioPlugin;
    }

    if (typeof window.Capacitor.registerPlugin === 'function') {
      try {
        const plugin = window.Capacitor.registerPlugin('BiometricAuth');
        if (plugin) {
          if (!window.Capacitor.Plugins) window.Capacitor.Plugins = {};
          window.Capacitor.Plugins.BiometricAuth = plugin;
          _nativeBioPlugin = plugin;
          return plugin;
        }
      } catch (e) {
        console.warn('[MFPasskeys] Error registrando BiometricAuth:', e);
      }
    }
    return null;
  };

  const isNativeBiometric = () => getBiometricPlugin() !== null;

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
    if (!response.ok) throw new Error(data.detail || data.error || 'No se pudo completar el acceso.');
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
    if (/iPhone|iPad/i.test(ua)) return 'iPhone Touch ID / Face ID';
    if (/Android/i.test(ua)) return 'Android Biométrico';
    if (/Windows/i.test(ua)) return 'Windows Hello';
    if (/Mac/i.test(ua)) return 'Mac Touch ID';
    return 'Este dispositivo';
  };
  const supported = () => isNativeBiometric() || (window.isSecureContext && !!window.PublicKeyCredential && !!navigator.credentials);

  async function supportsRegistration() {
    const bioPlugin = getBiometricPlugin();
    if (bioPlugin) {
      try {
        const info = await bioPlugin.isAvailable();
        return !!(info && (info.hasBiometrics || info.isAvailable));
      } catch (_) {
        return false;
      }
    }
    if (!supported()) return false;
    try {
      if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        if (!await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) return false;
      }
      if (typeof window.PublicKeyCredential.getClientCapabilities === 'function') {
        const capabilities = await window.PublicKeyCredential.getClientCapabilities();
        if (capabilities && capabilities.userVerifyingPlatformAuthenticator === false) return false;
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  async function register() {
    const bioPlugin = getBiometricPlugin();
    if (bioPlugin) {
      // Flujo nativo 100% como Red Mercantil (Face ID / Touch ID al Llavero del iPhone)
      await bioPlugin.authenticate({
        reason: 'Confirma tu huella o Face ID para activar el acceso biométrico en MásKFundas'
      });
      const regResp = await post('/api/auth/biometric/register', { device_name: deviceName() });
      if (!regResp || !regResp.token) {
        throw new Error(regResp?.error || 'No se pudo registrar la biometría en el servidor.');
      }
      await bioPlugin.setCredentials({
        phone: regResp.phone || 'cliente_maskfundas',
        token: regResp.token
      });
      localStorage.setItem('mf_passkey_enabled', '1');
      return { success: true, message: 'Touch ID / Face ID configurado correctamente en este dispositivo.' };
    }

    // Flujo WebAuthn estándar para navegadores web
    if (!await supportsRegistration()) throw new Error('Este navegador no ofrece Face ID/huella.');
    const { options } = await post('/api/auth/passkeys/register/options', { device_name: deviceName() });
    let credential;
    try { credential = await navigator.credentials.create({ publicKey: decodeOptions(options) }); }
    catch (error) {
      if (error.name === 'NotAllowedError') throw new Error('Se canceló la activación de Face ID/huella.');
      if (error.name === 'InvalidStateError') throw new Error('Este dispositivo ya tiene una llave para la cuenta.');
      throw error;
    }
    if (!credential) throw new Error('El dispositivo no creó la llave.');
    const payload = credentialJson(credential);
    payload.device_name = deviceName();
    const result = await post('/api/auth/passkeys/register/verify', payload);
    localStorage.setItem('mf_passkey_enabled', '1');
    return result;
  }

  async function login() {
    const bioPlugin = getBiometricPlugin();
    if (bioPlugin) {
      // Flujo nativo: abre sensor Face ID / Touch ID y extrae credencial del Llavero
      const creds = await bioPlugin.getCredentials({
        reason: 'Inicia sesión con tu huella o Face ID en MásKFundas'
      });
      if (!creds || !creds.success || !creds.token) {
        throw new Error(creds?.error || 'No hay huella o Face ID registrado en este dispositivo. Entra con código para activarla.');
      }
      return post('/api/auth/biometric/login', { token: creds.token });
    }

    // Flujo WebAuthn estándar
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

  return { getBiometricPlugin, isNativeBiometric, supported, supportsRegistration, register, login, deviceName };
})();
