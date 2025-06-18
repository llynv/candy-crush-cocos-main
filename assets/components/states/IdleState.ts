import { Color } from 'cc';
import { TileState } from './TileState';
import { Tile } from '../Tile';
import { AnimationManager } from '../managers/AnimationManager';

export class IdleState extends TileState {
  private animationHandler: AnimationManager | null = null;

  constructor(tile: Tile) {
    super(tile);
    this.animationHandler = tile.getComponent(AnimationManager);
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
