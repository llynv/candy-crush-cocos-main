import { _decorator, Component, instantiate, Prefab, type Node } from 'cc';
const { ccclass, property } = _decorator;
import { GameConfig } from '../../constants/GameConfig';
import { Tile } from '../Tile';
import { Frame } from '../Frame';

export interface GridPosition {
  x: number;
  y: number;
}

@ccclass('BoardManager')
export class BoardManager extends Component {
  @property(Prefab)
  private tilePrefab: Prefab | null = null;

  @property(Prefab)
  private framePrefab: Prefab | null = null;

  private tileGrid: (Tile | undefined)[][] = [];
  private frameGrid: (Frame | undefined)[][] = [];
  private tileCoords: Map<Tile, GridPosition> = new Map();
  private maxDifference = 6;

  protected __preload(): void {
    if (this.tilePrefab === null) throw new Error('Tile prefab is not set');
    if (this.framePrefab === null) throw new Error('Frame prefab is not set');
  }

  public initializeBoard(): void {
    this.createFrames();
    this.createTiles();
  }

  public getTileGrid(): (Tile | undefined)[][] {
    return this.tileGrid;
  }

  public getFrameGrid(): (Frame | undefined)[][] {
    return this.frameGrid;
  }

  public getTileCoords(): Map<Tile, GridPosition> {
    return this.tileCoords;
  }

  public getTileAt(x: number, y: number): Tile | undefined {
    if (y >= 0 && y < this.tileGrid.length && x >= 0 && x < this.tileGrid[y].length) {
      return this.tileGrid[y][x];
    }
    return undefined;
  }

  public setTileAt(x: number, y: number, tile: Tile | undefined): void {
    if (y >= 0 && y < this.tileGrid.length && x >= 0 && x < this.tileGrid[y].length) {
      this.tileGrid[y][x] = tile;
      if (tile) {
        this.tileCoords.set(tile, { x, y });
      }
    }
  }

  public getWorldPosition(gridPos: GridPosition): { x: number; y: number } {
    return {
      x:
        (-GameConfig.GridWidth * GameConfig.TileWidth) / 2 +
        GameConfig.TileWidth / 2 +
        gridPos.x * GameConfig.TileWidth,
      y: -(
        (-GameConfig.GridHeight * GameConfig.TileHeight) / 2 +
        GameConfig.TileHeight / 2 +
        gridPos.y * GameConfig.TileHeight
      ),
    };
  }

  public createTileAt(x: number, y: number): Tile {
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

    const { x: xPos, y: yPos } = this.getWorldPosition({ x, y });
    node.setPosition(xPos, yPos);

    const correspondingFrame = this.frameGrid[y][x];
    if (correspondingFrame) {
      tile.setFrame(correspondingFrame);
    }

    this.tileCoords.set(tile, { x, y });
    this.tileGrid[y][x] = tile;

    return tile;
  }

  public clearTileAt(x: number, y: number): void {
    const tile = this.tileGrid[y][x];
    if (tile) {
      this.tileCoords.delete(tile);
      this.tileGrid[y][x] = undefined;
    }
  }

  private createFrames(): void {
    this.frameGrid = [];
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      this.frameGrid[y] = [];
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        this.frameGrid[y][x] = this.createFrame(x, y);
      }
    }
  }

  private createTiles(): void {
    this.tileGrid = [];
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      this.tileGrid[y] = [];
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        this.tileGrid[y][x] = this.createTileAt(x, y);
      }
    }
  }

  private createFrame(x: number, y: number): Frame {
    const frameNode = instantiate(this.framePrefab) as Node | null;
    if (frameNode === null) throw new Error('Failed to instantiate frame prefab');

    const frame = frameNode.getComponent(Frame);
    if (frame === null) throw new Error('Failed to get Frame component');

    const { x: xPos, y: yPos } = this.getWorldPosition({ x, y });
    frameNode.setPosition(xPos, yPos);

    frame.setSpriteFrame((x + y) % 2);
    this.node?.addChild(frameNode);
    frame.setTweenDuration(0.15);

    return frame;
  }
}
