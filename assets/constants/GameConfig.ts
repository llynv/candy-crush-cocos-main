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
  CandyTypes: [
    {
      name: 'Blue Candy',
      // light blue
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
