# QR Flow Argentina

Plataforma SaaS de generación y gestión de **códigos QR dinámicos** con analítica de escaneos, planes de suscripción pagos vía **Mercado Pago** y panel de administración. Pensada para el mercado argentino/LATAM.

> El frontend fue inicialmente prototipado con [Lovable](https://lovable.dev) y luego desarrollado e iterado directamente en código (lógica de negocio, backend serverless, seguridad y pagos).

## ¿Qué hace?

- **QR dinámicos**: el destino de un QR se puede editar sin reimprimir el código (el QR apunta a una URL corta propia que redirige al destino real).
- **Personalización visual** de cada QR (colores, estilos de punto, logo) con `qr-code-styling`.
- **Analítica de escaneos**: estadísticas por dispositivo, ubicación y tiempo, con gráficos (`recharts`).
- **Planes y suscripciones** recurrentes con **Mercado Pago** (alta, cobro, cancelación, webhooks firmados).
- **Panel de administración**: gestión de usuarios, planes, QRs, webhooks y usuarios eliminados.
- **Papelera con expiración**: soft-delete de QRs con limpieza automática programada.
- **Emails transaccionales** (bienvenida, fin de período de prueba, etc.) vía **Resend**, con cola propia y manejo de bajas (unsubscribe).

## Stack técnico

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI primitives)
- React Router, React Hook Form + Zod (validación), TanStack Query
- Vitest + Testing Library para tests de componentes

**Backend / Infraestructura**
- **Supabase** como backend completo:
  - Postgres con **Row Level Security (RLS)** en todas las tablas sensibles
  - Auth (registro, login, recuperación de contraseña)
  - **38 migraciones SQL** versionadas (`supabase/migrations`), incluyendo infraestructura de cola de emails con vault de secretos
  - **16 Edge Functions** en Deno/TypeScript (`supabase/functions`) para toda la lógica server-side

**Pagos**
- Integración con **Mercado Pago** (suscripciones recurrentes / preapproval):
  - `create-subscription`, `cancel-subscription`, `check-pending-subscriptions`
  - `mercadopago-webhook` con **verificación de firma HMAC-SHA256** de las notificaciones (siguiendo el esquema oficial de Mercado Pago)

**Email**
- **Resend** para envío transaccional, con cola en Postgres y manejo de tokens de baja (`process-email-queue`, `process-trial-expirations`, `send-first-qr-email`)

## Edge Functions (Deno)

| Función | Propósito |
|---|---|
| `redirect` | Resuelve el QR corto y redirige al destino, registrando el escaneo |
| `validate-url` / `validate-email-domain` | Validación server-side de URLs y dominios de email |
| `create-subscription` / `cancel-subscription` / `check-pending-subscriptions` | Ciclo de vida de suscripciones con Mercado Pago |
| `mercadopago-webhook` | Recepción y verificación de notificaciones de pago |
| `admin-users` / `verify-admin` | Gestión y verificación de rol admin (JWT + chequeo de rol en DB) |
| `process-email-queue` / `process-trial-expirations` / `send-first-qr-email` | Envío de emails transaccionales vía Resend |
| `aggregate-scans` | Agregación periódica de estadísticas de escaneos |
| `cleanup-trash` | Limpieza automática de QRs en papelera |
| `delete-user` | Baja de cuenta de usuario |

## Seguridad

- Autenticación basada en JWT de Supabase, validada en cada Edge Function sensible.
- Roles de administrador verificados contra la base de datos (no hardcodeados ni asumidos por el JWT).
- Webhooks de Mercado Pago verificados criptográficamente (HMAC) antes de procesar cualquier notificación.
- Secretos de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `RESEND_API_KEY`) gestionados como variables de entorno de las Edge Functions, nunca expuestos en el cliente.
- Rate limiting en intentos de autenticación (`useAuthRateLimit`) y validación de fuerza de contraseña.

## Estructura del proyecto

```
src/
  components/
    landing/     # Landing page pública (hero, pricing, FAQ, etc.)
    dashboard/   # Componentes del panel de usuario
    admin/       # Componentes del panel de administración
    ui/          # Design system (shadcn/ui)
  pages/
    dashboard/   # Crear QR, estadísticas, facturación, papelera, ajustes
    admin/       # Usuarios, planes, QRs, webhooks
  hooks/         # Lógica de datos y estado (QRs, suscripción, límites, stats)
  lib/           # Validaciones y utilidades compartidas

supabase/
  functions/     # Edge Functions (backend serverless)
  migrations/    # Historial versionado del esquema de base de datos
```

## Desarrollo local

Requiere Node.js.

```bash
git clone <URL_DEL_REPO>
cd qr-flow-argentina
npm install
npm run dev
```

Variables de entorno necesarias (ver `.env`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Otros scripts disponibles:

```bash
npm run build       # build de producción
npm run lint         # linting
npm run test         # tests con Vitest
```

## Despliegue

El frontend se despliega como sitio estático (build de Vite); el backend corre íntegramente en Supabase (Postgres + Edge Functions). Las migraciones en `supabase/migrations` definen el esquema de forma reproducible.
