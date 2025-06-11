import { _decorator, Component, Camera } from 'cc';
const { ccclass, property } = _decorator;

import { GameConfig } from '../constants/GameConfig';
import { Tile } from './Tile';
import { GameGlobalData } from './GameGlobalData';
import { BoardManager } from './managers/BoardManager';
import { MatchManager } from './managers/MatchManager';
import { AnimationManager, FallTask } from './managers/AnimationManager';
import { InputManager } from './managers/InputManager';
import { ProgressManager } from './managers/ProgressManager';
import { SpecialTileManager, MatchResult } from './managers/SpecialTileManager';
import { ParticleEffectManager } from './managers/ParticleEffectManager';
import { Singleton } from './patterns/Singleton';
import { SpecialTileType } from '../constants/SpecialTileConfig';

@ccclass('GameManager')
export default class GameManager extends Singleton {
  @property(Camera)
  private camera: Camera | null = null;

  private boardManager: BoardManager | null = null;
  private matchManager: MatchManager | null = null;
  private animationManager: AnimationManager | null = null;
  private inputManager: InputManager | null = null;
  private specialTileManager: SpecialTileManager | null = null;
  private particleEffectManager: ParticleEffectManager | null = null;

  private playerIdleTime = 0;
  private currentTilesQuantity = GameConfig.GridWidth * GameConfig.GridHeight;
  private canMove = false;
  private firstSelectedTile: Tile | undefined = undefined;
  private secondSelectedTile: Tile | undefined = undefined;
  private pendingScoreData: { matchCount: number; matchSize: number } | null = null;
  private swappedTiles: Tile[] = [];

  protected __preload(): void {
    this.assignManagers();
    if (!this.boardManager) throw new Error('BoardManager is required');
    if (!this.matchManager) throw new Error('MatchManager is required');
    if (!this.animationManager) throw new Error('AnimationManager is required');
    if (!this.inputManager) throw new Error('InputManager is required');
    if (!this.specialTileManager) throw new Error('SpecialTileManager is required');
    if (!this.particleEffectManager) throw new Error('ParticleEffectManager is required');
  }

  protected start(): void {
    this.setupProgressManager();
    this.createBoard();
  }

  protected update(dt: number): void {
    this.checkIdleTime(dt);
  }

  private assignManagers(): void {
    this.boardManager = this.node.getComponent(BoardManager);
    this.matchManager = this.node.getComponent(MatchManager);
    this.animationManager = this.node.getComponent(AnimationManager);
    this.inputManager = this.node.getComponent(InputManager);
    this.specialTileManager = this.node.getComponent(SpecialTileManager);
    this.particleEffectManager = this.node.getComponent(ParticleEffectManager);
  }

  private setupProgressManager(): void {
    ProgressManager.getInstance().onMilestoneCompleted(this.handleMilestoneCompleted.bind(this));
  }

  private async handleMilestoneCompleted(): Promise<void> {
    console.log('Milestone completed! Starting celebration animation...');

    this.canMove = false;
    GameGlobalData.getInstance().setIsMouseDown(true);

    this.createBoard();

    await this.animationManager!.triggerMilestoneNewBoard();
  }

  private createBoard(): void {
    this.canMove = false;
    GameGlobalData.getInstance().setIsMouseDown(true);
    this.boardManager!.initializeBoard();
    this.setupTileCallbacks();
    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;
    this.pendingScoreData = null;

    this.checkMatches().then(() => {
      this.resetTile();
    });
  }

