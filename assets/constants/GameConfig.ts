import { Color } from 'cc';

export type TileType = {
  name: string;
  color: Color;
};

export const GameConfig = {
  GridWidth: 8,
  GridHeight: 8,
  TileWidth: 64,
  TileHeight: 64,
  MaxIdleTime: 10,
  MilestoneSystem: {
    milestoneThresholds: [1500, 2500, 4000, 6000, 9000, 15000, 25000, 40000, 60000, 90000, 150000],
    pointsPerTile: 10,
    bonusPoints: {
      match4: 50,
      match5Plus: 100,
    },
    celebrationAnimationDuration: 4.5,
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
