

## Plan: Agregar email de aviso 48hs antes de expiración del trial

Actualmente el sistema envía **un solo aviso** previo a la expiración, controlado por `trial_notice_at` y `trial_notice_sent` en `profiles`. Para agregar un segundo aviso a las 48hs sin romper el existente (24hs), se necesitan nuevos campos y lógica.

### Cambios propuestos

**1. Migración de base de datos — Agregar campos para el segundo aviso**
- Agregar a `profiles`: `trial_notice_48h_at` (timestamptz, nullable) y `trial_notice_48h_sent` (boolean, default false)

**2. Actualizar `src/hooks/useQRCodes.ts` — Calcular fecha del aviso de 48hs**
- Al iniciar el trial, calcular `trial_notice_48h_at` = `trial_expires_at - 2 días` y guardarlo en el profile junto con los campos existentes

**3. Actualizar `supabase/functions/process-trial-expirations/index.ts` — Enviar el email de 48hs**
- Agregar un nuevo Step (entre Step 1 y Step 2 actuales) que:
  - Busque profiles con `trial_notice_48h_at <= now` y `trial_notice_48h_sent = false`
  - Verifique que no tengan suscripción activa
  - Envíe email con asunto "⏰ Tu período de prueba vence en 2 días"
  - Registre en `email_logs` con tipo `trial_48h_notice`
  - Marque `trial_notice_48h_sent = true`

**4. Actualizar `supabase/functions/mercadopago-webhook/index.ts` — Limpiar campos al suscribirse**
- Agregar `trial_notice_48h_at: null, trial_notice_48h_sent: true` al update que se hace cuando el usuario se suscribe

### Detalles técnicos
- El email de 48hs tiene contenido similar al de 24hs pero con "vence en 2 días" en lugar de "está por expirar"
- Si `trial_expire_days` es menor a 3, el aviso de 48hs se omite (coincidiría con o antes del inicio del trial)
- El cron job existente (3 AM UTC) procesa ambos avisos en la misma ejecución

