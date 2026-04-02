export type HierarchyLevelType = 'floor' | 'zone' | 'panel' | 'circuit' | 'sub_circuit';

export interface HierarchyNode {
  id: string;
  buildingId: string;
  parentId: string | null;
  name: string;
  levelType: HierarchyLevelType;
  sortOrder: number;
  metadata: Record<string, unknown>;
  children?: HierarchyNode[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHierarchyNodePayload {
  buildingId: string;
  parentId?: string;
  name: string;
  levelType: HierarchyLevelType;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateHierarchyNodePayload {
  name?: string;
  levelType?: HierarchyLevelType;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}
