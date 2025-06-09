import {
  _decorator,
  Component,
  EventMouse,
  Input,
  instantiate,
  Prefab,
  tween,
  Vec3,
  type Node,
  Camera,
  UITransform,
} from 'cc';
const { ccclass, property } = _decorator;
import GameConfig from '../constants/GameConfig';
import { Tile } from './Tile';
import { Frame } from './Frame';
import { CONFIG } from './animation-handler/TileAnimationConfig';
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

    this.node?.addChild(frameNode);

    frame.setTweenDuration(0.15);

    return frame;
  }

  private addTile(x: number, y: number): Tile {
    const randomTileType: string = this.getRandomTileType();

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

  private getRandomTileType(): string {
    let randomTileType: string =
      GameConfig.CandyTypes[Math.floor(Math.random() * this.maxDifference)];

    return randomTileType;
  }

  private tileDown(tile: Tile): void {
    if (!this.canMove) return;

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
    const fallDelayBase = 0.05;
    let animationPromises: Promise<void>[] = [];
    let anyTilesMoved = false;

    let tilesToMove: Array<{ tile: Tile; fromY: number; toY: number; x: number }> = [];

    for (let x = 0; x < GameConfig.GridWidth; x++) {
      let writeIndex = GameConfig.GridHeight - 1;

      for (let y = GameConfig.GridHeight - 1; y >= 0; y--) {
        if (this.tileGrid[y][x] !== undefined) {
          if (y !== writeIndex) {
            tilesToMove.push({
              tile: this.tileGrid[y][x]!,
              fromY: y,
              toY: writeIndex,
              x: x,
            });
            anyTilesMoved = true;
          }
          writeIndex--;
        }
      }
    }

    tilesToMove.forEach((moveData, index) => {
      const { tile, fromY, toY, x } = moveData;

      this.tileGrid[fromY][x] = undefined;
      this.tileGrid[toY][x] = tile;

      this.tileCoords.set(tile, { x, y: toY });

      tile.setFrame(this.frameGrid[toY][x]!);

      const { y: yPos } = this.getTilePosition({ x, y: toY });
      const fallDelay = index * fallDelayBase;
      const fallDistance = Math.abs(toY - fromY);

      const animationPromise = new Promise<void>(resolve => {
        tween(tile.node)
          .delay(fallDelay)
          .to(
            0.3 + fallDistance * 0.05,
            {
              position: new Vec3(tile.node.x, yPos, tile.node.position.z),
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
            {
              easing: 'quadOut',
            }
          )
          .to(
            0.1,
            {
              scale: new Vec3(1.0, 1.0, 1.0),
            },
            {
              easing: 'backOut',
            }
          )
          .call(() => {
            resolve();
          })
          .start();
      });

      animationPromises.push(animationPromise);
    });

    if (anyTilesMoved) {
      Promise.all(animationPromises).then(() => {
        setTimeout(() => {
          this.fillTile();
        }, 0);
      });
    } else {
      this.fillTile();
    }
  }

  private fillTile(): void {
    const spawnHeight = GameConfig.TileHeight * 2;
    const fallDelayBase = 0.08;
    let columnDelays: number[] = new Array(GameConfig.GridWidth).fill(0);

    for (let x = 0; x < GameConfig.GridWidth; x++) {
      for (let y = 0; y < GameConfig.GridHeight; y++) {
        if (this.tileGrid[y][x] === undefined) {
          const tile = this.addTile(x, y);
          this.tileGrid[y][x] = tile;

          this.tileCoords.set(tile, { x, y });

          const finalPosition = this.getTilePosition({ x, y });

          const spawnY = finalPosition.y + spawnHeight + columnDelays[x] * GameConfig.TileHeight;
          tile.node.setPosition(finalPosition.x, spawnY, 0);

          tile.node.setScale(0.5, 0.5, 1.0);

          const fallDelay = columnDelays[x] * fallDelayBase;
          columnDelays[x]++;

          tween(tile.node)
            .delay(fallDelay)

            .to(
              0.1,
              {
                scale: new Vec3(1.0, 1.0, 1.0),
              },
              { easing: 'backOut' }
            )

            .to(
              0.4 + columnDelays[x] * 0.05,
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
                scale: new Vec3(1.1, 0.9, 1.0),
              },
              { easing: 'quadOut' }
            )
            .to(
              0.15,
              {
                scale: new Vec3(0.95, 1.05, 1.0),
              },
              { easing: 'quadInOut' }
            )
            .to(
              0.1,
              {
                scale: new Vec3(1.0, 1.0, 1.0),
              },
              { easing: 'backOut' }
            )
            .start();
        }
      }
    }

    setTimeout(() => {
      this.checkMatches();
    }, 800);
  }

  private tileUp(): void {
    if (this.firstSelectedTile) this.firstSelectedTile.deselectTile();
    if (this.secondSelectedTile) this.secondSelectedTile.deselectTile();

    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;
  }

  private removeTileGroup(matches: Tile[][]): void {
    for (let i = 0; i < matches.length; i++) {
      const tempArr = matches[i];

      for (let j = 0; j < tempArr.length; j++) {
        const tile = tempArr[j];

        if (!tile || !this.tileCoords.has(tile)) {
          continue;
        }

        const tileCoords = this.tileCoords.get(tile)!;

        if (tileCoords.x !== -1 && tileCoords.y !== -1) {
          if (tile.node && tile.node.isValid) {
            tile.node.destroy();
          }

          this.tileGrid[tileCoords.y][tileCoords.x] = undefined;
          this.tileCoords.delete(tile);
          this.currentTilesQuantity--;
        }
      }
    }
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
