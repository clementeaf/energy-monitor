import { useNavigate } from 'react-router';
import { Card } from '../../../components/ui/Card';
import type { Local } from '../../../types';

interface LocalCardProps {
  local: Local;
  buildingId: string;
}

export function LocalCard({ local, buildingId }: LocalCardProps) {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate(`/buildings/${buildingId}/locals/${local.id}`)}>
      <h3 className="mb-1 font-bold text-text">{local.name}</h3>
      <p className="text-sm text-muted">{local.type}</p>
      <div className="mt-2 flex justify-between text-sm text-subtle">
        <span>Piso {local.floor}</span>
        <span>{local.area} m²</span>
      </div>
    </Card>
  );
}
