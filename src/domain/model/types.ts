export type {
  AnalysisSettings,
  DependencyLink,
  DocumentRef,
  Door,
  DoorOperation,
  Footprint,
  Furniture,
  FurnitureCategory,
  ProjectInfo,
  RectFootprint,
  Room,
  Scene,
  Wall,
} from './schema';

export interface PlanRectLike {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}
