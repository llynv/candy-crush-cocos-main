import { _decorator, Component, Vec3 } from 'cc';
import { Tile } from '../Tile';
import { GameConfig, PatternShape } from '../../constants/GameConfig';
import { SpecialTileType } from '../../constants/SpecialTileConfig';

const { ccclass } = _decorator;

@ccclass('MatchManager')
export class MatchManager extends Component {
  public findMatches(tileGrid: (Tile | undefined)[][]): Tile[][] {
    const matches: Tile[][] = [];
    const processedTiles = new Set<Tile>();

    this.findShapeMatches(tileGrid, matches, processedTiles);

    console.log('matches', matches);

    return matches;
  }

  private findShapeMatches(
    tileGrid: (Tile | undefined)[][],
    matches: Tile[][],
    processedTiles: Set<Tile>
  ): void {
    for (let matchSize = 5; matchSize >= 3; matchSize--) {
      const matchPatterns = PatternShape.filter(pattern => pattern.shape.length === matchSize);
      this.findShapeMatchesByPatterns(tileGrid, matches, processedTiles, matchPatterns);
    }
  }

  private findShapeMatchesByPatterns(
    tileGrid: (Tile | undefined)[][],
    matches: Tile[][],
    processedTiles: Set<Tile>,
    matchPatterns: { name: string; shape: Vec3[] }[]
  ): void {
    for (let y = 0; y < tileGrid.length; y++) {
      for (let x = 0; x < tileGrid[y].length; x++) {
        const centerTile = tileGrid[y][x];
        if (
          !centerTile ||
          processedTiles.has(centerTile) ||
          centerTile.getSpecialType() === SpecialTileType.RAINBOW
        ) {
          continue;
        }

        for (const pattern of matchPatterns) {
          const match = this.findPatternMatch(tileGrid, x, y, pattern, processedTiles);
          if (match) {
            matches.push(match);
            match.forEach(tile => processedTiles.add(tile));
          }
        }
      }
    }
  }

  private isInGrid(x: number, y: number): boolean {
    return x >= 0 && x < GameConfig.GridWidth && y >= 0 && y < GameConfig.GridHeight;
  }

  private findPatternMatch(
    tileGrid: (Tile | undefined)[][],
    x: number,
    y: number,
    pattern: { name: string; shape: Vec3[] },
    processedTiles: Set<Tile>
  ): Tile[] | null {
    const match: Tile[] = [];
    const shape = pattern.shape;
    const tileType = tileGrid[y][x]?.getTileType();
    for (const offset of shape) {
      const newX = x + offset.x;
      const newY = y + offset.y;
      if (!this.isInGrid(newX, newY)) return null;
      const tile = tileGrid[newY][newX];
      if (
        !tile ||
        processedTiles.has(tile) ||
        tile.getTileType() !== tileType ||
        tile.isRainbowTile()
      )
        return null;
      match.push(tile);
    }

    return match.length >= pattern.shape.length ? match : null;
  }
}
