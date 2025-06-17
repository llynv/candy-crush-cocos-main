import {
  _decorator,
  Component,
  Prefab,
  instantiate,
  ParticleSystem2D,
  Node,
  Vec3,
  Color,
  UITransform,
} from 'cc';
import { SpecialTileType } from '../../constants/SpecialTileConfig';
import { Tile } from '../Tile';

const { ccclass, property } = _decorator;

@ccclass('ParticleEffectManager')
export class ParticleEffectManager extends Component {
  @property(Prefab)
  private bombCreationEffect: Prefab | null = null;

  @property(Prefab)
  private rainbowCreationEffect: Prefab | null = null;

  @property(Prefab)
  private bombActivationEffect: Prefab | null = null;

  @property(Prefab)
  private rainbowActivationEffect: Prefab | null = null;

  @property(Prefab)
  private explosionEffect: Prefab | null = null;

  @property(Prefab)
  private sparkleEffect: Prefab | null = null;

  @property(Prefab)
  private confettiEffect: Prefab | null = null;

  @property(Prefab)
  private shockwaveEffect: Prefab | null = null;

  public async playSpecialTileCreationEffect(
    tile: Tile,
    specialType: SpecialTileType
  ): Promise<void> {
    const effectPrefab = this.getCreationEffectPrefab(specialType);
    if (!effectPrefab || !tile.node || !tile.node.isValid) return;

    return this.playEffect(effectPrefab, tile.node.worldPosition, tile.node.parent);
  }

  public playSpecialTileActivationEffect(tile: Tile, specialType: SpecialTileType): void {
    const effectPrefab = this.getActivationEffectPrefab(specialType);
    if (!effectPrefab || !tile.node || !tile.node.isValid) return;

    this.playEffect(effectPrefab, tile.node.worldPosition, tile.node.parent);
  }

  public async playExplosionEffect(position: Vec3, parent: Node): Promise<void> {
    if (!this.explosionEffect) return;
    return this.playEffect(this.explosionEffect, position, parent);
  }

  public async playSparkleEffect(position: Vec3, parent: Node): Promise<void> {
    if (!this.sparkleEffect) return;
    return this.playEffect(this.sparkleEffect, position, parent);
  }

  /**
   * Play confetti effect for milestone celebrations
   */
  public async playConfettiEffect(position: Vec3, parent: Node, color?: Color): Promise<void> {
    const effectPrefab = this.confettiEffect || this.sparkleEffect;
    if (!effectPrefab) return;

    return this.playColoredEffect(effectPrefab, position, parent, color);
  }

