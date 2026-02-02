import { useState } from "react";
import { useAdminPlans } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Save, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_ars: number;
  qr_limit: number;
  retention_days: number;
  has_logo_customization: boolean;
  has_api_access: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function AdminPlans() {
  const { data: plans, isLoading } = useAdminPlans();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = (plan: Plan) => {
    setEditingPlan({ ...plan });
  };

  const handleCancel = () => {
    setEditingPlan(null);
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("plans")
        .update({
          name: editingPlan.name,
          price_ars: editingPlan.price_ars,
          qr_limit: editingPlan.qr_limit,
          retention_days: editingPlan.retention_days,
          has_logo_customization: editingPlan.has_logo_customization,
          has_api_access: editingPlan.has_api_access,
          is_active: editingPlan.is_active,
          sort_order: editingPlan.sort_order,
        })
        .eq("id", editingPlan.id);

      if (error) throw error;

      toast.success("Plan actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setEditingPlan(null);
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Error al actualizar el plan");
    } finally {
      setSaving(false);
    }
  };

  const updateEditingPlan = (field: keyof Plan, value: string | number | boolean) => {
    if (!editingPlan) return;
    setEditingPlan({ ...editingPlan, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Planes</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de planes y precios
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans?.map((plan) => {
            const isEditing = editingPlan?.id === plan.id;
            const displayPlan = isEditing ? editingPlan : plan;

            return (
              <Card
                key={plan.id}
                className={`relative ${!displayPlan.is_active ? "opacity-60" : ""}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {isEditing ? (
                        <Input
                          value={displayPlan.name}
                          onChange={(e) => updateEditingPlan("name", e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        displayPlan.name
                      )}
                    </div>
                    {!displayPlan.is_active && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Inactivo</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price */}
                  <div>
                    <Label className="text-muted-foreground">Precio (ARS)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={displayPlan.price_ars}
                        onChange={(e) => updateEditingPlan("price_ars", parseFloat(e.target.value))}
                      />
                    ) : (
                      <p className="text-2xl font-bold">
                        ${displayPlan.price_ars.toLocaleString("es-AR")}
                      </p>
                    )}
                  </div>

                  {/* QR Limit */}
                  <div>
                    <Label className="text-muted-foreground">Límite de QRs</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={displayPlan.qr_limit}
                        onChange={(e) => updateEditingPlan("qr_limit", parseInt(e.target.value))}
                      />
                    ) : (
                      <p className="font-medium">{displayPlan.qr_limit} QRs</p>
                    )}
                  </div>

                  {/* Retention Days */}
                  <div>
                    <Label className="text-muted-foreground">Retención Analytics</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={displayPlan.retention_days}
                        onChange={(e) => updateEditingPlan("retention_days", parseInt(e.target.value))}
                      />
                    ) : (
                      <p className="font-medium">{displayPlan.retention_days} días</p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Logo personalizado</Label>
                      {isEditing ? (
                        <Switch
                          checked={displayPlan.has_logo_customization}
                          onCheckedChange={(v) => updateEditingPlan("has_logo_customization", v)}
                        />
                      ) : displayPlan.has_logo_customization ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Acceso API</Label>
                      {isEditing ? (
                        <Switch
                          checked={displayPlan.has_api_access}
                          onCheckedChange={(v) => updateEditingPlan("has_api_access", v)}
                        />
                      ) : displayPlan.has_api_access ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Activo</Label>
                      {isEditing ? (
                        <Switch
                          checked={displayPlan.is_active}
                          onCheckedChange={(v) => updateEditingPlan("is_active", v)}
                        />
                      ) : displayPlan.is_active ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Sort Order */}
                  {isEditing && (
                    <div>
                      <Label className="text-muted-foreground">Orden</Label>
                      <Input
                        type="number"
                        value={displayPlan.sort_order}
                        onChange={(e) => updateEditingPlan("sort_order", parseInt(e.target.value))}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={handleCancel}
                          disabled={saving}
                        >
                          Cancelar
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Guardar
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleEdit(plan)}
                      >
                        Editar plan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
