import {
  _decorator,
  Component,
  EventMouse,
  instantiate,
  Prefab,
  tween,
  Vec3,
  type Node,
  Camera,
} from 'cc';
const { ccclass, property } = _decorator;
import { GameConfig } from '../constants/GameConfig';
import { Tile } from './Tile';
import { Frame } from './Frame';
import { GameGlobalData } from './GameGlobalData';

@ccclass('GameManager')
export default class GameManager extends Component {
  private canMove = false;

  private tileGrid: (Tile | undefined)[][] = [];
  private frameGrid: (Frame | undefined)[][] = [];

  private tileCoords: Map<Tile, { x: number; y: number }> = new Map();

  private firstSelectedTile: Tile | undefined = undefined;
  private secondSelectedTile: Tile | undefined = undefined;

  private maxDifference = 6;
  private currentTilesQuantity = GameConfig.GridWidth * GameConfig.GridHeight;
  private playerIdleTime = 0;

  @property(Prefab)
  private tilePrefab: Prefab | null = null;

  @property(Camera)
  private camera: Camera | null = null;

  @property(Prefab)
  private framePrefab: Prefab | null = null;

  __preload(): void {
    if (this.tilePrefab === null) throw new Error('Tile prefab is not set');
    if (this.framePrefab === null) throw new Error('Frame prefab is not set');
  }

  start(): void {
    this.createBoard();
  }

  update(dt: number): void {
    this.checkIdleTime(dt);
  }

  private checkIdleTime(dt: number): void {
    this.playerIdleTime += dt;
    console.log('player idle time', this.playerIdleTime);
    if (this.playerIdleTime > GameConfig.MaxIdleTime) {
      this.makeTilesIdleAnimation();
      this.playerIdleTime = 0;
    }
  }

