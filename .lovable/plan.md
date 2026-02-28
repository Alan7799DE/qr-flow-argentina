

## Plan: Eliminar la pestaña de Estadísticas

### Cambios:

1. **`src/components/dashboard/DashboardLayout.tsx`** — Eliminar la entrada `{ icon: BarChart3, label: "Estadísticas", path: "/dashboard/stats" }` del array `navItems` y el import de `BarChart3`.

2. **`src/App.tsx`** — Eliminar la ruta `<Route path="stats" element={<Stats />} />` y el import de `Stats`.

3. **Eliminar archivos**:
   - `src/pages/dashboard/Stats.tsx`
   - `src/hooks/useScanStats.ts` → Solo si `useAllQRStats` no se usa en otro lado (verificar primero; `useScanStats` se usa en `QRDetail.tsx` así que el archivo se mantiene, solo se elimina `useAllQRStats`).

