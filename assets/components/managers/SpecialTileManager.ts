import { _decorator, Component } from 'cc';
import { Tile } from '../Tile';
import {
  SpecialTileType,
  SpecialTileConfig,
  SpecialTileCreationRules,
  MatchShape,
} from '../../constants/SpecialTileConfig';
import { GameConfig } from '../../constants/GameConfig';
import { BoardManager } from './BoardManager';
import { ParticleEffectManager } from './ParticleEffectManager';
import { AnimationManager } from './AnimationManager';
import GameManager from '../GameManager';

const { ccclass } = _decorator;

export interface MatchResult {
  tiles: Tile[];
  length: number;
  isHorizontal: boolean;
  centerPosition: { x: number; y: number };
  shape: MatchShape;
}

@ccclass('SpecialTileManager')
export class SpecialTileManager extends Component {
  private boardManager: BoardManager | null = null;
  private particleEffectManager: ParticleEffectManager | null = null;

  protected onLoad(): void {
    this.boardManager = this.node.getComponent(BoardManager);
    this.particleEffectManager = this.node.getComponent(ParticleEffectManager);
  }

  public shouldCreateSpecialTile(matchResult: MatchResult): SpecialTileType | null {
    const { length, shape } = matchResult;

    switch (shape) {
      case MatchShape.LINE_HORIZONTAL:
        if (length === 4) return SpecialTileCreationRules.MATCH_4_HORIZONTAL_CREATES;
        if (length >= 5) return SpecialTileCreationRules.MATCH_5_LINE_CREATES;
        break;

      case MatchShape.LINE_VERTICAL:
        if (length === 4) return SpecialTileCreationRules.MATCH_4_VERTICAL_CREATES;
        if (length >= 5) return SpecialTileCreationRules.MATCH_5_LINE_CREATES;
        break;

      case MatchShape.T_SHAPE:
      case MatchShape.L_SHAPE:
        return SpecialTileCreationRules.MATCH_5_T_L_CREATES;

      case MatchShape.SQUARE:
        return SpecialTileCreationRules.MATCH_SQUARE_CREATES;

      case MatchShape.COMPLEX:
        if (length >= 6) return SpecialTileCreationRules.MATCH_6_PLUS_CREATES;
        break;
    }

    return null;
  }

  private determineSpecialTileType(match: Tile[]): SpecialTileType | null {
    return match.length === 4 ? SpecialTileType.BOMB : SpecialTileType.RAINBOW;
  }

  public async createSpecialTile(
    souceTile: Tile,
    specialType: SpecialTileType,
    match: Tile[],
    callback?: () => void
  ): Promise<void> {
    if (!souceTile || !souceTile.node || !souceTile.node.isValid) return;

    console.log('createSpecialTile', souceTile, specialType, match);

    souceTile.setSpecialType(specialType!);
    this.particleEffectManager?.createTileParticleEffect(souceTile, specialType);

    const combinePromises = Array<Promise<void>>();

    for (const tile of match) {
      combinePromises.push(
        tile.playCombineEffect(souceTile, () => {
          callback?.();
          tile.node.destroy();
        })
      );
    }

    await Promise.all(combinePromises);
  }

  public activateSpecialTile(
    tile: Tile,
    swapTile: Tile,
    coords: { x: number; y: number },
    isPlayerSwap: boolean = false
  ): Tile[] {
    if (!tile || !tile.node || !tile.node.isValid) return [];

    const specialType = tile.getSpecialType();
    const tileGrid = this.boardManager!.getTileGrid();
    console.log(
      'Activating special tile:',
      specialType,
      'at coords:',
      coords,
      'isPlayerSwap:',
      isPlayerSwap
    );

    if (!coords) return [];

    switch (specialType) {
      case SpecialTileType.BOMB:
        return this.activateBombTile(coords.x, coords.y, tileGrid, tile);

      case SpecialTileType.RAINBOW:
        if (isPlayerSwap) {
          return this.activateRainbowTile(tile, swapTile, tileGrid);
        }
        return [];

      case SpecialTileType.STRIPED_HORIZONTAL:
        return this.activateStripedTile(coords.x, coords.y, tileGrid, 'horizontal');

      case SpecialTileType.STRIPED_VERTICAL:
        return this.activateStripedTile(coords.x, coords.y, tileGrid, 'vertical');

      case SpecialTileType.WRAPPED:
        return this.activateWrappedTile(coords.x, coords.y, tileGrid, tile);

      default:
        return [];
    }
  }

