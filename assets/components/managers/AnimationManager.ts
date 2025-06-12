import { _decorator, Component, tween, Vec3, Color, Node } from 'cc';
import { Tile } from '../Tile';
import { GameConfig } from '../../constants/GameConfig';
import { BoardManager, GridPosition } from './BoardManager';
import { CONFIG, COLOR_PRESETS } from '../../constants/AnimationConfig';
import { Singleton } from '../patterns/Singleton';

const { ccclass } = _decorator;

export interface FallTask {
  tile: Tile;
  fromY: number;
  toY: number;
  x: number;
  isNewTile: boolean;
}

@ccclass('AnimationManager')
export class AnimationManager extends Component {
  private boardManager: BoardManager | null = null;

  private tile: Tile | null = null;
  private originalScale: Vec3 = new Vec3(1, 1, 1);
  private originalColor: Color = Color.WHITE.clone();
  private isAnimating: boolean = false;
  private selectionTween: any = null;

  protected onLoad(): void {
    this.boardManager = this.node.getComponent(BoardManager);
    this.tile = this.getComponent(Tile);
    if (!this.tile) {
      console.error('AnimationManager requires a Tile component');
      return;
    }

    this.originalScale.set(this.node.scale);
    if (this.tile.getSprite()) {
      this.originalColor.set(this.tile.getSprite()!.color);
    }
  }

  public animateSwap(tile1: Tile, tile2: Tile, callback: () => void): void {
    if (!tile1.node || !tile2.node || !tile1.node.isValid || !tile2.node.isValid) {
      throw new Error('Invalid tiles for swap animation');
    }

    tile1.node.setSiblingIndex(tile2.node.parent!.children.length);

    tween(tile1.node)
      .to(
        0.15,
        {
          position: new Vec3(tile2.node.x, tile2.node.y, tile1.node.position.z),
          scale: new Vec3(1.85, 1.85, 1.0),
        },
        { easing: 'linear' }
      )
      .to(0.15, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'linear' })
      .start();

