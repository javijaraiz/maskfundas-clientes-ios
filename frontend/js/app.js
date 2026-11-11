// <i class="fa-solid fa-mobile-screen"></i> App Logic - Portal de Clientes MásGigas
// Inspiración visual y usabilidad mobile-first limpia (Simyo / O2 España)

let state = {
    telefonoUsuario: (window.__MG_SESSION && window.__MG_SESSION.telefono) || sessionStorage.getItem('mg_user_phone') || localStorage.getItem('mg_user_phone') || '',
    lineas: [],
    facturas: [],
    facturasError: false,
    lineaActiva: null,
    productos: [],
    llamadas: null,
    solicitudActualTipo: '',
    esTitular: true,
    dniCliente: '',
    demo: false,
    mesesConsumo: [],
    mesConsumoActivoIdx: 0,
    mesConsumoSeleccionado: ''
};

let lineModalReturnFocus = null;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

// Los tokens solo persisten en esta pestaña; elimina credenciales heredadas
// del almacenamiento persistente del navegador.
sessionStorage.removeItem('mg_token');
localStorage.removeItem('mg_token');
localStorage.removeItem('mg_user_phone');

function obtenerTokenCSRF() {
    const item = document.cookie.split('; ').find(cookie => cookie.startsWith('client_csrf='));
    return item ? decodeURIComponent(item.slice('client_csrf='.length)) : '';
}

