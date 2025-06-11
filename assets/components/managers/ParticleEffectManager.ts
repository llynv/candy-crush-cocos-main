import {
  _decorator,
  Component,
  Prefab,
  instantiate,
  ParticleSystem2D,
  Node,
  Vec3,
  Color,
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
    }
  }

  public async playMultipleEffects(
    positions: Vec3[],
    effectType: 'explosion' | 'sparkle',
    parent: Node
  ): Promise<void> {
    const effectPromises = positions.map((position, index) => {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          if (effectType === 'explosion') {
            this.playExplosionEffect(position, parent).then(resolve);
          } else {
            this.playSparkleEffect(position, parent).then(resolve);
          }
        }, index * 100);
      });
    });

    await Promise.all(effectPromises);
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

    console.log('effectPrefab', effectPrefab);

    if (!effectPrefab) return;

    const effectNode = instantiate(effectPrefab);
    tile.node.addChild(effectNode);
    effectNode.setPosition(0, 0, 0);

    const particleSystem = effectNode.getComponent(ParticleSystem2D);
    console.log('particleSystem', particleSystem);
    if (particleSystem && effectType !== SpecialTileType.RAINBOW) {
      particleSystem.startColor = tileColor;
      particleSystem.startColorVar = new Color(0, 0, 0, 255);
      particleSystem.endColor = tileColor;
      particleSystem.endColorVar = new Color(0, 0, 0, 255);
      particleSystem.playOnLoad = true;
    }
  }
}
