

## Cambio: No deshabilitar botón, mostrar error al tocar

En vez de deshabilitar los botones de guardar/crear cuando la URL es inválida, permitir que el usuario los toque y mostrar el error inline en ese momento.

### Cambios

#### `src/pages/dashboard/CreateQR.tsx`
1. Quitar `!isUrlValid` de la condición `disabled` del botón submit (línea 262) — dejar solo `createQR.isPending || isValidatingUrl`
2. La validación ya se ejecuta en `validate()` y en `handleSubmit` (líneas 82-84 y 100), así que al tocar el botón con URL inválida se mostrará el error inline existente y no se enviará el form

#### `src/pages/dashboard/QRDetail.tsx`
1. Quitar `!urlValidation.valid` de la condición `disabled` del botón "Guardar" (línea 417) — dejar solo `updateQR.isPending || isValidatingUrl`
2. La función `handleSaveUrl` (línea 190) ya valida y muestra el error inline si la URL es inválida, así que el flujo funciona correctamente

#### `src/components/landing/QRCreatorPublic.tsx`
1. En el botón "Descargar QR" del mobile y desktop, actualmente está `disabled={!url}` — cambiar para que nunca esté deshabilitado
2. En `handleDownload`, antes de proceder, validar con `validateDestinationUrl(url)`: si no es válida, mostrar un toast con el mensaje de error pidiendo reingresar la URL

### Lo que NO cambia
- La lógica de validación en `validateDestinationUrl.ts`
- Los mensajes de error inline debajo de los inputs
- El flujo de auth en la landing

