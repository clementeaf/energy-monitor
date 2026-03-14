import { useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';

export function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title={`Alerta ${id}`}
        showBack
        breadcrumbs={[
          { label: 'Alertas', to: '/alerts' },
          { label: id ?? '' },
        ]}
      />
      <div className="flex flex-1 items-center justify-center text-muted">
        Detalle de alerta — pendiente de conectar
      </div>
    </div>
  );
}
