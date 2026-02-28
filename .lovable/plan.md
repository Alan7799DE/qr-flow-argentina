

## Eliminar rate limiting y limpiar badge "Pendiente"

### Cambios

**1. `supabase/functions/redirect/index.ts`**
- Eliminar constantes `RATE_LIMIT_WINDOW_MINUTES` y `RATE_LIMIT_MAX_SCANS` (líneas 9-10)
- Eliminar función `hashIP()` completa (líneas 37-49)
- Eliminar variables `clientIP` e `ipHash` (líneas 106-108)
- Eliminar query de conteo para rate limiting (líneas 110-124)
- Eliminar condicional `isRateLimited` y aplanar la lógica (líneas 126-148): siempre registrar el scan sin condiciones
- En el insert de `qr_scan_events`, poner `ip_hash: null`

**2. `src/pages/admin/AdminUsers.tsx`** (líneas 127-129)
- Eliminar la rama `sub?.status === "pending"` con el badge "Pendiente"
- Quedan solo dos estados: "Activo" o "Sin plan"

