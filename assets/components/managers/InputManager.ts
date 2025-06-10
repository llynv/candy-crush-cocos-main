import { _decorator, Component } from 'cc';
import { Tile } from '../Tile';
import { BoardManager } from './BoardManager';

const { ccclass } = _decorator;

export interface SelectionResult {
  isValid: boolean;
  shouldSwap: boolean;
  firstTile: Tile;
  secondTile?: Tile;
}

@ccclass('InputManager')
export class InputManager extends Component {
  private firstSelectedTile: Tile | undefined = undefined;
  private secondSelectedTile: Tile | undefined = undefined;
  private boardManager: BoardManager | null = null;
  private canMove: boolean = true;

  public setBoardManager(boardManager: BoardManager): void {
    this.boardManager = boardManager;
  }

  public setCanMove(canMove: boolean): void {
    this.canMove = canMove;
  }

  public getCanMove(): boolean {
    return this.canMove;
  }

  public handleTileClick(tile: Tile): SelectionResult {
    if (!this.canMove || !this.boardManager) {
      return { isValid: false, shouldSwap: false, firstTile: tile };
    }

    if (!this.firstSelectedTile || this.firstSelectedTile === tile) {
      this.selectFirstTile(tile);
      return { isValid: true, shouldSwap: false, firstTile: tile };
    }

    this.secondSelectedTile = tile;
    const isAdjacent = this.areAdjacent(this.firstSelectedTile, this.secondSelectedTile);

    if (isAdjacent) {
      const result: SelectionResult = {
        isValid: true,
        shouldSwap: true,
        firstTile: this.firstSelectedTile,
        secondTile: this.secondSelectedTile,
      };

      this.canMove = false;
      return result;
    } else {
      this.deselectAll();
      this.selectFirstTile(tile);
      return { isValid: true, shouldSwap: false, firstTile: tile };
    }
  }

  public swapCompleted(): void {
    this.canMove = true;
    this.deselectAll();
  }

  public swapFailed(): void {
    this.canMove = true;
  }

  public getSelectedTiles(): { first?: Tile; second?: Tile } {
    return {
      first: this.firstSelectedTile,
      second: this.secondSelectedTile,
    };
  }

  public deselectAll(): void {
    this.firstSelectedTile?.changeState('idle');
    this.secondSelectedTile?.changeState('idle');
    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;
  }

  private selectFirstTile(tile: Tile): void {
    this.deselectAll();
    this.firstSelectedTile = tile;
    tile.changeState('select');
  }

  private areAdjacent(tile1: Tile, tile2: Tile): boolean {
    if (!this.boardManager) return false;

    const coords1 = this.boardManager.getTileCoords().get(tile1);
    const coords2 = this.boardManager.getTileCoords().get(tile2);

    if (!coords1 || !coords2) return false;

    const dx = Math.abs(coords1.x - coords2.x);
    const dy = Math.abs(coords1.y - coords2.y);

    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  public reset(): void {
    this.deselectAll();
    this.canMove = true;
  }
}
