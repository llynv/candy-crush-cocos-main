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

  private virtualGrid: (Tile | undefined)[][] = [];
  private tileCoords: Map<Tile, GridPosition> = new Map();
  private maxDifference = 4;

  private readonly VIRTUAL_GRID_HEIGHT = GameConfig.GridHeight;

  protected __preload(): void {
    if (this.tilePrefab === null) throw new Error('Tile prefab is not set');
    if (this.framePrefab === null) throw new Error('Frame prefab is not set');
  }

  public setTilePrefab(tilePrefab: Prefab): void {
    this.tilePrefab = tilePrefab;
  }

  public setFramePrefab(framePrefab: Prefab): void {
    this.framePrefab = framePrefab;
  }

  public createFrames(): void {
    this.frameGrid = [];
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      this.frameGrid[y] = [];
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        this.frameGrid[y][x] = this.createFrame(x, y);
      }
    }
  }

  public initializeBoard(): void {
    this.createTiles();
    this.initializeVirtualGrid();
  }

  public getTileGrid(): (Tile | undefined)[][] {
    return this.tileGrid;
  }

  public getFrameGrid(): (Frame | undefined)[][] {
    return this.frameGrid;
  }

  public getVirtualGrid(): (Tile | undefined)[][] {
    return this.virtualGrid;
  }

  public getVirtualGridHeight(): number {
    return this.VIRTUAL_GRID_HEIGHT;
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

  public getVirtualTileAt(x: number, y: number): Tile | undefined {
    if (y >= 0 && y < this.virtualGrid.length && x >= 0 && x < this.virtualGrid[y].length) {
      return this.virtualGrid[y][x];
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

  public setVirtualTileAt(x: number, y: number, tile: Tile | undefined): void {
    if (y >= 0 && y < this.virtualGrid.length && x >= 0 && x < this.virtualGrid[y].length) {
      this.virtualGrid[y][x] = tile;
      if (tile) {
        this.tileCoords.set(tile, { x, y: -(y + 1) });
      }
    }
  }

  public getWorldPosition(gridPos: GridPosition): { x: number; y: number } {
    return {
      x:
        (-GameConfig.GridWidth * GameConfig.TileWidth) / 2 +
        GameConfig.TileWidth / 2 +
        gridPos.x * GameConfig.TileWidth +
        GameConfig.OffsetX,
      y: -(
        (-GameConfig.GridHeight * GameConfig.TileHeight) / 2 +
        GameConfig.TileHeight / 2 +
        gridPos.y * GameConfig.TileHeight +
        GameConfig.OffsetY
      ),
    };
  }

  public getVirtualWorldPosition(gridPos: GridPosition): { x: number; y: number } {
    return {
      x:
        (-GameConfig.GridWidth * GameConfig.TileWidth) / 2 +
        GameConfig.TileWidth / 2 +
        gridPos.x * GameConfig.TileWidth,
      y: -(
        (-GameConfig.GridHeight * GameConfig.TileHeight) / 2 +
        GameConfig.TileHeight / 2 +
        (-gridPos.y - this.VIRTUAL_GRID_HEIGHT) * GameConfig.TileHeight
      ),
    };
  }

  public getNeighbors(gridPos: GridPosition): Tile[] {
    const neighbors: Tile[] = [];
    const { x, y } = gridPos;

    if (x > 0 && this.getTileAt(x - 1, y)) neighbors.push(this.getTileAt(x - 1, y)!);
    if (x < GameConfig.GridWidth - 1 && this.getTileAt(x + 1, y))
      neighbors.push(this.getTileAt(x + 1, y)!);
    if (y > 0 && this.getTileAt(x, y - 1)) neighbors.push(this.getTileAt(x, y - 1)!);
    if (y < GameConfig.GridHeight - 1 && this.getTileAt(x, y + 1))
      neighbors.push(this.getTileAt(x, y + 1)!);

    return neighbors;
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

  public createVirtualTileAt(x: number, y: number): Tile {
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

    const { x: xPos, y: yPos } = this.getVirtualWorldPosition({ x, y });
    node.setPosition(xPos, yPos);

    node.active = false;

    this.tileCoords.set(tile, { x, y: -(y + 1) });
    this.virtualGrid[y][x] = tile;

    return tile;
  }

  public moveVirtualTileToMainGrid(
    virtualX: number,
    virtualY: number,
    mainX: number,
    mainY: number
  ): Tile | null {
    const virtualTile = this.getVirtualTileAt(virtualX, virtualY);
    if (!virtualTile) return null;

    this.setVirtualTileAt(virtualX, virtualY, undefined);

    this.setTileAt(mainX, mainY, virtualTile);

    const correspondingFrame = this.frameGrid[mainY][mainX];
    if (correspondingFrame) {
      virtualTile.setFrame(correspondingFrame);
    }

    return virtualTile;
  }

  public getVirtualTilesForColumn(x: number, count: number): Tile[] {
    const tiles: Tile[] = [];
    let collected = 0;

    for (let y = this.VIRTUAL_GRID_HEIGHT - 1; y >= 0 && collected < count; y--) {
      const tile = this.getVirtualTileAt(x, y);
      if (tile) {
        tile.node.active = true;

        const fallStartY = -(collected + 1);
        const worldPos = this.getWorldPosition({ x, y: fallStartY });
        tile.node.setPosition(worldPos.x, worldPos.y, 0);

        tiles.push(tile);
        this.setVirtualTileAt(x, y, undefined);
        collected++;
      }
    }

    return tiles;
  }

  public refillVirtualGrid(): void {
    for (let x = 0; x < GameConfig.GridWidth; x++) {
      for (let y = 0; y < this.VIRTUAL_GRID_HEIGHT; y++) {
        if (!this.getVirtualTileAt(x, y)) {
          const newVirtualTile = this.createVirtualTileAt(x, y);

          newVirtualTile.node.active = false;
        }
      }
    }
  }

  public clearTileAt(x: number, y: number): void {
    const tile = this.tileGrid[y][x];
    if (tile) {
      this.tileCoords.delete(tile);
      this.tileGrid[y][x] = undefined;
    }
  }

  private initializeVirtualGrid(): void {
    this.virtualGrid = [];
    for (let y = 0; y < this.VIRTUAL_GRID_HEIGHT; y++) {
      this.virtualGrid[y] = [];
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        this.virtualGrid[y][x] = this.createVirtualTileAt(x, y);
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
