

## Plan: Mover estadísticas de escaneos a una pestaña independiente

### Cambios propuestos

**1. Crear nueva página `src/pages/dashboard/Stats.tsx`**
- Página con título "Estadísticas"
- Dropdown (`Select`) que lista todos los QR codes del usuario (usando `useQRCodes`)
- Al seleccionar un QR, muestra el gráfico de escaneos de los últimos 7 días (reutilizando `useScanStats`)
- Si no hay QRs, mostrar estado vacío
- Pre-seleccionar el primer QR por defecto

**2. Agregar ruta en `src/App.tsx`**
- Nueva ruta: `/dashboard/stats` → `<Stats />`

**3. Agregar item en sidebar `src/components/dashboard/DashboardLayout.tsx`**
- Nuevo item de navegación "Estadísticas" con icono `BarChart3`, entre "Crear QR" y "Facturación"

**4. Eliminar sección de estadísticas de `src/pages/dashboard/QRDetail.tsx`**
- Remover el bloque del gráfico de escaneos (líneas 436-460)
- Remover import de `useScanStats` y las variables `stats`/`loadingStats`

### Detalles técnicos
- El dropdown usa el componente `Select` existente, mostrando nombre del QR + cantidad de escaneos
- El hook `useScanStats` se reutiliza sin cambios
- El hook `useQRCodes` ya provee la lista de QRs necesaria para el dropdown

