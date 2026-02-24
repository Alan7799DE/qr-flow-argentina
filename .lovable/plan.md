

# Rediseno visual de las 3 secciones con tarjetas

## Resumen

Las tres secciones (Features, Benefits/Use Cases, FAQ) usan actualmente el mismo patron visual: tarjetas blancas con borde, icono, titulo y descripcion. Esto genera monotonia. El plan es darle a cada seccion una identidad visual distinta manteniendo la coherencia de marca.

## Cambios por seccion

### 1. FeaturesSection - Layout alternado con icono grande destacado

Reemplazar el grid uniforme de 6 tarjetas por un layout tipo "bento grid" asimetrico:
- Las 2 primeras features ocupan media pantalla cada una (2 columnas grandes)
- Las 4 restantes van en un grid de 2x2 debajo, mas compactas
- Las tarjetas grandes tienen el icono mas prominente (48x48 con gradiente), y un borde izquierdo de color primary de 3px
- Las tarjetas chicas son mas minimalistas: sin borde, fondo `muted/50`, icono inline con el titulo
- Se elimina el hover de translate y se usa un hover de borde/color mas sutil

### 2. BenefitsSection - Beneficios como lista horizontal + Casos de uso como tarjetas con fondo de color

**Beneficios (primera mitad):**
- Cambiar de grid de tarjetas a una lista de items horizontales (sin tarjeta)
- Cada item: icono a la izquierda (circulo con gradiente), titulo y descripcion a la derecha
- Layout en 2 columnas en desktop, 1 en mobile
- Sin bordes ni sombras, solo separadores sutiles entre items

**Casos de uso (segunda mitad):**
- Cada tarjeta tiene un fondo de color distinto y suave (variaciones de primary/10, accent/10, success/10, warning/10, etc.)
- El icono es mas grande (40x40) y del mismo color que el fondo pero mas saturado
- Bordes redondeados mas generosos (rounded-3xl)
- Sin borde visible, solo el color de fondo diferencia las tarjetas

### 3. FAQSection - Ya usa accordion (no tarjetas)

El FAQ ya tiene un estilo diferenciado con accordion. Solo se le agrega un toque visual:
- Envolverlo en una tarjeta contenedora con borde sutil y padding generoso
- Agregar un icono decorativo grande y semitransparente de fondo (HelpCircle al 5% opacidad, posicion absoluta)

## Archivos afectados

| Archivo | Accion |
|---------|--------|
| `src/components/landing/FeaturesSection.tsx` | Modificar (bento grid) |
| `src/components/landing/BenefitsSection.tsx` | Modificar (lista + tarjetas con color) |
| `src/components/landing/FAQSection.tsx` | Modificar menor (tarjeta contenedora) |

## Detalles tecnicos

**Bento grid de Features:**
```text
+---------------------------+---------------------------+
|  [icon]                   |  [icon]                   |
|  URLs editables           |  Analytics detallados     |
|  Descripcion larga...     |  Descripcion larga...     |
+---------------------------+---------------------------+
+-----------+-----------+-----------+-----------+
| [i] Desc  | [i] Desc  | [i] UTM   | [i] 99.9% |
|  PNG/SVG  |  Slugs    |  Builder  |  Uptime   |
+-----------+-----------+-----------+-----------+
```
- Primera fila: `grid-cols-1 md:grid-cols-2`, tarjetas con `p-8`, borde izquierdo `border-l-4 border-primary`
- Segunda fila: `grid-cols-2 lg:grid-cols-4`, tarjetas con `p-5`, fondo `bg-muted/50`, sin borde exterior

**Beneficios como lista:**
```text
[o] Editables en cualquier momento     [o] Analytics en tiempo real
    Descripcion...                          Descripcion...
─────────────────────────────────────  ─────────────────────────────
[o] Creacion instantanea               [o] Compatibles con todos...
    Descripcion...                          Descripcion...
```
- Grid `grid-cols-1 md:grid-cols-2`, cada item es un `flex gap-4` con icono + texto
- Separador `border-b border-border/50` en cada item, padding `py-5`

**Casos de uso con colores:**
- Paleta de fondos: `bg-blue-50`, `bg-teal-50`, `bg-orange-50`, `bg-purple-50`, `bg-green-50`, `bg-rose-50` (light mode)
- En dark mode: `dark:bg-blue-950/30`, etc.
- Cada tarjeta `rounded-3xl p-6` sin `border`, solo fondo de color

**FAQ contenedora:**
- Envolver el accordion en `<div className="bg-card rounded-2xl border p-8 relative overflow-hidden">`
- Icono decorativo: `<HelpCircle className="absolute -right-8 -bottom-8 w-48 h-48 text-muted-foreground/5" />`