  /**
   * Play multiple confetti bursts for milestone celebration
   */
  public async playMilestoneConfetti(parent: Node): Promise<void> {
    const confettiColors = [
      new Color(255, 215, 0, 255),
      new Color(255, 20, 147, 255),
      new Color(0, 191, 255, 255),
      new Color(50, 205, 50, 255),
      new Color(255, 165, 0, 255),
      new Color(138, 43, 226, 255),
    ];

    const confettiPositions = this.generateConfettiPositions(parent);

    const confettiPromises = confettiPositions.map((position, index) => {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const color = confettiColors[index % confettiColors.length];
          this.playConfettiEffect(position, parent, color).then(resolve);
        }, index * 150);
      });
    });

    await Promise.all(confettiPromises);
  }

  /**
   * Generate confetti positions around the screen
   */
  private generateConfettiPositions(parent: Node): Vec3[] {
    const positions: Vec3[] = [];

    const bounds = this.getNodeBounds(parent);

    positions.push(
      new Vec3(bounds.left + 100, bounds.top - 100, 0),
      new Vec3(bounds.right - 100, bounds.top - 100, 0),
      new Vec3(bounds.center.x, bounds.top - 50, 0),
      new Vec3(bounds.left + 50, bounds.center.y + 100, 0),
      new Vec3(bounds.right - 50, bounds.center.y + 100, 0),
      new Vec3(bounds.center.x - 200, bounds.top - 150, 0),
      new Vec3(bounds.center.x + 200, bounds.top - 150, 0)
    );

    return positions;
  }

  /**
   * Get bounds of a node for positioning effects
   */
  private getNodeBounds(node: Node) {
    const defaultBounds = {
      left: -400,
      right: 400,
      top: 300,
      bottom: -300,
      center: { x: 0, y: 0 },
    };

    try {
      const transform = node.getComponent(UITransform);
      if (transform && transform.contentSize) {
        const size = transform.contentSize;
        return {
          left: -size.width / 2,
          right: size.width / 2,
          top: size.height / 2,
          bottom: -size.height / 2,
          center: { x: 0, y: 0 },
        };
      }
    } catch (error) {
      console.warn('Could not get node bounds, using defaults:', error);
    }

    return defaultBounds;
  }

  private getCreationEffectPrefab(specialType: SpecialTileType): Prefab | null {
    switch (specialType) {
      case SpecialTileType.BOMB:
        return this.bombCreationEffect;
      case SpecialTileType.RAINBOW:
        return this.rainbowCreationEffect;
      default:
        return null;
    }
  }

  private getActivationEffectPrefab(specialType: SpecialTileType): Prefab | null {
    switch (specialType) {
      case SpecialTileType.BOMB:
        return this.bombActivationEffect;
      case SpecialTileType.RAINBOW:
        return this.rainbowActivationEffect;
      default:
        return null;
    }
  }

  private playEffect(effectPrefab: Prefab, worldPosition: Vec3, parent: Node | null): void {
    if (!parent) return;

    const effectNode = instantiate(effectPrefab);
    parent.addChild(effectNode);
    effectNode.setWorldPosition(worldPosition);

    const particleSystem = effectNode.getComponent(ParticleSystem2D);
    if (particleSystem) {
      particleSystem.playOnLoad = true;

      setTimeout(() => {
        if (effectNode && effectNode.isValid) {
          effectNode.destroy();
        }
      }, 3000);
    }
  }

  /**
   * Play effect with custom color
   */
  private playColoredEffect(
    effectPrefab: Prefab,
    worldPosition: Vec3,
    parent: Node | null,
    color?: Color
  ): void {
    if (!parent) return;

    const effectNode = instantiate(effectPrefab);
    parent.addChild(effectNode);
    effectNode.setWorldPosition(worldPosition);

    const particleSystem = effectNode.getComponent(ParticleSystem2D);
    if (particleSystem) {
      particleSystem.playOnLoad = true;

      if (color) {
        particleSystem.startColor = color;
        particleSystem.endColor = color;
        particleSystem.startColorVar = new Color(50, 50, 50, 0);
        particleSystem.endColorVar = new Color(50, 50, 50, 0);
      }

      setTimeout(() => {
        if (effectNode && effectNode.isValid) {
          effectNode.destroy();
        }
      }, 3000);
    }
  }

  public async playMultipleEffects(
    positions: Vec3[],
    effectType: 'explosion' | 'sparkle' | 'confetti' | 'shockwave',
    parent: Node
  ): Promise<void> {
    const effectPromises = positions.map((position, index) => {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          if (effectType === 'explosion') {
            this.playExplosionEffect(position, parent).then(resolve);
          } else if (effectType === 'sparkle') {
            this.playSparkleEffect(position, parent).then(resolve);
          } else if (effectType === 'confetti') {
            this.playConfettiEffect(position, parent).then(resolve);
          } else if (effectType === 'shockwave') {
            this.playShockwaveEffect(position, parent).then(resolve);
          } else {
            resolve();
          }
        }, index * 100);
      });
    });

    await Promise.all(effectPromises);
  }

  public async playSpecialTileDestroyEffect(
    position: Vec3,
    parent: Node,
    specialType: SpecialTileType
  ): Promise<void> {
    if (!this.shockwaveEffect) return;
    switch (specialType) {
      case SpecialTileType.BOMB:
        return this.playEffect(this.shockwaveEffect, position, parent);

      case SpecialTileType.RAINBOW:
        // return this.playEffect(this.rainbowCreationEffect, position, parent);
        break;

      default:
        break;
    }
  }

  private getParticleEffectPrefab(effectType: SpecialTileType): Prefab | null {
    switch (effectType) {
      case SpecialTileType.BOMB:
        return this.bombCreationEffect;
      case SpecialTileType.RAINBOW:
        return this.rainbowCreationEffect;
      default:
        return null;
    }
  }

  public createTileParticleEffect(tile: Tile, effectType: SpecialTileType): void {
    if (!tile.node || !tile.node.isValid) return;

    const tileColor = tile.getTileType().color;
    const effectPrefab = this.getParticleEffectPrefab(effectType);

    if (!effectPrefab) return;

    const effectNode = instantiate(effectPrefab);
    effectNode.setParent(tile.node);
    tile.node.addChild(effectNode);
    effectNode.setPosition(0, 0, 0);

    const particleSystem = effectNode.getComponent(ParticleSystem2D);
    if (particleSystem && effectType !== SpecialTileType.RAINBOW) {
      particleSystem.startColor = tileColor;
      particleSystem.startColorVar = new Color(0, 0, 0, 255);
      particleSystem.endColor = tileColor;
      particleSystem.endColorVar = new Color(0, 0, 0, 255);
      particleSystem.playOnLoad = true;
    }
  }

  /**
   * Play a shock-wave effect (ring expanding outwards)
   */
  public async playShockwaveEffect(position: Vec3, parent: Node): Promise<void> {
    if (!this.shockwaveEffect) return;
    return this.playEffect(this.shockwaveEffect, position, parent);
  }

  protected onDestroy(): void {
    this.node.children.forEach(child => {
      if (child.isValid) {
        child.destroy();
      }
    });
  }
}
