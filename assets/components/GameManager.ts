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

@ccclass('GameManager')
export default class GameManager extends Component {
  private canMove = false;

  private tileGrid: (Tile | undefined)[][] = [];

  private firstSelectedTile: Tile | undefined = undefined;
  private secondSelectedTile: Tile | undefined = undefined;

  @property(Prefab)
  private tilePrefab: Prefab | null = null;

  @property(Camera)
  private camera: Camera | null = null;

  __preload(): void {
    if (this.tilePrefab === null) throw new Error('Tile prefab is not set');
  }

  start(): void {
    this.createBoard();
  }

  private createBoard() {
    this.canMove = true;
    this.tileGrid = [];

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

  private addTile(x: number, y: number): Tile {
    const randomTileType: string =
      GameConfig.CandyTypes[Math.floor(Math.random() * GameConfig.CandyTypes.length)];

    const node = instantiate(this.tilePrefab) as Node | null;

    if (node === null) throw new Error('Failed to instantiate tile prefab');

    const tile = node.getComponent(Tile) as Tile | null;

    if (tile === null) throw new Error('Failed to get tile component');

    this.node?.addChild(node);

    tile.setTileType(randomTileType);

    const { x: xPos, y: yPos } = this.getTilePosition({ x, y });
    node.setPosition(xPos, yPos);

    tile.addOnMouseDownCallback(tile => this.tileDown(tile));
    tile.addOnMouseUpCallback(tile => this.tileDown(tile));

    return tile;
  }

  private tileDown(tile: Tile): void {
    if (!this.canMove) return;

    if (!this.firstSelectedTile || this.firstSelectedTile === tile) {
      this.firstSelectedTile = tile;
      tile.selectTile();
    } else {
      this.secondSelectedTile = tile;

      console.log(
        `tiles: ${this.firstSelectedTile.getTileType()} and ${this.secondSelectedTile.getTileType()}`
      );

      const firstCoords = this.getTileCoords(this.firstSelectedTile);
      const secondCoords = this.getTileCoords(this.secondSelectedTile);

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

      console.log(
        `tiles: ${this.firstSelectedTile.getTileType()} and ${this.secondSelectedTile?.getTileType()}`
      );
    }
  }

  private getTilePosition(coords: { x: number; y: number }): { x: number; y: number } {
    return {
      x:
        (-GameConfig.GridWidth * GameConfig.TileWidth) / 2 +
        GameConfig.TileWidth / 2 +
        coords.x * GameConfig.TileWidth,
      y:
        // Invert y coordinate since game world coordinates are inverted (positive y is up)
        -(
          (-GameConfig.GridHeight * GameConfig.TileHeight) / 2 +
          GameConfig.TileHeight / 2 +
          coords.y * GameConfig.TileHeight
        ),
    };
  }

  private getTileCoords(tile: Tile): { x: number; y: number } {
    for (let y = 0; y < this.tileGrid.length; y++) {
      for (let x = 0; x < this.tileGrid[y].length; x++) {
        if (this.tileGrid[y][x] === tile) {
          return { x, y };
        }
      }
    }

    throw new Error('Tile not found');
  }

  private swapTiles(): void {
    if (this.firstSelectedTile && this.secondSelectedTile) {
      const firstSelectedTileCoords = this.getTileCoords(this.firstSelectedTile);
      const secondSelectedTileCoords = this.getTileCoords(this.secondSelectedTile);

      this.tileGrid[firstSelectedTileCoords.y][firstSelectedTileCoords.x] = this.secondSelectedTile;

      this.tileGrid[secondSelectedTileCoords.y][secondSelectedTileCoords.x] =
        this.firstSelectedTile;

      tween(this.firstSelectedTile.node)
        .to(
          0.4,
          {
            position: new Vec3(
              this.secondSelectedTile.node.x,
              this.secondSelectedTile.node.y,
              this.firstSelectedTile.node.position.z
            ),
          },
          {
            easing: 'linear',
          }
        )
        .start();

      tween(this.secondSelectedTile.node)
        .to(
          0.4,
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
          this.checkMatches();
        })
        .start();

      this.firstSelectedTile = this.tileGrid[firstSelectedTileCoords.y][firstSelectedTileCoords.x];

      this.secondSelectedTile =
        this.tileGrid[secondSelectedTileCoords.y][secondSelectedTileCoords.x];

      if (this.firstSelectedTile) this.firstSelectedTile.changeState('idle');
      if (this.secondSelectedTile) this.secondSelectedTile.changeState('idle');
    }
  }

  private checkMatches(): void {
    const matches = this.getMatches(this.tileGrid);

    if (matches.length > 0) {
      this.removeTileGroup(matches);
      this.resetTile();
      this.fillTile();
      this.tileUp();
      this.checkMatches();
    } else {
      this.swapTiles();
      this.tileUp();
      this.canMove = true;
    }
  }

  private resetTile(): void {
    for (let x = GameConfig.GridWidth - 1; x >= 0; x--) {
      for (let y = GameConfig.GridHeight - 1; y > 0; y--) {
        if (this.tileGrid[y][x] === undefined && this.tileGrid[y - 1][x] !== undefined) {
          const tempTile = this.tileGrid[y - 1][x]!;
          this.tileGrid[y][x] = tempTile;
          this.tileGrid[y - 1][x] = undefined;

          const { y: yPos } = this.getTilePosition({ x, y });

          tween(tempTile.node)
            .to(
              0.2,
              {
                position: new Vec3(tempTile.node.x, yPos, tempTile.node.position.z),
              },
              {
                easing: 'linear',
              }
            )
            .start();

          y = GameConfig.GridHeight;
        }
      }
    }
  }

  private fillTile(): void {
    for (let y = 0; y < this.tileGrid.length; y++) {
      for (let x = 0; x < this.tileGrid[y].length; x++) {
        if (this.tileGrid[y][x] === undefined) {
          const tile = this.addTile(x, y);
          this.tileGrid[y][x] = tile;
        }
      }
    }
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
        const tileCoords = this.getTileCoords(tile);

        if (tileCoords.x !== -1 && tileCoords.y !== -1) {
          tile.node.destroy();
          this.tileGrid[tileCoords.y][tileCoords.x] = undefined;
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
