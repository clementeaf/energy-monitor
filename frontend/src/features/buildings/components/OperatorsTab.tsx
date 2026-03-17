import { useState } from 'react';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { ContextMenu } from '../../../components/ui/ContextMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Drawer } from '../../../components/ui/Drawer';
import { OperatorForm } from './OperatorForm';
import { useOperatorsByBuilding, useRenameOperator, useDeleteOperator } from '../../../hooks/queries/useOperators';
import type { OperatorSummary } from '../../../types';

interface OperatorsTabProps {
  buildingName: string;
}

export function OperatorsTab({ buildingName }: OperatorsTabProps) {
  const { data: operators, isLoading } = useOperatorsByBuilding(buildingName);
  const renameMutation = useRenameOperator();
  const deleteMutation = useDeleteOperator();

  const [editingOp, setEditingOp] = useState<string | null>(null);
  const [deletingOp, setDeletingOp] = useState<string | null>(null);

  const columns: Column<OperatorSummary>[] = [
    { label: 'Operador', value: (r) => r.storeName, align: 'left' },
    { label: 'Medidores', value: (r) => String(r.meterCount) },
    {
      label: '',
      value: (r) => (
        <ContextMenu items={[
          { label: 'Renombrar', onClick: () => setEditingOp(r.storeName) },
          { label: 'Eliminar', onClick: () => setDeletingOp(r.storeName), danger: true },
        ]} />
      ),
      align: 'right',
    },
  ];

  if (isLoading) return <p className="py-8 text-center text-sm text-pa-text-muted">Cargando...</p>;
  if (!operators || operators.length === 0) return <p className="py-8 text-center text-sm text-muted">Sin operadores</p>;

  return (
    <>
      <DataTable
        data={operators}
        columns={columns}
        rowKey={(r) => r.storeName}
        maxHeight="max-h-none"
        pageSize={20}
      />

      <Drawer
        open={!!editingOp}
        onClose={() => setEditingOp(null)}
        title={`Renombrar Operador — ${editingOp}`}
        size="sm"
      >
        <OperatorForm
          initial={editingOp ? { storeName: editingOp } : undefined}
          loading={renameMutation.isPending}
          onSubmit={({ storeName }) => {
            renameMutation.mutate(
              { buildingName, operatorName: editingOp!, newName: storeName },
              { onSuccess: () => setEditingOp(null) },
            );
          }}
        />
      </Drawer>

      <ConfirmDialog
        open={!!deletingOp}
        title="Eliminar Operador"
        message={`Los medidores de "${deletingOp}" quedarán como "Sin información". Esta acción no se puede deshacer.`}
        onConfirm={() => {
          deleteMutation.mutate(
            { buildingName, operatorName: deletingOp! },
            { onSuccess: () => setDeletingOp(null) },
          );
        }}
        onCancel={() => setDeletingOp(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
