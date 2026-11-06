/**
 * Command Palette Global (Ctrl + K / Cmd + K) para Panel MásKFundas
 * 100% Autónomo con CSS Embebido (inmune a caché de navegador)
 */
(function() {
    // 1. Inyectar CSS Embebido Seguro
    function injectStyles() {
        if (document.getElementById('cmd-palette-embedded-css')) return;
        const style = document.createElement('style');
        style.id = 'cmd-palette-embedded-css';
        style.textContent = `
            .btn-cmd-trigger {
                background: rgba(255, 255, 255, 0.09) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                color: #f1f5f9 !important;
                padding: 6px 10px !important;
                border-radius: 8px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
                transition: all 0.15s ease !important;
                user-select: none !important;
                height: 32px !important;
                box-sizing: border-box !important;
            }
            .btn-cmd-trigger:hover {
                background: rgba(255, 255, 255, 0.18) !important;
                border-color: rgba(255, 255, 255, 0.35) !important;
                color: #ffffff !important;
            }
            .btn-cmd-trigger kbd {
                background: rgba(0, 0, 0, 0.35) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 4px !important;
                padding: 1px 5px !important;
                font-size: 10px !important;
                color: #94a3b8 !important;
                font-family: ui-monospace, monospace !important;
            }
            @media (max-width: 1450px) {
                .btn-cmd-lbl { display: none !important; }
            }
            @media (max-width: 1150px) {
                .btn-cmd-trigger { display: none !important; }
            }

            #cmd-palette-backdrop {
                display: none !important;
                position: fixed !important;
                top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                width: 100vw !important; height: 100vh !important;
                background: rgba(11, 15, 25, 0.72) !important;
                backdrop-filter: blur(5px) !important;
                -webkit-backdrop-filter: blur(5px) !important;
                z-index: 999999 !important;
                align-items: flex-start !important;
                justify-content: center !important;
                padding-top: 12vh !important;
                box-sizing: border-box !important;
                opacity: 0;
                transition: opacity 0.15s ease-out !important;
            }
            #cmd-palette-backdrop.cmd-active {
                display: flex !important;
                opacity: 1 !important;
            }

            .cmd-modal {
                background: #ffffff !important;
                border-radius: 14px !important;
                width: 100% !important;
                max-width: 620px !important;
                box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0,0,0,0.08) !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                margin: 0 16px !important;
                transform: scale(0.97) translateY(-8px);
                transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            #cmd-palette-backdrop.cmd-active .cmd-modal {
                transform: scale(1) translateY(0) !important;
            }

            .cmd-header {
                display: flex !important;
                align-items: center !important;
                padding: 14px 18px !important;
                border-bottom: 1px solid #e2e8f0 !important;
                gap: 12px !important;
                background: #ffffff !important;
            }
            .cmd-search-icon {
                font-size: 16px !important;
                color: #0284c7 !important;
            }
            .cmd-input {
                flex: 1 !important;
                border: none !important;
                outline: none !important;
                font-size: 15px !important;
                font-weight: 500 !important;
                color: #0f172a !important;
                background: transparent !important;
                font-family: inherit !important;
            }
            .cmd-input::placeholder {
                color: #94a3b8 !important;
            }
            .cmd-badge-esc {
                background: #f1f5f9 !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 4px !important;
                font-size: 10.5px !important;
                font-weight: 700 !important;
                color: #64748b !important;
                padding: 2px 6px !important;
                cursor: pointer !important;
            }
            .cmd-badge-esc:hover {
                background: #e2e8f0 !important;
                color: #0f172a !important;
            }

            .cmd-body {
                max-height: 380px !important;
                overflow-y: auto !important;
                background: #f8fafc !important;
            }
            .cmd-loading {
                padding: 32px !important;
                text-align: center !important;
                color: #64748b !important;
                font-size: 13px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
            }
            .cmd-empty {
                padding: 36px 20px !important;
                text-align: center !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 6px !important;
            }
            .cmd-empty-icon {
                font-size: 26px !important;
                color: #0284c7 !important;
                margin-bottom: 4px !important;
            }
            .cmd-empty-title {
                font-size: 14px !important;
                font-weight: 700 !important;
                color: #1e293b !important;
            }
            .cmd-empty-desc {
                font-size: 12px !important;
                color: #64748b !important;
                max-width: 320px !important;
            }
            .cmd-shortcuts {
                display: flex !important;
                gap: 12px !important;
                margin-top: 14px !important;
                font-size: 11px !important;
                color: #94a3b8 !important;
            }
            .cmd-shortcuts kbd {
                background: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 3px !important;
                padding: 1px 4px !important;
                color: #475569 !important;
            }

            .cmd-list {
                padding: 6px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 4px !important;
            }
            .cmd-item {
                padding: 10px 14px !important;
                border-radius: 8px !important;
                background: #ffffff !important;
                border: 1px solid transparent !important;
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                cursor: pointer !important;
                transition: all 0.12s ease !important;
            }
            .cmd-item:hover, .cmd-item.selected {
                background: #ffffff !important;
                border-color: #0284c7 !important;
                box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08) !important;
                transform: translateY(-1px) !important;
            }
            .cmd-item-icon {
                width: 32px !important;
                height: 32px !important;
                border-radius: 8px !important;
                background: #e0f2fe !important;
                color: #0284c7 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 14px !important;
                flex-shrink: 0 !important;
            }
            .cmd-item-info {
                flex: 1 !important;
                min-width: 0 !important;
            }
            .cmd-item-title {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                font-size: 13.5px !important;
                font-weight: 700 !important;
                color: #0f172a !important;
            }
            .cmd-phone {
                color: #0284c7 !important;
                font-family: ui-monospace, monospace !important;
            }
            .cmd-client-name {
                color: #334155 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
            .cmd-item-meta {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                margin-top: 3px !important;
                font-size: 11px !important;
                color: #64748b !important;
                flex-wrap: wrap !important;
            }
            .cmd-op {
                padding: 1px 6px !important;
                border-radius: 4px !important;
                font-size: 10px !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
            }
            .op-finetwork { background: #fef3c7 !important; color: #b45309 !important; }
            .op-aire { background: #e0f2fe !important; color: #0369a1 !important; }
            .op-lemonvil { background: #dcfce7 !important; color: #15803d !important; }
            .op-tmovil { background: #fee2e2 !important; color: #b91c1c !important; }
            .op-default { background: #f1f5f9 !important; color: #475569 !important; }

            .cmd-mark {
                background: rgba(254, 240, 138, 0.7) !important;
                color: inherit !important;
                padding: 0 2px !important;
                border-radius: 2px !important;
            }

            .cmd-item-actions {
                display: flex !important;
                gap: 4px !important;
            }
            .cmd-action-btn {
                padding: 4px 8px !important;
                border-radius: 6px !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                text-decoration: none !important;
                background: #f1f5f9 !important;
                color: #475569 !important;
                transition: all 0.15s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
            .cmd-action-btn:hover {
                background: #0284c7 !important;
                color: #ffffff !important;
            }

            .cmd-footer {
                padding: 8px 16px !important;
                background: #ffffff !important;
                border-top: 1px solid #e2e8f0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                font-size: 11px !important;
                color: #94a3b8 !important;
            }
            .cmd-footer-left {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
            }
            .cmd-footer-indicator {
                width: 6px !important;
                height: 6px !important;
                border-radius: 50% !important;
                background: #10b981 !important;
            }
            .cmd-footer-right kbd {
                background: #f1f5f9 !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 3px !important;
                padding: 1px 4px !important;
                color: #64748b !important;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Crear e inyectar el HTML del modal de búsqueda si no existe
    function injectCommandPalette() {
        injectStyles();
        if (document.getElementById('cmd-palette-backdrop')) return;

        const html = `
        <div id="cmd-palette-backdrop" style="display:none !important; position:fixed !important; top:0 !important; left:0 !important; right:0 !important; bottom:0 !important; width:100vw !important; height:100vh !important; z-index:999999 !important;">
            <div class="cmd-modal" onclick="event.stopPropagation();">
                <div class="cmd-header">
                    <i class="fa-solid fa-magnifying-glass cmd-search-icon"></i>
                    <input type="text" id="cmd-palette-input" class="cmd-input" placeholder="Buscar por cliente, teléfono, DNI, ICCID, operador..." autocomplete="off" spellcheck="false">
                    <span class="cmd-badge-esc" onclick="window.closeCommandPalette()">ESC</span>
                </div>
                <div class="cmd-body" id="cmd-palette-results">
                    <div class="cmd-empty">
                        <div class="cmd-empty-icon"><i class="fa-solid fa-bolt"></i></div>
                        <div class="cmd-empty-title">Búsqueda Rápida Global</div>
                        <div class="cmd-empty-desc">Escribe al menos 2 caracteres para buscar en tiempo real con SQLite FTS5.</div>
                        <div class="cmd-shortcuts">
                            <span><kbd>↑</kbd> <kbd>↓</kbd> Navegar</span>
                            <span><kbd>↵</kbd> Abrir en Visor</span>
                            <span><kbd>ESC</kbd> Cerrar</span>
                        </div>
                    </div>
                </div>
                <div class="cmd-footer">
                    <div class="cmd-footer-left">
                        <span class="cmd-footer-indicator"></span> <span>Base de Datos SQLite FTS5</span>
                    </div>
                    <div class="cmd-footer-right">
                        <span><kbd>Ctrl</kbd> + <kbd>K</kbd></span>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        const backdrop = document.getElementById('cmd-palette-backdrop');
        const input = document.getElementById('cmd-palette-input');

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) window.closeCommandPalette();
        });

        let debounceTimer = null;
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const val = e.target.value.trim();
            if (val.length < 2) {
                renderEmptyState();
                return;
            }
            debounceTimer = setTimeout(() => performSearch(val), 80);
        });

        input.addEventListener('keydown', handleKeyNavigation);
    }

    let searchResults = [];
    let selectedIndex = 0;

    window.openCommandPalette = function(initialQuery = '') {
        injectCommandPalette();
        const backdrop = document.getElementById('cmd-palette-backdrop');
        const input = document.getElementById('cmd-palette-input');
        backdrop.style.setProperty('display', 'flex', 'important');
        setTimeout(() => backdrop.classList.add('cmd-active'), 10);
        input.value = initialQuery;
        input.focus();
        input.select();
        if (initialQuery.length >= 2) {
            performSearch(initialQuery);
        } else {
            renderEmptyState();
        }
    };

    window.closeCommandPalette = function() {
        const backdrop = document.getElementById('cmd-palette-backdrop');
        if (!backdrop) return;
        backdrop.classList.remove('cmd-active');
        setTimeout(() => { 
            backdrop.style.setProperty('display', 'none', 'important'); 
        }, 150);
    };

    async function performSearch(query) {
        const resultsContainer = document.getElementById('cmd-palette-results');
        resultsContainer.innerHTML = `
            <div class="cmd-loading">
                <i class="fa-solid fa-spinner fa-spin"></i> Buscando en base de datos...
            </div>
        `;

        try {
            const res = await fetch(`/api/admin/global-search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
            if (!res.ok) throw new Error("Error en búsqueda");
            const data = await res.json();
            searchResults = data.resultados || [];
            selectedIndex = 0;
            renderResults(searchResults, query);
        } catch (err) {
            resultsContainer.innerHTML = `
                <div class="cmd-empty">
                    <div class="cmd-empty-icon" style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <div class="cmd-empty-title">Error al consultar el servidor</div>
                    <div class="cmd-empty-desc">${err.message}</div>
                </div>
            `;
        }
    }

    function renderResults(items, query) {
        const resultsContainer = document.getElementById('cmd-palette-results');
        if (!items || items.length === 0) {
            resultsContainer.innerHTML = `
                <div class="cmd-empty">
                    <div class="cmd-empty-icon"><i class="fa-regular fa-face-frown"></i></div>
                    <div class="cmd-empty-title">Sin coincidencias</div>
                    <div class="cmd-empty-desc">No se encontraron líneas o clientes con "<strong>${escapeHtml(query)}</strong>".</div>
                </div>
            `;
            return;
        }

        let html = `<div class="cmd-list">`;
        items.forEach((item, idx) => {
            const isSelected = (idx === selectedIndex) ? 'selected' : '';
            const opClass = getOpBadgeClass(item.operador);
            const consumoGb = item.gigas_consumidos ? Number(item.gigas_consumidos).toFixed(1) : '0.0';
            const totalGb = item.gigas_totales ? Number(item.gigas_totales).toFixed(0) : '0';

            html += `
            <div class="cmd-item ${isSelected}" data-idx="${idx}" onclick="selectItem(${idx})">
                <div class="cmd-item-icon">
                    <i class="fa-solid fa-mobile-screen-button"></i>
                </div>
                <div class="cmd-item-info">
                    <div class="cmd-item-title">
                        <span class="cmd-phone">${highlight(item.telefono, query)}</span>
                        <span class="cmd-client-name">${highlight(item.nombre || 'Sin Titular', query)}</span>
                    </div>
                    <div class="cmd-item-meta">
                        <span class="cmd-dni"><i class="fa-regular fa-id-card"></i> ${highlight(item.dni || 'S/DNI', query)}</span>
                        <span class="cmd-op ${opClass}">${escapeHtml(item.operador || 'Mayorista')}</span>
                        <span class="cmd-tariff"><i class="fa-solid fa-cube"></i> ${escapeHtml(item.tarifa || 'Tarifa')}</span>
                        <span class="cmd-data"><i class="fa-solid fa-chart-pie"></i> ${consumoGb} / ${totalGb} GB</span>
                    </div>
                </div>
                <div class="cmd-item-actions" onclick="event.stopPropagation();">
                    <a href="/admin/visor?q=${encodeURIComponent(item.telefono)}" class="cmd-action-btn" title="Abrir en Visor 360°"><i class="fa-solid fa-eye"></i> Visor</a>
                    <a href="/admin/consumos" class="cmd-action-btn" title="Ver Consumos CDR"><i class="fa-solid fa-fire"></i> CDRs</a>
                </div>
            </div>
            `;
        });
        html += `</div>`;
        resultsContainer.innerHTML = html;
        ensureSelectedVisible();
    }

    function renderEmptyState() {
        const resultsContainer = document.getElementById('cmd-palette-results');
        resultsContainer.innerHTML = `
            <div class="cmd-empty">
                <div class="cmd-empty-icon"><i class="fa-solid fa-bolt"></i></div>
                <div class="cmd-empty-title">Búsqueda Rápida Global</div>
                <div class="cmd-empty-desc">Escribe al menos 2 caracteres para buscar en tiempo real con SQLite FTS5.</div>
                <div class="cmd-shortcuts">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> Navegar</span>
                    <span><kbd>↵</kbd> Abrir en Visor</span>
                    <span><kbd>ESC</kbd> Cerrar</span>
                </div>
            </div>
        `;
    }

    function handleKeyNavigation(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            window.closeCommandPalette();
            return;
        }

        if (!searchResults || searchResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % searchResults.length;
            updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + searchResults.length) % searchResults.length;
            updateSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searchResults[selectedIndex]) {
                selectItem(selectedIndex);
            }
        }
    }

    function updateSelection() {
        const items = document.querySelectorAll('.cmd-item');
        items.forEach((it, idx) => {
            if (idx === selectedIndex) {
                it.classList.add('selected');
            } else {
                it.classList.remove('selected');
            }
        });
        ensureSelectedVisible();
    }

    function ensureSelectedVisible() {
        const selected = document.querySelector('.cmd-item.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    window.selectItem = function(idx) {
        const item = searchResults[idx];
        if (!item) return;
        window.closeCommandPalette();
        window.location.href = `/admin/visor?q=${encodeURIComponent(item.telefono || item.dni || '')}`;
    };

    function getOpBadgeClass(op) {
        const opL = (op || '').toLowerCase();
        if (opL.includes('finetwork')) return 'op-finetwork';
        if (opL.includes('aire')) return 'op-aire';
        if (opL.includes('lemonvil')) return 'op-lemonvil';
        if (opL.includes('tmovil') || opL.includes('t-movil')) return 'op-tmovil';
        return 'op-default';
    }

    function highlight(text, query) {
        if (!text || !query) return escapeHtml(text || '');
        const escaped = escapeHtml(text);
        const qEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reg = new RegExp(`(${qEscaped})`, 'gi');
        return escaped.replace(reg, '<mark class="cmd-mark">$1</mark>');
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Atajo de Teclado (Ctrl+K o Cmd+K)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            // Si estamos en /admin/visor y el buscador hero está en pantalla, enfocarlo directamente
            if (window.location.pathname.includes('/admin/visor')) {
                const visorInput = document.getElementById('inputSearchClient');
                if (visorInput) {
                    visorInput.focus();
                    visorInput.select();
                    return;
                }
            }
            const backdrop = document.getElementById('cmd-palette-backdrop');
            if (backdrop && backdrop.classList.contains('cmd-active')) {
                window.closeCommandPalette();
            } else {
                window.openCommandPalette();
            }
        }
    });

    // La misma búsqueda y el mismo menú en todos los apartados de administración.
    function setupNavTrigger() {
        injectStyles();
        const navRight = document.querySelector('.global-nav-right');
        if (navRight && !document.getElementById('btn-global-search-trigger')) {
            const btn = document.createElement('button');
            btn.id = 'btn-global-search-trigger';
            btn.className = 'btn-cmd-trigger';
            btn.setAttribute('type', 'button');
            btn.setAttribute('title', 'Búsqueda Rápida Global (Ctrl + K)');
            btn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> <span class="btn-cmd-lbl">Buscar</span> <kbd>Ctrl K</kbd>`;
            btn.onclick = () => window.openCommandPalette();
            navRight.insertBefore(btn, navRight.firstChild);
        }
    }

    function setupMobileNav() {
        const nav = document.querySelector('.global-nav');
        if (!nav) return;

        // Auto-centrar la píldora activa ÚNICAMENTE dentro del contenedor scrollable móvil (sin desplazar el body/window)
        const linksContainer = document.querySelector('.global-nav-links');
        if (linksContainer && window.innerWidth <= 900) {
            const activeLink = linksContainer.querySelector('a.active');
            if (activeLink) {
                setTimeout(() => {
                    const offset = activeLink.offsetLeft - (linksContainer.clientWidth / 2) + (activeLink.clientWidth / 2);
                    linksContainer.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
                }, 120);
            }
        }

        // Si ya existe la función o el drawer, no duplicar
        if (!window.toggleNavMenu) {
            window.toggleNavMenu = function() {
                const drawer = document.getElementById('globalNavDrawer');
                const backdrop = document.getElementById('drawerBackdrop');
                const toggle = document.getElementById('navMobileToggle');
                if (drawer && backdrop) {
                    const isOpen = drawer.classList.contains('open');
                    if (isOpen) {
                        drawer.classList.remove('open');
                        backdrop.classList.remove('active');
                    } else {
                        drawer.classList.add('open');
                        backdrop.classList.add('active');
                    }
                    if (toggle) toggle.setAttribute('aria-expanded', String(!isOpen));
                }
            };
        }

        document.addEventListener('keydown', (event) => {
            const drawer = document.getElementById('globalNavDrawer');
            if (event.key === 'Escape' && drawer && drawer.classList.contains('open')) {
                window.toggleNavMenu();
            }
        });

        const navRight = document.querySelector('.global-nav-right');
        const navInner = document.querySelector('.global-nav-inner');
        if (navInner && navRight && !document.getElementById('globalNavCurrent')) {
            const active = document.querySelector('.global-nav-links a.active');
            const current = document.createElement('span');
            current.id = 'globalNavCurrent';
            current.className = 'global-nav-current';
            current.textContent = active ? active.textContent.trim() : 'Centro de mando';
            navInner.insertBefore(current, navRight);
        }
        if (navRight && !document.getElementById('btnTopDowisp')) {
            const btnDowisp = document.createElement('a');
            btnDowisp.id = 'btnTopDowisp';
            btnDowisp.className = 'btn-top-dowisp';
            btnDowisp.href = '/admin/dowisp';
            btnDowisp.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> <span>DoWISP Live</span> <span class="badge-live-pulse">LIVE</span>';
            btnDowisp.title = 'Abrir Consola DoWISP Live en Vivo';
            const logoutBtn = navRight.querySelector('.global-nav-logout');
            if (logoutBtn) {
                navRight.insertBefore(btnDowisp, logoutBtn);
            } else {
                navRight.appendChild(btnDowisp);
            }
        }
        if (navRight && !document.getElementById('navMobileToggle')) {
            const btnToggle = document.createElement('button');
            btnToggle.id = 'navMobileToggle';
            btnToggle.className = 'nav-mobile-toggle';
            btnToggle.setAttribute('type', 'button');
            btnToggle.setAttribute('aria-label', 'Abrir menú');
            btnToggle.setAttribute('aria-controls', 'globalNavDrawer');
            btnToggle.setAttribute('aria-expanded', 'false');
            btnToggle.innerHTML = '<i class="fa-solid fa-bars"></i> <span>Menú</span>';
            btnToggle.onclick = window.toggleNavMenu;
            const logoutBtn = navRight.querySelector('.global-nav-logout');
            if (logoutBtn) {
                navRight.insertBefore(btnToggle, logoutBtn);
            } else {
                navRight.appendChild(btnToggle);
            }
        }

        if (!document.getElementById('globalNavDrawer')) {
            const currentPath = window.location.pathname;
            const backdrop = document.createElement('div');
            backdrop.className = 'drawer-backdrop';
            backdrop.id = 'drawerBackdrop';
            backdrop.onclick = window.toggleNavMenu;
            document.body.appendChild(backdrop);

            const drawer = document.createElement('div');
            drawer.className = 'global-nav-drawer';
            drawer.id = 'globalNavDrawer';
            drawer.innerHTML = `
                <div class="drawer-header">
                    <div class="drawer-title">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>Navegación del Sistema</span>
                    </div>
                    <button class="drawer-close" onclick="window.toggleNavMenu()" aria-label="Cerrar menú">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="drawer-content">
                    <div class="drawer-section-title" style="color: #38bdf8; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-star" style="color:#f59e0b; font-size:11px;"></i> ACCESO PRINCIPAL ISP
                    </div>
                    <a href="/admin/dowisp" class="drawer-item ${currentPath.includes('/admin/dowisp') ? 'active' : ''}" style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(14, 165, 233, 0.1)); border: 1px solid rgba(56, 189, 248, 0.4); font-weight: 700; color: #38bdf8; margin-bottom: 12px;">
                        <i class="fa-solid fa-satellite-dish" style="color:#38bdf8;"></i> 
                        <span>DoWISP Live (Consola Central)</span> 
                        <span class="drawer-badge" style="background:#10b981; color:#fff; font-weight:800;">LIVE</span>
                    </a>

                    <div class="drawer-section-title">ATENCIÓN AL CLIENTE</div>
                    <a href="/admin/tickets" class="drawer-item ${currentPath.includes('/admin/tickets') ? 'active' : ''}"><i class="fa-solid fa-inbox"></i> Tickets y solicitudes ${currentPath.includes('/admin/tickets') ? '<span class="drawer-badge">Actual</span>' : ''}</a>
                    <a href="/admin/seguridad?tab=portal" class="drawer-item ${currentPath.includes('/admin/seguridad') ? 'active' : ''}"><i class="fa-solid fa-user-clock"></i> Accesos portal clientes</a>

                    <div class="drawer-section-title">OPERACIONES & FACTURACIÓN</div>
                    <a href="/admin" class="drawer-item ${currentPath === '/admin' ? 'active' : ''}"><i class="fa-solid fa-chart-line"></i> Dashboard ${currentPath === '/admin' ? '<span class="drawer-badge">Actual</span>' : ''}</a>
                    <a href="/admin/morosos" class="drawer-item ${currentPath.includes('/admin/morosos') ? 'active' : ''}"><i class="fa-solid fa-file-invoice-dollar"></i> Morosos ${currentPath.includes('/admin/morosos') ? '<span class="drawer-badge">Actual</span>' : ''}</a>
                    <a href="/admin/facturas-directas" class="drawer-item ${currentPath.includes('/admin/facturas-directas') ? 'active' : ''}"><i class="fa-solid fa-paper-plane"></i> Facturas Directas ${currentPath.includes('/admin/facturas-directas') ? '<span class="drawer-badge">Actual</span>' : ''}</a>
                    <a href="/admin/devoluciones" class="drawer-item ${currentPath.includes('/admin/devoluciones') ? 'active' : ''}"><i class="fa-solid fa-rotate-left"></i> Devoluciones SEPA ${currentPath.includes('/admin/devoluciones') ? '<span class="drawer-badge">Actual</span>' : ''}</a>
                    <a href="/admin/consumos" class="drawer-item ${currentPath.includes('/admin/consumos') ? 'active' : ''}"><i class="fa-solid fa-fire-flame-curved"></i> Consumos & CDRs ${currentPath.includes('/admin/consumos') ? '<span class="drawer-badge">Actual</span>' : ''}</a>
                    
                    <div class="drawer-section-title">AUDITORÍA Y TELECOM</div>
                    <a href="/admin/auditoria" class="drawer-item ${currentPath.includes('/admin/auditoria') ? 'active' : ''}"><i class="fa-solid fa-tower-cell"></i> Líneas No Facturadas ${currentPath.includes('/admin/auditoria') ? '<span class="drawer-badge">Actual</span>' : ''}</a>
                    <a href="/admin/visor" class="drawer-item ${currentPath.includes('/admin/visor') ? 'active' : ''}"><i class="fa-solid fa-headset"></i> Visor Clientes ${currentPath.includes('/admin/visor') ? '<span class="drawer-badge">Actual</span>' : ''}</a>

                    <div class="drawer-section-title">SERVICIOS & SISTEMA</div>
                    <a href="/admin/propuesta" class="drawer-item" target="_blank" style="color: #fde047;"><i class="fa-solid fa-file-invoice-dollar"></i> Presupuestos</a>
                    <a href="https://sat.maskfundas.es" class="drawer-item" target="_blank" style="color: #fb923c;"><i class="fa-solid fa-screwdriver-wrench"></i> SAT MásKFundas</a>
                    <a href="/admin/seguridad" class="drawer-item ${currentPath.includes('/admin/seguridad') ? 'active' : ''}"><i class="fa-solid fa-lock"></i> Seguridad ${currentPath.includes('/admin/seguridad') ? '<span class="drawer-badge">Actual</span>' : ''}</a>

                    <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <a href="/admin/logout" class="drawer-item drawer-logout"><i class="fa-solid fa-arrow-right-from-bracket"></i> Cerrar Sesión</a>
                    </div>
                </div>
            `;
            document.body.appendChild(drawer);
        }
    }

    function initGlobalHelpers() {
        setupNavTrigger();
        setupMobileNav();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGlobalHelpers);
    } else {
        initGlobalHelpers();
    }
})();
