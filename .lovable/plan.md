

## Plan: Agregación diaria de escaneos con tabla resumen

### Concepto

Cada escaneo se registra en `qr_scan_events` como hasta ahora. Un cron diario (ej: 2 AM UTC) cuenta los escaneos del día anterior por QR, los escribe en una nueva tabla `qr_daily_stats`, actualiza `total_scans_cached` en `qr_codes`, y luego borra los registros procesados de `qr_scan_events`.

### Cambios

**1. Migración SQL — nueva tabla `qr_daily_stats`**
- Columnas: `id` (uuid), `qr_code_id` (uuid FK → qr_codes), `scan_date` (date), `scan_count` (integer), `created_at` (timestamptz)
- Unique constraint en `(qr_code_id, scan_date)` para evitar duplicados
- RLS: SELECT para dueños del QR y admins, INSERT/UPDATE/DELETE solo admins
- Índice en `(qr_code_id, scan_date)`

**2. Nueva Edge Function `aggregate-scans`**
- Protegida con `CRON_SECRET`
- Agrupa `qr_scan_events` por `qr_code_id` y `DATE(scanned_at)` para todos los registros con `scanned_at < fecha de hoy` (solo días completos)
- Upsert en `qr_daily_stats` (por si se ejecuta dos veces)
- Recalcula `total_scans_cached` = suma de `scan_count` en `qr_daily_stats` para cada QR afectado
- Actualiza `last_scan_at` en `qr_codes`
- Borra de `qr_scan_events` solo los registros ya agregados (anteriores a hoy)

**3. Simplificar `redirect/index.ts`**
- Eliminar el UPDATE a `qr_codes.total_scans_cached` y `last_scan_at` (el cron se encarga)
- Solo hacer INSERT en `qr_scan_events`

**4. Registrar cron job con `pg_cron`**
- Ejecutar `aggregate-scans` diariamente a las 2 AM UTC

**5. Registrar función en `supabase/config.toml`**
- `[functions.aggregate-scans]` con `verify_jwt = false`

**6. Actualizar `useScanStats.ts`**
- `useScanStats(qrCodeId)`: leer de `qr_daily_stats` los últimos 30 días para armar `dailyScans[]` y calcular 24h/7d/14d/21d/30d. Total desde `total_scans_cached`
- `useAllQRStats()`: usar `total_scans_cached` de `qr_codes` directamente, sin consultar `qr_scan_events`

**7. Actualizar `QRDetail.tsx`**
- Mantener las stat cards y el gráfico de barras, ahora alimentados desde `qr_daily_stats`
- Agregar texto "Estadísticas actualizadas diariamente" debajo del gráfico

### Detalle técnico

```text
FLUJO:
  Cada escaneo → INSERT qr_scan_events (solo)

  CRON 2AM UTC:
  aggregate-scans →
    1. SELECT qr_code_id, DATE(scanned_at), COUNT(*) FROM qr_scan_events WHERE scanned_at < today GROUP BY 1,2
    2. UPSERT qr_daily_stats
    3. UPDATE qr_codes SET total_scans_cached = SUM(qr_daily_stats.scan_count)
    4. DELETE FROM qr_scan_events WHERE scanned_at < today
```

Archivos a crear/modificar:
- Migración SQL (nueva tabla + índices + RLS)
- `supabase/functions/aggregate-scans/index.ts` (nueva)
- `supabase/functions/redirect/index.ts` (simplificar)
- `src/hooks/useScanStats.ts` (leer de `qr_daily_stats`)
- `src/pages/dashboard/QRDetail.tsx` (nota de actualización diaria)
- SQL insert para crear el cron job con `pg_cron`