async function gestionarPasskeys() {
    const modal = document.getElementById('passkeysModal');
    const list = document.getElementById('passkeyList');
    if (!modal || !list) return;
    modal.style.display = 'flex';
    list.innerHTML = '<p class="request-empty-state">Cargando dispositivos…</p>';
    try {
        const response = await fetch('/api/auth/passkeys', { credentials: 'same-origin', cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'No se pudieron consultar tus dispositivos.');
        const passkeys = data.passkeys || [];
        list.innerHTML = passkeys.length ? passkeys.map(item => `<div class="passkey-row"><div><strong>${escapeHtml(item.device_name || 'Dispositivo')}</strong><small>Registrado ${escapeHtml(String(item.created_at || '').slice(0, 10))}</small></div><button type="button" class="passkey-remove" data-passkey-id="${Number(item.id)}" data-passkey-name="${escapeHtml(item.device_name || 'Dispositivo')}">Quitar</button></div>`).join('') : '<p class="request-empty-state">Aún no has activado el acceso con passkey.</p>';
        list.querySelectorAll('[data-passkey-id]').forEach(button => button.addEventListener('click', () => eliminarPasskey(button.dataset.passkeyId, button.dataset.passkeyName)));
    } catch (error) {
        list.innerHTML = `<p class="request-empty-state">${escapeHtml(error.message)}</p>`;
    }
}

function cerrarModalPasskeys() {
    const modal = document.getElementById('passkeysModal');
    if (modal) modal.style.display = 'none';
}

async function registrarPasskeyDesdeApp() {
    const button = document.querySelector('#passkeysModal .primary-modal-btn');
    if (!window.MFPasskeys?.supported()) { mostrarToast('Tu navegador no permite el acceso con passkey.'); return; }
    if (button) button.disabled = true;
    try {
        const result = await window.MFPasskeys.register();
        mostrarToast(result.message || 'Dispositivo registrado.');
        await gestionarPasskeys();
    } catch (error) {
        mostrarToast(error.message || 'No se pudo registrar este dispositivo.');
    } finally {
        if (button) button.disabled = false;
    }
}

async function eliminarPasskey(id, name) {
    if (!window.confirm(`¿Quitar «${name}»? Podrás volver a registrarlo después de entrar con el código del correo.`)) return;
    try {
        const response = await fetch(`/api/auth/passkeys/${encodeURIComponent(id)}/delete`, {
            method: 'POST', credentials: 'same-origin', cache: 'no-store',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': obtenerTokenCSRF() }, body: '{}'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'No se pudo quitar el dispositivo.');
        mostrarToast('Llave de acceso eliminada.');
        await gestionarPasskeys();
    } catch (error) { mostrarToast(error.message || 'No se pudo quitar el dispositivo.'); }
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarTema();
    inicializarApp();
});

// ─────────────────────────────────────────────
// 🌙 Modo Claro / Modo Oscuro
// ─────────────────────────────────────────────
function inicializarTema() {
    const savedTheme = localStorage.getItem('mg_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        aplicarTema('dark');
    } else {
        aplicarTema('light');
    }
}

function aplicarTema(theme) {
    const icon = document.getElementById('themeIcon');
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        if (icon) icon.className = 'fa-solid fa-sun';
        localStorage.setItem('mg_theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        if (icon) icon.className = 'fa-solid fa-moon';
        localStorage.setItem('mg_theme', 'light');
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    aplicarTema(isDark ? 'light' : 'dark');
}

let loadingInterval = null;

function iniciarAnimacionFrasesCarga() {
    const frases = [
        { main: 'Login seguro', sub: 'Verificando sesión cifrada...' },
        { main: 'Desencriptando datos', sub: 'Descargando líneas contratadas y gigas...' },
        { main: 'Procesando datos', sub: 'Calculando consumos en tiempo real...' },
        { main: 'Disfrutando del mejor servicio', sub: '¡Todo listo para ti!' }
    ];

    let idx = 0;
    const mainEl = document.getElementById('loadingMainText');
    const subEl = document.getElementById('loadingSubText');

    if (loadingInterval) clearInterval(loadingInterval);
    loadingInterval = setInterval(() => {
        idx = (idx + 1) % frases.length;
        if (mainEl && subEl) {
            mainEl.style.transition = 'opacity 0.25s ease';
            subEl.style.transition = 'opacity 0.25s ease';
            mainEl.style.opacity = '0';
            subEl.style.opacity = '0';
            setTimeout(() => {
                mainEl.textContent = frases[idx].main;
                subEl.textContent = frases[idx].sub;
                mainEl.style.opacity = '1';
                subEl.style.opacity = '1';
            }, 250);
        }
    }, 1600);
}

async function inicializarApp() {
    iniciarAnimacionFrasesCarga();

    // Si no hay teléfono o token válido en sesión, redirigir a login
    if (!state.telefonoUsuario) {
        window.location.href = '/login';
        return;
    }

    // 1. Mostrar teléfono en cabecera
    const userPhoneDisplay = document.getElementById('userPhoneDisplay');
    if (userPhoneDisplay) {
        userPhoneDisplay.textContent = formatearTelefono(state.telefonoUsuario);
    }

    // 2. Cargar Líneas del Cliente desde DoWISP / Backend
    const lineasCargadas = await cargarLineasCliente();

    // No dejar una capa de carga infinita ni una app en blanco si el servidor
    // rechaza la sesión o la API no está disponible.
    if (!lineasCargadas) {
        ocultarCapaCarga();
        return;
    }

    // 3. Actualizar datos de Perfil de Usuario / Empresa en la Cabecera
    actualizarCabeceraUsuario();

    // 4. Mostrar el portal principal antes de consultar el servicio remoto de facturación.
    inicializarSelectorMesesConsumo();
    cambiarTab('inicio');
    cambiarConsumoSubtab('datos');

    // 5. La consulta de facturas se completa en segundo plano; un DoWISP lento no bloquea la app.
    ocultarCapaCarga();
    void cargarFacturasCliente();
}

function ocultarCapaCarga() {
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
    const overlay = document.getElementById('appLoadingOverlay');
    if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
}

function actualizarCabeceraUsuario() {
    const l = state.lineaActiva || (state.lineas && state.lineas[0]);
    if (!l) return;

    const nombreCompleto = l.nombre || 'Mi Cuenta';
    const dni = l.dni || '';
    const tel = state.telefonoUsuario || l.numero;

    // Nombre recortado elegante para el botón (ej: "ELEVA ANDAMIOS" o primer nombre)
    const partes = nombreCompleto.split(' ');
    const nombreCorto = partes.length > 2 ? `${partes[0]} ${partes[1]}` : nombreCompleto;

    const userDisplayName = document.getElementById('userDisplayName');
    const userAvatarText = document.getElementById('userAvatarText');
    const popoverUserName = document.getElementById('popoverUserName');
    const popoverUserDni = document.getElementById('popoverUserDni');
    const popoverUserPhone = document.getElementById('popoverUserPhone');

    if (userDisplayName) userDisplayName.textContent = nombreCorto;
    if (userAvatarText) {
        // Iniciales para el avatar (ej: "EA" o icono de edificio si es SL/SA)
        if (nombreCompleto.includes('SL') || nombreCompleto.includes('SA') || nombreCompleto.includes('CB')) {
            userAvatarText.innerHTML = '<i class="fa-solid fa-building" style="font-size: 0.85rem;"></i>';
        } else {
            if (partes[0]) userAvatarText.textContent = partes[0][0].toUpperCase();
            else userAvatarText.innerHTML = '<i class="fa-solid fa-user" style="font-size: 0.85rem;"></i>';
        }
    }
    if (popoverUserName) popoverUserName.textContent = nombreCompleto;
    if (popoverUserDni) popoverUserDni.style.display = 'none';
    if (popoverUserPhone) popoverUserPhone.style.display = 'none';
}

function formatearTelefono(tel) {
    if (!tel) return '';
    const clean = tel.replace(/\D/g, '');
    if (clean.length === 9) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 7)} ${clean.slice(7, 9)}`;
    }
    return tel;
}

function formatearPuk(puk) {
    if (!puk) return 'No disponible';
    return puk.toString().replace(/\s+/g, '').trim();
}

function formatearIccid(iccid) {
    if (!iccid) return 'No disponible';
    return iccid.toString().replace(/(.{4})/g, '$1 ').trim();
}

async function cargarLineasCliente() {
    try {
        const res = await fetch(`/api/cliente/lineas?telefono=${encodeURIComponent(state.telefonoUsuario)}`, { credentials: 'same-origin', cache: 'no-store' });
        if (res.status === 401) {
            cerrarSesion();
            return false;
        }
        if (res.status === 403) {
            cerrarSesion('Tu sesión ya no es válida. Inicia sesión de nuevo para continuar.');
            return false;
        }
        if (!res.ok) {
            mostrarToast('No se pudieron cargar tus líneas. Inténtalo de nuevo más tarde.');
            return false;
        }
        const data = await res.json();
        if (data.status === 'ok' && data.lineas && data.lineas.length > 0) {
            state.lineas = data.lineas;
            state.productos = Array.isArray(data.productos) && data.productos.length ? data.productos : data.lineas;
            state.lineaActiva = state.lineas.find(l => l.tipo === 'movil') || state.lineas[0];
            // Guardar flag de titular y DNI que devuelve el backend
            state.esTitular = data.es_titular !== undefined ? data.es_titular : true;
            state.dniCliente = data.dni || '';
            state.demo = data.demo === true;

            // Guardar en caché offline para resiliencia total
            try {
                localStorage.setItem('mg_offline_lineas', JSON.stringify(data.lineas));
                localStorage.setItem('mg_offline_productos', JSON.stringify(state.productos));
            } catch (_) {}

            const demoBanner = document.getElementById('reviewDemoBanner');
            if (demoBanner) demoBanner.hidden = !state.demo;

            // Ocultar opción de Passkeys/huella en modo demo para simplificar revisión
            const passkeysItem = document.getElementById('menuItemPasskeys');
            if (passkeysItem) passkeysItem.style.display = state.demo ? 'none' : 'flex';
            renderizarLineaActiva();
            renderizarListaServicios();
            // Ocultar pestaña de facturas si no es titular
            controlarAccesoFacturas();
            return true;
        }
        mostrarToast('No encontramos líneas asociadas a esta cuenta. Contacta con atención al cliente.');
        return false;
    } catch (err) {
        console.error('Error cargando líneas:', err);
        // Recuperar de caché offline si no hay red (Modo Avión / Sin cobertura)
        try {
            const cachedLineas = localStorage.getItem('mg_offline_lineas');
            if (cachedLineas) {
                const parsed = JSON.parse(cachedLineas);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    state.lineas = parsed;
                    state.lineaActiva = parsed.find(l => l.tipo === 'movil') || parsed[0];
                    renderizarLineaActiva();
                    mostrarAvisoConexion(false);
                    return true;
                }
            }
        } catch (_) {}
        mostrarToast('No se pudieron cargar tus líneas. Comprueba la conexión e inténtalo de nuevo.');
        return false;
    }
}

function controlarAccesoFacturas() {
    // Buscar todos los posibles botones/tabs de facturas en el HTML
    const tabFacturas = document.querySelector('[onclick*="factura"], [onclick*="Factura"], .tab-btn[data-tab="facturas"], #btnVerFacturas, .invoice-tab');
    const seccionFacturas = document.getElementById('facturasSection') || document.getElementById('invoicesSection');
    
    if (!state.esTitular) {
        // Ocultar acceso a facturas para empleados
        if (tabFacturas) {
            tabFacturas.style.display = 'none';
            tabFacturas.setAttribute('disabled', 'true');
        }
        if (seccionFacturas) seccionFacturas.style.display = 'none';
        
        // Añadir mensaje informativo discreto
        const container = document.getElementById('invoicesListContainer');
        if (container) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0; text-align:center;">Las facturas están disponibles para el titular del contrato.</p>`;
        }
        console.info('[Privacidad] Acceso a facturas restringido: usuario no es titular del contrato.');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPUESTA HÁPTICA NATIVA (CAPACITOR / WEB HAPTICS API)
// ─────────────────────────────────────────────────────────────────────────────
function triggerHaptic(type = 'light') {
    try {
        if (window.Capacitor && window.Capacitor.isPluginAvailable('Haptics')) {
            const { Haptics, ImpactStyle, NotificationType } = window.Capacitor.Plugins;
            if (type === 'success') {
                Haptics.notification({ type: NotificationType.SUCCESS });
            } else if (type === 'warning') {
                Haptics.notification({ type: NotificationType.WARNING });
            } else if (type === 'heavy') {
                Haptics.impact({ style: ImpactStyle.Heavy });
            } else if (type === 'medium') {
                Haptics.impact({ style: ImpactStyle.Medium });
            } else {
                Haptics.impact({ style: ImpactStyle.Light });
            }
            return;
        }
        if (navigator && typeof navigator.vibrate === 'function') {
            if (type === 'success') navigator.vibrate([15, 60, 20]);
            else if (type === 'warning') navigator.vibrate([30, 80, 30]);
            else if (type === 'medium') navigator.vibrate(20);
            else navigator.vibrate(10);
        }
    } catch (_) {}
}

function cambiarTab(tabId) {
    const tabs = ['inicio', 'consumo', 'facturas', 'mas'];
    if (!tabs.includes(tabId)) return;
    triggerHaptic('light');

    tabs.forEach(t => {
        const pane = document.getElementById(`pane${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const btn = document.getElementById(`tabNav${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (pane) pane.classList.toggle('active', t === tabId);
        if (btn) btn.classList.toggle('active', t === tabId);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cambiarConsumoSubtab(tipo) {
    const isDatos = tipo === 'datos';
    const subDatos = document.getElementById('subviewConsumoDatos');
    const subLlamadas = document.getElementById('subviewConsumoLlamadas');
    const btnDatos = document.getElementById('segBtnDatos');
    const btnLlamadas = document.getElementById('segBtnLlamadas');

    if (subDatos) subDatos.style.display = isDatos ? 'block' : 'none';
    if (subLlamadas) subLlamadas.style.display = isDatos ? 'none' : 'block';
    if (btnDatos) btnDatos.classList.toggle('active', isDatos);
    if (btnLlamadas) btnLlamadas.classList.toggle('active', !isDatos);

    renderizarConsumoSegunMes(state.mesConsumoSeleccionado);
}

function renderizarLineaActiva() {
    const l = state.lineaActiva;
    if (!l) return;

    // Nombre de pila para el saludo
    const nombreCompleto = l.nombre || 'Cliente';
    const primerNombre = nombreCompleto.split(' ')[0] || 'Cliente';
    const greetingEl = document.getElementById('homeClientGreeting');
    if (greetingEl) greetingEl.textContent = primerNombre;

    // Selector superior y línea formateada
    const currentLineNumber = document.getElementById('currentLineNumber');
    const homeLineEl = document.getElementById('homeFormattedLine');
    const formattedTel = l.tipo === 'movil' ? formatearTelefono(l.numero) : l.numero;
    if (currentLineNumber) currentLineNumber.textContent = formattedTel;
    if (homeLineEl) homeLineEl.textContent = formattedTel;

    // Tarifas en Inicio
    const homeMobilePlan = document.getElementById('homeMobilePlan');
    if (homeMobilePlan) homeMobilePlan.textContent = l.tarifa || 'Tarifa Activa';

    // Fila de Fibra si existe en el contrato
    const lineaFibra = state.productos.find(x => x.tipo === 'fibra');
    const homeFiberRow = document.getElementById('homeFiberRow');
    const homeFiberPlan = document.getElementById('homeFiberPlan');
    if (homeFiberRow) {
        if (lineaFibra) {
            homeFiberRow.style.display = 'flex';
            if (homeFiberPlan) homeFiberPlan.textContent = [lineaFibra.velocidad_mbps ? `${lineaFibra.velocidad_mbps} Mb` : '', lineaFibra.tarifa].filter(Boolean).join(' · ') || 'Fibra óptica';
        } else {
            homeFiberRow.style.display = 'none';
        }
    }

    // Fecha de renovación de ciclo mensual
    const ahora = new Date();
    const proximoMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    const diffDias = Math.max(1, Math.ceil((proximoMes - ahora) / (1000 * 60 * 60 * 24)));
    const nombresMeses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const mesRenovacion = nombresMeses[proximoMes.getMonth()];
    const cycleText = `Renueva el 1 de ${mesRenovacion} · Quedan ${diffDias} días`;

    const homeCycleEl = document.getElementById('homeCycleText');
    if (homeCycleEl) homeCycleEl.textContent = cycleText;

    // Cálculos de Gigas
    const totales = parseFloat(l.gigas_totales) || 40.0;
    const consumidos = parseFloat(l.gigas_consumidos) || 0.0;
    const restantes = Math.max(0, (totales - consumidos)).toFixed(1);
    const porcentajeUsado = Math.min(100, Math.max(0, (consumidos / totales) * 100));

    // 1. Elementos de Pantalla Inicio (Home)
    const homeRemEl = document.getElementById('homeRemainingGb');
    const homeTotEl = document.getElementById('homeTotalGb');
    const homeBadgeEl = document.getElementById('homePercentBadge');
    const homeRadialBar = document.getElementById('homeRadialProgressBar');

    if (homeRemEl) homeRemEl.textContent = restantes;
    if (homeTotEl) homeTotEl.textContent = totales;
    if (homeBadgeEl) homeBadgeEl.textContent = `${Math.round(porcentajeUsado)}% usado`;

    if (homeRadialBar) {
        const maxDash = 283;
        const offset = maxDash - (maxDash * porcentajeUsado / 100);
        setTimeout(() => {
            homeRadialBar.style.strokeDashoffset = offset;
        }, 150);
    }

    // 2. Elementos de Pantalla Consumo según mes seleccionado
    renderizarConsumoSegunMes(state.mesConsumoSeleccionado);

    // Cargar CDRs de llamadas y datos
    if (l.tipo === 'movil') {
        cargarLlamadasCliente(l.numero);
        cargarDatosCliente(l.numero);
    }

    // Modal PUK / ICCID
    const pukCode = document.getElementById('pukCode');
    const iccidCode = document.getElementById('iccidCode');
    if (pukCode) pukCode.textContent = l.puk ? formatearPuk(l.puk) : 'Consultar en soporte';
    if (iccidCode) iccidCode.textContent = l.iccid ? formatearIccid(l.iccid) : 'En tu tarjeta SIM física';

    // Modal datos personales
    const modalProfileName = document.getElementById('modalProfileName');
    const modalProfileDni = document.getElementById('modalProfileDni');
    const modalProfilePhone = document.getElementById('modalProfilePhone');
    if (modalProfileName) modalProfileName.textContent = l.nombre || 'Cliente MásKFundas';
    if (modalProfileDni) modalProfileDni.textContent = l.dni || state.dniCliente || 'Registrado';
    if (modalProfilePhone) modalProfilePhone.textContent = formattedTel;

    // Actualizar histograma diario
    renderizarGraficoBarrasConsumo();
}

function renderizarGraficoBarrasConsumo() {
    renderizarHistogramaMes(obtenerConsumoMes(state.mesConsumoSeleccionado));
}

function renderizarListaServicios() {
    const container = document.getElementById('servicesListContainer');
    if (!container) return;
    const products = Array.isArray(state.productos) ? state.productos : [];
    const count = document.getElementById('productsCountLabel');
    if (count) count.textContent = `${products.length} ${products.length === 1 ? 'servicio' : 'servicios'}`;
    if (!products.length) {
        container.innerHTML = '<p class="products-empty">No encontramos productos activos asociados a tu cuenta.</p>';
        return;
    }
    container.innerHTML = products.map(product => {
        const mobile = product.tipo === 'movil';
        const lineIndex = mobile ? state.lineas.findIndex(line => String(line.numero) === String(product.numero)) : -1;
        const selected = lineIndex >= 0 && state.lineaActiva && String(state.lineaActiva.numero) === String(product.numero);
        const title = mobile ? `Línea móvil · ${formatearTelefono(product.numero)}` : 'Fibra óptica';
        const detail = [product.tarifa, mobile ? null : (product.velocidad_mbps ? `${product.velocidad_mbps} Mb` : null), product.direccion].filter(Boolean).join(' · ');
        const tag = mobile && product.numero ? `<span class="product-number">${escapeHtml(formatearTelefono(product.numero))}</span>` : '';
        const content = `<span class="product-mark" aria-hidden="true"><i class="fa-solid ${mobile ? 'fa-mobile-screen' : 'fa-wifi'}"></i></span><span class="product-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail || product.numero || '')}</span>${tag}</span><span class="product-state">Activo</span>${lineIndex >= 0 ? '<i class="fa-solid fa-chevron-right product-chevron" aria-hidden="true"></i>' : ''}`;
        return lineIndex >= 0
            ? `<button type="button" class="product-row ${selected ? 'product-row-selected' : ''}" onclick="seleccionarLineaPorIndex(${lineIndex})">${content}</button>`
            : `<div class="product-row">${content}</div>`;
    }).join('');
}

function seleccionarLineaPorIndex(index) {
    if (state.lineas[index]) {
        state.lineaActiva = state.lineas[index];
        state.llamadas = null;
        renderizarLineaActiva();
        renderizarListaServicios();
        cerrarModalLineas();
        mostrarToast(`Mostrando línea ${state.lineaActiva.numero}`);
    }
}

async function cargarFacturasCliente() {
    // Empleados (no titulares) no pueden ver facturas de empresa
    if (!state.esTitular) {
        controlarAccesoFacturas();
        return;
    }
    try {
        const telefono = state.telefonoUsuario || '';
        const dni = state.dniCliente || (state.lineaActiva ? (state.lineaActiva.dni || state.lineaActiva.cliente_dni || '') : '');
        if (!dni && !telefono) return;
        const params = new URLSearchParams({ telefono });
        if (dni) params.set('dni', dni);
        const res = await fetch(`/api/cliente/facturas?${params.toString()}`, { credentials: 'same-origin', cache: 'no-store' });
        if (res.status === 401) {
            cerrarSesion('Tu sesión ha caducado. Inicia sesión de nuevo.');
            return;
        }
        if (res.status === 403) {
            // El backend confirmó que no es titular
            state.esTitular = false;
            controlarAccesoFacturas();
            return;
        }
        const data = await res.json();
        if (res.status === 503 || !res.ok) {
            mostrarEstadoFacturasNoDisponible();
            return;
        }
        if (data.status === 'ok' && data.facturas) {
            state.facturas = data.facturas;
            state.facturasError = false;
            renderizarFacturas();
        } else {
            mostrarEstadoFacturasNoDisponible();
        }
    } catch (err) {
        console.error('Error cargando facturas:', err);
        mostrarEstadoFacturasNoDisponible();
    }
}

function mostrarEstadoFacturasNoDisponible() {
    state.facturasError = true;
    const list = document.getElementById('invoiceHistoryList');
    const hero = document.getElementById('heroInvoiceBox');
    if (hero) hero.hidden = true;
    if (list) list.innerHTML = `<div class="invoice-load-error" role="status"><p>No hemos podido consultar tus facturas ahora. Tus facturas no se han eliminado; inténtalo de nuevo.</p><button type="button" class="invoice-retry-button" onclick="reintentarCargaFacturas()">Reintentar</button></div>`;
}

async function reintentarCargaFacturas() {
    const list = document.getElementById('invoiceHistoryList');
    if (list) list.innerHTML = `<div class="invoice-load-error" role="status"><p>Comprobando la conexión con facturación…</p></div>`;
    await cargarFacturasCliente();
}

function renderizarFacturas() {
    const list = document.getElementById('invoiceHistoryList');
    const container = document.getElementById('invoicesListContainer');
    const hero = document.getElementById('heroInvoiceBox');
    if (hero) hero.hidden = false;

    if (!state.facturas || state.facturas.length === 0) {
        if (hero) hero.hidden = true;
        if (list) list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No hay facturas emitidas recientemente.</div>`;
        if (container) container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0; text-align: center;">No hay facturas emitidas recientemente.</p>`;
        return;
    }

    // 1. Hero última factura
    const ultima = state.facturas[0];
    const heroAmount = document.getElementById('heroInvoiceAmount');
    const heroDate = document.getElementById('heroInvoiceDate');
    const heroBadge = document.getElementById('heroInvoiceStatusBadge');
    const estUltima = obtenerEstadoFactura(ultima.estado);

    if (heroAmount) heroAmount.textContent = `${formatearImporteFactura(ultima.importe)} €`;
    if (heroDate) heroDate.textContent = ultima.fecha ? `${ultima.fecha} · Factura ${ultima.numero || ''}` : 'Reciente';
    if (heroBadge) {
        heroBadge.textContent = estUltima.label || 'Pagada';
        heroBadge.className = `status-pill ${estUltima.pendiente ? 'status-pending' : 'status-paid'}`;
    }

    // 2. Historial en lista editorial con hairlines
    if (list) {
        let htmlList = '';
        state.facturas.forEach(f => {
            const est = obtenerEstadoFactura(f.estado);
            const fId = /^[A-Za-z0-9_-]{1,64}$/.test(String(f.id || '')) ? encodeURIComponent(f.id) : '';
            const clickAction = fId ? `descargarFacturaPdf('${fId}')` : 'mostrarFacturaDisponible()';

            let mesLabel = f.fecha || 'Factura';
            if (f.fecha && f.fecha.includes('/')) {
                const p = f.fecha.split('/');
                const mIdx = parseInt(p[1], 10) - 1;
                const nombresCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                if (nombresCompletos[mIdx]) {
                    mesLabel = `${nombresCompletos[mIdx]} ${p[2] || ''}`;
                }
            }

            htmlList += `
                <div class="invoice-history-row" onclick="${clickAction}">
                    <div>
                        <div class="invoice-row-month">${escapeHtml(mesLabel)}</div>
                        <div class="invoice-row-date">${escapeHtml(f.fecha || '')} &bull; ${escapeHtml(f.numero || '')}</div>
                    </div>
                    <div class="invoice-row-right">
                        <span class="invoice-row-amount">${formatearImporteFactura(f.importe)} €</span>
                        <span class="status-pill ${est.pendiente ? 'status-pending' : 'status-paid'}">${escapeHtml(est.label)}</span>
                        <i class="fa-solid fa-chevron-right invoice-row-chevron"></i>
                    </div>
                </div>
            `;
        });
        list.innerHTML = htmlList;
    }
}

function descargarUltimaFactura() {
    if (state.facturas && state.facturas.length > 0) {
        const f = state.facturas[0];
        if (f.id) {
            descargarFacturaPdf(f.id);
            return;
        }
    }
    mostrarFacturaDisponible();
}

function mostrarModalDatosPersonales() {
    const modal = document.getElementById('datosPersonalesModal');
    if (!modal) return;
    const l = state.lineaActiva || (state.lineas && state.lineas[0]);
    if (l) {
        const nameEl = document.getElementById('modalProfileName');
        const dniEl = document.getElementById('modalProfileDni');
        const phoneEl = document.getElementById('modalProfilePhone');
        if (nameEl) nameEl.textContent = l.nombre || 'Cliente MásKFundas';
        if (dniEl) dniEl.textContent = l.dni || state.dniCliente || 'Registrado';
        if (phoneEl) phoneEl.textContent = formatearTelefono(state.telefonoUsuario || l.numero);
    }
    modal.style.display = 'flex';
}

function cerrarModalDatosPersonales() {
    const modal = document.getElementById('datosPersonalesModal');
    if (modal) modal.style.display = 'none';
}

function formatearImporteFactura(importe) {
    const normalized = String(importe ?? '').trim();
    if (!normalized) return '—';
    const value = Number(normalized.replace(',', '.'));
    return Number.isFinite(value) ? value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

function obtenerEstadoFactura(estado) {
    const value = String(estado || '').trim().toLocaleLowerCase('es');
    if (/pagad|cobrad|abonad/.test(value)) return { label: 'Pagada', pendiente: false };
    if (/pendient|impag|devuelt|devoluci|vencid|reclam/.test(value)) return { label: 'Pendiente de pago', pendiente: true };
    if (/anulad|cancelad/.test(value)) return { label: 'Anulada', pendiente: false };
    if (/borrador|proceso|emitid/.test(value)) return { label: 'En proceso', pendiente: false };
    return { label: value ? 'Estado: ' + String(estado).slice(0, 40) : 'Estado no disponible', pendiente: false };
}

function toggleHistorialFacturasInline() {
    const el = document.getElementById('historialFacturasInline');
    const arrow = document.getElementById('arrowHistorialFacturas');
    if (!el) return;
    const abierto = el.style.display === 'block';
    el.style.display = abierto ? 'none' : 'block';
    if (arrow) arrow.style.transform = abierto ? 'rotate(0deg)' : 'rotate(180deg)';
}

function descargarFacturaPdf(facturaId) {
    const id = decodeURIComponent(String(facturaId || ''));
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
        mostrarToast('El identificador de factura no es válido.');
        return;
    }
    mostrarToast('Descargando factura...');
    // Descarga directa vía endpoint backend
    window.location.href = `/api/cliente/factura/${encodeURIComponent(id)}/descargar`;
}

function mostrarFacturaDisponible() {
    mostrarToast('Esta factura está disponible en tu correo.');
}

// Modales de Líneas
function toggleLineModal(forzar) {
    const modal = document.getElementById('lineModal');
    if (!modal) return;
    if (forzar === false) {
        cerrarModalLineas();
        return;
    }

    lineModalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modalLineList = document.getElementById('modalLineList');
    if (modalLineList) {
        const lineas = Array.isArray(state.lineas) ? state.lineas : [];
        let html = '<ul class="line-select-list" role="list">';
        lineas.forEach((l, idx) => {
            const icon = l.tipo === 'movil' ? '<i class="fa-solid fa-mobile-screen"></i>' : '<i class="fa-solid fa-wifi"></i>';
            const num = escapeHtml(l.tipo === 'movil' ? formatearTelefono(l.numero) : l.numero);
            const esActiva = state.lineaActiva && state.lineaActiva.numero === l.numero;
            const tipoServicio = l.tipo === 'movil' ? 'Línea móvil' : 'Fibra';
            const tarifa = escapeHtml(l.tarifa || 'Servicio activo');
            const anuncio = `${tipoServicio} ${num}. ${l.tarifa || 'Servicio activo'}. ${esActiva ? 'En uso' : 'Seleccionar para consultar'}.`;
            html += `
                <li>
                    <button type="button" class="line-select-row ${esActiva ? 'is-current' : ''}" onclick="seleccionarLineaPorIndex(${idx})" aria-pressed="${Boolean(esActiva)}" aria-label="${escapeHtml(anuncio)}">
                        <span class="line-select-icon" aria-hidden="true">${icon}</span>
                        <span class="line-select-copy">
                            <span class="line-select-type">${tipoServicio}</span>
                            <strong class="line-select-number">${num}</strong>
                            <span class="line-select-plan">${tarifa}</span>
                        </span>
                        <span class="line-select-state ${esActiva ? 'is-current' : ''}">
                            ${esActiva ? '<i class="fa-solid fa-check" aria-hidden="true"></i><span>En uso</span>' : '<span>Elegir</span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i>'}
                        </span>
                    </button>
                </li>
            `;
        });
        if (!lineas.length) html += '<li class="line-select-empty">No hay líneas disponibles para seleccionar.</li>';
        html += '</ul>';
        modalLineList.innerHTML = html;
    }
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    const currentRow = modal.querySelector('.line-select-row[aria-pressed="true"]');
    const firstRow = modal.querySelector('.line-select-row');
    const closeButton = modal.querySelector('.close-btn');
    (currentRow || firstRow || closeButton)?.focus();
}

function cerrarModalLineas() {
    const modal = document.getElementById('lineModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (lineModalReturnFocus?.isConnected) lineModalReturnFocus.focus();
    lineModalReturnFocus = null;
}

document.addEventListener('keydown', event => {
    const modal = document.getElementById('lineModal');
    if (!modal || modal.getAttribute('aria-hidden') === 'true') return;
    if (event.key === 'Escape') {
        event.preventDefault();
        cerrarModalLineas();
        return;
    }
    if (event.key !== 'Tab') return;
    const focusables = [...modal.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
    }
});

// Modal PUK
function mostrarModalPuk() {
    const modal = document.getElementById('pukModal');
    const l = state.lineaActiva;
    if (l) {
        const pukCode = document.getElementById('pukCode');
        const iccidCode = document.getElementById('iccidCode');
        if (pukCode) pukCode.textContent = l.puk ? formatearPuk(l.puk) : 'Consultar en soporte';
        if (iccidCode) iccidCode.textContent = l.iccid ? formatearIccid(l.iccid) : 'En tu tarjeta SIM';
    }
    if (modal) modal.style.display = 'flex';
}

function cerrarModalPuk() {
    const modal = document.getElementById('pukModal');
    if (modal) modal.style.display = 'none';
}

// ─────────────────────────────────────────────
// Llamadas y Detalle CDR con Selector de Periodo
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 📅 Selector y Navegador de Meses en Consumo
// ─────────────────────────────────────────────

function generarMesesConsumo(n = 12) {
    const nombresMeses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const result = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const mm = String(m + 1).padStart(2, '0');
        const key = `${mm}/${y}`;
        result.push({
            key: key,
            mesNombre: nombresMeses[m],
            mesCorto: nombresMeses[m].substring(0, 3),
            anio: y,
            label: i === 0 ? 'Este mes' : (i === 1 ? 'Mes anterior' : `${nombresMeses[m]}`),
            nombreLargo: i === 0 ? `${nombresMeses[m]} ${y} (Actual)` : `${nombresMeses[m]} ${y}`,
            esActual: (i === 0)
        });
    }
    return result;
}

const generarUltimosMeses = generarMesesConsumo;

function inicializarSelectorMesesConsumo() {
    state.mesesConsumo = generarMesesConsumo(12);
    state.mesConsumoActivoIdx = 0;
    state.mesConsumoSeleccionado = state.mesesConsumo[0].key;

    const select = document.getElementById('consumoMonthSelect');
    if (select) {
        let html = '';
        state.mesesConsumo.forEach((m, idx) => {
            html += `<option value="${m.key}" ${idx === 0 ? 'selected' : ''}>${m.nombreLargo}</option>`;
        });
        select.innerHTML = html;
    }

    actualizarControlesNavegacionMes();
}

function actualizarControlesNavegacionMes() {
    const meses = state.mesesConsumo;
    const idx = state.mesConsumoActivoIdx;
    if (!meses || meses.length === 0) return;

    const mesObj = meses[idx];
    const labelEl = document.getElementById('consumoMonthLabel');
    const select = document.getElementById('consumoMonthSelect');
    const btnAnt = document.getElementById('btnMesAnterior');
    const btnSig = document.getElementById('btnMesSiguiente');

    if (labelEl) labelEl.textContent = mesObj.nombreLargo;
    if (select) select.value = mesObj.key;

    if (btnAnt) btnAnt.disabled = (idx >= meses.length - 1);
    if (btnSig) btnSig.disabled = (idx <= 0);
}

function navegarMesConsumo(dir) {
    if (!state.mesesConsumo || state.mesesConsumo.length === 0) return;

    if (dir === -1) {
        if (state.mesConsumoActivoIdx < state.mesesConsumo.length - 1) {
            state.mesConsumoActivoIdx++;
        }
    } else if (dir === 1) {
        if (state.mesConsumoActivoIdx > 0) {
            state.mesConsumoActivoIdx--;
        }
    }

    const nuevoMes = state.mesesConsumo[state.mesConsumoActivoIdx];
    state.mesConsumoSeleccionado = nuevoMes.key;
    actualizarControlesNavegacionMes();
    renderizarConsumoSegunMes(nuevoMes.key);
}

function seleccionarMesConsumo(mesKey) {
    if (!state.mesesConsumo || state.mesesConsumo.length === 0) return;
    const idx = state.mesesConsumo.findIndex(m => m.key === mesKey);
    if (idx !== -1) {
        state.mesConsumoActivoIdx = idx;
        state.mesConsumoSeleccionado = mesKey;
        actualizarControlesNavegacionMes();
        renderizarConsumoSegunMes(mesKey);
    }
}

function obtenerConsumoMes(mesKey) {
    const meses = state.mesesConsumo && state.mesesConsumo.length ? state.mesesConsumo : generarMesesConsumo(12);
    const mesObj = meses.find(m => m.key === mesKey) || meses[0];
    const esMesActual = mesObj ? mesObj.esActual : (meses[0].key === mesKey);
    const l = state.lineaActiva || {};
    const datosCDR = state.datosCDR || {};
    const llamadasCDR = state.llamadas || {};
    const gigasTotalesTarifa = parseFloat(l.gigas_totales || datosCDR.gigas_totales || 0);

    // 1. Datos
    let gbConsumidos = 0;
    const todosDatosDiarios = datosCDR.datos_diarios || {};
    const diasDelMes = {};

    Object.entries(todosDatosDiarios).forEach(([diaStr, val]) => {
        const fStr = diaStr.trim();
        let mesAnio = '';
        const sep = fStr.includes('-') ? '-' : (fStr.includes('/') ? '/' : '');
        if (sep) {
            const p = fStr.split(sep);
            if (p.length === 3) {
                if (p[0].length === 4) mesAnio = `${p[1].padStart(2, '0')}/${p[0]}`;
                else if (p[2].length === 4) mesAnio = `${p[1].padStart(2, '0')}/${p[2]}`;
            }
        }
        if (mesAnio === mesKey) {
            diasDelMes[diaStr] = val;
            const mb = typeof val === 'object' ? (parseFloat(val.mb) || 0) : (parseFloat(val) || 0);
            gbConsumidos += (mb / 1024);
        }
    });

    const hist = (datosCDR.historico_meses && datosCDR.historico_meses[mesKey]) ||
                 (llamadasCDR.historico_meses && llamadasCDR.historico_meses[mesKey]);

    if (hist && hist.gigas_consumidos !== undefined) {
        gbConsumidos = parseFloat(hist.gigas_consumidos);
    } else if (esMesActual) {
        const gbActual = parseFloat(l.gigas_consumidos || datosCDR.gigas_consumidos || 0);
        if (gbActual > 0 || Object.keys(diasDelMes).length === 0) {
            gbConsumidos = gbActual;
        }
    }

    // 2. Llamadas
    let minutos = 0;
    let numLlamadas = 0;
    if (hist && hist.minutos_consumidos !== undefined) {
        minutos = parseInt(hist.minutos_consumidos, 10);
        numLlamadas = parseInt(hist.llamadas_totales, 10);
    }

    const todasLlamadas = (llamadasCDR && llamadasCDR.llamadas_recientes) || [];
    const llamadasDelMes = todasLlamadas.filter(call => {
        if (!call.fecha) return false;
        const fStr = call.fecha.split(' ')[0].trim();
        let mesAnio = '';
        const sep = fStr.includes('-') ? '-' : (fStr.includes('/') ? '/' : '');
        if (sep) {
            const p = fStr.split(sep);
            if (p.length === 3) {
                if (p[0].length === 4) mesAnio = `${p[1].padStart(2, '0')}/${p[0]}`;
                else if (p[2].length === 4) mesAnio = `${p[1].padStart(2, '0')}/${p[2]}`;
            }
        }
        return mesAnio === mesKey;
    });

    if (llamadasDelMes.length > 0 && (!hist || !hist.llamadas_totales)) {
        numLlamadas = llamadasDelMes.length;
        const durationSeconds = value => {
            if (Number.isFinite(Number(value))) return Math.max(0, Number(value));
            let seconds = 0;
            const units = { h: 3600, hora: 3600, horas: 3600, min: 60, m: 60, seg: 1, s: 1 };
            for (const match of String(value || '').matchAll(/(\d+(?:[.,]\d+)?)\s*(horas?|h|min|m|seg|s)\b/gi)) {
                seconds += (parseFloat(match[1].replace(',', '.')) || 0) * (units[match[2].toLowerCase()] || 1);
            }
            return seconds;
        };
        const totalSecs = llamadasDelMes.reduce((acc, c) => acc + durationSeconds(c.duracion), 0);
        minutos = Math.round(totalSecs / 60);
    } else if (esMesActual && minutos === 0) {
        minutos = parseInt(l.minutos_consumidos || llamadasCDR.minutos_consumidos || 0, 10);
        numLlamadas = parseInt(l.llamadas_totales || llamadasCDR.llamadas_totales || llamadasDelMes.length, 10);
    }

    return {
        mesKey,
        mesObj,
        esMesActual,
        gigasTotalesTarifa,
        gigasConsumidos: parseFloat(gbConsumidos.toFixed(2)),
        diasDelMes,
        minutosConsumidos: minutos,
        llamadasTotales: numLlamadas,
        llamadasLista: llamadasDelMes
    };
}

function renderizarConsumoSegunMes(mesKey) {
    if (!mesKey && state.mesesConsumo && state.mesesConsumo[0]) {
        mesKey = state.mesesConsumo[0].key;
    }
    const c = obtenerConsumoMes(mesKey);
    const l = state.lineaActiva || {};
    const mesObj = c.mesObj || { mesNombre: 'este mes', anio: 2026 };

    // 1. Tanque Vertical
    const tankHeadLabel = document.getElementById('tankHeadlineLabel');
    const tankRemEl = document.getElementById('tankRemainingVal');
    const tankTotEl = document.getElementById('tankTotalVal');
    const tankHeadSub = document.getElementById('tankHeadlineSub');
    const tankLiquid = document.getElementById('tankLiquidFill');
    const tankMaxTick = document.getElementById('tankMaxTick');
    const tankLevelTick = document.getElementById('tankLevelTick');
    const tankCycleSub = document.getElementById('tankCycleSubText');

    const totales = c.gigasTotalesTarifa || 10;
    const consumidos = c.gigasConsumidos;

    if (c.esMesActual) {
        const restantes = Math.max(0, totales - consumidos).toFixed(1);
        if (tankHeadLabel) tankHeadLabel.textContent = 'Te quedan';
        if (tankRemEl) tankRemEl.textContent = restantes;
        if (tankTotEl) tankTotEl.textContent = totales;
        if (tankHeadSub) tankHeadSub.innerHTML = `de <span id="tankTotalVal">${totales}</span> GB`;
        if (tankLiquid) {
            const pctRestante = Math.min(100, Math.max(8, (restantes / totales) * 100));
            tankLiquid.style.height = `${pctRestante}%`;
        }
        if (tankMaxTick) tankMaxTick.textContent = `${totales} GB`;
        if (tankLevelTick) tankLevelTick.textContent = `${restantes} GB disponibles`;
        
        const now = new Date();
        const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const diffDias = Math.max(0, ultimoDiaMes - now.getDate());
        const nombresMeses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        const proxMes = nombresMeses[(now.getMonth() + 1) % 12];
        if (tankCycleSub) tankCycleSub.textContent = `Renueva el 1 de ${proxMes} (${diffDias} días)`;
    } else {
        if (tankHeadLabel) tankHeadLabel.textContent = `Consumo en ${mesObj.mesNombre}`;
        if (tankRemEl) tankRemEl.textContent = consumidos.toFixed(1);
        if (tankTotEl) tankTotEl.textContent = totales;
        if (tankHeadSub) tankHeadSub.innerHTML = `de <span id="tankTotalVal">${totales}</span> GB contratados`;
        if (tankLiquid) {
            const pctConsumido = Math.min(100, Math.max(8, (consumidos / totales) * 100));
            tankLiquid.style.height = `${pctConsumido}%`;
        }
        if (tankMaxTick) tankMaxTick.textContent = `${totales} GB`;
        if (tankLevelTick) tankLevelTick.textContent = `${consumidos.toFixed(1)} GB consumidos`;
        if (tankCycleSub) tankCycleSub.textContent = `Ciclo cerrado · Periodo facturado`;
    }

    // 2. Histograma Diario
    renderizarHistogramaMes(c);

    // 3. Subvista Llamadas
    const callMinEl = document.getElementById('callMinutesVal');
    const callCountEl = document.getElementById('callCountTotal');
    const callPlanSub = document.getElementById('callPlanSub');

    if (callMinEl) callMinEl.textContent = c.minutosConsumidos;
    if (callPlanSub) {
        callPlanSub.textContent = c.esMesActual ? (l.tarifa || 'Llamadas Ilimitadas') : `Consumo cerrado · ${mesObj.mesNombre} ${mesObj.anio}`;
    }
    if (callCountEl) {
        callCountEl.textContent = `${c.llamadasTotales} ${c.llamadasTotales === 1 ? 'llamada' : 'llamadas'} registradas en ${mesObj.mesNombre.toLowerCase()}`;
    }
}

function renderizarHistogramaMes(consumoObj) {
    const container = document.getElementById('dailyBarsContainer');
    const todayBadge = document.getElementById('todayUsageBadge');
    if (!container) return;

    const entries = Object.entries(consumoObj.diasDelMes || {});
    
    if (entries.length === 0) {
        if (!consumoObj.esMesActual) {
            container.innerHTML = `<div class="histogram-empty-note">Consumo acumulado de <strong>${consumoObj.gigasConsumidos.toFixed(1)} GB</strong> en el ciclo de ${consumoObj.mesObj.mesNombre}.</div>`;
            if (todayBadge) todayBadge.textContent = `Total: ${consumoObj.gigasConsumidos.toFixed(1)} GB`;
            return;
        }
        const pattern = [25, 40, 30, 65, 45, 80, 50, 35, 70, 90, 60, 45, 85, 75];
        let html = '';
        pattern.forEach((p, idx) => {
            const isToday = idx === pattern.length - 1;
            html += `
                <div class="bar-column" title="Día ${idx + 1}: ${(p / 45).toFixed(1)} GB">
                    <div class="bar-fill ${isToday ? 'bar-active' : ''}" style="height: ${p}%;"></div>
                </div>
            `;
        });
        container.innerHTML = html;
        if (todayBadge) todayBadge.textContent = 'Calculando hoy...';
        return;
    }

    entries.sort((a, b) => {
        const pA = a[0].split(/[-/]/);
        const pB = b[0].split(/[-/]/);
        const dateA = pA[0].length === 4 ? new Date(pA[0], pA[1]-1, pA[2]) : new Date(pA[2], pA[1]-1, pA[0]);
        const dateB = pB[0].length === 4 ? new Date(pB[0], pB[1]-1, pB[2]) : new Date(pB[2], pB[1]-1, pB[0]);
        return dateA - dateB;
    });

    const maxValMb = Math.max(...entries.map(e => (typeof e[1] === 'object' ? (parseFloat(e[1].mb) || 0) : (parseFloat(e[1]) * 1024 || 0))), 100);

    let html = '';
    entries.slice(-14).forEach((e, idx, arr) => {
        const mb = typeof e[1] === 'object' ? (parseFloat(e[1].mb) || 0) : (parseFloat(e[1]) * 1024 || 0);
        const gb = (mb / 1024).toFixed(1);
        const pct = Math.min(100, Math.max(12, (mb / maxValMb) * 100));
        const isLatest = (idx === arr.length - 1) && consumoObj.esMesActual;
        html += `
            <div class="bar-column" title="${e[0]}: ${gb} GB">
                <div class="bar-fill ${isLatest ? 'bar-active' : ''}" style="height: ${pct}%;"></div>
            </div>
        `;
    });
    container.innerHTML = html;

    if (todayBadge) {
        if (consumoObj.esMesActual && entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            const mb = typeof lastEntry[1] === 'object' ? (parseFloat(lastEntry[1].mb) || 0) : (parseFloat(lastEntry[1]) * 1024 || 0);
            todayBadge.textContent = `${(mb / 1024).toFixed(1)} GB hoy`;
        } else {
            todayBadge.textContent = `Total: ${consumoObj.gigasConsumidos.toFixed(1)} GB`;
        }
    }
}

// Filtra las llamadas de state.llamadas.llamadas_recientes para el mes dado (key MM/YYYY)
function filtrarLlamadasPorMes(key) {
    const todas = (state.llamadas && state.llamadas.llamadas_recientes) || [];
    if (!key) return todas;
    return todas.filter(call => {
        if (!call.fecha) return false;
        const fStr = call.fecha.split(' ')[0].trim();
        let mesAnio = '';
        
        const sep = fStr.includes('-') ? '-' : (fStr.includes('/') ? '/' : '');
        if (sep) {
            const p = fStr.split(sep);
            if (p.length === 3) {
                // Si p[0] tiene 4 dígitos -> YYYY-MM-DD
                if (p[0].length === 4) {
                    mesAnio = `${p[1].padStart(2, '0')}/${p[0]}`;
                } else if (p[2].length === 4) {
                    // Si p[2] tiene 4 dígitos -> DD-MM-YYYY o DD/MM/YYYY
                    mesAnio = `${p[1].padStart(2, '0')}/${p[2]}`;
                }
            }
        }
        return mesAnio === key;
    });
}

function renderizarLlamadasEnModal(mesKey) {
    const list = document.getElementById('callsListContainer');
    const summaryEl = document.getElementById('cdrPeriodSummary');
    if (!list) return;

    const llamadas = filtrarLlamadasPorMes(mesKey);

    // Resumen calculado desde los CDR, sin asumir que las llamadas cuestan 0 €.
    const durationSeconds = value => {
        if (Number.isFinite(Number(value))) return Math.max(0, Number(value));
        let seconds = 0;
        const units = { h: 3600, hora: 3600, horas: 3600, min: 60, m: 60, seg: 1, s: 1 };
        for (const match of String(value || '').matchAll(/(\d+(?:[.,]\d+)?)\s*(horas?|h|min|m|seg|s)\b/gi)) {
            seconds += (parseFloat(match[1].replace(',', '.')) || 0) * (units[match[2].toLowerCase()] || 1);
        }
        return seconds;
    };
    const moneyValue = value => {
        let text = String(value ?? '').replace(/[^\d,.-]/g, '');
        if (text.includes(',') && text.includes('.')) {
            text = text.lastIndexOf(',') > text.lastIndexOf('.')
                ? text.replace(/\./g, '').replace(',', '.')
                : text.replace(/,/g, '');
        } else if (text.includes(',')) text = text.replace(',', '.');
        return Number.parseFloat(text) || 0;
    };
    const totalSeconds = llamadas.reduce((sum, call) => sum + durationSeconds(call.duracion), 0);
    const totalMin = Math.floor(totalSeconds / 60);
    const extraSeconds = Math.round(totalSeconds % 60);
    const durationLabel = extraSeconds ? `${totalMin} min ${extraSeconds} s` : `${totalMin} min`;
    const totalCost = llamadas.reduce((sum, call) => sum + moneyValue(call.coste), 0);
    const costLabel = `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCost)} €`;

    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="cdr-summary-stat">
                <span class="cdr-summary-num">${llamadas.length}</span>
                <span class="cdr-summary-lbl">Llamadas</span>
            </div>
            <div class="cdr-divider"></div>
            <div class="cdr-summary-stat">
                <span class="cdr-summary-num">${escapeHtml(durationLabel)}</span>
                <span class="cdr-summary-lbl">Minutos</span>
            </div>
            <div class="cdr-divider"></div>
            <div class="cdr-summary-stat">
                <span class="cdr-summary-num">${escapeHtml(costLabel)}</span>
                <span class="cdr-summary-lbl">Coste registrado</span>
            </div>
        `;
    }

    if (llamadas.length === 0) {
        list.innerHTML = `
            <div class="cdr-empty-state">
                <span class="cdr-empty-icon"><i class="fa-solid fa-inbox" style="font-size: 2rem; color: #94a3b8; display: block; margin-bottom: 0.5rem;"></i></span>
                Sin llamadas salientes registradas en este periodo.
            </div>
        `;
        return;
    }

    let html = '';
    [...llamadas].reverse().forEach(call => {
        const tipo = String(call.tipo || 'Llamada nacional');
        const destino = String(call.destino || 'Destino no disponible');
        const fecha = String(call.fecha || 'Fecha no disponible');
        const duracion = String(call.duracion || 'Duración no disponible');
        const coste = String(call.coste || '0,00 €');
        const icon = tipo.toLowerCase().includes('fijo') ? '<i class="fa-solid fa-phone"></i>' : '<i class="fa-solid fa-mobile-screen-button"></i>';
        html += `
            <div class="call-item-row">
                <div class="call-left">
                    <span class="call-icon">${icon}</span>
                    <div class="call-main">
                        <div class="call-target">${escapeHtml(destino)}</div>
                        <div class="call-date">${escapeHtml(fecha)}</div>
                        <span class="call-type">${escapeHtml(tipo)}</span>
                    </div>
                </div>
                <div class="call-right">
                    <div class="call-duration">${escapeHtml(duracion)}</div>
                    <div class="call-cost">${escapeHtml(coste)}</div>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}

function renderizarSelectorPeriodo(meses, mesActivoKey) {
    const selector = document.getElementById('cdrPeriodSelector');
    if (!selector) return;
    let html = '';
    meses.forEach(m => {
        const selected = m.key === mesActivoKey ? 'selected' : '';
        html += `<option value="${m.key}" ${selected}>${m.label}</option>`;
    });
    selector.innerHTML = html;
}

function seleccionarPeriodoCDR(mesKey) {
    renderizarLlamadasEnModal(mesKey);
}

async function cargarLlamadasCliente(telefono) {
    try {
        const tel = telefono || (state.lineaActiva ? state.lineaActiva.numero : state.telefonoUsuario);
        if (!tel) return false;
        const res = await fetch(`/api/cliente/llamadas?telefono=${encodeURIComponent(tel)}`, { credentials: 'same-origin', cache: 'no-store' });
        if (res.status === 401) {
            cerrarSesion();
            return false;
        }
        const data = await res.json();
        if (data.status === 'ok') {
            state.llamadas = data;
            // Actualizar tarjeta resumen en dashboard
            const minEl = document.getElementById('voiceMinutes');
            const totalEl = document.getElementById('voiceTotalCalls');
            const planEl = document.getElementById('voicePlanTitle');
            if (minEl) minEl.textContent = data.minutos_consumidos || 0;
            if (totalEl) totalEl.textContent = data.llamadas_totales || 0;
            if (planEl) planEl.textContent = data.tipo_tarifa || 'Llamadas Ilimitadas';
            const callCountEl = document.getElementById('callCountTotal');
            const actualCalls = Array.isArray(data.llamadas_recientes) ? data.llamadas_recientes.length : 0;
            if (callCountEl) callCountEl.textContent = `${actualCalls} ${actualCalls === 1 ? 'llamada' : 'llamadas'} registradas en el ciclo`;
            renderizarConsumoSegunMes(state.mesConsumoSeleccionado);
            return true;
        }
        return false;
    } catch (err) {
        console.error('Error cargando llamadas:', err);
        return false;
    }
}

async function mostrarModalLlamadas() {
    const modal = document.getElementById('callsModal');
    if (!modal) return;

    modal.style.display = 'flex';
    const list = document.getElementById('callsListContainer');
    if (state.llamadas === null) {
        if (list) list.innerHTML = '<div class="cdr-loading-state"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i><span>Cargando el detalle de llamadas…</span></div>';
        const loaded = await cargarLlamadasCliente(state.lineaActiva?.numero);
        if (!loaded) {
            if (list) list.innerHTML = '<div class="cdr-empty-state"><span class="cdr-empty-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span>No se pudo cargar el detalle. Comprueba tu conexión e inténtalo de nuevo.</div>';
            return;
        }
    }

    // Generar píldoras de los meses disponibles
    const meses = state.mesesConsumo && state.mesesConsumo.length ? state.mesesConsumo : generarMesesConsumo(12);
    const mesActivo = state.mesConsumoSeleccionado || meses[0].key;
    renderizarSelectorPeriodo(meses, mesActivo);
    renderizarLlamadasEnModal(mesActivo);
}

function cerrarModalLlamadas() {
    const modal = document.getElementById('callsModal');
    if (modal) modal.style.display = 'none';
}

// ─────────────────────────────────────────────
// Conexiones de Datos CDR con Desglose Diario
// ─────────────────────────────────────────────

async function cargarDatosCliente(telefono) {
    try {
        const tel = telefono || (state.lineaActiva ? state.lineaActiva.numero : state.telefonoUsuario);
        if (!tel) return;
        const res = await fetch(`/api/cliente/datos?telefono=${encodeURIComponent(tel)}`, { credentials: 'same-origin', cache: 'no-store' });
        if (res.status === 401) {
            cerrarSesion();
            return;
        }
        const data = await res.json();
        if (data.status === 'ok') {
            state.datosCDR = data;
            // Actualizar tarjeta resumen en dashboard
            const consEl = document.getElementById('dataTotalConsumed');
            const sessEl = document.getElementById('dataTotalSessions');
            if (consEl) consEl.textContent = `${data.gigas_consumidos} GB`;
            if (sessEl) sessEl.textContent = data.total_conexiones || 0;
            renderizarConsumoSegunMes(state.mesConsumoSeleccionado);
        }
    } catch (err) {
        console.error('Error cargando datos CDR:', err);
    }
}

function mostrarModalDatos() {
    const modal = document.getElementById('dataModal');
    if (!modal) return;

    // Generar píldoras de los meses disponibles
    const meses = state.mesesConsumo && state.mesesConsumo.length ? state.mesesConsumo : generarMesesConsumo(12);
    const mesActivo = state.mesConsumoSeleccionado || meses[0].key;
    renderizarSelectorPeriodoDatos(meses, mesActivo);
    renderizarDatosEnModal(mesActivo);

    modal.style.display = 'flex';
}

function cerrarModalDatos() {
    const modal = document.getElementById('dataModal');
    if (modal) modal.style.display = 'none';
}

function renderizarSelectorPeriodoDatos(meses, mesActivoKey) {
    const selector = document.getElementById('dataPeriodSelector');
    if (!selector) return;

    let html = '';
    meses.forEach(m => {
        const selected = m.key === mesActivoKey ? 'selected' : '';
        html += `<option value="${m.key}" ${selected}>${m.label} (${m.key})</option>`;
    });
    selector.innerHTML = html;
}

function seleccionarPeriodoDatos(mesKey) {
    renderizarDatosEnModal(mesKey);
}

function renderizarDatosEnModal(mesKey) {
    const list = document.getElementById('dataListContainer');
    const summaryEl = document.getElementById('dataPeriodSummary');
    if (!list) return;

    const datosDiarios = (state.datosCDR && state.datosCDR.datos_diarios) || {};
    
    // Filtrar días del mes seleccionado (key MM/YYYY)
    const diasFiltrados = Object.keys(datosDiarios).filter(diaStr => {
        const fStr = diaStr.trim();
        let mesAnio = '';
        const sep = fStr.includes('-') ? '-' : (fStr.includes('/') ? '/' : '');
        if (sep) {
            const p = fStr.split(sep);
            if (p.length === 3) {
                if (p[0].length === 4) {
                    mesAnio = `${p[1].padStart(2, '0')}/${p[0]}`;
                } else if (p[2].length === 4) {
                    mesAnio = `${p[1].padStart(2, '0')}/${p[2]}`;
                }
            }
        }
        return mesAnio === mesKey;
    });

    // Ordenar días del más reciente al más antiguo
    diasFiltrados.sort((a, b) => {
        const pA = a.split('-').reverse().join('');
        const pB = b.split('-').reverse().join('');
        return pB.localeCompare(pA);
    });

    let totalMbMes = 0;
    let totalSesMes = 0;
    diasFiltrados.forEach(d => {
        totalMbMes += datosDiarios[d].mb || 0;
        totalSesMes += datosDiarios[d].sesiones || 0;
    });

    // Si el mes seleccionado es el mes actual y no hay registros diarios individuales en CDR, usar el total acumulado real de la línea
    const ahora = new Date();
    const mmActual = String(ahora.getMonth() + 1).padStart(2, '0');
    const yyyyActual = String(ahora.getFullYear());
    const esMesActual = (mesKey === `${mmActual}/${yyyyActual}`);
    const gigasConsumidosLinea = parseFloat((state.lineaActiva && state.lineaActiva.gigas_consumidos) || (state.datosCDR && state.datosCDR.gigas_consumidos) || 0);

    let displayGb = (totalMbMes / 1024).toFixed(2);
    if (diasFiltrados.length === 0 && esMesActual && gigasConsumidosLinea > 0) {
        displayGb = gigasConsumidosLinea.toFixed(2);
    }

    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="cdr-summary-stat">
                <span class="cdr-summary-num">${displayGb} GB</span>
                <span class="cdr-summary-lbl">Datos Usados</span>
            </div>
            <div class="cdr-divider"></div>
            <div class="cdr-summary-stat">
                <span class="cdr-summary-num">${totalSesMes > 0 ? totalSesMes : 'Activa'}</span>
                <span class="cdr-summary-lbl">Conexiones</span>
            </div>
            <div class="cdr-divider"></div>
            <div class="cdr-summary-stat">
                <span class="cdr-summary-num" style="color: var(--success-green);">0,00 €</span>
                <span class="cdr-summary-lbl">Coste</span>
            </div>
        `;
    }

    if (diasFiltrados.length === 0) {
        if (esMesActual && gigasConsumidosLinea > 0) {
            list.innerHTML = `
                <div class="cdr-empty-state" style="padding: 1.5rem 1rem;">
                    <span class="cdr-empty-icon" style="color: var(--brand-blue);"><i class="fa-solid fa-tower-cell" style="font-size: 2.2rem; display: block; margin-bottom: 0.75rem;"></i></span>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem; margin-bottom: 0.35rem;">Navegación 4G / 5G Activa</div>
                    <div style="color: var(--text-muted); font-size: 0.82rem; line-height: 1.4; max-width: 320px; margin: 0 auto;">
                        Llevas consumidos <strong>${displayGb} GB</strong> en este ciclo. El desglose diario detallado se consolida al cierre de las sesiones del operador.
                    </div>
                </div>
            `;
        } else {
            list.innerHTML = `
                <div class="cdr-empty-state">
                    <span class="cdr-empty-icon"><i class="fa-solid fa-inbox" style="font-size: 2rem; color: #94a3b8; display: block; margin-bottom: 0.5rem;"></i></span>
                    Sin conexiones de datos registradas en este periodo.
                </div>
            `;
        }
        return;
    }

    // Calcular consumo máximo diario para escalar el gráfico de barras (0% a 100%)
    let maxMb = 1;
    diasFiltrados.forEach(d => {
        if ((datosDiarios[d].mb || 0) > maxMb) {
            maxMb = datosDiarios[d].mb;
        }
    });

    // Ordenar cronológicamente para el gráfico de barras (del día 1 al 31)
    const diasGrafico = [...diasFiltrados].sort((a, b) => {
        const pA = a.split('-').reverse().join('');
        const pB = b.split('-').reverse().join('');
        return pA.localeCompare(pB);
    });

    let chartBarsHtml = '';
    diasGrafico.forEach(dia => {
        const item = datosDiarios[dia];
        const mb = item.mb || 0;
        const pct = Math.max(8, Math.min(100, (mb / maxMb) * 100));
        const numDia = dia.split('-')[0];
        const valTooltip = mb >= 1024 ? `${(mb/1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
        
        chartBarsHtml += `
            <div class="chart-bar-column" title="${escapeHtml(dia)}: ${valTooltip}">
                <div class="chart-bar-tooltip">${valTooltip}</div>
                <div class="chart-bar-fill" style="height: ${pct}%;"></div>
                <span class="chart-bar-label">${escapeHtml(numDia)}</span>
            </div>
        `;
    });

    const maxLabelStr = maxMb >= 1024 ? `${(maxMb/1024).toFixed(2)} GB` : `${maxMb.toFixed(0)} MB`;

    let html = `
        <div class="daily-chart-container">
            <div class="chart-header">
                <span class="chart-title"><i class="fa-solid fa-chart-simple text-blue"></i> Gráfico Diario</span>
                <span class="chart-max-label">Pico máx: ${maxLabelStr}</span>
            </div>
            <div class="chart-bars-scroll">
                ${chartBarsHtml}
            </div>
        </div>
    `;
    diasFiltrados.forEach(dia => {
        const item = datosDiarios[dia];
        const mb = item.mb || 0;
        const gb = (mb / 1024).toFixed(2);
        const consumoStr = mb >= 1024 ? `${gb} GB (${mb.toFixed(0)} MB)` : `${mb.toFixed(1)} MB`;
        
        html += `
            <div class="call-item-row">
                <div class="call-left">
                    <span class="call-icon" style="background: rgba(0, 102, 255, 0.08); color: var(--brand-blue);"><i class="fa-solid fa-wifi"></i></span>
                    <div>
                        <div class="call-target">${escapeHtml(dia)}</div>
                        <div class="call-date">${item.sesiones} conexiones 4G/5G registradas</div>
                    </div>
                </div>
                <div class="call-right">
                    <div class="call-duration" style="font-weight: 700; color: #0B2265;">${consumoStr}</div>
                    <div class="call-cost" style="color: var(--success-green);">0,00 €</div>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}


// Navegación directa a Facturas en la pantalla principal
function irASeccionFacturas() {
    const sec = document.getElementById('invoicesSection');
    if (sec) {
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        sec.style.transition = 'all 0.3s ease';
        sec.style.boxShadow = '0 0 0 3px rgba(11, 34, 101, 0.2)';
        setTimeout(() => {
            sec.style.boxShadow = '';
        }, 1200);
    }
}

// Modal PUK Seguro
function mostrarModalPuk() {
    const modal = document.getElementById('pukModal');
    if (!modal) return;
    const l = state.lineaActiva || (state.lineas && state.lineas[0]);
    if (l) {
        const pukLineNumber = document.getElementById('pukLineNumber');
        const pukCode = document.getElementById('pukCode');
        const iccidCode = document.getElementById('iccidCode');

        if (pukLineNumber) pukLineNumber.textContent = formatearTelefono(l.numero);
        if (pukCode) pukCode.textContent = l.puk ? formatearPuk(l.puk) : 'Consultar en soporte';
        if (iccidCode) iccidCode.textContent = l.iccid ? formatearIccid(l.iccid) : (l.sim_iccid ? formatearIccid(l.sim_iccid) : 'En tu tarjeta SIM física');
    }
    modal.style.display = 'flex';
}

function cerrarModalPuk() {
    const modal = document.getElementById('pukModal');
    if (modal) modal.style.display = 'none';
}

// Modales de Solicitudes Rápidas (Bono extra, Roaming, eSIM)
const ESTADOS_GESTION = {
    RECIBIDA: 'Recibida', EN_CURSO: 'En revisión', ESPERANDO_CLIENTE: 'Necesitamos tu respuesta',
    RESUELTA: 'Resuelta', CERRADA: 'Cerrada'
};
const TIPOS_GESTION = {
    soporte: 'Atención al cliente', roaming: 'Roaming', duplicado_sim: 'Duplicado SIM / eSIM',
    bono_extra: 'Bono de datos', cambio_tarifa: 'Cambio de tarifa'
};

function mostrarModalGestiones() {
    const modal = document.getElementById('gestionesModal');
    if (!modal) return;
    modal.style.display = 'flex';
    cargarSolicitudesCliente();
}

function cerrarModalGestiones() {
    const modal = document.getElementById('gestionesModal');
    if (modal) modal.style.display = 'none';
}

function formatoFechaGestion(value) {
    if (!value) return 'Fecha pendiente';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

async function cargarSolicitudesCliente() {
    const body = document.getElementById('gestionesModalBody');
    const back = document.getElementById('trackingBackButton');
    const title = document.getElementById('gestionesModalTitle');
    if (!body) return;
    if (back) back.hidden = true;
    if (title) title.textContent = 'Mis solicitudes';
    body.innerHTML = '<p class="tracking-loading">Cargando tus solicitudes…</p>';
    try {
        const response = await fetch('/api/cliente/solicitudes', { credentials: 'same-origin', cache: 'no-store' });
        if (response.status === 401) { cerrarSesion(); return; }
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'No se pudieron cargar tus solicitudes.');
        const requests = Array.isArray(data.solicitudes) ? data.solicitudes : [];
        if (!requests.length) {
            body.innerHTML = '<div class="tracking-empty"><i class="fa-regular fa-message"></i><strong>Aún no tienes solicitudes</strong><span>Cuando nos escribas, podrás consultar aquí su estado y responder al equipo.</span></div>';
            return;
        }
        const hasLegacyReferences = requests.some(item => !String(item.ticket || '').startsWith('MKF-'));
        body.innerHTML = `<div class="tracking-list">${requests.map(item => {
            const status = ESTADOS_GESTION[item.estado] || 'En revisión';
            const type = TIPOS_GESTION[item.tipo] || 'Solicitud';
            return `<button type="button" class="tracking-item" data-tracking-ticket="${escapeHtml(item.ticket)}">
                <span class="tracking-item-top"><strong>${escapeHtml(type)}</strong><span class="tracking-status" data-status="${escapeHtml(item.estado)}">${escapeHtml(status)}</span></span>
                <span class="tracking-item-meta">${escapeHtml(item.ticket)} · ${escapeHtml(formatearTelefono(item.telefono))}</span>
                <span class="tracking-item-date">${escapeHtml(formatoFechaGestion(item.creada_en))}</span>
            </button>`;
        }).join('')}</div>${hasLegacyReferences ? '<p class="tracking-legacy-note">Las solicitudes anteriores conservan su referencia original. Las nuevas usan referencias MKF.</p>' : ''}`;
        body.querySelectorAll('[data-tracking-ticket]').forEach(button => button.addEventListener('click', () => abrirDetalleGestion(button.dataset.trackingTicket)));
    } catch (error) {
        body.innerHTML = `<div class="tracking-error"><p>${escapeHtml(error.message)}</p><button type="button" class="tracking-retry" onclick="cargarSolicitudesCliente()">Volver a intentar</button></div>`;
    }
}

async function abrirDetalleGestion(ticket) {
    const body = document.getElementById('gestionesModalBody');
    const back = document.getElementById('trackingBackButton');
    const title = document.getElementById('gestionesModalTitle');
    if (!body) return;
    if (back) back.hidden = false;
    if (title) title.textContent = 'Detalle de solicitud';
    body.innerHTML = '<p class="tracking-loading">Cargando conversación…</p>';
    try {
        const response = await fetch(`/api/cliente/solicitudes/${encodeURIComponent(ticket)}`, { credentials: 'same-origin', cache: 'no-store' });
        if (response.status === 401) { cerrarSesion(); return; }
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'No se pudo cargar esta solicitud.');
        const item = data.ticket;
        const status = ESTADOS_GESTION[item.estado] || 'En revisión';
        const closed = ['RESUELTA', 'CERRADA'].includes(item.estado);
        const messages = Array.isArray(item.messages) ? item.messages : [];
        body.innerHTML = `<div class="tracking-detail">
            <div class="tracking-detail-summary"><span class="tracking-status" data-status="${escapeHtml(item.estado)}">${escapeHtml(status)}</span><strong>${escapeHtml(TIPOS_GESTION[item.tipo] || 'Solicitud')}</strong><span>${escapeHtml(item.ticket)} · ${escapeHtml(formatearTelefono(item.telefono))}</span><small>Enviada ${escapeHtml(formatoFechaGestion(item.creada_en))}</small></div>
            <div class="tracking-origin"><span>Tu solicitud</span><p>${escapeHtml(item.detalles || 'Sin detalle adicional.')}</p></div>
            <div class="tracking-messages" aria-label="Conversación">${messages.length ? messages.map(message => `<article class="tracking-message ${message.author_type === 'cliente' ? 'from-customer' : 'from-team'}"><span>${message.author_type === 'cliente' ? 'Tú' : 'MásKFundas'} · ${escapeHtml(formatoFechaGestion(message.created_at))}</span><p>${escapeHtml(message.body)}</p></article>`).join('') : '<p class="tracking-no-messages">Todavía no hay respuestas. Te avisaremos cuando el equipo te escriba.</p>'}</div>
            ${closed ? '<p class="tracking-closed-note">Esta solicitud está cerrada. Si necesitas más ayuda, contacta con atención al cliente.</p>' : `<form class="tracking-reply-form" id="trackingReplyForm"><label for="trackingReplyText">Responder al equipo</label><textarea id="trackingReplyText" maxlength="4000" required placeholder="Escribe tu respuesta…"></textarea><button type="submit">Enviar respuesta</button></form>`}
        </div>`;
        const conversation = body.querySelector('.tracking-messages');
        if (conversation) conversation.scrollTop = conversation.scrollHeight;
        const form = document.getElementById('trackingReplyForm');
        if (form) form.addEventListener('submit', event => enviarRespuestaGestion(event, ticket));
    } catch (error) {
        body.innerHTML = `<div class="tracking-error"><p>${escapeHtml(error.message)}</p><button type="button" class="tracking-retry" onclick="cargarSolicitudesCliente()">Volver a mis solicitudes</button></div>`;
    }
}

async function enviarRespuestaGestion(event, ticket) {
    event.preventDefault();
    const textarea = document.getElementById('trackingReplyText');
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const mensaje = textarea?.value.trim();
    if (!mensaje || !button) return;
    button.disabled = true;
    button.textContent = 'Enviando…';
    try {
        const response = await fetch(`/api/cliente/solicitudes/${encodeURIComponent(ticket)}/mensajes`, {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': obtenerTokenCSRF() },
            body: JSON.stringify({ mensaje })
        });
        const data = await response.json();
        if (response.status === 401) { cerrarSesion(); return; }
        if (!response.ok) throw new Error(data.detail || 'No se pudo enviar la respuesta.');
        mostrarToast('Respuesta enviada al equipo de MásKFundas.');
        await abrirDetalleGestion(ticket);
    } catch (error) {
        mostrarToast(error.message || 'No se pudo enviar la respuesta.');
        button.disabled = false;
        button.textContent = 'Enviar respuesta';
    }
}

function abrirModalSolicitud(tipo) {
    state.solicitudActualTipo = tipo;
    const modal = document.getElementById('solicitudModal');
    const title = document.getElementById('solicitudModalTitle');
    const body = document.getElementById('solicitudModalBody');
    const numActual = formatearTelefono(state.lineaActiva ? state.lineaActiva.numero : state.telefonoUsuario);
    const numActualHtml = escapeHtml(numActual);
    const numActualQuery = encodeURIComponent(numActual);

    if (!modal || !title || !body) return;

    if (tipo === 'bono_extra') {
        title.innerHTML = '<i class="fa-solid fa-rocket" style="color: var(--brand-blue); margin-right: 6px;"></i>Añadir Bono Extra de Datos';
        body.innerHTML = `
            <p class="modal-desc">Selecciona el paquete de datos extra para tu línea <strong>${numActualHtml}</strong>:</p>
            <label class="section-label">TIPO DE BONO</label>
            <select id="selectBono" class="form-select">
                <option value="5GB - 3.00€">+5 GB de datos alta velocidad (3.00 €)</option>
                <option value="10GB - 5.00€" selected>+10 GB de datos alta velocidad (5.00 €)</option>
                <option value="20GB - 8.00€">+20 GB de datos alta velocidad (8.00 €)</option>
                <option value="50GB - 12.00€">+50 GB de datos alta velocidad (12.00 €)</option>
            </select>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.5rem;">Se añadirá a tu consumo del mes en curso y se cobrará en tu próxima factura.</p>
        `;
    } else if (tipo === 'roaming') {
        title.innerHTML = '<i class="fa-solid fa-plane-departure" style="color: var(--brand-orange); margin-right: 8px;"></i>Configuración de Roaming';
        body.innerHTML = `
            <div class="roaming-line-pill">
                <i class="fa-solid fa-mobile-screen" style="color: var(--brand-orange);"></i>
                <span>Línea: <strong>${numActualHtml}</strong></span>
            </div>

            <input type="hidden" id="selectRoaming" value="Activar Roaming Zona 1 (Unión Europea - Gratuito)">

            <div class="roaming-cards-stack">
                <!-- Opción 1: Unión Europea (Incluido) -->
                <div class="roaming-option-card selected" id="optRoamingUE" onclick="seleccionarOpcionRoaming('optRoamingUE', 'Activar Roaming Zona 1 (Unión Europea - Gratuito)')">
                    <div class="roaming-card-top">
                        <div class="roaming-card-badge-row">
                            <span class="roaming-flag">🇪🇺</span>
                            <span class="roaming-card-title">Zona 1: Unión Europea</span>
                        </div>
                        <span class="roaming-pill-free">0 € · Incluido</span>
                    </div>
                    <p class="roaming-card-desc">Llama y navega con los gigas y minutos de tu tarifa exactamente igual que en España.</p>
                    <div class="roaming-check-circle"><i class="fa-solid fa-check"></i></div>
                </div>

                <!-- Opción 2: Mundial / Resto del Mundo -->
                <div class="roaming-option-card" id="optRoamingMundo" onclick="seleccionarOpcionRoaming('optRoamingMundo', 'Activar Roaming Mundial (Resto de países)')">
                    <div class="roaming-card-top">
                        <div class="roaming-card-badge-row">
                            <span class="roaming-flag">🌐</span>
                            <span class="roaming-card-title">Mundial (Resto de países)</span>
                        </div>
                        <span class="roaming-pill-pay">Tarificación por uso</span>
                    </div>
                    <p class="roaming-card-desc">Para viajar a EE.UU., Suiza, Andorra, Reino Unido o Latinoamérica. Se factura según el consumo realizado.</p>
                    <div class="roaming-check-circle"><i class="fa-solid fa-check"></i></div>
                </div>

                <!-- Opción 3: Desactivar Roaming -->
                <div class="roaming-option-card" id="optRoamingOff" onclick="seleccionarOpcionRoaming('optRoamingOff', 'Desactivar Roaming')">
                    <div class="roaming-card-top">
                        <div class="roaming-card-badge-row">
                            <span class="roaming-flag">🔒</span>
                            <span class="roaming-card-title">Desactivar Roaming</span>
                        </div>
                        <span class="roaming-pill-off">Bloqueado</span>
                    </div>
                    <p class="roaming-card-desc">Bloquea cualquier tráfico de datos móviles en el extranjero para evitar consumos accidentales.</p>
                    <div class="roaming-check-circle"><i class="fa-solid fa-check"></i></div>
                </div>
            </div>

            <div class="roaming-info-callout">
                <i class="fa-solid fa-circle-info" style="color: var(--brand-orange); font-size: 1rem; flex-shrink: 0; margin-top: 2px;"></i>
                <p>En países de la UE tu móvil se conectará automáticamente al operador local con mayor cobertura. Recuerda tener activa la casilla <em>«Itinerancia de datos»</em> en los ajustes de tu móvil.</p>
            </div>

            <p class="support-meta-note" style="margin-top: 10px; font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-ticket" style="color: var(--brand-orange);"></i>
                Al solicitar tu opción, el equipo de MásKFundas revisará tu petición y te responderá.
            </p>
        `;
    } else if (tipo === 'duplicado_sim') {
        title.innerHTML = '<i class="fa-solid fa-sim-card" style="color: var(--brand-blue); margin-right: 6px;"></i>Duplicado SIM / eSIM';
        body.innerHTML = `
            <div class="solicitud-info-banner" style="background: var(--brand-blue-light); border: 1px solid var(--surface-border); border-radius: 12px; padding: 0.75rem 0.9rem; margin-bottom: 0.85rem; font-size: 0.8rem; color: var(--text-main); line-height: 1.4;">
                <i class="fa-solid fa-store" style="color: var(--brand-blue); margin-right: 4px;"></i><strong>Recogida gratuita en tienda:</strong> Plasencia (C/ Sol, 60), Béjar o Navalmoral. O solicítalo directamente:
            </div>
            
            <div class="solicitud-fast-channels" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
                <a href="https://wa.me/34666677773?text=Hola,%20necesito%20un%20duplicado%20de%20SIM/eSIM%20para%20la%20linea%20${numActualQuery}" target="_blank" rel="noopener noreferrer" style="text-align: center; background: #22C55E; color: white; padding: 0.6rem 0.4rem; border-radius: 10px; text-decoration: none; font-size: 0.78rem; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                    <i class="fa-brands fa-whatsapp" style="font-size: 1.1rem;"></i> <span>WhatsApp</span>
                </a>
                <a href="tel:666677773" style="text-align: center; background: var(--brand-blue); color: white; padding: 0.6rem 0.4rem; border-radius: 10px; text-decoration: none; font-size: 0.78rem; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                    <i class="fa-solid fa-phone" style="font-size: 1.1rem;"></i> <span>Llamar</span>
                </a>
            </div>

            <div class="solicitud-form-card" style="background: var(--surface-border-subtle); border: 1px solid var(--surface-border); border-radius: 12px; padding: 0.85rem;">
                <label class="section-label" style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">TIPO DE FORMATO / RECOGIDA:</label>
                <select id="selectSim" class="form-select">
                    <option value="SIM Física (Tienda Plasencia - C/ Sol 60)" selected>MásKFundas Plasencia (C/ Sol, 60) - Gratuita</option>
                    <option value="SIM Física (Tienda Béjar)">MásKFundas Béjar - Gratuita</option>
                    <option value="SIM Física (Tienda Navalmoral de la Mata)">MásKFundas Navalmoral de la Mata - Gratuita</option>
                    <option value="eSIM Virtual QR por email (Coste 10€)">eSIM Virtual QR por Email (Coste: 10 €)</option>
                </select>

                <label class="section-label" style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); display: block; margin-top: 0.6rem; margin-bottom: 0.35rem;">TELÉFONO DE CONTACTO:</label>
                <input type="tel" id="inputTelContacto" class="form-input" placeholder="Ej: 600 00 00 00" value="${escapeHtml(state.telefonoUsuario)}">
            </div>
        `;
    } else if (tipo === 'soporte') {
        title.innerHTML = '<i class="fa-solid fa-headset" style="color: var(--brand-orange); margin-right: 8px;"></i>Atención y Soporte';
        body.innerHTML = `
            <div class="roaming-line-pill" style="margin-bottom: 12px;">
                <i class="fa-solid fa-mobile-screen" style="color: var(--brand-orange);"></i>
                <span>Línea: <strong>${numActualHtml}</strong></span>
            </div>

            <p class="modal-desc" style="margin-bottom: 14px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.45;">
                ¿Tienes alguna consulta o incidencia? Contacta directamente por nuestros canales de atención o envíanos tu consulta:
            </p>

            <!-- Canales Directos Inmediatos -->
            <div class="support-channels-grid">
                <a href="https://wa.me/34666677773?text=Hola,%20necesito%20ayuda%20con%20mi%20linea%20${numActualQuery}" target="_blank" rel="noopener noreferrer" class="support-channel-card channel-wa">
                    <div class="channel-icon-wrap wa-icon-bg">
                        <i class="fa-brands fa-whatsapp"></i>
                    </div>
                    <div class="channel-info">
                        <span class="channel-title">WhatsApp MásKFundas</span>
                        <span class="channel-sub">666 67 77 73 · Chat directo e inmediato</span>
                    </div>
                    <i class="fa-solid fa-arrow-up-right-from-square channel-chevron"></i>
                </a>

                <a href="tel:666677773" class="support-channel-card channel-tel">
                    <div class="channel-icon-wrap tel-icon-bg">
                        <i class="fa-solid fa-phone"></i>
                    </div>
                    <div class="channel-info">
                        <span class="channel-title">Llamar a Atención al Cliente</span>
                        <span class="channel-sub">666 67 77 73 · Llamada directa gratuita</span>
                    </div>
                    <i class="fa-solid fa-arrow-up-right-from-square channel-chevron"></i>
                </a>
            </div>

            <!-- Separador -->
            <div class="support-divider">
                <span>O envíanos una solicitud online</span>
            </div>

            <!-- Formulario de Ticket -->
            <div class="support-ticket-form">
                <div class="form-group-custom" style="margin-bottom: 12px;">
                    <label class="custom-field-label" for="supportRequestDetails">¿EN QUÉ PODEMOS AYUDARTE?</label>
                    <textarea id="supportRequestDetails" class="custom-textarea" rows="4" maxlength="2000" required placeholder="Describe brevemente tu consulta, problema técnico o duda..."></textarea>
                </div>

                <div class="form-group-custom" style="margin-bottom: 12px;">
                    <label class="custom-field-label" for="inputTelContacto">TELÉFONO DE CONTACTO</label>
                    <input type="tel" id="inputTelContacto" class="custom-input" maxlength="20" value="${escapeHtml(state.telefonoUsuario)}" autocomplete="tel" placeholder="Ej: 600 00 00 00">
                </div>
            </div>

            <p class="support-meta-note">
                <i class="fa-regular fa-clock" style="margin-right: 4px; color: var(--brand-orange);"></i>
                Horario de atención: Lunes a Viernes de 9:30 a 14:00 y de 17:00 a 20:30. Al enviar tu consulta recibirás un número de referencia.
            </p>
        `;
    } else if (tipo === 'cambio_tarifa') {
        title.innerHTML = '<i class="fa-solid fa-sliders" style="color: var(--brand-orange); margin-right: 8px;"></i>Cambio de Tarifa';
        body.innerHTML = `
            <div class="roaming-line-pill" style="margin-bottom: 12px;">
                <i class="fa-solid fa-mobile-screen" style="color: var(--brand-orange);"></i>
                <span>Línea: <strong>${numActualHtml}</strong></span>
            </div>

            <p class="modal-desc" style="margin-bottom: 14px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.45;">
                Descubre nuestras mejores tarifas y planes de fibra o móvil. Contacta directamente con un asesor o solicita una mejora para tu línea:
            </p>

            <!-- Canales Directos Inmediatos -->
            <div class="support-channels-grid">
                <a href="https://wa.me/34666677773?text=Hola,%20quiero%20información%20sobre%20las%20mejores%20tarifas%20para%20mi%20linea%20${numActualQuery}" target="_blank" rel="noopener noreferrer" class="support-channel-card channel-wa">
                    <div class="channel-icon-wrap wa-icon-bg">
                        <i class="fa-brands fa-whatsapp"></i>
                    </div>
                    <div class="channel-info">
                        <span class="channel-title">WhatsApp Asesor Comercial</span>
                        <span class="channel-sub">666 67 77 73 · Consulta directa sin esperas</span>
                    </div>
                    <i class="fa-solid fa-arrow-up-right-from-square channel-chevron"></i>
                </a>

                <a href="tel:666677773" class="support-channel-card channel-tel">
                    <div class="channel-icon-wrap tel-icon-bg">
                        <i class="fa-solid fa-phone"></i>
                    </div>
                    <div class="channel-info">
                        <span class="channel-title">Llamar a Atención al Cliente</span>
                        <span class="channel-sub">666 67 77 73 · Asesoramiento telefónico gratuito</span>
                    </div>
                    <i class="fa-solid fa-arrow-up-right-from-square channel-chevron"></i>
                </a>
            </div>

            <!-- Separador -->
            <div class="support-divider">
                <span>O solicita tu cambio online</span>
            </div>

            <!-- Formulario de Ticket -->
            <div class="support-ticket-form">
                <div class="form-group-custom" style="margin-bottom: 12px;">
                    <label class="custom-field-label" for="supportRequestDetails">¿QUÉ TARIFA O MEJORA TE INTERESA?</label>
                    <textarea id="supportRequestDetails" class="custom-textarea" rows="4" maxlength="2000" required placeholder="Indícanos cuántos GB o velocidad de fibra necesitas, o si quieres añadir más líneas..."></textarea>
                </div>

                <div class="form-group-custom" style="margin-bottom: 12px;">
                    <label class="custom-field-label" for="inputTelContacto">TELÉFONO DE CONTACTO</label>
                    <input type="tel" id="inputTelContacto" class="custom-input" maxlength="20" value="${escapeHtml(state.telefonoUsuario)}" autocomplete="tel" placeholder="Ej: 600 00 00 00">
                </div>
            </div>

            <p class="support-meta-note">
                <i class="fa-solid fa-shield-halved" style="margin-right: 4px; color: var(--brand-orange);"></i>
                Un asesor comercial revisará tu solicitud y te contactará para ofrecerte las opciones disponibles, sin interrumpir tu servicio.
            </p>
        `;
    } else if (tipo === 'baja_cuenta') {
        title.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: #64748b; margin-right: 8px;"></i>Privacidad y Supresión de Cuenta';
        body.innerHTML = `
            <div class="roaming-line-pill" style="margin-bottom: 12px;">
                <i class="fa-solid fa-user-shield" style="color: #64748b;"></i>
                <span>Cuenta: <strong>${escapeHtml(state.dniCliente || numActual)}</strong></span>
            </div>

            <p class="modal-desc" style="margin-bottom: 14px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.45;">
                Puedes pedir la eliminación del acceso y de los datos del portal que ya no deban conservarse. Esta solicitud es independiente de la baja de tus líneas o contrato de telecomunicaciones:
            </p>

            <div class="support-ticket-form">
                <div class="form-group-custom" style="margin-bottom: 12px;">
                    <label class="custom-field-label" for="selectTipoBaja">TIPO DE SOLICITUD</label>
                    <select id="selectTipoBaja" class="form-select" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1); font-size: 0.85rem;">
                        <option value="Eliminación de cuenta y credenciales del portal">Eliminación de cuenta y datos de acceso al portal</option>
                        <option value="Derecho de supresión / olvido RGPD">Ejercicio de derecho de supresión (RGPD)</option>
                    </select>
                </div>

                <div class="form-group-custom" style="margin-bottom: 12px;">
                    <label class="custom-field-label" for="supportRequestDetails">MOTIVO O DETALLES DE LA SOLICITUD</label>
                    <textarea id="supportRequestDetails" class="custom-textarea" rows="3" maxlength="1000" placeholder="Indícanos cualquier información adicional para procesar tu baja..."></textarea>
                </div>

                <div class="form-group-custom" style="margin-bottom: 12px;">
                    <label class="custom-field-label" for="inputTelContacto">TELÉFONO DE CONFIRMACIÓN</label>
                    <input type="tel" id="inputTelContacto" class="custom-input" maxlength="20" value="${escapeHtml(state.telefonoUsuario)}" autocomplete="tel" placeholder="Ej: 600 00 00 00">
                </div>
            </div>

            <p class="support-meta-note">
                <i class="fa-solid fa-lock" style="margin-right: 4px; color: #64748b;"></i>
                Recibirás una referencia para consultar el estado. La eliminación del acceso al portal no cancela automáticamente tus líneas o contrato; el equipo verificará tu identidad y atenderá la solicitud conforme a los plazos legales.
            </p>
        `;
    }

    const card = modal.querySelector('.modal-card');
    if (card) {
        card.classList.toggle('modal-fullscreen', tipo === 'soporte' || tipo === 'cambio_tarifa' || tipo === 'baja_cuenta');
    }

    const btnConfirm = document.getElementById('btnEnviarSolicitud');
    if (btnConfirm) {
        btnConfirm.onclick = enviarSolicitudServicio;
        if (tipo === 'soporte') {
            btnConfirm.textContent = 'Enviar solicitud';
        } else if (tipo === 'cambio_tarifa') {
            btnConfirm.textContent = 'Solicitar cambio de tarifa';
        } else if (tipo === 'roaming') {
            btnConfirm.textContent = 'Enviar solicitud';
        } else {
            btnConfirm.textContent = 'Enviar solicitud';
        }
    }

    modal.style.display = 'flex';
}

function seleccionarOpcionRoaming(cardId, valor) {
    document.querySelectorAll('.roaming-option-card').forEach(c => c.classList.remove('selected'));
    const selected = document.getElementById(cardId);
    if (selected) selected.classList.add('selected');
    const input = document.getElementById('selectRoaming');
    if (input) input.value = valor;
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(12);
    }
}

function cerrarModalSolicitud() {
    const modal = document.getElementById('solicitudModal');
    if (modal) {
        modal.style.display = 'none';
        const card = modal.querySelector('.modal-card');
        if (card) card.classList.remove('modal-fullscreen');
    }
    const btnConfirm = document.getElementById('btnEnviarSolicitud');
    if (btnConfirm) {
        btnConfirm.onclick = enviarSolicitudServicio;
    }
}

async function enviarSolicitudServicio() {
    const tipo = state.solicitudActualTipo;
    let detalles = '';

    const numActual = state.lineaActiva ? state.lineaActiva.numero : state.telefonoUsuario;
    const numActualHtml = escapeHtml(formatearTelefono(numActual));
    const telContacto = document.getElementById('inputTelContacto') ? document.getElementById('inputTelContacto').value : numActual;

    if (tipo === 'roaming') {
        const el = document.getElementById('selectRoaming');
        detalles = el ? el.value : 'Roaming';
    } else if (tipo === 'duplicado_sim') {
        const el = document.getElementById('selectSim');
        detalles = el ? el.value : 'Duplicado SIM';
    } else if (tipo === 'bono_extra') {
        const el = document.getElementById('selectBono');
        detalles = el ? el.value : '';
    } else if (tipo === 'baja_cuenta') {
        const sel = document.getElementById('selectTipoBaja')?.value || 'Baja de cuenta';
        const txt = document.getElementById('supportRequestDetails')?.value.trim() || 'Sin observaciones';
        detalles = `[PRIVACIDAD] Solicitud: ${sel} | Detalle: ${txt}`;
    } else if (tipo === 'soporte' || tipo === 'cambio_tarifa') {
        detalles = document.getElementById('supportRequestDetails')?.value.trim() || '';
    }

    if (!detalles) {
        if (tipo === 'cambio_tarifa') {
            mostrarToast('Indica qué tarifa o mejora te interesa para abrir el ticket.');
        } else if (tipo === 'soporte') {
            mostrarToast('Describe brevemente tu consulta para abrir el ticket.');
        } else {
            mostrarToast('Escribe los detalles para poder registrar la gestión.');
        }
        return;
    }

    const payload = {
        telefono: numActual,
        tipo_solicitud: tipo,
        detalles: `${detalles} | Teléfono de Contacto: ${telContacto}`
    };

    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': obtenerTokenCSRF()
        };
        const res = await fetch('/api/cliente/solicitud', {
            method: 'POST',
            headers,
            credentials: 'same-origin',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            if (res.status === 401) {
                cerrarSesion('Tu sesión ya no es válida. Inicia sesión de nuevo.');
                return;
            }
            mostrarToast(data.detail || 'No se pudo registrar la solicitud. Inténtalo de nuevo.');
            return;
        }

        // Mostrar confirmación y referencia para el seguimiento de la solicitud
        const ticketNum = data.ticket || 'MKF-REGISTRADO';
        const modalTitle = document.getElementById('solicitudModalTitle');
        const modalBody = document.getElementById('solicitudModalBody');
        const btnConfirm = document.getElementById('btnEnviarSolicitud');

        let confirmMsg = '';
        if (tipo === 'roaming') {
            confirmMsg = `Hemos recibido tu solicitud de roaming para la línea <strong>${numActualHtml}</strong>. El equipo de MásKFundas revisará la gestión y te informará cuando esté tramitada.`;
        } else if (tipo === 'cambio_tarifa') {
            confirmMsg = `Hemos recibido tu solicitud de cambio de tarifa para la línea <strong>${numActualHtml}</strong>. Un asesor comercial revisará las opciones disponibles y te contactará para confirmarlas antes de realizar cualquier cambio.`;
        } else if (tipo === 'soporte') {
            confirmMsg = `Tu consulta de soporte ha sido registrada correctamente. Un agente de atención al cliente te responderá a la mayor brevedad.`;
        } else {
            confirmMsg = `Hemos recibido tu solicitud para la línea <strong>${numActualHtml}</strong>. El equipo de MásKFundas la revisará y te informará de los siguientes pasos.`;
        }

        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #22c55e; margin-right: 8px;"></i>Solicitud recibida';
        }

        if (modalBody) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 1.5rem 0.5rem;">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(34, 197, 94, 0.12); color: #22c55e; display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1rem;">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">¡Hemos recibido tu solicitud!</h3>
                    <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.25rem;">
                        ${confirmMsg}
                    </p>
                    <div style="background: var(--surface-border-subtle); border: 1.5px dashed var(--brand-orange); border-radius: 12px; padding: 12px; margin-bottom: 1.25rem; display: inline-block; width: 100%; box-sizing: border-box;">
                        <span style="display: block; font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; letter-spacing: 0.5px;">REFERENCIA MÁS K FUNDAS</span>
                        <strong style="font-size: 1.4rem; color: var(--brand-orange); font-family: monospace; letter-spacing: 1.5px;">#${escapeHtml(ticketNum)}</strong>
                    </div>
                    <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; margin: 0;">
                        Guarda esta referencia por si necesitas consultarnos. Te informaremos de la respuesta o de cualquier paso necesario.
                    </p>
                </div>
            `;
        }

        if (btnConfirm) {
            btnConfirm.textContent = 'Cerrar y Volver';
            btnConfirm.onclick = cerrarModalSolicitud;
        }

        mostrarToast(`Solicitud recibida · ${ticketNum}`);
    } catch (err) {
        cerrarModalSolicitud();
        mostrarToast('No se pudo confirmar la solicitud por un error de conexión.');
    }
}

// Utilidades
function copiarTexto(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent.replace(/\s+/g, '');
    navigator.clipboard.writeText(text).then(() => {
        triggerHaptic('success');
        mostrarToast(`¡Copiado al portapapeles! (${text})`);
    }).catch(err => {
        triggerHaptic('medium');
        mostrarToast(`Copiado: ${text}`);
    });
}

function mostrarToast(mensaje) {
    const toast = document.getElementById('appToast');
    if (!toast) return;
    toast.textContent = mensaje;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function toggleHelpMenu(event) {
    if (event) event.stopPropagation();
    const pop = document.getElementById('helpPopover');
    if (!pop) return;
    const isVisible = pop.style.display === 'block';
    const userPop = document.getElementById('userPopover');
    if (userPop) userPop.style.display = 'none';
    pop.style.display = isVisible ? 'none' : 'block';
}

function toggleUserMenu(event) {
    if (event) event.stopPropagation();
    const pop = document.getElementById('userPopover');
    if (!pop) return;
    const isVisible = pop.style.display === 'block';
    const helpPop = document.getElementById('helpPopover');
    if (helpPop) helpPop.style.display = 'none';
    pop.style.display = isVisible ? 'none' : 'block';
}

// Cerrar desplegables al hacer click fuera
document.addEventListener('click', (e) => {
    const helpPop = document.getElementById('helpPopover');
    const helpBtn = document.getElementById('helpBtn');
    if (helpPop && helpPop.style.display === 'block') {
        if (!helpPop.contains(e.target) && e.target !== helpBtn) {
            helpPop.style.display = 'none';
        }
    }

    const userPop = document.getElementById('userPopover');
    const userPill = document.getElementById('userPill');
    if (userPop && userPop.style.display === 'block') {
        if (!userPop.contains(e.target) && !userPill.contains(e.target)) {
            userPop.style.display = 'none';
        }
    }
});

function cerrarSesion(mensaje = '') {
    sessionStorage.removeItem('mg_token');
    sessionStorage.removeItem('mg_user_phone');
    localStorage.removeItem('mg_token');
    localStorage.removeItem('mg_user_phone');
    const destino = mensaje ? `/login?logout=1&mensaje=${encodeURIComponent(mensaje)}` : '/login?logout=1';
    window.location.href = destino;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECCIÓN DE CONEXIÓN OFFLINE / ONLINE (RESILIENCIA PARA APPLE APP STORE)
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('offline', () => {
    mostrarAvisoConexion(false);
});
window.addEventListener('online', () => {
    mostrarAvisoConexion(true);
});

function mostrarAvisoConexion(online) {
    let banner = document.getElementById('offlineBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offlineBanner';
        banner.style.position = 'fixed';
        banner.style.top = 'max(12px, env(safe-area-inset-top, 12px))';
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.zIndex = '99999';
        banner.style.padding = '8px 16px';
        banner.style.borderRadius = '20px';
        banner.style.fontSize = '0.82rem';
        banner.style.fontWeight = '600';
        banner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.18)';
        banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        document.body.appendChild(banner);
    }
    if (!online) {
        banner.style.background = '#0b1938';
        banner.style.color = '#ffffff';
        banner.innerHTML = '<i class="fa-solid fa-wifi-slash" style="margin-right: 6px; color: #f59e0b;"></i> Modo sin conexión (datos guardados)';
        banner.style.display = 'block';
        banner.style.opacity = '1';
    } else {
        banner.style.background = '#10b981';
        banner.style.color = '#ffffff';
        banner.innerHTML = '<i class="fa-solid fa-check" style="margin-right: 6px;"></i> Conexión a internet restablecida';
        banner.style.display = 'block';
        banner.style.opacity = '1';
        setTimeout(() => {
            if (banner) banner.style.opacity = '0';
            setTimeout(() => { if (banner) banner.style.display = 'none'; }, 300);
        }, 3000);
    }
}
