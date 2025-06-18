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
  public spawnConfettiParticle(
    position: Vec3,
    config: Partial<ConfettiConfig> = {}
  ): ConfettiParticle {
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
  public createConfettiBurst(position: Vec3, config: Partial<ConfettiSystemConfig> = {}): void {
    const defaultConfig: ConfettiSystemConfig = {
      particleCount: 35,
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
      intensity: 'heavy',
    };

    const finalConfig = { ...defaultConfig, ...config };

    const particleCount = this.getParticleCount(finalConfig);

    const burstInterval = finalConfig.burstDuration / particleCount;

    for (let i = 0; i < particleCount; i++) {
      this.scheduleOnce(() => {
        const tightRadius = finalConfig.spawnRadius * 0.3;
        const spawnPos = this.getRandomSpawnPosition(position, tightRadius);
        const particleConfig = this.getParticleConfig(finalConfig);
        this.spawnConfettiParticle(spawnPos, particleConfig);
      }, i * burstInterval);
    }
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
    const screenBounds = this.getScreenBounds();
    const burstPositions = [
      new Vec3(screenBounds.left + 100, screenBounds.top - 100, 0),
      new Vec3(screenBounds.right - 100, screenBounds.top - 100, 0),
      new Vec3(screenBounds.center.x, screenBounds.top - 50, 0),
      new Vec3(screenBounds.left + 200, screenBounds.top - 200, 0),
      new Vec3(screenBounds.right - 200, screenBounds.top - 200, 0),
    ];

    for (const [index, position] of burstPositions.entries()) {
      this.scheduleOnce(() => {
        this.createConfettiBurst(position, {
          particleCount: 40,
          intensity: 'medium',
        });
      }, index * 0.1);
    }
  }

  /**
   * Get particle configuration based on system config
   */
  private getParticleConfig(systemConfig: ConfettiSystemConfig): Partial<ConfettiConfig> {
    const velocityMultiplier =
      systemConfig.intensity === 'heavy' ? 1.2 : systemConfig.intensity === 'light' ? 0.8 : 1.0;

    const baseUpwardVelocity = 200 * velocityMultiplier;
    const maxUpwardVelocity = 500 * velocityMultiplier;
    const maxOutwardVelocity = 300 * velocityMultiplier;

    return {
      initialVelocityMin: new Vec3(-maxOutwardVelocity, baseUpwardVelocity, 0),
      initialVelocityMax: new Vec3(maxOutwardVelocity, maxUpwardVelocity, 0),
      colors: systemConfig.colors,
      lifetime: systemConfig.intensity === 'heavy' ? 7.0 : 6.0,
      gravity: 600,
      airDensity: 1.5,
      shapes: ['square', 'rectangle'],
      massRange: { min: 0.0005, max: 0.0015 },
      rotationSpeed: 540,
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
