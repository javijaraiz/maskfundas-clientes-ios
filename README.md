# 📱 MásKFundas: Portal de Clientes, Telecomunicaciones y Centro de Mando

Sistema integral de gestión de telecomunicaciones, facturación, auditoría mayorista y portal de clientes para el operador **MásKFundas** (MásGigas / Telefonía Plasencia).

---

## 🌐 Servicios y URLs en Producción
* **Portal de Clientes:** [`https://clientes.maskfundas.es`](https://clientes.maskfundas.es)
  - Consulta de consumos en tiempo real (datos vs. restantes con gráficos circulares interactivos).
  - Consulta instantánea de códigos **PIN y PUK**.
  - Descarga y visualización de facturas oficiales emitidas por DoWISP.
  - Acceso seguro mediante verificación por WhatsApp / OTP.
* **Consola de Administración:** [`https://admin.maskfundas.es`](https://admin.maskfundas.es)
  - Dashboard general de líneas, clientes, consumo y evolución mensual.
  - Auditoría preventiva de sobrecostes (SMS, roaming, llamadas especiales).
  - Panel de morosos e impagos SEPA Norma 19.
  - Gestor de líneas huérfanas y monitor anti-fuga de margen.
* **DoWISP Live (Consola Embebida):** [`https://admin.maskfundas.es/admin/dowisp`](https://admin.maskfundas.es/admin/dowisp)
  - Acceso stealth directo a DoWISP con proxy reverso y sesión persistente inyectada (cero extensiones o navegadores externos requeridos).

---

## 🏗️ Infraestructura y Arquitectura
* **VPS Host:** Debian en `93.93.115.93`.
* **Contenedor Docker:** `portal-clientes` (FastAPI + Uvicorn en puerto `8085`).
* **Servidor Web Host:** Apache 2.4 con Reverse Proxy y protección Zero-Downtime (`/reloading.html`).
* **Puente Proxy SSH:** Servidor Ionos (`212.227.104.74`) para enlace FTP con T-Móvil.
* **Bases de Datos & Caché:**
  - `data/master_cache.json`: Caché consolidada de 444 líneas (<50ms).
  - `data/portal_master.db`: SQLite con índice de texto completo FTS5 para clientes y censo.
  - `data/morosos.db`: SQLite con historial de recibos devueltos y deudas vivas.

---

## 📡 Mayoristas Integrados (4)
1. **AireNetworks (Red Movistar):** SFTP automatizado en puerto `65501` + extractor GECO.
2. **FiNetwork (Red Vodafone):** SFTP `ftp.finetwork.com` + sincronización histórica.
3. **T-Móvil (Red MasOrange):** Enlace FTP `5.134.36.100` a través del túnel Ionos.
4. **Lemonvil (Red Orange):** Conector FTP `ftp.lemonvil.com` + auditoría de bonos.

---

## 🚀 Estructura del Repositorio

```
clientes.maskfundas.es/
├── backend/                  # Núcleo de servicios, conectores y APIs
│   ├── server.py             # Servidor de producción FastAPI
│   ├── sync_cron.py          # Motor de sincronización paralela de CDRs (09:00 y 16:00)
│   ├── dowisp_connector.py   # Conector nativo blindado a DoWISP (sesión 14 días)
│   ├── tmovil_bridge.py      # Puente SSH delta incremental para T-Móvil
│   ├── sync_finetwork_sftp.py# Conector SFTP para FiNetwork
│   ├── sync_morosos.py       # Sincronizador de recibos devueltos a SQLite
│   ├── sync_tarifas_luz.py   # Monitor matinal de tarifas eléctricas (Naturgy / Gana Energía)
│   ├── auditoria_manager.py  # Clasificador contable inteligente de líneas
│   ├── cron_anti_fuga.py     # Monitor semanal de líneas con tráfico no facturadas
│   ├── cron_alerta_sobreconsumo.py # Alertas automáticas de excesos > 5,00 €
│   ├── mail_sender.py        # Motor de correo corporativo SMTP
│   └── master_db.py          # Gestor de base de datos SQLite y FTS5
├── frontend/                 # Interfaz web SPA mobile-first (clientes y administración)
├── data/                     # Datos persistentes, cachés y bases de datos locales
│   ├── master_cache.json     # Caché maestra de líneas y consumos en tiempo real
│   ├── portal_master.db      # Base de datos SQLite del portal
│   └── morosos.db            # Base de datos SQLite de impagos
├── docs/                     # Documentación monográfica y auditorías de seguridad
├── scratch/                  # Herramientas operativas directas
│   ├── fast_lookup.py        # Consulta instantánea (<50ms) por teléfono o DNI
│   ├── run_vps_script.py     # Ejecutor remoto en contenedor Docker del VPS
│   └── _archivo/             # Histórico de scripts y tests antiguos archivados
├── deploy/                   # Configuraciones de servidor, Apache y servicios systemd
├── .agents/skills/           # Habilidades multi-agente especializadas
│   ├── auto-documenter/      # Protocolo de mantenimiento de bitácora
│   ├── vps-deploy/           # Despliegues ultrarrápidos con vps.py
│   ├── dowisp-live/          # Operaciones en DoWISP Live
│   ├── maskfundas-telefonia/ # Consultas y políticas de roaming/tarifas
│   └── crm-facturacion/      # Gestión de facturas Tier-1 y morosos
├── BITACORA.md               # Historial cronológico de cambios y decisiones técnicas
├── DOCUMENTACION_PROCESOS_Y_CRONS.md # Mapa de tareas programadas del VPS
├── AGENTS.md                 # Guía maestra de arquitectura para IA y desarrolladores
├── vps.py                    # Herramienta de sincronización y despliegue diferencial
└── config.py                 # Configuración de variables de entorno y credenciales
```

---

## 🛠️ Herramientas de Uso Diario

### 1. Despliegue al VPS (Zero-Downtime)
```bash
python vps.py sync           # Sube cambios incrementales por hash MD5 (<1s)
python vps.py logs 50        # Ver últimos logs del contenedor
python vps.py exec "<cmd>"   # Ejecutar comando dentro del contenedor Docker
```

### 2. Consulta Ultrarrápida de una Línea o Cliente (<50ms)
```bash
python scratch/fast_lookup.py 618754148
python scratch/fast_lookup.py 12345678A
```

### 3. Registro en Bitácora
Cada cambio o intervención de calado debe documentarse en [`BITACORA.md`](file:///BITACORA.md) según el protocolo de [`.agents/skills/auto-documenter/SKILL.md`](file:///.agents/skills/auto-documenter/SKILL.md).
