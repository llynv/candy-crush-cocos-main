import {
  _decorator,
  Component,
  tween,
  Vec3,
  Color,
  Node,
  Sprite,
  instantiate,
  UITransform,
  Tween,
} from 'cc';
import { Tile } from '../Tile';
import { GameConfig } from '../../constants/GameConfig';
import { BoardManager, GridPosition } from './BoardManager';
import { CONFIG, COLOR_PRESETS } from '../../constants/AnimationConfig';
import { Singleton } from '../patterns/Singleton';
import { ParticleEffectManager } from './ParticleEffectManager';

const { ccclass, property } = _decorator;

export interface FallTask {
  tile: Tile;
  fromY: number;
  toY: number;
  x: number;
  isNewTile: boolean;
}

@ccclass('AnimationManager')
export class AnimationManager extends Component {
  @property(Node)
  private rotationContainer: Node | null = null;

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

    const children = fallTasks[0].tile.node.parent!.children;

    for (const child of children) {
      Tween.stopAllByTarget(child);
      child.setScale(1, 1, 1);
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

    const baseFallDuration = 0.1;
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
  public animatePulse(pulseCount: number = 2): void {
    if (this.isAnimating) return;

    this.isAnimating = true;
    const pulseScale = this.originalScale
      .clone()
      .multiplyScalar(CONFIG.PULSE_CONFIG.scaleMultiplier!);
    let currentPulse = 0;

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
      .union()
      .repeat(pulseCount)
      .start();
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

    const originalData: { tile: Tile; originalPos: Vec3; originalParent: Node }[] = [];

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (tile && tile.node && tile.node.isValid) {
          originalData.push({
            tile,
            originalPos: tile.node.position.clone(),
            originalParent: tile.node.parent!,
          });
        }
      }
    }

    if (originalData.length === 0) return;

    const totalTiles = originalData.length;
    const animationDuration = GameConfig.MilestoneSystem.celebrationAnimationDuration;
    const moveToCirclePhase = animationDuration * 0.1;
    const circlePhase = animationDuration * 0.7;
    const returnPhase = animationDuration * 0.2;

    const centerPos = centerNode.position.clone();

    const maxRadiusX = (GameConfig.GridWidth * GameConfig.TileWidth) / 2 - GameConfig.TileWidth;
    const maxRadiusY = (GameConfig.GridHeight * GameConfig.TileHeight) / 2 - GameConfig.TileHeight;
    const radius = Math.min(maxRadiusX, maxRadiusY) * 1.1;

    const movePromises = originalData.map((data, idx) => {
      return new Promise<void>(resolve => {
        const angleOffset = (idx / totalTiles) * Math.PI * 2;
        const circleX = centerPos.x + Math.cos(angleOffset) * radius;
        const circleY = centerPos.y + Math.sin(angleOffset) * radius;
        const delay = (idx / totalTiles) * 0.05;

        tween(data.tile.node)
          .delay(delay)
          .parallel(
            tween(data.tile.node).to(
              moveToCirclePhase,
              { position: new Vec3(circleX, circleY, 0) },
              { easing: 'quadOut' }
            ),
            tween(data.tile.node)
              .to(
                moveToCirclePhase * 0.5,
                { scale: new Vec3(0.85, 0.85, 1) },
                { easing: 'quadOut' }
              )
              .to(moveToCirclePhase * 0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
          )
          .call(() => resolve())
          .start();
      });
    });

    await Promise.all(movePromises);

    const virtualContainer = instantiate(this.rotationContainer!);

    centerNode.parent?.addChild(virtualContainer);
    virtualContainer.setPosition(centerPos);
    virtualContainer.setSiblingIndex(this.rotationContainer!.getSiblingIndex());

    originalData.forEach(d => {
      const worldPos = d.tile.node.getWorldPosition();
      d.tile.node.setParent(virtualContainer);
      d.tile.node.setWorldPosition(worldPos);
    });

    await new Promise<void>(resolve => {
      tween(virtualContainer)
        .to(circlePhase, { angle: -720 }, { easing: 'sineInOut' })
        .call(() => resolve())
        .start();
    });

    originalData.forEach(d => {
      const worldPos = d.tile.node.getWorldPosition();
      d.tile.node.setParent(d.originalParent);
      d.tile.node.setWorldPosition(worldPos);
    });

    virtualContainer.destroy();

    const returnPromises = originalData.map((data, idx) => {
      return new Promise<void>(resolve => {
        const delay = (idx / totalTiles) * 0.1;
        tween(data.tile.node)
          .delay(delay)
          .parallel(
            tween(data.tile.node).to(
              returnPhase,
              { position: data.originalPos },
              { easing: 'backOut' }
            ),
            tween(data.tile.node)
              .to(returnPhase * 0.2, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'quadOut' })
              .to(returnPhase * 0.8, { scale: new Vec3(1, 1, 1) }, { easing: 'bounceOut' })
          )
          .call(() => resolve())
          .start();
      });
    });

