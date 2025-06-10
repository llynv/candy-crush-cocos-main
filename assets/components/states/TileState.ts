import { _decorator } from 'cc';
import { Tile } from '../Tile';

export abstract class TileState {
  protected tile: Tile;

  constructor(tile: Tile) {
    this.tile = tile;
  }

  abstract onEnter(): void;
  abstract onExit(): void;
  abstract onUpdate(): void;
  abstract onPlayerIdle(): void;
}
