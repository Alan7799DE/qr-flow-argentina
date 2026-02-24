

# Rediseno del Hero con QR Creator como protagonista (estilo QR.io)

## Resumen

Redisenar el `HeroSection` y el `QRCreatorPublic` inspirandose en la estetica de QR.io: el creador de QR ocupa practicamente toda la pantalla como elemento principal, con un layout de dos paneles (formulario a la izquierda, preview + descarga a la derecha), pasos numerados, y el titulo/subtitulo reducidos a un encabezado compacto arriba del formulario. Se mantienen los colores azul/turquesa y la tipografia actual.

## Cambios

### 1. `src/components/landing/HeroSection.tsx` - Reestructurar layout

- Eliminar el badge superior ("La forma mas facil..."), el h1 grande, el subtitulo largo, el boton "Ver precios" y el bloque de stats
- Reemplazar por un encabezado compacto arriba del creador: titulo corto (ej: "Crea tu codigo QR") y subtitulo de una linea
- El componente `<QRCreatorPublic />` ocupa todo el ancho disponible justo debajo, siendo lo primero visible tras el navbar
- Reducir el `pt` para que el creador aparezca lo mas arriba posible (justo debajo del navbar fijo de 64px)
- Mover los stats debajo del creador o eliminarlos del hero (pasarlos a la seccion de features)

### 2. `src/components/landing/QRCreatorPublic.tsx` - Rediseno estilo QR.io

Redisenar completamente el layout interno con pasos numerados y dos paneles:

**Panel izquierdo (formulario):**
- **Paso 1 - "Completa el contenido"**: badge numerado verde/primary con el numero "1", titulo del paso, input de URL grande con placeholder "https://"
- **Paso 2 - "Disena tu codigo QR"**: badge "2", selector de colores con los preset circles actuales + picker custom + input hex
- **UTM Builder**: colapsable debajo del paso 2, con la misma mecanica actual

**Panel derecho (preview + descarga):**
- **Paso 3 - "Descarga tu QR"**: badge "3", titulo
- Preview del QR centrado en una tarjeta con borde sutil (fondo blanco, bordes redondeados, sin sombra excesiva, similar a QR.io)
- Boton "Descargar codigo QR" debajo del preview, full-width dentro del panel derecho, usando variante `hero` con gradiente

**Estetica general:**
- Tarjeta contenedora con fondo blanco solido (no glass), bordes suaves, sombra sutil (`shadow-lg`)
- Los badges de paso son circulos pequenos con el numero en color primary sobre fondo primary/10
- Separadores sutiles entre pasos (linea horizontal fina)
- El layout es `grid grid-cols-1 lg:grid-cols-[1fr_380px]` para que el panel derecho tenga ancho fijo
- En mobile: el preview se mueve arriba del formulario

### 3. Archivos afectados

| Archivo | Accion |
|---------|--------|
| `src/components/landing/HeroSection.tsx` | Modificar (simplificar hero, QR creator primero) |
| `src/components/landing/QRCreatorPublic.tsx` | Modificar (rediseno con pasos numerados, layout 2 paneles) |

### Detalles de implementacion

**Badge de paso numerado (componente inline):**
```text
[1] Completa el contenido
```
Un circulo de 28x28px con el numero, color de fondo `bg-primary/10`, texto `text-primary`, font-bold. Titulo del paso en `text-lg font-semibold`.

**Layout del QR Creator:**
```text
+------------------------------------------+------------------+
|  [1] Completa el contenido               | [3] Descarga     |
|  [input URL .........................]   |                  |
|  ─────────────────────────────────────   |  +------------+  |
|  [2] Disena tu codigo QR                 |  |            |  |
|  (o)(o)(o)(o)(o) [picker] [#hex]         |  |   QR IMG   |  |
|  ─────────────────────────────────────   |  |            |  |
|  > UTM Builder (colapsable)              |  +------------+  |
|                                          |                  |
|                                          | [Descargar QR]   |
+------------------------------------------+------------------+
```

**HeroSection simplificado:**
```text
[Navbar fijo]
                    Crea tu codigo QR
         Genera QRs dinamicos, editables y con analytics
+-------------------------------------------------------+
|              QR Creator (layout 2 paneles)             |
+-------------------------------------------------------+
```

No se modifica ninguna logica de negocio (download, auth check, sessionStorage, UTM builder). Solo cambia la estructura visual y el orden de los elementos.

