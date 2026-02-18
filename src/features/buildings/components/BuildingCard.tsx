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
      <h3 className="mb-2 text-lg font-bold text-black">{building.name}</h3>
      <p className="mb-1 text-sm text-[#666]">{building.address}</p>
      <div className="mt-3 flex justify-between border-t border-[#e0e0e0] pt-3 text-sm">
        <span className="text-[#999]">Area: <span className="text-[#333]">{building.totalArea} m²</span></span>
        <span className="text-[#999]">Locales: <span className="font-semibold text-black">{building.localsCount}</span></span>
      </div>
    </Card>
  );
}
