import { Color } from 'cc';

export enum SpecialTileType {
  NORMAL = 'normal',
  BOMB = 'bomb',
  RAINBOW = 'rainbow',
  STRIPED_HORIZONTAL = 'striped_horizontal',
  STRIPED_VERTICAL = 'striped_vertical',
  WRAPPED = 'wrapped',
}

export interface SpecialTileData {
  type: SpecialTileType;
  name: string;
  color: Color;
  effectRadius?: number;
  matchesAllColors?: boolean;
  activationSound?: string;
  direction?: 'horizontal' | 'vertical' | 'both';
}

export const SpecialTileConfig = {
  NORMAL: {
    type: SpecialTileType.NORMAL,
    name: 'Normal',
    color: new Color(255, 255, 255, 255),
  },
  BOMB: {
    type: SpecialTileType.BOMB,
    name: 'Bomb Candy',
    color: new Color(128, 128, 128, 255),
    effectRadius: 1,
    activationSound: 'bomb_explosion',
  },
  RAINBOW: {
    type: SpecialTileType.RAINBOW,
    name: 'Rainbow Candy',
    color: new Color(255, 255, 255, 255),
    matchesAllColors: true,
    activationSound: 'rainbow_burst',
  },
  STRIPED_HORIZONTAL: {
    type: SpecialTileType.STRIPED_HORIZONTAL,
    name: 'Horizontal Striped Candy',
    color: new Color(255, 255, 255, 255),
    direction: 'horizontal' as const,
    activationSound: 'striped_activation',
  },
  STRIPED_VERTICAL: {
    type: SpecialTileType.STRIPED_VERTICAL,
    name: 'Vertical Striped Candy',
    color: new Color(255, 255, 255, 255),
    direction: 'vertical' as const,
    activationSound: 'striped_activation',
  },
  WRAPPED: {
    type: SpecialTileType.WRAPPED,
    name: 'Wrapped Candy',
    color: new Color(255, 255, 255, 255),
    effectRadius: 2,
    activationSound: 'wrapped_explosion',
  },
} as const;

export const SpecialTileCreationRules = {
  // 4-tile horizontal match creates horizontal striped
  MATCH_4_HORIZONTAL_CREATES: SpecialTileType.STRIPED_HORIZONTAL,
  // 4-tile vertical match creates vertical striped
  MATCH_4_VERTICAL_CREATES: SpecialTileType.STRIPED_VERTICAL,
  // 5-tile straight line creates rainbow
  MATCH_5_LINE_CREATES: SpecialTileType.RAINBOW,
  // T-shaped or L-shaped 5-tile match creates wrapped candy
  MATCH_5_T_L_CREATES: SpecialTileType.WRAPPED,
  // 6+ tile match creates rainbow
  MATCH_6_PLUS_CREATES: SpecialTileType.RAINBOW,
  // 2x2 square match creates bomb
  MATCH_SQUARE_CREATES: SpecialTileType.BOMB,
} as const;

export enum MatchShape {
  LINE_HORIZONTAL = 'line_horizontal',
  LINE_VERTICAL = 'line_vertical',
  T_SHAPE = 't_shape',
  L_SHAPE = 'l_shape',
  SQUARE = 'square',
  COMPLEX = 'complex',
}
