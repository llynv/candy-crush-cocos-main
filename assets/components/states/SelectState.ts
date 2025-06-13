import { Color, Vec3 } from 'cc';
import { TileState } from './TileState';
import { Tile } from '../Tile';
import { AnimationManager } from '../managers/AnimationManager';

export class SelectState extends TileState {
  private animationHandler: AnimationManager | null = null;

  constructor(tile: Tile) {
    super(tile);
    this.animationHandler = tile.getComponent(AnimationManager);
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
