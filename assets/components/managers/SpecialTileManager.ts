import { _decorator, Component } from 'cc';
import { Tile } from '../Tile';
import { SpecialTileType, SpecialTileConfig } from '../../constants/SpecialTileConfig';
import { GameConfig } from '../../constants/GameConfig';
import { BoardManager } from './BoardManager';
import { ParticleEffectManager } from './ParticleEffectManager';
import { AnimationManager } from './AnimationManager';
import GameManager from '../GameManager';

const { ccclass } = _decorator;

@ccclass('SpecialTileManager')
export class SpecialTileManager extends Component {
  private boardManager: BoardManager | null = null;
  private particleEffectManager: ParticleEffectManager | null = null;

  protected onLoad(): void {
    this.boardManager = this.node.getComponent(BoardManager);
    this.particleEffectManager = this.node.getComponent(ParticleEffectManager);
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

    souceTile.setSpecialType(specialType!);
    this.particleEffectManager?.createTileParticleEffect(souceTile, specialType);

    const combinePromises = Array<Promise<void>>();

    const validCombination = match.filter(tile => tile.node && tile.node.isValid).length;
    let currentValidCombination = 0;

    const onTileDestroyed = () => {
      currentValidCombination++;
      if (currentValidCombination >= validCombination) {
        callback?.();
      }
    };

    for (const tile of match) {
      if (!tile || !tile.node || !tile.node.isValid) {
        continue;
      }

      combinePromises.push(
        tile.playCombineEffect(souceTile, () => {
          onTileDestroyed();
        })
      );
    }

    await Promise.all(combinePromises);
  }

  public activateSpecialTile(
    tile: Tile,
    swapTile: Tile,
    coords: { x: number; y: number },
    isPlayerSwap: boolean = false,
    isRainbowClick: boolean = false
  ): Tile[] {
    if (!tile || !tile.node || !tile.node.isValid) return [];

    const specialType = tile.getSpecialType();
    const tileGrid = this.boardManager!.getTileGrid();

    if (!coords) return [];

    switch (specialType) {
      case SpecialTileType.BOMB:
        return this.activateBombTile(coords.x, coords.y, tileGrid, tile);

      case SpecialTileType.RAINBOW:
        return this.activateRainbowTile(tile, swapTile, tileGrid, isPlayerSwap, isRainbowClick);

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
          if (tile && tile.node && tile.node.isValid && !tile.isRainbowTile()) {
            affectedTiles.push(tile);
          }
        }
      }
    }
    return affectedTiles;
  }

  private activateRainbowTile(
    rainbowTile: Tile,
    targetTile: Tile,
    tileGrid: (Tile | undefined)[][],
    isPlayerSwap: boolean = false,
    isRainbowClick: boolean = false
  ): Tile[] {
    const affectedTiles: Tile[] = [];

    if (isRainbowClick) {
      return this.activateRainbowClick(rainbowTile, targetTile, tileGrid);
    }

    if (!isPlayerSwap) return [];

    if (targetTile.isRainbowTile()) {
      for (const row of tileGrid) {
        for (const tile of row) {
          if (tile && tile.node && tile.node.isValid) {
            affectedTiles.push(tile);
          }
        }
      }
      return affectedTiles;
    }

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (
          !tile ||
          !targetTile ||
          tile.getTileType() !== targetTile.getTileType() ||
          tile.isRainbowTile()
        )
          continue;
        affectedTiles.push(tile);
      }
    }

    return affectedTiles;
  }

  private activateRainbowClick(
    rainbowTile: Tile,
    targetTile: Tile,
    tileGrid: (Tile | undefined)[][]
  ): Tile[] {
    const affectedTiles: Tile[] = [];

    const visitedTiles = new Set<Tile>();
    const tileCoords = this.boardManager!.getTileCoords();
    const rainbowCoords = tileCoords.get(rainbowTile);

    if (!rainbowCoords) return affectedTiles;

    const centerX = rainbowCoords.x;
    const centerY = rainbowCoords.y;

    const directions = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];

    const maxEdges = 5;

    const result = this.spiralTraversal(
      centerX,
      centerY,
      visitedTiles,
      affectedTiles,
      maxEdges,
      tileGrid,
      directions
    );

    affectedTiles.length = 0;
    affectedTiles.push(...result);

    return affectedTiles;
  }

  private spiralTraversal(
    startX: number,
    startY: number,
    visitedSet: Set<Tile>,
    affectedList: Tile[],
    maxEdges: number,
    tileGrid: (Tile | undefined)[][],
    directions: { x: number; y: number }[]
  ): Tile[] {
    let result = [...affectedList];
    let visited = new Set(visitedSet);

    const traverse = (
      x: number,
      y: number,
      dir: number,
      dirSteps: number,
      steps: number,
      turns: number,
      total: number
    ): void => {
      if (total >= maxEdges * maxEdges) return;

      if (this.isInBounds(x, y, tileGrid)) {
        const tile = tileGrid[y][x];
        if (tile && tile.node && tile.node.isValid && !visited.has(tile)) {
          result.push(tile);
          visited.add(tile);
        }
      }

      const nextX = x + directions[dir].x;
      const nextY = y + directions[dir].y;
      const nextSteps = steps + 1;
      const nextTotal = total + 1;

      if (nextSteps === dirSteps) {
        const nextDir = (dir + 1) % 4;
        const nextTurns = turns + 1;
        const nextDirSteps = nextTurns % 2 === 0 ? dirSteps + 1 : dirSteps;

        traverse(nextX, nextY, nextDir, nextDirSteps, 0, nextTurns, nextTotal);
      } else {
        traverse(nextX, nextY, dir, dirSteps, nextSteps, turns, nextTotal);
      }
    };

    traverse(startX, startY, 0, 1, 0, 0, 0);
    return result;
  }

  private isInBounds(x: number, y: number, tileGrid: (Tile | undefined)[][]): boolean {
    return (
      x >= 0 &&
      x < GameConfig.GridWidth &&
      y >= 0 &&
      y < GameConfig.GridHeight &&
      tileGrid[y][x] !== undefined
    );
  }
}
