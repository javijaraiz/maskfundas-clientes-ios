# Guía Maestra del Proyecto: MásKFundas Clientes y Telecomunicaciones

Bienvenido al repositorio de **MásKFundas Clientes y Centro de Mando Administrativo**. Este documento es la referencia primordial de navegación rápida para optimizar consumo de tokens y maximizar la precisión en el desarrollo.

---

## ⚡ 1. El Proyecto en 30 Segundos

* **¿Qué es?** Sistema integral de telecomunicaciones, facturación, portal de cliente y centro de mando administrativo para MásKFundas ISP.
* **URLs de Producción:**
  - **Portal de Clientes:** `https://clientes.maskfundas.es` (consumos en vivo, facturas, PUKs, soporte).
  - **Consola de Administración:** `https://admin.maskfundas.es` (dashboard, auditoría, cobros, seguridad).
  - **DoWISP Live (Consola Embebida):** `https://admin.maskfundas.es/admin/dowisp` (proxy reverso stealth con sesión inyectada).
* **Infraestructura:**
  - VPS Debian en `93.93.115.93` gestionado con Docker (`portal-clientes`, FastAPI + Uvicorn en puerto 8085).
  - Servidor web host: Apache 2.4 con Reverse Proxy y protección Zero-Downtime (`/reloading.html`).
* **Mayoristas Integrados (4):** AireNetworks (Movistar), FiNetwork (Vodafone), T-Móvil (Orange), Lemonvil (Orange).

---

## 🧭 2. Dónde Está Cada Dato Clave (Zero-Scraping / Mínimo Token)

| Dato Buscado | Dónde Consultar Primero | Tiempo de Respuesta |
|---|---|---|
| **Consumos, Gigas, Minutos, PUK, Tarifa de una línea** | `data/master_cache.json` (leer con script o JSON) | **< 50ms** |
| **Clientes, DNI, Teléfonos, Fechas de Nacimiento** | `data/portal_master.db` (SQLite) | **< 5ms** |
| **Facturas Impagadas, Deuda, Devoluciones SEPA** | `data/morosos.db` (SQLite) | **< 5ms** |
| **Sesión Activa de DoWISP (Django 14 días)** | `data/dowisp_session.json` | **Persistente** |
| **Cookies de Mayoristas con 2FA** | `data/airenetworks_cookies.json`, `data/finetwork_cookies.json` | **Local** |
| **Bitácora Técnica / Historial de Cambios** | `BITACORA.md` (orden cronológico inverso) | **Inmediato** |

---

## 🤖 3. Especialización Multi-Agente (Matriz de Roles)

Para resolver cualquier tarea con el menor gasto de tokens y máxima precisión, adopta el rol correspondiente y activa su skill:

```
                            ┌────────────────────────┐
                            │    AGENTE ORQUESTADOR   │
                            └───────────┬────────────┘
         ┌──────────────────┬───────────┴─────────────┬──────────────────┐
         ▼                  ▼                         ▼                  ▼
┌──────────────────┐┌──────────────────┐    ┌──────────────────┐ ┌──────────────────┐
│  DEVOPS & VPS    ││ TELECOM & CDRs   │    │  CRM & DOWISP    │ │ FACTURACIÓN &    │
│  (vps-deploy)    ││ (maskfundas-tel, │    │  (dowisp-live)   │ │ RECOBROS         │
│                  ││  auditoria-tel)  │    │                  │ │ (crm-facturac.)  │
└──────────────────┘└──────────────────┘    └──────────────────┘ └──────────────────┘
```

