import { _decorator, Component, Camera } from 'cc';
const { ccclass, property } = _decorator;

import { GameConfig } from '../constants/GameConfig';
import { Tile } from './Tile';
import { GameGlobalData } from './GameGlobalData';
import { BoardManager } from './managers/BoardManager';
import { MatchManager } from './managers/MatchManager';
import { AnimationManager, FallTask } from './managers/AnimationManager';
import { InputManager } from './managers/InputManager';

@ccclass('GameManager')
export default class GameManager extends Component {
  @property(Camera)
  private camera: Camera | null = null;

  @property(BoardManager)
  private boardManager: BoardManager | null = null;

  @property(MatchManager)
  private matchManager: MatchManager | null = null;

  @property(AnimationManager)
  private animationManager: AnimationManager | null = null;

  @property(InputManager)
  private inputManager: InputManager | null = null;

  private playerIdleTime = 0;
  private currentTilesQuantity = GameConfig.GridWidth * GameConfig.GridHeight;
  private canMove = false;
  private firstSelectedTile: Tile | undefined = undefined;
  private secondSelectedTile: Tile | undefined = undefined;

  protected __preload(): void {
    if (!this.boardManager) throw new Error('BoardManager is required');
    if (!this.matchManager) throw new Error('MatchManager is required');
    if (!this.animationManager) throw new Error('AnimationManager is required');
    if (!this.inputManager) throw new Error('InputManager is required');
  }

  protected start(): void {
    this.initializeManagers();
    this.createBoard();
  }

  protected update(dt: number): void {
    this.checkIdleTime(dt);
  }

  private initializeManagers(): void {
    this.animationManager!.setBoardManager(this.boardManager!);
  }

  private createBoard(): void {
    this.canMove = false;
    GameGlobalData.getInstance().setIsMouseDown(true);
    this.boardManager!.initializeBoard();
    this.setupTileCallbacks();
    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;

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

      for (let i = columnTiles.length; i < GameConfig.GridHeight; i++) {
        const targetY = GameConfig.GridHeight - 1 - i;
        const newTile = this.boardManager!.createTileAt(x, targetY);

        newTile.addOnMouseDownCallback(this.tileDown.bind(this));
        newTile.addOnMouseUpCallback(this.tileDown.bind(this));

        newTile.setFrame(frameGrid[targetY][x]!);

        fallTasks.push({
          tile: newTile,
          fromY: -1,
          toY: targetY,
          x: x,
          isNewTile: true,
        });
      }
    }

    if (fallTasks.length === 0) {
      setTimeout(() => {
        this.checkMatches();
      }, 0);
      return;
    }

    await this.animationManager!.animateFall(fallTasks);

    setTimeout(() => {
      this.checkMatches();
    }, 0);
  }

  private tileUp(): void {
    this.firstSelectedTile?.changeState('idle');
    this.secondSelectedTile?.changeState('idle');

    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;
  }

  private removeTileGroup(matches: Tile[][]): Promise<void> {
    return new Promise<void>(resolve => {
      const tileCoords = this.boardManager!.getTileCoords();
      let match = [];
      let totalTilesToDestroy = 0;
      let tilesDestroyed = 0;

      for (let i = 0; i < matches.length; i++) {
        const tempArr = matches[i];

        for (let j = 0; j < tempArr.length; j++) {
          const tile = tempArr[j];

          if (!tile || !tileCoords.has(tile)) {
            continue;
          }

          const coords = tileCoords.get(tile)!;

          if (coords.x !== -1 && coords.y !== -1) {
            match.push(tile.getTileType());
            totalTilesToDestroy++;
          }
        }
      }

      console.log('match', match);

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

      for (let i = 0; i < matches.length; i++) {
        const tempArr = matches[i];

        for (let j = 0; j < tempArr.length; j++) {
          const tile = tempArr[j];

          if (!tile || !tileCoords.has(tile)) {
            continue;
          }

          const coords = tileCoords.get(tile)!;

          if (coords.x !== -1 && coords.y !== -1) {
            tile.playDestroyAnimation(() => {
              tile.playParticleEffect(() => {
                tile.node.destroy();
                onTileDestroyed();
              });
            });

            this.boardManager!.clearTileAt(coords.x, coords.y);
          }
        }
      }
    });
  }

  protected onDestroy(): void {}
}
