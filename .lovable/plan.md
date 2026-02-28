

## Plan: Agregar edición de color y forma de QR codes

### Contexto actual
- Los QR se generan con la librería `qrcode` (npm), que solo soporta color pero **no** soporta estilos de puntos/esquinas (formas).
- La tabla `qr_codes` ya tiene columna `color` pero no tiene columna para forma/estilo.
- En las tarjetas del dashboard hay un botón "Editar color y forma" que solo redirige a QRDetail sin funcionalidad específica.

### Cambios propuestos

**1. Migración de base de datos**
- Agregar columna `dot_style` (text, default `'square'`) a `qr_codes` para guardar el estilo de los puntos del QR.
- Valores posibles: `square`, `dots`, `rounded`, `classy`, `classy-rounded`, `extra-rounded`.

**2. Reemplazar librería de QR**
- Instalar `qr-code-styling` (soporta dot styles, corner styles, colores, logos).
- Reemplazar el uso de `qrcode` por `qr-code-styling` en:
  - `QRDetail.tsx` (preview y descarga)
  - `Dashboard.tsx` (preview en tarjetas via `QRPreviewImage`)
  - `DownloadQRDialog.tsx` (descarga en formatos PNG/SVG/JPG)
  - `CreateQR.tsx` (preview al crear)
  - `QRCreatorPublic.tsx` (preview público en landing)

**3. Componente de edición de color y forma en QRDetail**
- Agregar una nueva sección "Personalización" en QRDetail con:
  - **Color picker** (reutilizando el patrón de preset colors del landing + input hex)
  - **Selector de forma** con previews visuales de cada estilo (square, dots, rounded, classy, classy-rounded, extra-rounded)
  - Botón "Guardar cambios" que llama a `useUpdateQR` con `color` y `dot_style`
  - Preview en tiempo real del QR con los cambios aplicados

**4. Actualizar hooks y tipos**
- Agregar `dot_style` a la interfaz `QRCode` y `UpdateQRData` en `useQRCodes.ts`.
- Pasar `dot_style` en las funciones de creación y actualización.

**5. Actualizar CreateQR y QRCreatorPublic**
- Agregar selector de forma en el formulario de creación.
- Incluir `dot_style` en el payload de creación.

**6. Actualizar botón "Editar color y forma" en Dashboard**
- Hacer que el botón lleve directamente a la sección de personalización en QRDetail (con hash o scroll).

### Detalles técnicos

La librería `qr-code-styling` genera QR codes con la siguiente API:
```typescript
const qrCode = new QRCodeStyling({
  width: 300,
  height: 300,
  data: "https://...",
  dotsOptions: { type: "rounded", color: "#000000" },
  cornersSquareOptions: { type: "extra-rounded" },
  cornersDotOptions: { type: "dot" },
});
```

Se creará un componente wrapper `StyledQRCode` que encapsule la lógica de renderizado con `qr-code-styling`, recibiendo `url`, `color`, `dotStyle` y `size` como props, y que se reutilice en todas las vistas (dashboard cards, detail, create, download).

