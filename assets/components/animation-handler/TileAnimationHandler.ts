import { _decorator, Component, tween, Vec3, Color, Node, Sprite, repeat } from 'cc';
import { Tile } from '../Tile';
import { AnimationConfig, CONFIG, COLOR_PRESETS } from './TileAnimationConfig';

const { ccclass, property } = _decorator;

@ccclass('TileAnimationHandler')
export class TileAnimationHandler extends Component {
  private tile: Tile | null = null;
  private originalScale: Vec3 = new Vec3(1, 1, 1);
  private originalColor: Color = Color.WHITE.clone();
  private isAnimating: boolean = false;
  private selectionTween: any = null;

  onLoad(): void {
    this.tile = this.getComponent(Tile);
    if (!this.tile) {
      console.error('TileAnimationHandler requires a Tile component');
      return;
    }

    this.originalScale.set(this.node.scale);
    if (this.tile.getSprite()) {
      this.originalColor.set(this.tile.getSprite()!.color);
    }
  }

  /**
   * Selection animation - repeating scale pulse
   */
  public animateSelection(): void {
    if (this.isAnimating) return;

    this.stopAllAnimations();

    this.isAnimating = true;
    const scaledUp = this.originalScale.clone().multiplyScalar(1.2);

    this.selectionTween = tween(this.node)
      .to(CONFIG.SELECTION_CONFIG.duration!, { scale: scaledUp }, { easing: 'sineOut' })
      .to(CONFIG.SELECTION_CONFIG.duration!, { scale: this.originalScale }, { easing: 'sineIn' })
      .union()
      .repeatForever()
      .start();
  }

  /**
   * Deselection animation - stop pulse and return to normal
   */
  public animateDeselection(): void {
    this.isAnimating = false;

    if (this.selectionTween) {
      this.selectionTween.stop();
      this.selectionTween = null;
    }

    this.node.scale = this.originalScale;
  }

  /**
   * Destruction animation - shrink and fade out
   */
  public animateDestruction(): Promise<void> {
    return new Promise(resolve => {
      if (this.isAnimating) {
        resolve();
        return;
      }

      this.isAnimating = true;

      const bounceScale = this.originalScale
        .clone()
        .multiplyScalar(CONFIG.DESTRUCTION_CONFIG.bounceMultiplier!);

      tween(this.node)
        .to(0.1, { scale: bounceScale }, { easing: 'quadOut' })
        .to(
          CONFIG.DESTRUCTION_CONFIG.duration!,
          {
            scale: new Vec3(0, 0, 0),
          },
          {
            easing: CONFIG.DESTRUCTION_CONFIG.easing,
          }
        )
        .call(() => {
          this.isAnimating = false;
          resolve();
        })
        .start();

      if (this.tile?.getSprite()) {
        const sprite = this.tile.getSprite()!;
        const transparentColor = new Color(
          COLOR_PRESETS.TRANSPARENT.r,
          COLOR_PRESETS.TRANSPARENT.g,
          COLOR_PRESETS.TRANSPARENT.b,
          COLOR_PRESETS.TRANSPARENT.a
        );

        tween(sprite)
          .delay(0.1)
          .to(CONFIG.DESTRUCTION_CONFIG.duration!, {
            color: transparentColor,
          })
          .start();
      }
    });
  }

  /**
   * Spawn animation - scale up from zero with bounce
   */
  public animateSpawn(): Promise<void> {
    return new Promise(resolve => {
      if (this.isAnimating) {
        resolve();
        return;
      }

      this.isAnimating = true;

      this.node.scale = new Vec3(0, 0, 0);

      tween(this.node)
        .to(
          CONFIG.SPAWN_CONFIG.duration!,
          {
            scale: this.originalScale,
          },
          {
            easing: CONFIG.SPAWN_CONFIG.easing,
          }
        )
        .call(() => {
          this.isAnimating = false;
          resolve();
        })
        .start();
    });
  }