### 🔹 Rol 1: DevOps & Operaciones VPS
* **Skill Asociada:** [`vps-deploy`](file:///.agents/skills/vps-deploy/SKILL.md)
* **Comandos Clave:**
  - Diagnóstico 360° (VPS, Mayoristas, DBs, Docker): `python scripts/telecom_ops.py status`
  - Desplegar cambios: `python vps.py sync` (Zero-downtime, no reinicia si solo es frontend/data).
  - Ejecutar en contenedor: `python vps.py exec "<comando>"`
  - Receptor local cookies (puerto 8765): `python scripts/cookie_receiver.py`
  - Ver logs en vivo: `python vps.py logs 50`

### 🔹 Rol 2: CRM & DoWISP Live
* **Skill Asociada:** [`dowisp-live`](file:///.agents/skills/dowisp-live/SKILL.md)
* **Puntos de Entrada:**
  - Consola Web: `https://admin.maskfundas.es/admin/dowisp`
  - Automatización / Python: `from backend.dowisp_connector import get_dowisp_connector`
* **Regla Inviolable:** NUNCA pedir al usuario abrir Chrome ni usar la extensión para DoWISP.

### 🔹 Rol 3: Telecomunicaciones y Mayoristas
* **Skills Asociadas:** [`maskfundas-telefonia`](file:///.agents/skills/maskfundas-telefonia/SKILL.md), [`auditoria-telecom`](file:///.agents/skills/auditoria-telecom/SKILL.md), [`finetwork-api`](.agents/skills/finetwork-api/SKILL.md), [`airenetworks-api`](.agents/skills/airenetworks-api/SKILL.md) y [`lemonvil-api`](.agents/skills/lemonvil-api/SKILL.md) para operaciones y estado del proveedor.
* **Comandos Clave:**
  - Sincronizar CDRs y reconstruir caché: `python vps.py exec "python /app/backend/sync_cron.py"`
  - Auditar líneas huérfanas y fugas: `python backend/cron_anti_fuga.py`
  - Conector nativo SOAP AireNetworks: `from backend.airenetworks_soap import AireNetworksSoapClient`
  - Conector nativo REST Lemonvil: `from backend.lemonvil_api import LemonvilApiClient`
  - Consulta directa sin scraping: buscar en `data/master_cache.json`.
* **Fuentes AireNetworks:** API SOAP oficial (`gestMOVIL_2.php`) para consulta en vivo de PUK/PIN, tarifas, consumos, cortes por impago y tramitaciones. Manuales oficiales en `docs/airenetworks_api/`. **NUNCA cambiar la contraseña de Web Service en GECO** ya que la comparte DoWISP.  
  - **Firma Obligatoria vía SMS (Signaturit):** Toda portabilidad o alta tramitada por API SOAP (`setAltaLineaPortabilidad` / `setAltaLineaNueva`) nace en estado `0 LINEA NO PROCESADA` (bloqueo `0008` de supervisión documental). Para que se lance al Nodo Central de la CNMC / donante, es **estrictamente obligatorio** enviar inmediatamente el documento para firma digital vía SMS (`enviarDocumentoSMS` para `PORTABILIDAD` y `CONTRATO`). Al firmar el cliente desde el enlace de Signaturit, la solicitud pasa automáticamente a `1 PROCESANDO`.
* **Fuentes Lemonvil:** API REST oficial (`https://resmes.lemonvil.com`) para consulta en vivo de PUK/ICC, consumos de datos y voz, tarifas y bloqueos por impago. Manual Swagger en `docs/lemonvil_api/swagger.json`. CDRs detallados vía FTP (`ftp.lemonvil.com`).
* **Fuentes FiNetwork:** API para estado y gestiones del mayorista; CDR SFTP para tráfico detallado. **Toda la facturación al cliente está en DoWISP**. Consultar el [catálogo de la API FiNetwork](.agents/skills/finetwork-api/references/catalogo.md) antes de integrarla.
  - **Firma Obligatoria de Contratos:** Todo pedido tramitado en FiNetwork (`dashboard.finetwork.com/purchases/order`) que quede en estado `Pendiente firma` requiere estampar la firma digital del cliente en la **hoja 2** (sección `FIRMA:` junto a la fecha y aceptación de condiciones) y adjuntarlo vía web/modal para que pase a estado `FIRMADO`. La firma digital del cliente se consulta y extrae desde el repositorio oficial de SAT CRM (`sat.maskfundas.es`, tabla `altas_telefonia`, campo `firma_digital_data`).

### 🔹 Rol 4: Facturación, Morosos y SEPA
* **Skill Asociada:** [`crm-facturacion`](file:///.agents/skills/crm-facturacion/SKILL.md)
* **Comandos Clave:**
  - Sincronizar morosos: `python vps.py exec "python /app/backend/sync_morosos.py"`
  - Consultar impagos: tabla `morosos` en `data/morosos.db`.
  - Regla Crítica: verificar `aplica_iva = True` en contratos peninsulares. Cero envíos de recobro desasistidos.

### 🔹 Rol Transversal: Auto-Documentación y Registro
* **Skill Asociada:** [`auto-documenter`](file:///.agents/skills/auto-documenter/SKILL.md)
* **Objetivo:** Registrar en [`BITACORA.md`](file:///BITACORA.md) cada intervención relevante con formato estructurado para asegurar la continuidad entre sesiones.

---

## 🚫 4. Reglas Inviolables del Proyecto
1. **Tolerancia Cero a Datos Falsos, Simulaciones Engañosas o Estimaciones:** Todo dato debe ser verificado en fuentes reales (CDRs reales o DoWISP). NUNCA dar por completada una acción si no ha sido efectivamente confirmada.
2. **Distinción Estricta entre DoWISP y Mayorista (NUNCA ENGAÑAR):**
   - **DoWISP:** Configuración interna del ISP, contratos, importes de facturación al cliente y ciclo de cobro.
   - **Mayorista (T-Móvil/TMola, AireNetworks, FiNetwork, Lemonvil):** Plataforma externa de provisión y coste mayorista.
   - **REGLA CRÍTICA:** Modificar un contrato o base de datos interna en DoWISP **NO cambia automáticamente la tarifa en el mayorista**. NUNCA afirmar que una tarifa mayorista está cambiada o que un ahorro está consolidado a menos que la orden haya sido formalmente tramitada y confirmada en el panel/API del mayorista. Informar siempre con total precisión: *"Configurado en DoWISP / Pendiente de tramitar en el mayorista"*.
3. **Las 3 Reglas de Oro en Migraciones de Tarifas:**
   - **Regla 1 (Ganar Dinero Siempre):** Todo cambio en el mayorista debe reducir el coste mayorista o aumentar el margen comercial. Nunca migrar una línea si el coste del mayorista sube.
   - **Regla 2 (No Degradar Servicio Jamás):** A un cliente nunca se le asigna una tarifa con menos gigas, minutos o velocidad de los que ya tiene contratados (igual o superior siempre).
   - **Regla 3 (Inviolabilidad de Precios al Cliente):** Al cliente nunca se le altera su precio de cobro en DoWISP (PVP fijo e inalterado).
   - **Regla 4 (Respeto al Consumo Máximo Histórico):** NUNCA poner a un cliente una tarifa con menos gigas de su consumo máximo registrado en los últimos 12 meses.
4. **Cero Fricción en DoWISP:** Siempre autónomo a través de DoWISP Live o `dowisp_connector.py`.
5. **No Reinventar Conectores SSH:** Usar exclusivamente `vps.py`.
6. **Respeto a Producción:** Despliegues protegidos con Zero-Downtime (`/reloading.html`).
7. **Regla de DoblaGigas y AcumulaGigas (AireNetworks y FiNetwork):**
   - El bono DoblaGigas **NUNCA caduca por sí solo** (la fecha visible en el panel mayorista es solo referencial de ciclo/campaña; se renueva perpetuamente y solo se pierde si se altera la tarifa base o cambia la factura de la línea).
   - Los datos acumulables (AcumulaGigas) permiten traspasar el 100% del bono no consumido al mes siguiente.
   - Consecuencia operativa: Una tarifa de 400 GB con acumulación o dobla-gigas permite al cliente disponer de hasta **800 GB reales disponibles**.