  private async makeTilesIdleAnimation(): Promise<void> {
    for (let i = 0; i < GameConfig.GridHeight; i++) {
      for (let j = 0, x = i; j <= i && x >= 0; j++, x--) {
        const tile = this.tileGrid[x][j];
        if (tile) {
          tile.onPlayerIdle();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    for (let j = 1; j < GameConfig.GridWidth; j++) {
      for (let i = j, y = GameConfig.GridHeight - 1; i < GameConfig.GridWidth && y >= 0; i++, y--) {
        const tile = this.tileGrid[y][i];
        if (tile) {
          tile.onPlayerIdle();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private createBoard() {
    this.canMove = true;
    this.tileGrid = [];
    this.frameGrid = [];

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      this.frameGrid[y] = [];
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        this.frameGrid[y][x] = this.addFrame(x, y);
      }
    }

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      this.tileGrid[y] = [];
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        this.tileGrid[y][x] = this.addTile(x, y);
      }
    }

    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;

    this.checkMatches();
  }

  private addFrame(x: number, y: number): Frame {
    const frameNode = instantiate(this.framePrefab) as Node | null;
    if (frameNode === null) throw new Error('Failed to instantiate frame prefab');

    const frame = frameNode.getComponent(Frame);
    if (frame === null) throw new Error('Failed to get Frame component');

    const { x: xPos, y: yPos } = this.getTilePosition({ x, y });
    frameNode.setPosition(xPos, yPos);

    frame.setSpriteFrame((x + y) % 2);

    this.node?.addChild(frameNode);

    frame.setTweenDuration(0.15);

    return frame;
  }

  private addTile(x: number, y: number): Tile {
    const randomTileType =
      GameConfig.CandyTypes[
        Math.floor(Math.random() * Math.min(this.maxDifference, GameConfig.CandyTypes.length))
      ];

    const node = instantiate(this.tilePrefab) as Node | null;

    if (node === null) throw new Error('Failed to instantiate tile prefab');

    const tile = node.getComponent(Tile) as Tile | null;

    if (tile === null) throw new Error('Failed to get tile component');

    this.node?.addChild(node);

    tile.setTileType(randomTileType);

    const { x: xPos, y: yPos } = this.getTilePosition({ x, y });
    node.setPosition(xPos, yPos);

    const correspondingFrame = this.frameGrid[y][x];
    if (correspondingFrame) {
      tile.setFrame(correspondingFrame);
    }

    tile.addOnMouseDownCallback(tile => this.tileDown(tile));
    tile.addOnMouseUpCallback(tile => this.tileDown(tile));

    this.tileCoords.set(tile, { x, y });

    return tile;
  }

  private tileDown(tile: Tile): void {
    if (!this.canMove) return;

    this.playerIdleTime = 0;

    if (!this.firstSelectedTile || this.firstSelectedTile === tile) {
      this.firstSelectedTile = tile;
      tile.selectTile();
    } else {
      this.secondSelectedTile = tile;

      const firstCoords = this.tileCoords.get(this.firstSelectedTile)!;
      const secondCoords = this.tileCoords.get(this.secondSelectedTile)!;

      const dx = Math.abs(firstCoords.x - secondCoords.x);
      const dy = Math.abs(firstCoords.y - secondCoords.y);

      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        this.canMove = false;
        this.swapTiles();
      } else {
        this.firstSelectedTile.deselectTile();
        this.firstSelectedTile = tile;
        tile.selectTile();
        this.secondSelectedTile = undefined;
      }
    }
  }

  private getTilePosition(coords: { x: number; y: number }): { x: number; y: number } {
    return {
      x:
        (-GameConfig.GridWidth * GameConfig.TileWidth) / 2 +
        GameConfig.TileWidth / 2 +
        coords.x * GameConfig.TileWidth,
      y: -(
        (-GameConfig.GridHeight * GameConfig.TileHeight) / 2 +
        GameConfig.TileHeight / 2 +
        coords.y * GameConfig.TileHeight
      ),
    };
  }

  private swapTiles(): void {
    if (this.firstSelectedTile && this.secondSelectedTile) {
      if (
        !this.firstSelectedTile.node ||
        !this.firstSelectedTile.node.isValid ||
        !this.secondSelectedTile.node ||
        !this.secondSelectedTile.node.isValid
      ) {
        console.error('Selected tiles are no longer valid');
        this.tileUp();
        this.canMove = true;
        return;
      }

      const firstSelectedTileCoords = this.tileCoords.get(this.firstSelectedTile);
      const secondSelectedTileCoords = this.tileCoords.get(this.secondSelectedTile);

      this.tileGrid[firstSelectedTileCoords!.y][firstSelectedTileCoords!.x] =
        this.secondSelectedTile;

      this.tileGrid[secondSelectedTileCoords!.y][secondSelectedTileCoords!.x] =
        this.firstSelectedTile;

      this.tileCoords.set(this.secondSelectedTile, {
        x: firstSelectedTileCoords!.x,
        y: firstSelectedTileCoords!.y,
      });
      this.tileCoords.set(this.firstSelectedTile, {
        x: secondSelectedTileCoords!.x,
        y: secondSelectedTileCoords!.y,
      });

      this.firstSelectedTile.node.setSiblingIndex(this.node.children.length);

      tween(this.firstSelectedTile.node)
        .to(
          0.15,
          {
            position: new Vec3(
              this.secondSelectedTile.node.x,
              this.secondSelectedTile.node.y,
              this.firstSelectedTile.node.position.z
            ),
            scale: new Vec3(1.85, 1.85, 1.0),
          },
          {
            easing: 'linear',
          }
        )
        .to(
          0.15,
          {
            scale: new Vec3(1.0, 1.0, 1.0),
          },
          {
            easing: 'linear',
          }
        )
        .start();

      tween(this.secondSelectedTile.node)
        .to(
          0.3,
          {
            position: new Vec3(
              this.firstSelectedTile.node.x,
              this.firstSelectedTile.node.y,
              this.secondSelectedTile.node.position.z
            ),
          },
          {
            easing: 'linear',
          }
        )
        .call(() => {
          this.checkMatches(true);
        })
        .start();

      this.firstSelectedTile =
        this.tileGrid[firstSelectedTileCoords!.y][firstSelectedTileCoords!.x];

      this.secondSelectedTile =
        this.tileGrid[secondSelectedTileCoords!.y][secondSelectedTileCoords!.x];

      if (!this.firstSelectedTile || !this.secondSelectedTile) return;

      this.tileCoords.set(this.firstSelectedTile, {
        x: firstSelectedTileCoords!.x,
        y: firstSelectedTileCoords!.y,
      });
      this.tileCoords.set(this.secondSelectedTile, {
        x: secondSelectedTileCoords!.x,
        y: secondSelectedTileCoords!.y,
      });
    } else {
      this.canMove = true;
      GameGlobalData.getInstance().setIsMouseDown(false);
    }
  }

  private checkMatches(isSwapCheck: boolean = false): void {
    const matches = this.getMatches(this.tileGrid);

    if (matches.length > 0) {
      this.removeTileGroup(matches);
      this.tileUp();
      this.resetTile();
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
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        this.tileGrid[y][x]!.setFrame(this.frameGrid[y][x]!);
      }
    }
  }

  private resetTile(): void {
    const fallTasks: Array<{
      tile: Tile;
      fromY: number;
      toY: number;
      x: number;
      isNewTile: boolean;
    }> = [];

    for (let x = 0; x < GameConfig.GridWidth; x++) {
      const columnTiles: Array<{ tile: Tile; currentY: number }> = [];

      for (let y = GameConfig.GridHeight - 1; y >= 0; y--) {
        if (this.tileGrid[y][x] !== undefined) {
          columnTiles.push({
            tile: this.tileGrid[y][x]!,
            currentY: y,
          });
        }
      }

      for (let y = 0; y < GameConfig.GridHeight; y++) {
        this.tileGrid[y][x] = undefined;
      }

      for (let i = 0; i < columnTiles.length; i++) {
        const tileData = columnTiles[i];
        const targetY = GameConfig.GridHeight - 1 - i;

        this.tileGrid[targetY][x] = tileData.tile;
        this.tileCoords.set(tileData.tile, { x, y: targetY });
        tileData.tile.setFrame(this.frameGrid[targetY][x]!);

        if (tileData.currentY !== targetY) {
          fallTasks.push({
            tile: tileData.tile,
            fromY: tileData.currentY,
            toY: targetY,
            x: x,
            isNewTile: false,
          });
        }
      }

      for (let i = columnTiles.length; i < GameConfig.GridHeight; i++) {
        const targetY = GameConfig.GridHeight - 1 - i;
        const newTile = this.addTile(x, targetY);

        this.tileGrid[targetY][x] = newTile;
        this.tileCoords.set(newTile, { x, y: targetY });
        newTile.setFrame(this.frameGrid[targetY][x]!);

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
      }, 100);
      return;
    }

    fallTasks.forEach(task => {
      const { tile, fromY, toY, x, isNewTile } = task;
      const finalPosition = this.getTilePosition({ x, y: toY });

      if (isNewTile) {
        const spawnHeight = (GameConfig.GridHeight - toY + 1) * GameConfig.TileHeight;
        const startY = finalPosition.y + spawnHeight;
        tile.node.setPosition(finalPosition.x, startY, 0);
        tile.node.setScale(0.8, 0.8, 1.0);
      } else {
        const currentPosition = this.getTilePosition({ x, y: fromY });
        tile.node.setPosition(currentPosition.x, currentPosition.y, 0);
      }
    });

    const fallDuration = 0.6;
    const animationPromises: Promise<void>[] = [];

    fallTasks.forEach(task => {
      const { tile, toY, x, isNewTile } = task;
      const finalPosition = this.getTilePosition({ x, y: toY });

      const animationPromise = new Promise<void>(resolve => {
        let tweenChain = tween(tile.node);

        if (isNewTile) {
          tweenChain = tweenChain.to(
            0.1,
            {
              scale: new Vec3(1.0, 1.0, 1.0),
            },
            { easing: 'backOut' }
          );
        }

        tweenChain
          .to(
            fallDuration,
            {
              position: new Vec3(finalPosition.x, finalPosition.y, 0),
            },
            {
              easing: 'quartIn',
            }
          )

          .to(
            0.1,
            {
              scale: new Vec3(1.05, 0.95, 1.0),
            },
            { easing: 'quadOut' }
          )
          .to(
            0.1,
            {
              scale: new Vec3(1.0, 1.0, 1.0),
            },
            { easing: 'backOut' }
          )
          .call(() => {
            resolve();
          })
          .start();
      });

      animationPromises.push(animationPromise);
    });

    Promise.all(animationPromises).then(() => {
      setTimeout(() => {
        this.checkMatches();
      }, 200);
    });
  }