  /**
   * Bounce animation for feedback (invalid moves, etc.) - quick scale bounce
   */
  public animateBounce(): Promise<void> {
    return new Promise(resolve => {
      if (this.isAnimating) {
        resolve();
        return;
      }

      this.isAnimating = true;
      const bounceScale = this.originalScale
        .clone()
        .multiplyScalar(CONFIG.BOUNCE_CONFIG.scaleMultiplier!);

      tween(this.node)
        .to(
          CONFIG.BOUNCE_CONFIG.duration!,
          {
            scale: bounceScale,
          },
          {
            easing: CONFIG.BOUNCE_CONFIG.easing,
          }
        )
        .to(
          CONFIG.BOUNCE_CONFIG.duration!,
          {
            scale: this.originalScale,
          },
          {
            easing: CONFIG.BOUNCE_CONFIG.easing,
          }
        )
        .call(() => {
          this.isAnimating = false;
          resolve();
        })
        .start();
    });
  }

  /**
   * Smooth movement animation to target position
   */
  public animateMoveTo(targetPosition: Vec3, duration?: number): Promise<void> {
    const animDuration = duration || CONFIG.MOVEMENT_CONFIG.duration!;

    return new Promise(resolve => {
      tween(this.node)
        .to(
          animDuration,
          {
            position: targetPosition,
          },
          {
            easing: CONFIG.MOVEMENT_CONFIG.easing,
          }
        )
        .call(() => {
          resolve();
        })
        .start();
    });
  }

  /**
   * Pulse animation for highlighting - scale-based pulsing
   */
  public animatePulse(pulseCount: number = 2): Promise<void> {
    return new Promise(resolve => {
      if (this.isAnimating) {
        resolve();
        return;
      }

      this.isAnimating = true;
      const pulseScale = this.originalScale
        .clone()
        .multiplyScalar(CONFIG.PULSE_CONFIG.scaleMultiplier!);
      let currentPulse = 0;

      const doPulse = () => {
        if (currentPulse >= pulseCount) {
          this.isAnimating = false;
          resolve();
          return;
        }

        currentPulse++;

        tween(this.node)
          .to(
            CONFIG.PULSE_CONFIG.duration!,
            {
              scale: pulseScale,
            },
            {
              easing: CONFIG.PULSE_CONFIG.easing,
            }
          )
          .to(
            CONFIG.PULSE_CONFIG.duration!,
            {
              scale: this.originalScale,
            },
            {
              easing: CONFIG.PULSE_CONFIG.easing,
            }
          )
          .call(() => {
            doPulse();
          })
          .start();
      };

      doPulse();
    });
  }

  /**
   * Stop all animations and reset to original state
   */
  public stopAllAnimations(): void {
    if (!this.isAnimating) return;

    tween(this.node).stop();
    if (this.tile?.getSprite()) {
      tween(this.tile.getSprite()!).stop();
    }

    if (this.selectionTween) {
      this.selectionTween.stop();
      this.selectionTween = null;
    }

    this.node.scale = this.originalScale;
    if (this.tile?.getSprite()) {
      this.tile.getSprite()!.color = this.originalColor;
    }

    this.isAnimating = false;
  }

  /**
   * Get current animation state
   */
  public getIsAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * Update original values (useful when tile changes)
   */
  public updateOriginalValues(): void {
    this.originalScale.set(this.node.scale);
    if (this.tile?.getSprite()) {
      this.originalColor.set(this.tile.getSprite()!.color);
    }
  }

  public animatePlayerIdle(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;

    tween(this.node)
      .to(0.4, { scale: new Vec3(1.15, 1.15, 1.15) }, { easing: 'sineOut' })
      .to(0.4, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
      .union()
      .call(() => {
        this.isAnimating = false;
      })
      .start();
  }

  public animateDestroy(callback?: () => void): void {
    tween(this.node)
      .to(0.1, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'quadOut' })
      .to(0.15, { scale: new Vec3(0, 0, 0) }, { easing: 'quadIn' })
      .call(() => {
        if (callback) callback();
      })
      .start();
  }
}
