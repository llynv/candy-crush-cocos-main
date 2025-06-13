import { Color, Vec3 } from 'cc';

export type TileType = {
  name: string;
  color: Color;
};

export const PatternShape: { name: string; shape: Vec3[] }[] = [
  {
    name: 'HorizontalLine5',
    shape: [new Vec3(0, 0), new Vec3(1, 0), new Vec3(2, 0), new Vec3(3, 0), new Vec3(4, 0)],
  },
  {
    name: 'VerticalLine5',
    shape: [new Vec3(0, 0), new Vec3(0, 1), new Vec3(0, 2), new Vec3(0, 3), new Vec3(0, 4)],
  },
  {
    name: 'PlusShape',
    shape: [new Vec3(0, 0), new Vec3(1, 0), new Vec3(0, 1), new Vec3(0, -1), new Vec3(-1, 0)],
  },
  {
    name: 'LShapeLeft',
    shape: [new Vec3(0, 0), new Vec3(0, 1), new Vec3(0, 2), new Vec3(-1, 0), new Vec3(-2, 0)],
  },
  {
    name: 'LShapeRight',
    shape: [new Vec3(0, 0), new Vec3(0, 1), new Vec3(0, 2), new Vec3(1, 0), new Vec3(2, 0)],
  },
  {
    name: 'LShapeUp',
    shape: [new Vec3(0, 0), new Vec3(0, -1), new Vec3(0, -2), new Vec3(1, 0), new Vec3(2, 0)],
  },
  {
    name: 'LShapeDown',
    shape: [new Vec3(0, 0), new Vec3(0, -1), new Vec3(0, -2), new Vec3(-1, 0), new Vec3(-2, 0)],
  },
  {
    name: 'TShapeUp',
    shape: [new Vec3(0, 0), new Vec3(-1, 0), new Vec3(1, 0), new Vec3(0, 1), new Vec3(0, 2)],
  },
  {
    name: 'TShapeDown',
    shape: [new Vec3(0, 0), new Vec3(-1, 0), new Vec3(1, 0), new Vec3(0, -1), new Vec3(0, -2)],
  },
  {
    name: 'TShapeLeft',
    shape: [new Vec3(0, 0), new Vec3(0, 1), new Vec3(0, -1), new Vec3(-1, 0), new Vec3(-2, 0)],
  },
  {
    name: 'TShapeRight',
    shape: [new Vec3(0, 0), new Vec3(0, 1), new Vec3(0, -1), new Vec3(1, 0), new Vec3(2, 0)],
  },
  {
    name: 'HorizontalLine4',
    shape: [new Vec3(0, 0), new Vec3(1, 0), new Vec3(2, 0), new Vec3(3, 0)],
  },
  {
    name: 'VerticalLine4',
    shape: [new Vec3(0, 0), new Vec3(0, 1), new Vec3(0, 2), new Vec3(0, 3)],
  },
  {
    name: 'HorizontalLine3',
    shape: [new Vec3(0, 0), new Vec3(1, 0), new Vec3(2, 0)],
  },
  {
    name: 'VerticalLine3',
    shape: [new Vec3(0, 0), new Vec3(0, 1), new Vec3(0, 2)],
  },
] as const;

export const GameConfig = {
  GridWidth: 8,
  GridHeight: 8,
  TileWidth: 64,
  TileHeight: 64,
  OffsetX: 0,
  OffsetY: 0,
  MaxIdleTime: 10,
  HintTime: 5,
  MilestoneSystem: {
    milestoneThresholds: [
      10000, 2500, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1280000, 2560000,
    ],
    movePerMilestone: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
    pointsPerTile: 10,
    bonusPoints: {
      match4: 50,
      match5Plus: 100,
    },
    celebrationAnimationDuration: 6,
  },
  RainbowClick: {
    minDestroyCount: 6,
    maxDestroyCount: 20,
  },
  CandyTypes: [
    {
      name: 'Blue Candy',
      color: new Color(55, 78, 252, 255),
    },
    {
      name: 'Green Candy',
      color: new Color(0, 128, 0, 255),
    },
    {
      name: 'Orange Candy',
      color: new Color(255, 126, 25, 255),
    },
    {
      name: 'Red Candy',
      color: new Color(255, 0, 0, 255),
    },
    {
      name: 'Yellow Candy',
      color: new Color(255, 255, 0, 255),
    },
    {
      name: 'Purple Candy',
      color: new Color(128, 0, 128, 255),
    },
  ] as TileType[],
} as const;
