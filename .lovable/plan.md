
# Creador de QR interactivo en la landing page

## Resumen

Reemplazar el mockup estatico del hero por un creador de QR funcional y visualmente atractivo. El visitante podra configurar su QR (URL, color, UTM) y ver la vista previa en tiempo real. Al clickear "Descargar QR", si no esta logueado se le pide registrarse, guardando los datos para recuperarlos post-login.

## Cambios

### 1. Nuevo componente: `src/components/landing/QRCreatorPublic.tsx`

Formulario de creacion de QR con estetica premium para la landing:

- **Layout**: Dos columnas en desktop (formulario a la izquierda, preview a la derecha), una columna en mobile (preview arriba, formulario abajo)
- **Campos**: URL de destino (con icono de link), selector de color (color picker + hex input), UTM Builder colapsable (source, medium, campaign)
- **Vista previa**: QR generado en tiempo real con la libreria `qrcode` (ya instalada), dentro de una tarjeta con fondo blanco, bordes redondeados y sombra glow animada
- **Boton "Descargar QR"**: Gradiente con efecto hover. Al clickear:
  - Verifica sesion con `supabase.auth.getUser()`
  - Si logueado: genera imagen PNG 1024px y dispara descarga
  - Si no logueado: guarda datos en `sessionStorage` (`pending_qr_*`) y redirige a `/auth?mode=signup&redirect=/dashboard/create`
- **Estetica**: Tarjeta con `glass` + `shadow-xl`, inputs con estilo elevado, transiciones suaves, badge de "Probalo gratis" arriba del formulario

### 2. Modificar `src/components/landing/HeroSection.tsx`

- Eliminar el bloque "Dashboard Preview Card" (lineas 76-120 aprox) con el mockup de analytics
- En su lugar, renderizar `<QRCreatorPublic />`
- Mantener: badge superior, headline, subheadline y stats
- Simplificar CTAs: eliminar el boton "Empezar gratis" (ahora el CTA es el formulario), mantener "Ver precios"
- Eliminar las decoraciones flotantes (ya no hacen falta con el nuevo componente)

### 3. Modificar `src/pages/Auth.tsx`

- Leer el parametro `redirect` de la URL (`searchParams.get("redirect")`)
- Post-login, redirigir a `redirect` en vez de siempre a `/dashboard`
- Cambiar las lineas 36 y 43 donde hace `navigate("/dashboard")` para usar el redirect

### 4. Modificar `src/pages/dashboard/CreateQR.tsx`

- Al montar, leer `sessionStorage` para las keys `pending_qr_url`, `pending_qr_color`, `pending_qr_utm_source`, `pending_qr_utm_medium`, `pending_qr_utm_campaign`
- Si existen, pre-cargar los campos del formulario con esos valores
- Limpiar el `sessionStorage` despues de cargar
- Auto-generar un nombre basado en el dominio de la URL (ej: "QR - tusitio.com")

### 5. Estetica del creador publico (detalles de diseno)

- Tarjeta principal: `bg-card/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl` (estilo glass)
- Preview del QR: fondo blanco puro con padding generoso, borde sutil, y `shadow-glow` cuando hay un QR generado
- Cuando no hay URL: placeholder con icono QR grande semitransparente y texto "Ingresa una URL para ver tu QR"
- Campo URL: tamano mas grande que lo normal (`h-12`), con icono de link integrado
- Color picker: presentado como circulos de colores predefinidos (negro, azul, rojo, verde, violeta) + picker custom
- UTM Builder: colapsable con animacion suave, separado visualmente con borde superior
- Boton descargar: full-width, variante `hero` (gradiente), tamano `xl`, con icono de descarga
- Animaciones: el QR aparece con fade-in al generarse, la tarjeta tiene hover sutil

## Flujo del usuario

```text
Landing page -> Ve el creador de QR integrado en el hero
    |
    v
Ingresa URL -> Ve preview del QR en tiempo real
    |
    v
Clickea "Descargar QR"
    |
    +-- Logueado? --> Descarga PNG directo
    |
    +-- No logueado? --> sessionStorage + redirect a /auth?mode=signup
                         --> Post-login: /dashboard/create con datos precargados
```

## Archivos afectados

| Archivo | Accion |
|---------|--------|
| `src/components/landing/QRCreatorPublic.tsx` | Crear (nuevo) |
| `src/components/landing/HeroSection.tsx` | Modificar (reemplazar mockup por componente) |
| `src/pages/Auth.tsx` | Modificar (soporte redirect post-login) |
| `src/pages/dashboard/CreateQR.tsx` | Modificar (cargar datos de sessionStorage) |