    tween(tile2.node)
      .to(
        0.3,
        {
          position: new Vec3(tile1.node.x, tile1.node.y, tile2.node.position.z),
        },
        { easing: 'linear' }
      )
      .call(() => {
        callback();
      })
      .start();
  }

  public async animateFall(fallTasks: FallTask[]): Promise<void> {
    if (!this.boardManager) {
      throw new Error('BoardManager not set');
    }

    fallTasks.forEach(task => {
      const { tile, fromY, toY, x, isNewTile } = task;
      const finalPosition = this.boardManager!.getWorldPosition({ x, y: toY });

      if (isNewTile) {
        tile.node.setScale(0.8, 0.8, 1.0);
      } else {
        const currentPosition = this.boardManager!.getWorldPosition({ x, y: fromY });
        tile.node.setPosition(currentPosition.x, currentPosition.y, 0);
      }
    });

    const baseFallDuration = 0.3;
    const animationPromises: Promise<void>[] = [];

    fallTasks.forEach((task, index) => {
      const { tile, toY, x, isNewTile, fromY } = task;
      const finalPosition = this.boardManager!.getWorldPosition({ x, y: toY });

      const animationPromise = new Promise<void>(resolve => {
        const delay = isNewTile ? Math.abs(fromY) * 0.05 : 0;

        const fallDistance = isNewTile ? Math.abs(fromY - toY) : Math.abs(fromY - toY);
        const fallDuration = baseFallDuration + fallDistance * 0.02;

        let tweenChain = tween(tile.node);

        if (delay > 0) {
          tweenChain = tweenChain.delay(delay);
        }

        if (isNewTile) {
          tweenChain = tweenChain.to(
            0.1,
            { scale: new Vec3(1.0, 1.0, 1.0) },
            { easing: 'backOut' }
          );
        }

        tweenChain
          .to(
            fallDuration,
            { position: new Vec3(finalPosition.x, finalPosition.y, 0) },
            { easing: 'quartIn' }
          )
          .to(0.1, { scale: new Vec3(1.05, 0.95, 1.0) }, { easing: 'quadOut' })
          .to(0.1, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
          .call(() => resolve())
          .start();
      });

      animationPromises.push(animationPromise);
    });

    await Promise.all(animationPromises);
  }

  public async animateIdleTiles(tileGrid: (Tile | undefined)[][]): Promise<void> {
    for (let i = 0; i < GameConfig.GridHeight; i++) {
      for (let j = 0, x = i; j <= i && x >= 0; j++, x--) {
        const tile = tileGrid[x][j];
        if (tile) {
          tile.onPlayerIdle();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    for (let j = 1; j < GameConfig.GridWidth; j++) {
      for (let i = j, y = GameConfig.GridHeight - 1; i < GameConfig.GridWidth && y >= 0; i++, y--) {
        const tile = tileGrid[y][i];
        if (tile) {
          tile.onPlayerIdle();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  public animateMatchedTiles(matches: Tile[][]): void {}

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

  public animateDestroy(callback?: () => void, resolve?: () => void): void {
    tween(this.node)
      .to(0.1, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'quadOut' })
      .to(0.15, { scale: new Vec3(0, 0, 0) }, { easing: 'quadIn' })
      .call(() => {
        callback?.();
        resolve?.();
      })
      .start();
  }

  /**
   * Animate all tiles in a circular motion around the board for milestone celebration
   */
  public async animateMilestoneCelebration(
    tileGrid: (Tile | undefined)[][],
    centerNode: Node
  ): Promise<void> {
    if (!this.boardManager) {
      throw new Error('BoardManager not set');
    }

    const originalPositions: { tile: Tile; originalPos: Vec3 }[] = [];

    const centerX = centerNode.getPosition().x;
    const centerY = centerNode.getPosition().y;

    const maxRadiusX = (GameConfig.GridWidth * GameConfig.TileWidth) / 2 - GameConfig.TileWidth;
    const maxRadiusY = (GameConfig.GridHeight * GameConfig.TileHeight) / 2 - GameConfig.TileHeight;
    const radius = Math.min(maxRadiusX, maxRadiusY) * 1.1;

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (tile && tile.node && tile.node.isValid) {
          originalPositions.push({
            tile,
            originalPos: tile.node.position.clone(),
          });
        }
      }
    }

    if (originalPositions.length === 0) {
      return;
    }

    const totalTiles = originalPositions.length;
    const animationDuration = GameConfig.MilestoneSystem.celebrationAnimationDuration;
    const moveToCirclePhase = animationDuration * 0.1;
    const circlePhase = animationDuration * 0.7;
    const returnPhase = animationDuration * 0.2;

    const moveToCirclePromises = originalPositions.map((tileData, index) => {
      return new Promise<void>(resolve => {
        const { tile } = tileData;
        const angleOffset = (index / totalTiles) * Math.PI * 2;
        const delay = (index / totalTiles) * 0.1;

        if (!tile || !tile.node || !tile.node.isValid) {
          resolve();
          return;
        }

        const circleX = centerX + Math.cos(angleOffset) * radius;
        const circleY = centerY + Math.sin(angleOffset) * radius;

        tween(tile.node)
          .delay(delay)
          .parallel(
            tween().to(
              moveToCirclePhase,
              { position: new Vec3(circleX, circleY, 0) },
              { easing: 'quadOut' }
            ),
            tween()
              .to(moveToCirclePhase * 0.5, { scale: new Vec3(0.8, 0.8, 1) }, { easing: 'quadOut' })
              .to(moveToCirclePhase * 0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
          )
          .call(() => resolve())
          .start();
      });
    });

    await Promise.all(moveToCirclePromises);

    const rotationPromises = originalPositions.map((tileData, index) => {
      return new Promise<void>(resolve => {
        const { tile } = tileData;
        let currentAngle = (index / totalTiles) * Math.PI * 2;

        if (!tile || !tile.node || !tile.node.isValid) {
          resolve();
          return;
        }

        const rotationSpeed = (Math.PI * 2) / 3;
        const updateInterval = 24;
        const totalSteps = Math.floor((circlePhase * 1000) / updateInterval);
        let currentStep = 0;

        const rotateStep = () => {
          if (!tile || !tile.node || !tile.node.isValid || currentStep >= totalSteps) {
            resolve();
            return;
          }

          currentAngle -= rotationSpeed / (1000 / updateInterval);
          const x = centerX + Math.cos(currentAngle) * radius;
          const y = centerY + Math.sin(currentAngle) * radius;

          tile.node.setPosition(x, y, 0);
          currentStep++;

          setTimeout(rotateStep, updateInterval);
        };

        rotateStep();
      });
    });

    await Promise.all(rotationPromises);

    const returnPromises = originalPositions.map((tileData, index) => {
      return new Promise<void>(resolve => {
        const { tile, originalPos } = tileData;
        const delay = (index / totalTiles) * 0.15;

        if (!tile || !tile.node || !tile.node.isValid) {
          resolve();
          return;
        }

        tween(tile.node)
          .delay(delay)
          .parallel(
            tween().to(returnPhase, { position: originalPos }, { easing: 'backOut' }),
            tween()
              .to(returnPhase * 0.2, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'quadOut' })
              .to(returnPhase * 0.8, { scale: new Vec3(1, 1, 1) }, { easing: 'bounceOut' })
          )
          .call(() => resolve())
          .start();
      });
    });

    await Promise.all(returnPromises);

    console.log('Milestone celebration animation completed');
  }

  public async animateSpecialTileActivation(
    specialTile: Tile,
    affectedTiles: Tile[]
  ): Promise<void> {
    if (!specialTile || !specialTile.node || !specialTile.node.isValid) return;

    const specialType = specialTile.getSpecialType();

    switch (specialType) {
      case 'bomb':
        await this.animateBombExplosion(specialTile, affectedTiles);
        break;
      case 'rainbow':
        await this.animateRainbowBurst(specialTile, affectedTiles);
        break;
    }
  }

  private async animateBombExplosion(bombTile: Tile, affectedTiles: Tile[]): Promise<void> {
    if (!bombTile.node || !bombTile.node.isValid) return;

    tween(bombTile.node)
      .to(0.1, { scale: new Vec3(1.5, 1.5, 1) }, { easing: 'quadOut' })
      .to(0.2, { scale: new Vec3(0.1, 0.1, 1) }, { easing: 'quadIn' })
      .start();

    const explosionPromises = affectedTiles.map((tile, index) => {
      return new Promise<void>(resolve => {
        if (!tile.node || !tile.node.isValid) {
          resolve();
          return;
        }

        const delay = index * 0.05;

        tween(tile.node)
          .delay(delay)
          .to(0.1, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'quadOut' })
          .to(0.15, { scale: new Vec3(0, 0, 1) }, { easing: 'quadIn' })
          .call(() => resolve())
          .start();
      });
    });

    await Promise.all(explosionPromises);
  }

  private async animateRainbowBurst(rainbowTile: Tile, affectedTiles: Tile[]): Promise<void> {
    if (!rainbowTile.node || !rainbowTile.node.isValid) return;

    const rainbowColors = [
      new Color(255, 0, 0, 255),
      new Color(255, 127, 0, 255),
      new Color(255, 255, 0, 255),
      new Color(0, 255, 0, 255),
      new Color(0, 0, 255, 255),
      new Color(75, 0, 130, 255),
      new Color(148, 0, 211, 255),
    ];

    const sprite = rainbowTile.getSprite();
    if (sprite) {
      for (let i = 0; i < 5; i++) {
        const color = rainbowColors[i % rainbowColors.length];
        tween(sprite).to(0.1, { color }).start();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const burstPromises = affectedTiles.map((tile, index) => {
      return new Promise<void>(resolve => {
        if (!tile.node || !tile.node.isValid) {
          resolve();
          return;
        }

        const delay = index * 0.03;
        const targetColor = rainbowColors[index % rainbowColors.length];
        const tileSprite = tile.getSprite();

        if (tileSprite) {
          tween(tileSprite).delay(delay).to(0.2, { color: targetColor }).start();
        }

        tween(tile.node)
          .delay(delay)
          .to(0.1, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'quadOut' })
          .to(0.2, { scale: new Vec3(0, 0, 1) }, { easing: 'quadIn' })
          .call(() => resolve())
          .start();
      });
    });

    await Promise.all(burstPromises);
  }

  public async animateTileCombination(matchedTiles: Tile[], centerTile: Tile): Promise<void> {
    if (!centerTile || !centerTile.node || !centerTile.node.isValid) return;

    const centerPosition = centerTile.node.position.clone();
    const animationPromises: Promise<void>[] = [];

    for (const tile of matchedTiles) {
      if (tile === centerTile || !tile.node || !tile.node.isValid) continue;

      const promise = new Promise<void>(resolve => {
        tween(tile.node)
          .to(
            0.4,
            {
              position: centerPosition,
              scale: new Vec3(0.8, 0.8, 1),
            },
            {
              easing: 'quadInOut',
            }
          )
          .to(
            0.1,
            {
              scale: new Vec3(0, 0, 1),
            },
            {
              easing: 'quadIn',
            }
          )
          .call(() => {
            console.log('destroy tile', tile);
            tile.node.destroy();
            resolve();
          })
          .start();
      });

      animationPromises.push(promise);
    }

    const centerPromise = new Promise<void>(resolve => {
      tween(centerTile.node)
        .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'quadOut' })
        .to(0.2, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'quadIn' })
        .call(() => {
          resolve();
        })
        .start();
    });

    animationPromises.push(centerPromise);

    await Promise.all(animationPromises);
  }

  public async animateCombine(
    sourceTile: Tile,
    targetTile: Tile,
    callback?: () => void,
    resolve?: () => void
  ): Promise<void> {
    tween(sourceTile.node)
      .to(0.25, { position: targetTile.node.getPosition() }, { easing: 'quadOut' })
      .call(() => {
        callback?.();
        resolve?.();
      })
      .start();
  }
}