    await Promise.all(returnPromises);
  }

  /**
   * Double rainbow combination – two rainbow tiles fly up, merge and unleash a shock-wave.
   */
  public async animateDoubleRainbow(
    rainbowOne: Tile,
    rainbowTwo: Tile,
    affectedTiles: Tile[]
  ): Promise<void> {
    if (!rainbowOne.node?.isValid || !rainbowTwo.node?.isValid) return;

    const particleManager = this.node.getComponent(ParticleEffectManager);

    const parentNode = rainbowOne.node.parent;
    if (!parentNode) return;

    rainbowOne.node.setSiblingIndex(rainbowTwo.node.parent!.children.length);
    rainbowTwo.node.setSiblingIndex(rainbowOne.node.parent!.children.length);

    const pos1Local = rainbowOne.node.position.clone();
    const pos2Local = rainbowTwo.node.position.clone();
    const midPointLocal = pos1Local.clone().add(pos2Local).multiplyScalar(0.5);
    midPointLocal.y += 120;

    const flyUp = (tile: Tile) =>
      new Promise<void>(resolve => {
        tween(tile.node)
          .to(
            0.25,
            {
              position: new Vec3(tile.node.position.x, tile.node.position.y + 120, 0),
              scale: new Vec3(1.2, 1.2, 1),
            },
            { easing: 'quadOut' }
          )
          .to(
            0.25,
            {
              position: midPointLocal,
            },
            { easing: 'quadIn' }
          )
          .call(() => resolve())
          .start();
      });

    await Promise.all([flyUp(rainbowOne), flyUp(rainbowTwo)]);

    await new Promise<void>(resolve => {
      tween(rainbowTwo.node)
        .to(0.2, { scale: new Vec3(0, 0, 0) })
        .call(() => resolve())
        .start();
    });

    await new Promise<void>(resolve => {
      tween(rainbowOne.node)
        .to(0.2, { scale: new Vec3(2.5, 2.5, 1) }, { easing: 'sineOut' })
        .call(() => {
          resolve();
        })
        .start();
    });

    const flyUpRapid = (tile: Tile) =>
      new Promise<void>(resolve => {
        tween(tile.node)
          .to(
            0.25,
            { position: new Vec3(tile.node.position.x, tile.node.position.y + 120, 0) },
            { easing: 'quadOut' }
          )
          .call(() => resolve())
          .start();
      });

    await Promise.all([flyUpRapid(rainbowOne), flyUpRapid(rainbowTwo)]);

    const flyDownRapid = (tile: Tile) =>
      new Promise<void>(resolve => {
        tween(tile.node)
          .to(0.25, { position: new Vec3(pos2Local.x, pos2Local.y, 0) }, { easing: 'quadOut' })
          .call(() => resolve())
          .start();
      });

    await Promise.all([flyDownRapid(rainbowOne), flyDownRapid(rainbowTwo)]);
  }

  /**
   * Animate rainbow click effect - split into pieces and jump to random tiles
   */
  public async animateRainbowClickEffect(rainbowTile: Tile, callback?: () => void): Promise<void> {
    if (!rainbowTile.node?.isValid || !rainbowTile.node.parent) return;

    rainbowTile.node.setSiblingIndex(rainbowTile.node.parent!.children.length);

    const rainbowPos = rainbowTile.node.position.clone();
    const rainbowScale = rainbowTile.node.scale.clone();

    tween(rainbowTile.node)
      .parallel(
        tween(rainbowTile.node).to(
          0.2,
          {
            position: new Vec3(rainbowPos.x, rainbowPos.y + 60, 0),
          },
          { easing: 'backOut' }
        ),
        tween(rainbowTile.node).to(
          0.2,
          { scale: new Vec3(rainbowScale.x * 1.5, rainbowScale.y * 1.5, 1) },
          { easing: 'backOut' }
        )
      )
      .parallel(
        tween(rainbowTile.node).to(0.2, { position: rainbowPos }, { easing: 'backIn' }),
        tween(rainbowTile.node).to(
          0.2,
          { scale: new Vec3(rainbowScale.x * 0.5, rainbowScale.y * 0.5, 1) },
          { easing: 'backIn' }
        )
      )
      .delay(0.1)
      .call(() => {
        callback?.();
      })
      .start();
  }

  /**
   * Animate rainbow swap with a normal tile: rainbow explodes into pieces that fly to all tiles of the swapped type
   */
  public async animateRainbowSwapToType(
    rainbowTile: Tile,
    targetType: any,
    targetTiles: Tile[]
  ): Promise<void> {
    if (!rainbowTile.node?.isValid || !rainbowTile.node.parent) return;
    if (!targetTiles.length) return;

    const pieceCount = targetTiles.length;
    const pieces: Node[] = [];
    const rainbowPos = rainbowTile.node.position.clone();

    for (let i = 0; i < pieceCount; i++) {
      const piece = new Node(`RainbowPiece_${i}`);
      piece.addComponent(Sprite);
      const sprite = piece.getComponent(Sprite)!;
      const uiTransform = piece.addComponent(UITransform);
      if (uiTransform) {
        uiTransform.setContentSize(GameConfig.SpriteSize, GameConfig.SpriteSize);
      }
      const rainbowSprite = rainbowTile.getSprite();
      if (rainbowSprite && rainbowSprite.spriteFrame) {
        sprite.spriteFrame = rainbowSprite.spriteFrame;
      }
      piece.setParent(rainbowTile.node.parent);
      piece.setPosition(rainbowPos);
      piece.setScale(0.5, 0.5, 1);
      pieces.push(piece);
    }

    tween(rainbowTile.node)
      .to(0.2, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
      .start();

    const scatterPromises = pieces.map((piece, index) => {
      const angle = (index / pieceCount) * 360 + Math.random() * 60 - 30;
      const scatterDistance = 80 + Math.random() * 40;
      const scatterX = Math.cos((angle * Math.PI) / 180) * scatterDistance;
      const scatterY = Math.sin((angle * Math.PI) / 180) * scatterDistance;
      return new Promise<void>(resolve => {
        tween(piece)
          .to(
            0.3,
            {
              position: new Vec3(rainbowPos.x + scatterX, rainbowPos.y + scatterY, 0),
              scale: new Vec3(0.6, 0.6, 1),
            },
            { easing: 'backOut' }
          )
          .call(() => resolve())
          .start();
      });
    });
    await Promise.all(scatterPromises);
    await new Promise(resolve => setTimeout(resolve, 200));

    const flyPromises = pieces.map((piece, index) => {
      const target = targetTiles[index];
      if (!target.node?.isValid) return Promise.resolve();
      const targetPos = target.node.position.clone();
      const delay = index * 0.07;
      return new Promise<void>(resolve => {
        tween(piece)
          .delay(delay)
          .to(
            0.5,
            {
              position: targetPos,
              scale: new Vec3(0.2, 0.2, 1),
            },
            { easing: 'quadInOut' }
          )
          .call(() => {
            if (target.node?.isValid) {
              tween(target.node)
                .to(0.1, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' })
                .to(0.2, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
                .start();
            }
            piece.destroy();
            resolve();
          })
          .start();
      });
    });
    await Promise.all(flyPromises);

    const particleManager = this.node.getComponent(ParticleEffectManager);
    if (particleManager && rainbowTile.node.parent) {
      particleManager.playSparkleEffect(rainbowPos, rainbowTile.node.parent);
    }
  }

  public async animateCombine(
    sourceTile: Tile,
    targetTile: Tile,
    callback?: () => void,
    resolve?: () => void
  ): Promise<void> {
    tween(sourceTile.node)
      .to(0.1, { position: targetTile.node.getPosition() }, { easing: 'quadOut' })
      .call(() => {
        callback?.();
        resolve?.();
      })
      .start();
  }
}