  private activateBombTile(
    centerX: number,
    centerY: number,
    tileGrid: (Tile | undefined)[][],
    bombTile: Tile
  ): Tile[] {
    const affectedTiles: Tile[] = [];
    const radius = SpecialTileConfig.BOMB.effectRadius || 1;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < GameConfig.GridWidth && y >= 0 && y < GameConfig.GridHeight) {
          const tile = tileGrid[y][x];
          if (tile && tile.node && tile.node.isValid) {
            affectedTiles.push(tile);
          }
        }
      }
    }
    return affectedTiles;
  }

  private activateStripedTile(
    centerX: number,
    centerY: number,
    tileGrid: (Tile | undefined)[][],
    direction: 'horizontal' | 'vertical'
  ): Tile[] {
    const affectedTiles: Tile[] = [];

    if (direction === 'horizontal') {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[centerY][x];
        if (tile && tile.node && tile.node.isValid) {
          affectedTiles.push(tile);
        }
      }
    } else {
      for (let y = 0; y < GameConfig.GridHeight; y++) {
        const tile = tileGrid[y][centerX];
        if (tile && tile.node && tile.node.isValid) {
          affectedTiles.push(tile);
        }
      }
    }

    return affectedTiles;
  }

  private activateWrappedTile(
    centerX: number,
    centerY: number,
    tileGrid: (Tile | undefined)[][],
    wrappedTile: Tile
  ): Tile[] {
    const affectedTiles: Tile[] = [];
    const radius = SpecialTileConfig.WRAPPED.effectRadius || 2;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < GameConfig.GridWidth && y >= 0 && y < GameConfig.GridHeight) {
          const tile = tileGrid[y][x];
          if (tile && tile.node && tile.node.isValid) {
            affectedTiles.push(tile);
          }
        }
      }
    }

    setTimeout(async () => {
      const secondWaveAffected: Tile[] = [];
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;

          if (x >= 0 && x < GameConfig.GridWidth && y >= 0 && y < GameConfig.GridHeight) {
            const tile = tileGrid[y][x];
            if (tile && tile.node && tile.node.isValid) {
              secondWaveAffected.push(tile);
            }
          }
        }
      }

      if (this.particleEffectManager && wrappedTile.node && wrappedTile.node.parent) {
        const positions = secondWaveAffected.map(tile => tile.node.worldPosition);
        await this.particleEffectManager?.playMultipleEffects(
          positions,
          'explosion',
          wrappedTile.node.parent
        );
      }
    }, 300);

    return affectedTiles;
  }

  private activateRainbowTile(
    rainbowTile: Tile,
    targetTile: Tile,
    tileGrid: (Tile | undefined)[][]
  ): Tile[] {
    const affectedTiles: Tile[] = [];
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (!tile || !targetTile || tile.getTileType() !== targetTile.getTileType()) continue;
        affectedTiles.push(tile);
      }
    }

    return affectedTiles;
  }

  public getMatchResults(matches: Tile[][] = []): MatchResult[] {
    if (!this.boardManager || matches.length === 0) return [];

    const tileCoords = this.boardManager!.getTileCoords();
    const results: MatchResult[] = [];

    for (const match of matches) {
      if (match.length < 3) continue;

      const positions = match
        .map(tile => (tile ? tileCoords.get(tile) : undefined))
        .filter(pos => pos !== undefined);
      if (positions.length === 0) continue;

      const shape = this.analyzeMatchShape(positions, match);
      const isHorizontal = shape === MatchShape.LINE_HORIZONTAL;
      const centerIndex = Math.floor(match.length / 2);
      const centerTile = match[centerIndex];
      if (!centerTile) continue;
      const centerPos = tileCoords.get(centerTile);

      if (centerPos) {
        results.push({
          tiles: match,
          length: match.length,
          isHorizontal,
          centerPosition: centerPos,
          shape,
        });
      }
    }

    return results;
  }

  private analyzeMatchShape(positions: { x: number; y: number }[], tiles: Tile[]): MatchShape {
    if (positions.length < 3) return MatchShape.COMPLEX;

    const isHorizontalLine = this.isHorizontalLine(positions);
    const isVerticalLine = this.isVerticalLine(positions);

    if (isHorizontalLine) return MatchShape.LINE_HORIZONTAL;
    if (isVerticalLine) return MatchShape.LINE_VERTICAL;

    if (positions.length >= 5) {
      if (this.isTShape(positions)) return MatchShape.T_SHAPE;
      if (this.isLShape(positions)) return MatchShape.L_SHAPE;
    }

    return MatchShape.COMPLEX;
  }

  private isSquarePattern(positions: { x: number; y: number }[]): boolean {
    if (positions.length !== 4) return false;

    const sortedPositions = positions.sort((a, b) => a.y - b.y || a.x - b.x);
    const [p1, p2, p3, p4] = sortedPositions;

    return (
      p1.x === p3.x &&
      p2.x === p4.x &&
      p1.y === p2.y &&
      p3.y === p4.y &&
      Math.abs(p1.x - p2.x) === 1 &&
      Math.abs(p1.y - p3.y) === 1
    );
  }

  private isHorizontalLine(positions: { x: number; y: number }[]): boolean {
    const firstY = positions[0].y;
    return positions.every(pos => pos.y === firstY);
  }

  private isVerticalLine(positions: { x: number; y: number }[]): boolean {
    const firstX = positions[0].x;
    return positions.every(pos => pos.x === firstX);
  }

  private isTShape(positions: { x: number; y: number }[]): boolean {
    const xGroups = new Map<number, number[]>();
    const yGroups = new Map<number, number[]>();

    positions.forEach(pos => {
      if (!xGroups.has(pos.x)) xGroups.set(pos.x, []);
      if (!yGroups.has(pos.y)) yGroups.set(pos.y, []);
      xGroups.get(pos.x)!.push(pos.y);
      yGroups.get(pos.y)!.push(pos.x);
    });

    for (const [y, xList] of yGroups) {
      if (xList.length >= 3) {
        const remainingPositions = positions.filter(p => p.y !== y);
        if (remainingPositions.length >= 2) {
          const centerX = Math.floor((Math.min(...xList) + Math.max(...xList)) / 2);
          if (remainingPositions.some(p => p.x === centerX)) {
            return true;
          }
        }
      }
    }

    for (const [x, yList] of xGroups) {
      if (yList.length >= 3) {
        const remainingPositions = positions.filter(p => p.x !== x);
        if (remainingPositions.length >= 2) {
          const centerY = Math.floor((Math.min(...yList) + Math.max(...yList)) / 2);
          if (remainingPositions.some(p => p.y === centerY)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private isLShape(positions: { x: number; y: number }[]): boolean {
    const xGroups = new Map<number, number[]>();
    const yGroups = new Map<number, number[]>();

    positions.forEach(pos => {
      if (!xGroups.has(pos.x)) xGroups.set(pos.x, []);
      if (!yGroups.has(pos.y)) yGroups.set(pos.y, []);
      xGroups.get(pos.x)!.push(pos.y);
      yGroups.get(pos.y)!.push(pos.x);
    });

    for (const pos of positions) {
      const horizontalCount = yGroups.get(pos.y)?.length || 0;
      const verticalCount = xGroups.get(pos.x)?.length || 0;

      if (horizontalCount >= 3 && verticalCount >= 3) {
        return true;
      }
    }

    return false;
  }
}
