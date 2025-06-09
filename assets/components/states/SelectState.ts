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
    this.animationHandler?.stopAllAnimations();
  }

  onClick(): void {
    this.animationHandler?.animateSelection();
  }

  onSelect(): void {}

  onDeselect(): void {
    this.animationHandler?.animateDeselection();
    this.animationHandler?.stopAllAnimations();
  }

  onMouseDown(): void {
    this.animationHandler?.animateSelection();
  }
  onMouseUp(): void {
    this.animationHandler?.animateSelection();
  }
}
