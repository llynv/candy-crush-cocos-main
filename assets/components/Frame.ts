import { _decorator, Component, Sprite, input, Input, EventMouse, tween, Color } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Frame')
export class Frame extends Component {
  @property(Sprite)
  private sprite: Sprite | null = null;

  private originalAlpha: number = 0.5;
  private hoverAlpha: number = 0.7;
  private isHovering: boolean = false;
  private tweenDuration: number = 0.15;

  protected __preload(): void {
    if (!this.sprite) throw new Error('Sprite is required for Frame');
  }

  protected onLoad(): void {
    if (!this.sprite) throw new Error('Sprite is required for Frame');
    this.sprite.color = new Color(0, 0, 0, this.originalAlpha * 255);
  }

  public triggerMouseEnter(): void {
    if (this.isHovering || !this.sprite) return;

    this.isHovering = true;

    const currentColor = this.sprite.color.clone();
    const targetAlpha = this.hoverAlpha * 255;

    tween(this.sprite)
      .to(
        this.tweenDuration,
        {
          color: currentColor.set(currentColor.r, currentColor.g, currentColor.b, targetAlpha),
        },
        {
          easing: 'quadOut',
        }
      )
      .start();
  }

  /**
   * Manually trigger mouse leave effect (called by tile above)
   */
  public triggerMouseLeave(): void {
    if (!this.isHovering || !this.sprite) return;

    this.isHovering = false;

    const currentColor = this.sprite.color.clone();
    const targetAlpha = this.originalAlpha * 255;

    tween(this.sprite)
      .to(
        this.tweenDuration,
        {
          color: currentColor.set(currentColor.r, currentColor.g, currentColor.b, targetAlpha),
        },
        {
          easing: 'quadIn',
        }
      )
      .start();
  }

  /**
   * Manually trigger hover effect
   */
  public setHoverState(hover: boolean): void {
    if (hover) {
      this.triggerMouseEnter();
    } else {
      this.triggerMouseLeave();
    }
  }

  /**
   * Set custom hover alpha value (0-1)
   */
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
