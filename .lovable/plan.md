

## Rediseño mobile del Hero — Layout estilo qr.io

### Concepto

En mobile, reorganizar el `QRCreatorPublic` para que el QR preview esté arriba y los pasos 1/2 se manejen como tabs debajo (similar a la referencia de qr.io), manteniendo la estética actual de QRapido. El título y subtítulo del hero se mantienen visibles arriba de todo.

En desktop (`lg:`), no se cambia nada — se mantiene el layout actual de dos columnas.

### Layout mobile propuesto

```text
┌──────────────────────────┐
│   Creá tu código QR      │  ← título + subtítulo (ya existe en HeroSection)
│   Generá QRs dinámicos...│
├──────────────────────────┤
│  Vista previa del QR     │  ← QR preview (arriba en mobile)
│       ┌──────────┐       │
│       │  QR Code │       │
│       └──────────┘       │
├──────────────────────────┤
│ [1 Contenido] [2 Diseño] │  ← tabs (solo mobile)
├──────────────────────────┤
│  (contenido del tab      │  ← URL input o color/dot style
│   activo)                │
├──────────────────────────┤
│  [  Descargar QR  ]      │  ← botón siempre visible
└──────────────────────────┘
```

### Cambios

#### `src/components/landing/QRCreatorPublic.tsx`

1. Agregar estado `activeTab: "content" | "design"` (default `"content"`)

2. **Mobile layout** (`isMobile`): Reestructurar el orden dentro del card:
   - **QR Preview** primero (mover arriba, con label "Vista previa del código QR")
   - **Tab bar** con dos botones: "1 Contenido" y "2 Diseño" — estilizados como pills/chips con el badge de step, tab activo con bg-primary/10 y texto primary, inactivo con texto muted
   - **Tab content**: si tab es "content" mostrar el input de URL + UTM builder; si tab es "design" mostrar color picker + dot style selector
   - **Botón Descargar** siempre al final, fuera del área de tabs
   - Eliminar los `StepBadge` y headers separados de Step 1/2/3 en mobile — se reemplazan por los tabs
   - Eliminar el `Separator` entre steps en mobile

3. **Desktop layout** (`!isMobile`): Sin cambios — mantener el grid de dos columnas con Steps 1, 2 a la izquierda y Step 3 (preview + download) a la derecha

4. Reducir el tamaño del QR preview en mobile a `size={220}` y `max-w-[240px]` para que ocupe menos espacio vertical

#### `src/components/landing/HeroSection.tsx`

5. En mobile, reducir el `mb-8` del heading a `mb-4` y el `pt-24` a `pt-20` para ganar espacio vertical

### Lo que NO cambia
- Desktop layout (dos columnas)
- Lógica de auth, download, UTM, session storage
- Estilos del QR preview (bordes, shadow)
- Ningún otro archivo

