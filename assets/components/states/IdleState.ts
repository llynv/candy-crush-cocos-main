import { Color } from 'cc';
import { TileState } from './TileState';
import { Tile } from '../Tile';
import { TileAnimationHandler } from '../animation-handler/TileAnimationHandler';

export class IdleState extends TileState {
  private animationHandler: TileAnimationHandler | null = null;

  constructor(tile: Tile) {
    super(tile);
    this.animationHandler = tile.getComponent(TileAnimationHandler);
  }

  onEnter(): void {
    this.animationHandler?.updateOriginalValues();
    this.animationHandler?.stopAllAnimations();
  }

  onExit(): void {}

  onUpdate(): void {}

  onPlayerIdle(): void {
    this.animationHandler?.animatePlayerIdle();
  }
}
