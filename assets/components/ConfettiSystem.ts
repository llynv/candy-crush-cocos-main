import {
  _decorator,
  Component,
  Node,
  Vec3,
  Color,
  instantiate,
  Prefab,
  randomRange,
  randomRangeInt,
  UITransform,
  Sprite,
  Canvas,
} from 'cc';
import { ConfettiParticle, ConfettiConfig } from './ConfettiParticle';

const { ccclass, property } = _decorator;

interface ConfettiSystemConfig {
  particleCount: number;
  spawnRadius: number;
  burstDuration: number;
  colors: Color[];
  intensity: 'light' | 'medium' | 'heavy';
}

@ccclass('ConfettiSystem')
export class ConfettiSystem extends Component {
  @property(Prefab)
  private confettiParticlePrefab: Prefab | null = null;

  @property(Node)
  private leftNode: Node | null = null;
  @property(Node)
  private rightNode: Node | null = null;

  private activeParticles: ConfettiParticle[] = [];

  /**
   * Create a new particle node
   */
  private createParticleNode(): Node {
    const particleNode = instantiate(this.confettiParticlePrefab!);
    this.node.addChild(particleNode);
    return particleNode;
  }

  /**
   * Spawn a single confetti particle at a position
   */
  public spawnConfettiParticle(position: Vec3, config: ConfettiConfig): ConfettiParticle {
    const particleNode = this.createParticleNode();
    particleNode.active = true;
    const confettiParticle = particleNode.getComponent(ConfettiParticle);

    if (!confettiParticle) {
      console.error('ConfettiParticle component not found on particle node');
      return null!;
    }

    particleNode.setPosition(position);

    confettiParticle.setDestroyCallback(() => {
      this.removeActiveParticle(confettiParticle);
    });

    confettiParticle.launch(config);

    this.activeParticles.push(confettiParticle);
    return confettiParticle;
  }

  /**
   * Create a confetti burst at a specific position
   */
  public createConfettiBurst(config: Partial<ConfettiSystemConfig> = {}): void {
    const defaultConfig: ConfettiSystemConfig = {
      particleCount: config.particleCount || 35,
      spawnRadius: 100,
      burstDuration: 0,
      colors: [
        new Color(255, 215, 0),
        new Color(255, 20, 147),
        new Color(0, 191, 255),
        new Color(50, 205, 50),
        new Color(255, 165, 0),
        new Color(138, 43, 226),
      ],
      intensity: config.intensity || 'heavy',
    };

    const finalConfig = { ...defaultConfig, ...config };

    const particleCount = this.getParticleCount(finalConfig);

    const burstInterval = finalConfig.burstDuration / particleCount;

    for (let i = 0; i < particleCount; i++) {
      this.scheduleOnce(() => {
        const leftSpawnPos = this.getEdgeToCenterSpawnPosition('left');
        const rightSpawnPos = this.getEdgeToCenterSpawnPosition('right');
        const leftParticleConfig = this.getParticleConfig(finalConfig, 'left');
        const rightParticleConfig = this.getParticleConfig(finalConfig, 'right');
        this.spawnConfettiParticle(leftSpawnPos, leftParticleConfig);
        this.spawnConfettiParticle(rightSpawnPos, rightParticleConfig);
      }, i * burstInterval);
    }
  }

  private getEdgeToCenterSpawnPosition(direction: 'left' | 'right'): Vec3 {
    return direction === 'left' ? this.leftNode?.position! : this.rightNode?.position!;
  }

  private getParticleCount(config: ConfettiSystemConfig): number {
    switch (config.intensity) {
      case 'light':
        return Math.floor(config.particleCount * 0.5);
      case 'heavy':
        return Math.floor(config.particleCount * 1.5);
      default:
        return config.particleCount;
    }
  }

  /**
   * Create a celebration confetti effect (multiple bursts)
   */
  public createCelebrationConfetti(): void {
    this.createConfettiBurst({
      particleCount: 50,
      intensity: 'medium',
    });
  }

  /**
   * Get particle configuration based on system config
   */
  private getParticleConfig(
    systemConfig: ConfettiSystemConfig,
    direction: 'left' | 'right'
  ): ConfettiConfig {
    const velocityMultiplier =
      systemConfig.intensity === 'heavy' ? 1.2 : systemConfig.intensity === 'light' ? 0.8 : 1.0;

    const baseUpwardVelocity = 1000 * velocityMultiplier;
    const maxUpwardVelocity = 1000 * velocityMultiplier;
    const minOutwardVelocity = 100 * velocityMultiplier;
    const maxOutwardVelocity = 500 * velocityMultiplier;

    return {
      initialVelocityMin: new Vec3(
        direction === 'left' ? minOutwardVelocity : -maxOutwardVelocity,
        baseUpwardVelocity,
        0
      ),
      initialVelocityMax: new Vec3(
        direction === 'left' ? maxOutwardVelocity : -minOutwardVelocity,
        maxUpwardVelocity,
        0
      ),
      colors: systemConfig.colors,
      lifetime: systemConfig.intensity === 'heavy' ? 7.0 : 6.0,
      gravity: 900,
      airDensity: 2.4,
      shapes: ['square', 'rectangle'],
      massRange: { min: 0.0015, max: 0.003 },
      rotationSpeed: 240,
    };
  }

  /**
   * Get a random spawn position within radius
   */
  private getRandomSpawnPosition(center: Vec3, radius: number): Vec3 {
    const angle = randomRange(0, Math.PI * 2);
    const distance = randomRange(0, radius);

    return new Vec3(
      center.x + Math.cos(angle) * distance,
      center.y + Math.sin(angle) * distance,
      center.z
    );
  }

  /**
   * Get screen bounds for positioning
   */
  private getScreenBounds() {
    const defaultBounds = {
      left: -400,
      right: 400,
      top: 300,
      bottom: -300,
      center: { x: 0, y: 0 },
    };

    try {
      const transform = this.node.getComponent(UITransform);
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
      console.warn('Could not get screen bounds, using defaults:', error);
    }

    return defaultBounds;
  }

  /**
   * Remove a particle from the active list
   */
  private removeActiveParticle(particle: ConfettiParticle): void {
    const index = this.activeParticles.indexOf(particle);
    if (index > -1) {
      this.activeParticles.splice(index, 1);
    }
  }

  /**
   * Clear all active particles
   */
  public clearAllParticles(): void {
    for (const particle of this.activeParticles) {
      if (particle && particle.getIsActive()) {
        particle.destroyParticle();
      }
    }
    this.activeParticles = [];
  }

  /**
   * Get the number of active particles
   */
  public getActiveParticleCount(): number {
    return this.activeParticles.length;
  }

  protected onDestroy(): void {
    this.clearAllParticles();
  }
}