  private setupTileCallbacks(): void {
    const tileGrid = this.boardManager!.getTileGrid();

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (tile) {
          tile.addOnMouseDownCallback(this.tileDown.bind(this));
          tile.addOnMouseUpCallback(this.tileDown.bind(this));
        }
      }
    }
  }

  private checkIdleTime(dt: number): void {
    this.playerIdleTime += dt;
    if (this.playerIdleTime > GameConfig.MaxIdleTime) {
      this.makeTilesIdleAnimation();
      this.playerIdleTime = 0;
    }
  }

  private async makeTilesIdleAnimation(): Promise<void> {
    const tileGrid = this.boardManager!.getTileGrid();
    await this.animationManager!.animateIdleTiles(tileGrid);
  }

  private tileDown(tile: Tile): void {
    if (!this.canMove) return;

    this.playerIdleTime = 0;

    if (!this.firstSelectedTile || this.firstSelectedTile === tile) {
      this.firstSelectedTile = tile;
      tile.changeState('select');
    } else {
      this.secondSelectedTile = tile;

      const tileCoords = this.boardManager!.getTileCoords();
      const firstCoords = tileCoords.get(this.firstSelectedTile)!;
      const secondCoords = tileCoords.get(this.secondSelectedTile)!;

      const dx = Math.abs(firstCoords.x - secondCoords.x);
      const dy = Math.abs(firstCoords.y - secondCoords.y);

      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        this.canMove = false;
        this.swapTiles();
      } else {
        this.firstSelectedTile.changeState('idle');
        this.firstSelectedTile = tile;
        tile.changeState('select');
        this.secondSelectedTile = undefined;
      }
    }
  }

  private swapTiles(): void {
    if (!this.firstSelectedTile || !this.secondSelectedTile) {
      this.canMove = true;
      GameGlobalData.getInstance().setIsMouseDown(false);
      return;
    }

    if (!this.firstSelectedTile.node?.isValid || !this.secondSelectedTile.node?.isValid) {
      console.error('Selected tiles are no longer valid');
      this.tileUp();
      this.canMove = true;
      return;
    }

    const tileCoords = this.boardManager!.getTileCoords();
    const tileGrid = this.boardManager!.getTileGrid();

    const firstSelectedTileCoords = tileCoords.get(this.firstSelectedTile);
    const secondSelectedTileCoords = tileCoords.get(this.secondSelectedTile);

    if (!firstSelectedTileCoords || !secondSelectedTileCoords) {
      console.error('Selected tile coordinates not found - tiles may have been destroyed');
      this.tileUp();
      this.canMove = true;
      GameGlobalData.getInstance().setIsMouseDown(false);
      return;
    }

    if (
      firstSelectedTileCoords.y < 0 ||
      firstSelectedTileCoords.y >= GameConfig.GridHeight ||
      firstSelectedTileCoords.x < 0 ||
      firstSelectedTileCoords.x >= GameConfig.GridWidth ||
      secondSelectedTileCoords.y < 0 ||
      secondSelectedTileCoords.y >= GameConfig.GridHeight ||
      secondSelectedTileCoords.x < 0 ||
      secondSelectedTileCoords.x >= GameConfig.GridWidth
    ) {
      console.error('Selected tile coordinates are out of bounds');
      this.tileUp();
      this.canMove = true;
      GameGlobalData.getInstance().setIsMouseDown(false);
      return;
    }

    this.swappedTiles = [this.firstSelectedTile, this.secondSelectedTile];

    tileGrid[firstSelectedTileCoords.y][firstSelectedTileCoords.x] = this.secondSelectedTile;
    tileGrid[secondSelectedTileCoords.y][secondSelectedTileCoords.x] = this.firstSelectedTile;

    tileCoords.set(this.secondSelectedTile, {
      x: firstSelectedTileCoords.x,
      y: firstSelectedTileCoords.y,
    });
    tileCoords.set(this.firstSelectedTile, {
      x: secondSelectedTileCoords.x,
      y: secondSelectedTileCoords.y,
    });

    this.animationManager!.animateSwap(this.firstSelectedTile, this.secondSelectedTile, () =>
      this.checkMatches(true)
    );

    this.firstSelectedTile = tileGrid[firstSelectedTileCoords.y][firstSelectedTileCoords.x];
    this.secondSelectedTile = tileGrid[secondSelectedTileCoords.y][secondSelectedTileCoords.x];

    if (!this.firstSelectedTile || !this.secondSelectedTile) return;

    tileCoords.set(this.firstSelectedTile, {
      x: firstSelectedTileCoords.x,
      y: firstSelectedTileCoords.y,
    });
    tileCoords.set(this.secondSelectedTile, {
      x: secondSelectedTileCoords.x,
      y: secondSelectedTileCoords.y,
    });
  }

  private async checkMatches(isSwapCheck: boolean = false): Promise<void> {
    const tileGrid = this.boardManager!.getTileGrid();
    const matches = this.matchManager!.findMatches(tileGrid);
    if (matches.length > 0) {
      this.removeTileGroup(matches).then(async () => {
        this.tileUp();
        await this.resetTile();
      });
    } else {
      if (this.pendingScoreData) {
        const milestoneCompleted = ProgressManager.getInstance().addScore(
          this.pendingScoreData.matchCount,
          this.pendingScoreData.matchSize
        );
        this.pendingScoreData = null;

        if (milestoneCompleted) {
          await this.handleMilestoneCompleted();
          return;
        }
      }

      if (isSwapCheck) {
        this.swapTiles();
      } else {
        this.canMove = true;
        GameGlobalData.getInstance().setIsMouseDown(false);
        this.resetFrames();
      }
      this.tileUp();
    }
  }

  private resetFrames(): void {
    const tileGrid = this.boardManager!.getTileGrid();
    const frameGrid = this.boardManager!.getFrameGrid();

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        if (tileGrid[y][x] && frameGrid[y][x]) {
          tileGrid[y][x]!.setFrame(frameGrid[y][x]!);
        }
      }
    }
  }

  private async resetTile(): Promise<void> {
    const fallTasks: FallTask[] = [];
    const tileGrid = this.boardManager!.getTileGrid();
    const frameGrid = this.boardManager!.getFrameGrid();
    const tileCoords = this.boardManager!.getTileCoords();

    for (let x = 0; x < GameConfig.GridWidth; x++) {
      const columnTiles: Array<{ tile: Tile; currentY: number }> = [];

      for (let y = GameConfig.GridHeight - 1; y >= 0; y--) {
        if (tileGrid[y][x] !== undefined) {
          columnTiles.push({
            tile: tileGrid[y][x]!,
            currentY: y,
          });
        }
      }

      for (let y = 0; y < GameConfig.GridHeight; y++) {
        this.boardManager!.setTileAt(x, y, undefined);
      }

      for (let i = 0; i < columnTiles.length; i++) {
        const tileData = columnTiles[i];
        const targetY = GameConfig.GridHeight - 1 - i;

        this.boardManager!.setTileAt(x, targetY, tileData.tile);
        tileData.tile.setFrame(frameGrid[targetY][x]!);

        if (tileData.currentY === targetY) {
          continue;
        }

        fallTasks.push({
          tile: tileData.tile,
          fromY: tileData.currentY,
          toY: targetY,
          x: x,
          isNewTile: false,
        });
      }

      const emptySpaces = GameConfig.GridHeight - columnTiles.length;
      if (emptySpaces > 0) {
        const virtualTiles = this.boardManager!.getVirtualTilesForColumn(x, emptySpaces);

        for (let i = 0; i < virtualTiles.length; i++) {
          const targetY = GameConfig.GridHeight - columnTiles.length - 1 - i;
          const virtualTile = virtualTiles[i];

          this.boardManager!.setTileAt(x, targetY, virtualTile);

          virtualTile.addOnMouseDownCallback(this.tileDown.bind(this));
          virtualTile.addOnMouseUpCallback(this.tileDown.bind(this));

          virtualTile.setFrame(frameGrid[targetY][x]!);

          const startFromY = -(i + 1);

          fallTasks.push({
            tile: virtualTile,
            fromY: startFromY,
            toY: targetY,
            x: x,
            isNewTile: true,
          });
        }
      }
    }

    this.boardManager!.refillVirtualGrid();

    if (fallTasks.length === 0) {
      this.checkMatches();
      return;
    }

    await this.animationManager!.animateFall(fallTasks);

    this.checkMatches();
  }

  private tileUp(): void {
    this.firstSelectedTile?.changeState('idle');
    this.secondSelectedTile?.changeState('idle');

    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;
  }

  private removeTileGroup(matches: Tile[][]): Promise<void> {
    return new Promise<void>(async resolve => {
      const tileCoords = this.boardManager!.getTileCoords();
      let matchTiles: Tile[] = [];
      const totalTilesToDestroy = matches.reduce(
        (acc, match) => acc + (match.length >= 4 ? 0 : match.length),
        0
      );
      let tilesDestroyed = 0;

      const combineCallbacks: Array<() => void> = [];

      for (const match of matches) {
        if (match.length >= 4) {
          const centerTile = match[Math.floor(match.length / 2)];
          combineCallbacks.push(async () => {
            await this.specialTileManager!.createSpecialTile(
              centerTile,
              match.length === 4 ? SpecialTileType.BOMB : SpecialTileType.RAINBOW,
              match.filter(tile => tile !== centerTile)
            );
          });

          for (const tile of match) {
            if (tile === centerTile) continue;
            this.boardManager!.clearTileAt(tileCoords.get(tile)!.x, tileCoords.get(tile)!.y);
          }
        } else {
          matchTiles.push(...match);
        }
      }

      await Promise.all(combineCallbacks.map(callback => callback()));

      const destroyCallbacks: Array<() => void> = [];

      if (totalTilesToDestroy === 0) {
        resolve();
        return;
      }

      const onTileDestroyed = () => {
        tilesDestroyed++;
        if (tilesDestroyed >= totalTilesToDestroy) {
          resolve();
        }
      };

      for (const tile of matchTiles) {
        if (!tileCoords.has(tile)) continue;

        const coords = tileCoords.get(tile)!;

        if (coords.x === -1 && coords.y === -1) {
          continue;
        }

        const swapTile =
          tile === this.firstSelectedTile
            ? (this.secondSelectedTile ?? tile)
            : (this.firstSelectedTile ?? tile);

        if (tile.isSpecial()) {
          const isPlayerSwap = this.swappedTiles && this.swappedTiles.indexOf(tile) !== -1;

          const affectedTiles = this.specialTileManager!.activateSpecialTile(
            tile,
            swapTile,
            coords,
            isPlayerSwap
          );
          if (affectedTiles.length > 0) {
            matchTiles.push(...affectedTiles);
          }
        }

        destroyCallbacks.push(async () => {
          await tile.playDestroyAnimation();
          await tile.playParticleEffect();
          tile.node.destroy();
          onTileDestroyed();
        });

        this.boardManager!.clearTileAt(coords.x, coords.y);
      }

      await Promise.all(destroyCallbacks.map(callback => callback()));

      // Reset swapped tiles after processing
      this.swappedTiles = [];
    });
  }

  protected onDestroy(): void {}
}
