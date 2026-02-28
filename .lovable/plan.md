

## Eliminar el estado "pendiente" de suscripciones

### Análisis

Es 100% viable. El `external_reference` que se envía a Mercado Pago ya contiene `user_id` y `plan_id`, así que el webhook tiene toda la info necesaria para crear la suscripción desde cero cuando MP confirme el pago.

### Cambios

**1. `create-subscription/index.ts`** — Simplificar drásticamente
- Ya NO crear/actualizar registro en tabla `subscriptions`
- Solo crear el preapproval en MP y devolver el `init_point`
- Eliminar la lógica de cancelar preapprovals previos pendientes (ya no existirán)
- El usuario siempre puede volver a hacer clic en "Elegir plan" sin problemas

**2. `mercadopago-webhook/index.ts`** — Ya maneja creación (líneas 330-346)
- Ya tiene lógica para insertar si no existe suscripción (`else` en línea 330)
- Solo ajustar: si el status de MP es `pending`, ignorar (no crear registro). Solo crear/actualizar cuando sea `authorized`, `paused`, o `cancelled`

**3. Eliminar `cleanup-pending-subscriptions/`** — Ya no es necesario
- Borrar la edge function completa
- Eliminar el cron job de la base de datos
- Eliminar entrada en `supabase/config.toml`

**4. Eliminar `check-subscription-status/`** — Ya no es necesario
- El botón "Verificar estado" del estado pendiente ya no tiene sentido
- Eliminar la edge function
- Eliminar entrada en `supabase/config.toml`

**5. `src/pages/dashboard/Billing.tsx`** — Limpiar UI
- Eliminar la sección de "Suscripción pendiente" (líneas 202-232)
- Eliminar `handleCheckSubscriptionStatus` y su estado
- Eliminar lógica de `isPendingPlan` en las cards de planes
- El botón siempre estará habilitado si no hay suscripción activa

**6. `src/hooks/useSubscription.ts`** — Quitar `pending` del tipo de status

**7. SQL** — Eliminar el cron job existente
```sql
SELECT cron.unschedule('cleanup-pending-subscriptions');
```

### Flujo resultante

1. Usuario hace clic en "Elegir plan" → se crea preapproval en MP → redirect a MP
2. Si el usuario cierra la ventana de MP → no pasa nada, no hay registro pendiente
3. Si paga → webhook de MP llega → se crea la suscripción como `active`
4. Si vuelve a hacer clic en otro plan → se crea otro preapproval en MP (el anterior queda sin efecto en MP automáticamente al no ser pagado)

