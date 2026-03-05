import { useNavigate } from 'react-router';
import { Card } from '../../../components/ui/Card';
import type { Building } from '../../../types';

interface BuildingCardProps {
  building: Building;
}

export function BuildingCard({ building }: BuildingCardProps) {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate(`/buildings/${building.id}`)}>
      <h3 className="mb-2 text-lg font-bold text-text">{building.name}</h3>
      <p className="mb-1 text-sm text-muted">{building.address}</p>
      <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
        <span className="text-subtle">Area: <span className="text-muted">{building.totalArea} m²</span></span>
        <span className="text-subtle">Medidores: <span className="font-semibold text-text">{building.metersCount}</span></span>
      </div>
    </Card>
  );
}
