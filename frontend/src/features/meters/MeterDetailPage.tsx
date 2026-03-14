import { useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';

export function MeterDetailPage() {
  const { meterId } = useParams<{ meterId: string }>();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title={`Medidor ${meterId}`}
        showBack
        breadcrumbs={[
          { label: 'Edificios', to: '/' },
          { label: meterId ?? '' },
        ]}
      />
      <div className="flex flex-1 items-center justify-center text-muted">
        Detalle de medidor — pendiente de conectar
      </div>
    </div>
  );
}
