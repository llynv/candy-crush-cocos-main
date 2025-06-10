import { _decorator, Component } from 'cc';
import { Tile } from '../Tile';

const { ccclass } = _decorator;

@ccclass('MatchManager')
export class MatchManager extends Component {
  public findMatches(tileGrid: (Tile | undefined)[][]): Tile[][] {
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