  private tileUp(): void {
    if (this.firstSelectedTile) this.firstSelectedTile.deselectTile();
    if (this.secondSelectedTile) this.secondSelectedTile.deselectTile();

    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;
  }

  private removeTileGroup(matches: Tile[][]): void {
    let match = [];
    for (let i = 0; i < matches.length; i++) {
      const tempArr = matches[i];

      for (let j = 0; j < tempArr.length; j++) {
        const tile = tempArr[j];

        if (!tile || !this.tileCoords.has(tile)) {
          continue;
        }

        const tileCoords = this.tileCoords.get(tile)!;

        if (tileCoords.x !== -1 && tileCoords.y !== -1) {
          match.push(tile.getTileType());
          if (tile.node && tile.node.isValid) {
            tile.node.destroy();
          }

          this.tileGrid[tileCoords.y][tileCoords.x] = undefined;
          this.tileCoords.delete(tile);
          this.currentTilesQuantity--;
        }
      }
    }

    console.log('match', match);
  }

  private getMatches(tileGrid: (Tile | undefined)[][]): Tile[][] {
    let matches: Tile[][] = [];
    let groups: Tile[] = [];

    for (let y = 0; y < tileGrid.length; y++) {
      let tempArray = tileGrid[y];
      groups = [];
      for (let x = 0; x < tempArray.length; x++) {
        if (x < tempArray.length - 2) {
          if (tileGrid[y][x] && tileGrid[y][x + 1] && tileGrid[y][x + 2]) {
            if (
              tileGrid[y][x]!.getTileType() === tileGrid[y][x + 1]!.getTileType() &&
              tileGrid[y][x + 1]!.getTileType() === tileGrid[y][x + 2]!.getTileType()
            ) {
              if (groups.length > 0) {
                if (groups.indexOf(tileGrid[y][x]!) === -1) {
                  matches.push(groups);
                  groups = [];
                }
              }

              if (groups.indexOf(tileGrid[y][x]!) === -1) {
                groups.push(tileGrid[y][x]!);
              }

              if (groups.indexOf(tileGrid[y][x + 1]!) === -1) {
                groups.push(tileGrid[y][x + 1]!);
              }

              if (groups.indexOf(tileGrid[y][x + 2]!) === -1) {
                groups.push(tileGrid[y][x + 2]!);
              }
            }
          }
        }
      }

      if (groups.length > 0) {
        matches.push(groups);
      }
    }

    for (let j = 0; j < tileGrid.length; j++) {
      const tempArr = tileGrid[j];
      groups = [];
      for (let i = 0; i < tempArr.length; i++) {
        if (i < tempArr.length - 2)
          if (tileGrid[i][j] && tileGrid[i + 1][j] && tileGrid[i + 2][j]) {
            if (
              tileGrid[i][j]!.getTileType() === tileGrid[i + 1][j]!.getTileType() &&
              tileGrid[i + 1][j]!.getTileType() === tileGrid[i + 2][j]!.getTileType()
            ) {
              if (groups.length > 0) {
                if (groups.indexOf(tileGrid[i][j]!) === -1) {
                  matches.push(groups);
                  groups = [];
                }
              }

              if (groups.indexOf(tileGrid[i][j]!) === -1) {
                groups.push(tileGrid[i][j]!);
              }
              if (groups.indexOf(tileGrid[i + 1][j]!) === -1) {
                groups.push(tileGrid[i + 1][j]!);
              }
              if (groups.indexOf(tileGrid[i + 2][j]!) === -1) {
                groups.push(tileGrid[i + 2][j]!);
              }
            }
          }
      }
      if (groups.length > 0) matches.push(groups);
    }

    return matches;
  }

  protected onDestroy(): void {}
}
