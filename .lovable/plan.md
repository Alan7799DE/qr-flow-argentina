

## Problema

El flujo actual usa `sessionStorage` para guardar los datos del QR pendiente. `sessionStorage` es **por pestaña**: cuando el usuario confirma su email y el link de confirmación se abre en otra pestaña (o la misma navega fuera), los datos se pierden. Por eso, al llegar al dashboard, el QR no se crea ni se muestra el diálogo de descarga.

## Solución

Cambiar de `sessionStorage` a `localStorage` para los datos del QR pendiente. `localStorage` persiste entre pestañas y sesiones del navegador.

### Archivos a modificar

1. **`src/components/landing/QRCreatorPublic.tsx`** -- Cambiar `sessionStorage.setItem(...)` → `localStorage.setItem(...)` en `savePendingQRData()`

2. **`src/components/landing/AuthDialog.tsx`** -- En el flujo de signup exitoso (línea 79-81), después del toast, también llamar a `savePendingQRData` (ya se hace antes de abrir el dialog, así que los datos ya están en storage -- no requiere cambio aquí)

3. **`src/pages/dashboard/Dashboard.tsx`** -- Cambiar `sessionStorage.getItem(...)` → `localStorage.getItem(...)` y `sessionStorage.removeItem(...)` → `localStorage.removeItem(...)` en el useEffect de auto-creación (líneas 103-117)

4. **`src/pages/dashboard/CreateQR.tsx`** -- Cambiar `sessionStorage` → `localStorage` en el useEffect que carga datos pendientes (líneas 31-46)

5. **`src/App.tsx`** -- En `OAuthRedirectHandler`, cambiar `sessionStorage` → `localStorage` para `oauth_redirect` (líneas 41-44) por consistencia

### Cambios concretos

- **QRCreatorPublic.tsx**: Reemplazar las 7 llamadas a `sessionStorage.setItem` por `localStorage.setItem` en `savePendingQRData()`
- **Dashboard.tsx**: Reemplazar las 5 llamadas a `sessionStorage.getItem` y 5 a `sessionStorage.removeItem` por `localStorage` equivalentes en el useEffect (líneas 103-117)
- **CreateQR.tsx**: Reemplazar las 10 llamadas a `sessionStorage` por `localStorage` en el useEffect (líneas 31-46)
- **App.tsx**: Reemplazar `sessionStorage` por `localStorage` para `oauth_redirect` (líneas 41-44)

Esto asegura que los datos del QR pendiente sobreviven al cambio de pestaña que ocurre durante la confirmación de email.

