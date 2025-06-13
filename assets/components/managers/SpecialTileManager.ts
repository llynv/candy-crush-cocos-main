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

    if (targetTile.isRainbowTile()) {
      tileGrid.forEach(row => {
        row.forEach(tile => {
          if (tile && tile.node && tile.node.isValid) {
            affectedTiles.push(tile);
          }
        });
      });
      return affectedTiles;
    }

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (!tile || !targetTile || tile.getTileType() !== targetTile.getTileType()) continue;
        affectedTiles.push(tile);
      }
    }

    return affectedTiles;
  }
}
