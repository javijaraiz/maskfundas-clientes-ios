(() => {
  const $ = (id) => document.getElementById(id);
  const state = { rows: [], selected: null, timer: null, requested: new URLSearchParams(location.search).get('ticket') };
  const labels = { RECIBIDA: 'Recibida', EN_CURSO: 'En curso', ESPERANDO_CLIENTE: 'Espera cliente', RESUELTA: 'Resuelta', CERRADA: 'Cerrada' };
  const types = { soporte: 'Consulta de soporte', roaming: 'Gestión de roaming', duplicado_sim: 'Duplicado SIM / eSIM', bono_extra: 'Bono extra de datos', cambio_tarifa: 'Cambio de tarifa' };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = (value) => value ? new Date(value).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  async function api(url, options = {}) {
    const res = await fetch(url, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    if (res.status === 401) { location.href = '/admin/login?next=/admin/tickets'; throw new Error('La sesión administrativa ha caducado.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'No se pudo completar la operación.');
    return data;
  }
  async function loadTickets(keep = true) {
    const params = new URLSearchParams({ q: $('search').value.trim(), estado: $('filterStatus').value, limit: '100' });
    try {
      const data = await api(`/api/admin/tickets?${params}`);
      state.rows = data.tickets || [];
      $('queueCount').textContent = `${state.rows.length} ${state.rows.length === 1 ? 'ticket' : 'tickets'}`;
      $('openCount').textContent = state.rows.filter(x => !['RESUELTA','CERRADA'].includes(x.estado)).length;
      const retryButton = $('retryNotices');
      retryButton.hidden = !(data.avisos_pendientes || data.avisos_fallidos);
      retryButton.textContent = `Reintentar avisos (${(data.avisos_pendientes || 0) + (data.avisos_fallidos || 0)})`;
      $('refreshTime').textContent = `Actualizado ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      renderList();
      if (state.requested && state.rows.some(x => x.ticket === state.requested)) {
        const requested = state.requested;
        state.requested = null;
        await openTicket(requested);
      }
      else if (keep && state.selected && state.rows.some(x => x.ticket === state.selected)) await openTicket(state.selected, false);
      else if (state.selected && !state.rows.some(x => x.ticket === state.selected)) { state.selected = null; renderEmpty(); }
    } catch (error) { $('ticketList').innerHTML = `<div class="empty">${esc(error.message)}</div>`; }
  }
  function renderList() {
    if (!state.rows.length) { $('ticketList').innerHTML = '<div class="empty">No hay solicitudes con estos filtros.</div>'; return; }
    $('ticketList').innerHTML = state.rows.map(row => `<button class="ticket-row" data-ticket="${esc(row.ticket)}" aria-current="${state.selected === row.ticket}">
      <span class="row-top"><span class="row-title">${esc(types[row.tipo] || 'Gestión de cliente')}</span><span class="state" data-state="${esc(row.estado)}">${esc(labels[row.estado] || row.estado)}</span></span>
      <span class="row-meta"><span class="ticket-id">${esc(row.ticket)} · ${esc(row.telefono)}</span><span class="row-date">${esc(date(row.actualizada_en || row.creada_en))}</span></span>
      <span class="row-snippet">${row.asignado_a ? `Responsable: ${esc(row.asignado_a)}` : 'Sin asignar'} · ${row.prioridad === 'URGENTE' ? 'Prioridad urgente' : 'Prioridad normal'}</span>
    </button>`).join('');
    $('ticketList').querySelectorAll('[data-ticket]').forEach(button => button.addEventListener('click', () => openTicket(button.dataset.ticket)));
  }
  function renderEmpty() { $('ticketDetail').innerHTML = '<div class="detail-empty">Selecciona una solicitud para leer el contexto, revisar la conversación y responder al cliente.</div>'; }
  async function openTicket(ticket, scroll = true) {
    state.selected = ticket; renderList();
    try {
      const data = await api(`/api/admin/tickets/${encodeURIComponent(ticket)}`);
      const t = data.ticket;
      const messages = (t.messages || []).map(m => `<article class="message ${m.author_type === 'agente' ? 'agent' : ''} ${m.internal ? 'internal' : ''}"><span class="message-meta">${m.internal ? 'NOTA INTERNA · ' : ''}${esc(m.author)} · ${esc(date(m.created_at))}</span>${esc(m.body)}</article>`).join('');
      const replyStatus = ['CERRADA','RESUELTA'].includes(t.estado) ? 'EN_CURSO' : (t.estado === 'RECIBIDA' ? 'ESPERANDO_CLIENTE' : t.estado);
      const customer = t.contexto_cliente || {};
      const lines = customer.lineas || [];
      const customerContext = `<section class="customer-context" aria-label="Ficha y servicios del cliente">
        <div class="customer-context-head"><div><div class="origin-label">CLIENTE Y SERVICIOS</div><strong>${esc(customer.nombre || 'Titular no disponible en ficha maestra')}</strong><span class="customer-line-main">Línea del ticket: ${esc(t.telefono)}</span></div>
          <div class="customer-links"><a class="customer-link" href="${esc(customer.ficha_url || `/admin/visor?q=${encodeURIComponent(t.telefono || '')}`)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-address-card"></i> Abrir ficha y servicios</a>
          ${customer.cliente_id_dowisp ? `<a class="customer-link customer-link-secondary" href="/admin/dowisp?route=${encodeURIComponent(`/admin/clientes/cliente/${customer.cliente_id_dowisp}/change/`)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ficha comercial</a>` : ''}</div></div>
        ${customer.proveedor || customer.tarifa ? `<div class="service-summary"><span><small>Proveedor de esta línea</small><strong>${esc(customer.proveedor || 'Sin dato')}</strong></span><span><small>Tarifa</small><strong>${esc(customer.tarifa || 'Sin dato')}</strong></span><span><small>Líneas móviles asociadas</small><strong>${lines.length || 'No disponibles'}</strong></span></div>` : '<p class="customer-context-empty">No hay datos de servicio asociados en la ficha maestra. Abre la ficha de cliente para consultar el resto de servicios.</p>'}
        ${lines.length > 1 ? `<details class="linked-lines"><summary>Ver líneas móviles asociadas (${lines.length})</summary><ul>${lines.map(line => `<li><span><strong>${esc(line.telefono)}</strong><small>${esc(line.proveedor || 'Proveedor sin dato')} · ${esc(line.tarifa || 'Tarifa sin dato')}</small></span><a href="/admin/visor?q=${encodeURIComponent(line.telefono || '')}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ficha de la línea ${esc(line.telefono)}">Ver línea <i class="fa-solid fa-arrow-up-right-from-square"></i></a></li>`).join('')}</ul></details>` : ''}
      </section>`;
      $('ticketDetail').innerHTML = `<header class="detail-head"><div><h2 class="detail-title">${esc(types[t.tipo] || 'Gestión de cliente')}</h2><div class="detail-sub">${esc(t.ticket)} · ${esc(t.telefono)} · Recibida ${esc(date(t.creada_en))}</div><span class="state-pill" id="currentTicketStatus" data-state="${esc(t.estado)}">${esc(labels[t.estado] || t.estado)}</span></div>
        <div class="controls"><select id="ticketPriority" aria-label="Prioridad"><option value="NORMAL" ${t.prioridad !== 'URGENTE' ? 'selected' : ''}>Prioridad normal</option><option value="URGENTE" ${t.prioridad === 'URGENTE' ? 'selected' : ''}>Prioridad urgente</option></select><input id="ticketAssignee" maxlength="120" value="${esc(t.asignado_a || '')}" placeholder="Asignar agente" aria-label="Responsable"><button id="saveMeta">Guardar</button></div></header>
        ${customerContext}<div class="conversation" id="conversation"><div class="origin"><div class="origin-label">Solicitud original · ${esc(date(t.creada_en))}</div><strong>${esc(t.detalles)}</strong></div>${messages || '<p class="notice">Todavía no hay respuestas en esta gestión.</p>'}${(t.events || []).map(e => `<p class="notice">${esc(e.event_type)} · ${esc(e.event_value)} · ${esc(e.actor)} · ${esc(date(e.created_at))}</p>`).join('')}</div>
        <form class="reply" id="replyForm"><label for="replyText" class="origin-label">Responder al cliente</label><textarea id="replyText" maxlength="4000" placeholder="Escribe una respuesta clara y concreta…" required></textarea>
          <div class="reply-bottom"><label class="internal-toggle"><input id="internalNote" type="checkbox"> Guardar como nota interna</label></div>
          <div class="reply-state-row"><label for="ticketReplyStatus">Estado al responder</label><select id="ticketReplyStatus" aria-label="Estado al responder">${Object.entries(labels).map(([key,label]) => `<option value="${key}" ${replyStatus === key ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
          <div class="reply-actions"><button class="send" id="sendReplyButton" type="submit">Enviar respuesta</button><button class="quick-pending" id="quickPending" type="button"><i class="fa-regular fa-clock"></i> Dejar pendiente</button><button class="quick-close" id="quickClose" type="button"><i class="fa-solid fa-check"></i> Cerrar ticket</button></div>
        </form>`;
      $('saveMeta').addEventListener('click', saveMeta);
      $('replyForm').addEventListener('submit', sendReply);
      $('quickPending').addEventListener('click', () => updateTicketState('EN_CURSO'));
      $('quickClose').addEventListener('click', () => updateTicketState('CERRADA'));
      $('internalNote').addEventListener('change', () => { $('sendReplyButton').textContent = $('internalNote').checked ? 'Guardar nota' : 'Enviar respuesta'; });
      const box = $('conversation'); if (scroll) box.scrollTop = box.scrollHeight;
    } catch (error) { $('ticketDetail').innerHTML = `<div class="notice">${esc(error.message)}</div>`; }
  }
  async function saveMeta() {
    const button = $('saveMeta'); button.disabled = true;
    try { const data = await api(`/api/admin/tickets/${encodeURIComponent(state.selected)}`, { method: 'PATCH', body: JSON.stringify({ prioridad: $('ticketPriority').value, asignado_a: $('ticketAssignee').value }) }); state.selected = data.ticket.ticket; await loadTickets(); }
    catch (error) { alert(error.message); } finally { button.disabled = false; }
  }
  async function updateTicketState(status) {
    const buttons = [$('quickPending'), $('quickClose')];
    buttons.forEach(button => { if (button) button.disabled = true; });
    try {
      const data = await api(`/api/admin/tickets/${encodeURIComponent(state.selected)}`, { method: 'PATCH', body: JSON.stringify({ estado: status }) });
      state.rows = state.rows.map(row => row.ticket === state.selected ? { ...row, estado: data.ticket.estado, actualizada_en: data.ticket.actualizada_en } : row);
      $('openCount').textContent = state.rows.filter(row => !['RESUELTA','CERRADA'].includes(row.estado)).length;
      const badge = $('currentTicketStatus');
      badge.textContent = labels[status] || status;
      badge.dataset.state = status;
      $('ticketReplyStatus').value = status;
      renderList();
    } catch (error) { alert(error.message); }
    finally { buttons.forEach(button => { if (button) button.disabled = false; }); }
  }
  async function sendReply(event) {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    try {
      const internal = $('internalNote').checked;
      const chosenStatus = $('ticketReplyStatus').value;
      const data = await api(`/api/admin/tickets/${encodeURIComponent(state.selected)}/mensajes`, { method: 'POST', body: JSON.stringify({ mensaje: $('replyText').value, nota_interna: internal, estado: internal ? null : chosenStatus }) });
      state.selected = data.ticket.ticket;
      await loadTickets();
    } catch (error) { alert(error.message); } finally { button.disabled = false; }
  }
  $('refresh').addEventListener('click', () => loadTickets());
  $('retryNotices').addEventListener('click', async () => {
    const button = $('retryNotices'); button.disabled = true;
    try { const result = await api('/api/admin/tickets/notificaciones/reintentar', { method: 'POST', body: '{}' }); alert(`Avisos enviados: ${result.enviadas}. Pendientes: ${result.pendientes}. Fallidos: ${result.fallidos}.`); await loadTickets(); }
    catch (error) { alert(error.message); } finally { button.disabled = false; }
  });
  $('filterStatus').addEventListener('change', () => loadTickets(false));
  let searchTimer; $('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadTickets(false), 250); });
  state.timer = setInterval(() => loadTickets(), 45000);
  loadTickets(false);
})();
