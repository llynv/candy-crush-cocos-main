import { Color, Vec3 } from 'cc';
import { TileState } from './TileState';
import { Tile } from '../Tile';
import { TileAnimationHandler } from '../animation-handler/TileAnimationHandler';

export class SelectState extends TileState {
  private animationHandler: TileAnimationHandler | null = null;

  constructor(tile: Tile) {
    super(tile);
    this.animationHandler = tile.getComponent(TileAnimationHandler);
  }

  onEnter(): void {
    this.animationHandler?.animateSelection();
  }

  onExit(): void {
    this.animationHandler?.animateDeselection();
  }

  onUpdate(): void {}

  onPlayerIdle(): void {
    this.animationHandler?.animatePlayerIdle();
  }
}
