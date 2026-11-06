/* Resúmenes para listados largos. El detalle es de solo lectura;
   los controles originales permanecen en la fila y conservan sus eventos. */
(() => {
    function dialog() {
        let node = document.getElementById('adminDetailDialog');
        if (node) return node;
        node = document.createElement('dialog');
        node.id = 'adminDetailDialog';
        node.className = 'admin-detail-dialog';
        node.innerHTML = '<header><strong id="adminDetailTitle">Detalle</strong><button type="button" aria-label="Cerrar detalle">×</button></header><dl id="adminDetailFields"></dl>';
        node.querySelector('header button').addEventListener('click', () => node.close());
        node.addEventListener('click', event => { if (event.target === node) node.close(); });
        document.body.appendChild(node);
        return node;
    }

    function show(table, row) {
        const node = dialog();
        const labels = Array.from(table.querySelectorAll('thead th'), th => th.textContent.trim().replace(/\s+/g, ' '));
        const cells = Array.from(row.cells);
        const fields = node.querySelector('#adminDetailFields');
        fields.replaceChildren();
        const primaryCell = cells[Number(table.dataset.compactPrimary || 0)];
        const titleSource = primaryCell?.querySelector('div, strong, a, span') || primaryCell;
        node.querySelector('#adminDetailTitle').textContent = titleSource?.textContent.trim() || 'Detalle';
        cells.forEach((cell, index) => {
            const value = cell.textContent.replace(/Ver más\s*$/, '').trim().replace(/\s+/g, ' ');
            if (!value && !cell.querySelector('input, select, textarea')) return;
            const dt = document.createElement('dt');
            const dd = document.createElement('dd');
            dt.textContent = labels[index] || `Campo ${index + 1}`;
            const controls = Array.from(cell.querySelectorAll('input, select, textarea'))
                .map(control => control.type === 'checkbox' ? (control.checked ? 'Sí' : 'No') : control.value)
                .filter(Boolean);
            dd.textContent = [value, ...controls].filter(Boolean).join(' · ');
            fields.append(dt, dd);
        });
        node.showModal();
    }

    function enhance(table) {
        const primary = Number(table.dataset.compactPrimary || 0);
        const status = Number(table.dataset.compactStatus || -1);
        const always = new Set((table.dataset.compactAlways || '').split(',').filter(Boolean).map(Number));
        always.add(primary);
        if (status >= 0) always.add(status);
        const tbody = table.tBodies[0];
        if (!tbody) return;
        for (const row of tbody.rows) {
            if (row.cells.length < 3 || row.cells[0].colSpan > 1 || row.classList.contains('detail-row')) continue;
            Array.from(row.cells).forEach((cell, index) => {
                cell.classList.toggle('admin-compact-primary', index === primary);
                cell.classList.toggle('admin-compact-status', index === status);
                cell.classList.toggle('admin-compact-actions', always.has(index) && index !== primary && index !== status);
            });
            const cell = row.cells[primary];
            if (!cell.querySelector('.admin-compact-more')) {
                const more = document.createElement('button');
                more.type = 'button';
                more.className = 'admin-compact-more';
                more.textContent = 'Ver más';
                more.setAttribute('aria-label', `Ver detalle de ${cell.textContent.trim()}`);
                more.addEventListener('click', () => show(table, row));
                cell.appendChild(more);
            }
        }
    }

    const dynamicConfigs = [
        ['#tableIdent > table', 0, 3, '1'],
        ['#tableNoIdent > table', 0, 2, ''],
    ];
    const tbodyConfigs = [
        ['tbodyConsumo90', 0, 4, '6'],
        ['tbodyAlertas', 1, 4, ''],
        ['tableMultiLineBody', 0, 2, ''],
        ['tableExtrasBody', 0, 2, ''],
    ];
    function configureLongLists() {
        document.querySelectorAll('table:not([data-compact-primary]):not([data-no-compact])').forEach(table => {
            if (table.closest('dialog, .modal, .admin-detail-dialog') || table.matches('.subtable, .detail-table')) return;
            const headers = Array.from(table.querySelectorAll('thead th'));
            if (headers.length < 5) return;
            const text = headers.map(th => th.textContent.trim().replace(/\s+/g, ' ').toLowerCase());
            let primary = text.findIndex(label => /cliente|titular|tel[eé]fono|l[ií]nea|nombre/.test(label));
            if (primary < 0) primary = 0;
            let status = text.findIndex((label, index) => index !== primary && /estado|seguimiento|diagn[oó]stico|consumo|deuda|importe|gigas|porcentaje|resultado|motivo|impacto|previsi[oó]n/.test(label));
            if (status < 0) status = Math.min(primary + 1, headers.length - 1);
            const actions = text.findIndex(label => /acciones|acci[oó]n|gesti[oó]n manual|enviar \(auto\)/.test(label));
            table.dataset.compactPrimary = String(primary);
            table.dataset.compactStatus = String(status);
            table.dataset.compactAlways = actions >= 0 ? String(actions) : '';
        });
    }
    const observed = new WeakSet();
    function init() {
        configureLongLists();
        dynamicConfigs.forEach(([selector, primary, status, always]) => {
            document.querySelectorAll(selector).forEach(table => {
                table.dataset.compactPrimary = String(primary);
                table.dataset.compactStatus = String(status);
                table.dataset.compactAlways = always;
            });
        });
        tbodyConfigs.forEach(([id, primary, status, always]) => {
            const table = document.getElementById(id)?.closest('table');
            if (!table) return;
            table.dataset.compactPrimary = String(primary);
            table.dataset.compactStatus = String(status);
            table.dataset.compactAlways = always;
        });
        document.querySelectorAll('table[data-compact-primary]').forEach(table => {
            table.classList.add('admin-compact-table');
            enhance(table);
            if (table.tBodies[0] && !observed.has(table)) {
                new MutationObserver(() => enhance(table)).observe(table.tBodies[0], { childList: true, subtree: false });
                observed.add(table);
            }
        });
    }
    function start() {
        init();
        let scheduled = false;
        new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            setTimeout(() => { scheduled = false; init(); }, 30);
        }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
