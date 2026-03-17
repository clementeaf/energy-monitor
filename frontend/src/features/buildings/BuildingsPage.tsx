import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ContextMenu } from '../../components/ui/ContextMenu';
import { Drawer } from '../../components/ui/Drawer';
import { PillButton } from '../../components/ui/PillButton';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { useBuildings, useCreateBuilding, useUpdateBuilding, useDeleteBuilding } from '../../hooks/queries/useBuildings';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { useAppStore } from '../../store/useAppStore';
import { fmt } from '../../lib/formatters';
import { BuildingForm } from './components/BuildingForm';
import type { BuildingSummary } from '../../types';

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium text-text">
        {value}{unit && <span className="ml-0.5 text-xs font-normal text-muted">{unit}</span>}
      </p>
    </div>
  );
}

export function BuildingsPage() {
  const navigate = useNavigate();
  const { data: buildings, isLoading } = useBuildings();
  const { isFilteredMode, needsSelection, operatorBuildings } = useOperatorFilter();
  const userMode = useAppStore((s) => s.userMode);
  const isHolding = userMode === 'holding';

  const createMutation = useCreateBuilding();
  const updateMutation = useUpdateBuilding();
  const deleteMutation = useDeleteBuilding();

  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<BuildingSummary | null>(null);
  const [deletingBuilding, setDeletingBuilding] = useState<string | null>(null);

  if (isLoading) return <BuildingsPageSkeleton />;

  // Group by buildingName, take latest month per building
  const latest = new Map<string, BuildingSummary>();
  for (const row of buildings ?? []) {
    if (!latest.has(row.buildingName)) {
      latest.set(row.buildingName, row);
    }
  }

  let cards = [...latest.values()];

  // Filter to operator's buildings in filtered modes
  if (isFilteredMode && operatorBuildings) {
    cards = cards.filter((b) => operatorBuildings.has(b.buildingName));
  }

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-pa-text-muted">Selecciona un operador o tienda en el sidebar para ver sus edificios.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {isHolding && (
        <div className="mb-3 flex justify-end px-1">
          <PillButton onClick={() => setDrawerMode('create')}>+ Nuevo Edificio</PillButton>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((b) => (
            <Card
              key={b.buildingName}
              className="space-y-3 !rounded-2xl border border-pa-navy/30"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate font-semibold text-text">{b.buildingName}</h3>
                <div className="flex shrink-0 items-center gap-1">
                  {isHolding && (
                    <ContextMenu items={[
                      { label: 'Editar', onClick: () => { setEditingBuilding(b); setDrawerMode('edit'); } },
                      { label: 'Eliminar', onClick: () => setDeletingBuilding(b.buildingName), danger: true },
                    ]} />
                  )}
                  <PillButton className="whitespace-nowrap" onClick={() => navigate(`/buildings/${encodeURIComponent(b.buildingName)}`)}>
                    Ver más +
                  </PillButton>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Consumo" value={fmt(b.totalKwh)} unit="kWh" />
                <Stat label="Potencia prom." value={fmt(b.avgPowerKw)} unit="kW" />
                <Stat label="Demanda peak" value={fmt(b.peakDemandKw)} unit="kW" />
                <Stat label="Factor potencia" value={b.avgPowerFactor != null ? b.avgPowerFactor.toFixed(2) : '—'} />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted">
                <span>{b.totalMeters} medidores</span>
                {b.areaSqm && <span>{fmt(b.areaSqm)} m²</span>}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Create / Edit Drawer */}
      <Drawer
        open={drawerMode !== null}
        onClose={() => { setDrawerMode(null); setEditingBuilding(null); }}
        title={drawerMode === 'edit' ? `Editar — ${editingBuilding?.buildingName}` : 'Nuevo Edificio'}
        size="sm"
      >
        <BuildingForm
          initial={editingBuilding ? { buildingName: editingBuilding.buildingName, areaSqm: editingBuilding.areaSqm } : undefined}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={(data) => {
            if (drawerMode === 'edit' && editingBuilding) {
              updateMutation.mutate(
                { name: editingBuilding.buildingName, data: { areaSqm: data.areaSqm } },
                { onSuccess: () => { setDrawerMode(null); setEditingBuilding(null); } },
              );
            } else {
              createMutation.mutate(data, {
                onSuccess: () => { setDrawerMode(null); },
              });
            }
          }}
        />
      </Drawer>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deletingBuilding}
        title="Eliminar Edificio"
        message={`Se eliminarán todos los datos de "${deletingBuilding}". Esta acción no se puede deshacer.`}
        onConfirm={() => {
          deleteMutation.mutate(deletingBuilding!, {
            onSuccess: () => setDeletingBuilding(null),
          });
        }}
        onCancel={() => setDeletingBuilding(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
