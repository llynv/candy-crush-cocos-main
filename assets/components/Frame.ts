import {
  _decorator,
  Component,
  Sprite,
  input,
  Input,
  EventMouse,
  tween,
  Color,
  SpriteFrame,
  UITransform,
} from 'cc';
import { GameConfig } from '../constants/GameConfig';

const { ccclass, property } = _decorator;

@ccclass('Frame')
export class Frame extends Component {
  @property(Sprite)
  private sprite: Sprite | null = null;

  @property([SpriteFrame])
  public spriteFrames: SpriteFrame[] = [];

  private originalAlpha: number = 0.6;
  private hoverAlpha: number = 0.7;
  private isHovering: boolean = false;
  private tweenDuration: number = 0.15;

  protected __preload(): void {
    if (!this.sprite) throw new Error('Sprite is required for Frame');
  }

  protected onLoad(): void {
    if (!this.sprite) throw new Error('Sprite is required for Frame');
    const currentColor = this.sprite.color.clone();
    this.sprite.color = currentColor.set(
      currentColor.r,
      currentColor.g,
      currentColor.b,
      this.originalAlpha * 255
    );
  }

  public setSpriteFrame(spriteIndex: number): void {
    if (
      !this.sprite ||
      !this.spriteFrames ||
      spriteIndex < 0 ||
      spriteIndex >= this.spriteFrames.length
    )
      return;

    this.sprite.spriteFrame = this.spriteFrames[spriteIndex];
    const uiTransform = this.sprite.node.getComponent(UITransform);
    if (uiTransform) {
      uiTransform.setContentSize(GameConfig.FrameSize, GameConfig.FrameSize);
    }
  }

  public triggerMouseEnter(): void {
    if (this.isHovering || !this.sprite) return;

    this.isHovering = true;

    const currentColor = this.sprite.color.clone();
    this.sprite.color = currentColor.set(
      currentColor.r,
      currentColor.g,
      currentColor.b,
      this.hoverAlpha * 255
    );
  }

  public triggerMouseLeave(): void {
    if (!this.isHovering || !this.sprite) return;

    this.isHovering = false;

    const currentColor = this.sprite.color.clone();
    this.sprite.color = currentColor.set(
      currentColor.r,
      currentColor.g,
      currentColor.b,
      this.originalAlpha * 255
    );
  }

  public setHoverState(hover: boolean): void {
    if (hover) {
      this.triggerMouseEnter();
    } else {
      this.triggerMouseLeave();
    }
  }

  public setHoverAlpha(alpha: number): void {
    this.hoverAlpha = Math.max(0, Math.min(1, alpha));
  }

  public setOriginalAlpha(alpha: number): void {
    this.originalAlpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * Set hover animation duration
   */
  public setTweenDuration(duration: number): void {
    this.tweenDuration = Math.max(0.05, duration);
  }

  /**
   * Get current hover state
   */
  public getIsHovering(): boolean {
    return this.isHovering;
  }

  /**
   * Reset frame to original state
   */
  public resetFrame(): void {
    if (!this.sprite) return;

    tween(this.sprite).stop();

    const currentColor = this.sprite.color.clone();
    this.sprite.color = currentColor.set(
      currentColor.r,
      currentColor.g,
      currentColor.b,
      this.originalAlpha * 255
    );

    this.isHovering = false;
  }

  protected onDestroy(): void {
    if (this.sprite) {
      tween(this.sprite).stop();
    }
  }
}
