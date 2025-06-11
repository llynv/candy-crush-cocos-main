import { _decorator, Component } from 'cc';
import { Tile } from '../Tile';
import { GameConfig } from '../../constants/GameConfig';

const { ccclass } = _decorator;

@ccclass('MatchManager')
export class MatchManager extends Component {
  public findMatches(tileGrid: (Tile | undefined)[][]): Tile[][] {
    const allMatchedTiles = new Set<Tile>();
    const matches: Tile[][] = [];

    for (let y = 0; y < tileGrid.length; y++) {
      for (let x = 0; x < tileGrid[y].length - 2; x++) {
        const horizontalMatch = this.getHorizontalMatch(tileGrid, x, y);
        if (horizontalMatch.length >= 3) {
          const hasNewTiles = horizontalMatch.some(tile => !allMatchedTiles.has(tile));
          if (hasNewTiles) {
            matches.push(horizontalMatch);
            horizontalMatch.forEach(tile => allMatchedTiles.add(tile));
          }
        }
      }
    }

    for (let x = 0; x < tileGrid[0].length; x++) {
      for (let y = 0; y < tileGrid.length - 2; y++) {
        const verticalMatch = this.getVerticalMatch(tileGrid, x, y);
        if (verticalMatch.length >= 3) {
          const hasNewTiles = verticalMatch.some(tile => !allMatchedTiles.has(tile));
          if (hasNewTiles) {
            matches.push(verticalMatch);
            verticalMatch.forEach(tile => allMatchedTiles.add(tile));
          }
        }
      }
    }

    return this.mergeOverlappingMatches(matches);
  }

  private getHorizontalMatch(tileGrid: (Tile | undefined)[][], startX: number, y: number): Tile[] {
    const match: Tile[] = [];
    const firstTile = tileGrid[y][startX];

    if (!firstTile) return match;

    for (let x = startX; x < tileGrid[y].length; x++) {
      const currentTile = tileGrid[y][x];
      if (currentTile && currentTile.canMatchWith(firstTile)) {
        match.push(currentTile);
      } else {
        break;
      }
    }

    return match;
  }

  private getVerticalMatch(tileGrid: (Tile | undefined)[][], x: number, startY: number): Tile[] {
    const match: Tile[] = [];
    const firstTile = tileGrid[startY][x];

    if (!firstTile) return match;

    for (let y = startY; y < tileGrid.length; y++) {
      const currentTile = tileGrid[y][x];
      if (currentTile && currentTile.canMatchWith(firstTile)) {
        match.push(currentTile);
      } else {
        break;
      }
    }

    return match;
  }

  private mergeOverlappingMatches(matches: Tile[][]): Tile[][] {
    if (matches.length <= 1) return matches;

    const mergedMatches: Tile[][] = [];
    const processedMatches = new Set<number>();

    for (let i = 0; i < matches.length; i++) {
      if (processedMatches.has(i)) continue;

      let currentMatch = [...matches[i]];
      processedMatches.add(i);

      let foundOverlap = true;
      while (foundOverlap) {
        foundOverlap = false;

        for (let j = i + 1; j < matches.length; j++) {
          if (processedMatches.has(j)) continue;

          const hasOverlap = matches[j].some(tile => currentMatch.indexOf(tile) !== -1);

          if (hasOverlap) {
            matches[j].forEach(tile => {
              if (currentMatch.indexOf(tile) === -1) {
                currentMatch.push(tile);
              }
            });
            processedMatches.add(j);
            foundOverlap = true;
          }
        }
      }

      mergedMatches.push(currentMatch);
    }

    return mergedMatches;
  }

  public hasMatches(tileGrid: (Tile | undefined)[][]): boolean {
    return this.findMatches(tileGrid).length > 0;
  }

  public removeDuplicateMatches(matches: Tile[][]): Tile[][] {
    const uniqueMatches: Tile[][] = [];
    const processedTiles = new Set<Tile>();

    for (const match of matches) {
      const newMatch = match.filter(tile => !processedTiles.has(tile));
      if (newMatch.length >= 3) {
        uniqueMatches.push(newMatch);
        newMatch.forEach(tile => processedTiles.add(tile));
      }
    }

    return uniqueMatches;
  }
}
