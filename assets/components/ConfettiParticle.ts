import {
  _decorator,
  Component,
  Node,
  Vec3,
  Color,
  Sprite,
  SpriteFrame,
  UITransform,
  randomRange,
  randomRangeInt,
  tween,
  Tween,
} from 'cc';

const { ccclass, property } = _decorator;

interface ConfettiConfig {
  initialVelocityMin: Vec3;
  initialVelocityMax: Vec3;
  gravity: number;
  airDensity: number;
  rotationSpeed: number;
  lifetime: number;
  colors: Color[];
  shapes: string[];
  massRange: { min: number; max: number };
}

@ccclass('ConfettiParticle')
export class ConfettiParticle extends Component {
  @property(Sprite)
  private sprite: Sprite | null = null;

  private velocity: Vec3 = new Vec3();
  private angularVelocity: number = 0;
  private gravity: number = 9.81; // m/s² (converted to pixels later)
  private airDensity: number = 1.225; // kg/m³ at sea level
  private mass: number = 0.001; // kg (very light confetti)
  private dragCoefficient: number = 1.2; // Cd value based on shape
  private crossSectionalArea: number = 0.0001; // m² (converted from pixel area)
  private terminalVelocity: number = 0;

  private lifetime: number = 0;
  private maxLifetime: number = 5.0;
  private startTime: number = 0;

  // Physics constants for pixel-based calculations
  private readonly PIXELS_PER_METER: number = 100; // 130 pixels = 1 meter
  private readonly GRAVITY_PIXELS: number = 981; // 9.81 m/s² * 130 pixels/m

  private initialScale: Vec3 = new Vec3(1, 1, 1);
  private fadeStartTime: number = 0.7;
  private currentShape: string = 'rectangle';

  private isActive: boolean = false;
  private destroyCallback: (() => void) | null = null;

  protected onLoad(): void {
    if (!this.sprite) {
      this.sprite = this.getComponent(Sprite) || this.addComponent(Sprite);
    }

    this.initialScale = this.node.scale.clone();
    this.node.active = false;
  }

  /**
   * Initialize and launch the confetti particle
   */
  public launch(config: Partial<ConfettiConfig> = {}): void {
    this.setupParticle(config);
    this.isActive = true;
    this.startTime = Date.now() / 1000;
    this.node.active = true;
  }

  /**
   * Set up the particle with configuration
   */
  private setupParticle(config: Partial<ConfettiConfig>): void {
    const defaultConfig: ConfettiConfig = {
      initialVelocityMin: new Vec3(-200, 400, 0),
      initialVelocityMax: new Vec3(200, 500, 0),
      gravity: this.GRAVITY_PIXELS,
      airDensity: 1.225,
      rotationSpeed: 360,
      lifetime: 5.0,
      colors: [
        new Color(255, 215, 0),
        new Color(255, 20, 147),
        new Color(0, 191, 255),
        new Color(50, 205, 50),
        new Color(255, 165, 0),
        new Color(138, 43, 226),
        new Color(255, 69, 0),
        new Color(255, 105, 180),
      ],
      shapes: ['square', 'circle', 'triangle', 'rectangle'],
      massRange: { min: 0.0015, max: 0.002 }, // kg - very light confetti pieces
    };

    const finalConfig = { ...defaultConfig, ...config };

    this.velocity = new Vec3(
      randomRange(finalConfig.initialVelocityMin.x, finalConfig.initialVelocityMax.x),
      randomRange(finalConfig.initialVelocityMin.y, finalConfig.initialVelocityMax.y),
      0
    );

    this.gravity = finalConfig.gravity;
    this.airDensity = finalConfig.airDensity;
    this.maxLifetime = finalConfig.lifetime;
    this.mass = randomRange(finalConfig.massRange.min, finalConfig.massRange.max);

    this.angularVelocity = randomRange(-finalConfig.rotationSpeed, finalConfig.rotationSpeed);

    const randomColor = finalConfig.colors[randomRangeInt(0, finalConfig.colors.length)];
    if (this.sprite) {
      this.sprite.color = randomColor;
    }

    const randomScale = randomRange(0.5, 1.2);
    this.node.setScale(
      this.initialScale.x * randomScale,
      this.initialScale.y * randomScale,
      this.initialScale.z
    );

    this.currentShape = finalConfig.shapes[randomRangeInt(0, finalConfig.shapes.length)];
    this.createConfettiShape(this.currentShape);
    this.calculateTerminalVelocity();
  }

  /**
   * Create a simple confetti shape and set its physical properties
   */
  private createConfettiShape(shape: string): void {
    const uiTransform = this.node.getComponent(UITransform);
    if (!uiTransform) return;

    let width: number, height: number;

    switch (shape) {
      case 'square':
        width = height = 12;
        this.dragCoefficient = 1.05; // Square has high drag
        break;
      case 'circle':
        width = height = 10;
        this.dragCoefficient = 0.47; // Circle is more aerodynamic
        break;
      case 'triangle':
        width = 10;
        height = 12;
        this.dragCoefficient = 1.2; // Triangle has highest drag due to sharp edges
        break;
      case 'rectangle':
        width = 15;
        height = 10;
        this.dragCoefficient = 0.98;
        break;
      default:
        width = 8;
        height = 16;
        this.dragCoefficient = 1.1;
        break;
    }

    uiTransform.setContentSize(width, height);

    // Calculate cross-sectional area in square meters
    // Convert pixels to meters and calculate area
    const widthMeters = width / this.PIXELS_PER_METER;
    const heightMeters = height / this.PIXELS_PER_METER;
    this.crossSectionalArea = widthMeters * heightMeters;
  }

  /**
   * Calculate terminal velocity using: v = √(2mg / (Cd * ρ * A))
   */
  private calculateTerminalVelocity(): void {
    const weight = this.mass * 9.81; // N (Newtons)
    const denominator = this.dragCoefficient * this.airDensity * this.crossSectionalArea;

    // Terminal velocity in m/s
    const terminalVelocityMS = Math.sqrt((2 * weight) / denominator);

    // Convert to pixels/s for our coordinate system
    this.terminalVelocity = terminalVelocityMS * this.PIXELS_PER_METER;
  }

  /**
   * Calculate drag force using: Fd = 1/2 * Cd * ρ * A * v²
   */
  private calculateDragForce(velocity: Vec3): Vec3 {
    const speed = velocity.length(); // |v|
    if (speed === 0) return new Vec3(0, 0, 0);

    // Convert velocity from pixels/s to m/s for calculation
    const speedMS = speed / this.PIXELS_PER_METER;

    // Calculate drag force magnitude in Newtons
    const dragForceMagnitude =
      0.5 * this.dragCoefficient * this.airDensity * this.crossSectionalArea * speedMS * speedMS;

    // Convert back to pixel-based force (N * pixels/m / kg = pixels/s²)
    const dragForcePixels = (dragForceMagnitude * this.PIXELS_PER_METER) / this.mass;

    // Drag force opposes velocity direction
    const velocityDirection = velocity.clone().normalize();
    velocityDirection.multiplyScalar(-dragForcePixels);

    return velocityDirection;
  }

  protected update(deltaTime: number): void {
    if (!this.isActive) return;

    this.updatePhysics(deltaTime);
    this.updateLifetime(deltaTime);
    this.updateAppearance();
  }

  /**
   * Update particle physics using realistic force-based calculations
   */
  private updatePhysics(deltaTime: number): void {
    // Calculate forces
    const gravityForce = new Vec3(0, -this.gravity, 0); // Downward gravity
    const dragForce = this.calculateDragForce(this.velocity);

    // Net force = gravity + drag
    const netForce = gravityForce.add(dragForce);

    // Apply force to update velocity: F = ma, so a = F/m
    // Since our forces are already in acceleration units (pixels/s²), we can apply directly
    this.velocity.x += netForce.x * deltaTime;
    this.velocity.y += netForce.y * deltaTime;

    // Optional: Debug terminal velocity approach
    const currentSpeed = this.velocity.length();
    if (currentSpeed > this.terminalVelocity * 1.1) {
      // If we're significantly over terminal velocity, something might be wrong
      // This is just for debugging - in real physics this should naturally balance
      console.log(
        `Confetti speed (${currentSpeed.toFixed(1)}) exceeds terminal velocity (${this.terminalVelocity.toFixed(1)})`
      );
    }

    // Update position based on velocity
    const currentPos = this.node.position;
    this.node.setPosition(
      currentPos.x + this.velocity.x * deltaTime,
      currentPos.y + this.velocity.y * deltaTime,
      currentPos.z
    );

    // Update rotation
    const currentRotation = this.node.eulerAngles;
    this.node.setRotationFromEuler(
      currentRotation.x,
      currentRotation.y,
      currentRotation.z + this.angularVelocity * deltaTime
    );
  }

  /**
   * Update particle lifetime
   */
  private updateLifetime(deltaTime: number): void {
    this.lifetime += deltaTime;

    if (this.lifetime >= this.maxLifetime) {
      this.destroyParticle();
    }
  }

  /**
   * Update particle appearance based on lifetime
   */
  private updateAppearance(): void {
    const lifeRatio = this.lifetime / this.maxLifetime;

    if (lifeRatio > this.fadeStartTime) {
      const fadeRatio = (lifeRatio - this.fadeStartTime) / (1 - this.fadeStartTime);
      const alpha = Math.max(0, 1 - fadeRatio);

      if (this.sprite) {
        const currentColor = this.sprite.color.clone();
        currentColor.a = alpha * 255;
        this.sprite.color = currentColor;
      }
    }

    const sizeRatio = 1 - lifeRatio * 0.2;
    this.node.setScale(
      this.initialScale.x * sizeRatio,
      this.initialScale.y * sizeRatio,
      this.initialScale.z
    );
  }

  /**
   * Set callback to be called when particle is destroyed
   */
  public setDestroyCallback(callback: () => void): void {
    this.destroyCallback = callback;
  }

  /**
   * Destroy the particle
   */
  public destroyParticle(): void {
    this.isActive = false;

    if (this.destroyCallback) {
      this.destroyCallback();
    }

    this.node.active = false;

    this.scheduleOnce(() => {
      if (this.node && this.node.isValid) {
        this.node.destroy();
      }
    }, 0.1);
  }

  /**
   * Check if particle is still active
   */
  public getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current velocity (useful for debugging)
   */
  public getVelocity(): Vec3 {
    return this.velocity.clone();
  }

  /**
   * Get the calculated terminal velocity for this particle
   */
  public getTerminalVelocity(): number {
    return this.terminalVelocity;
  }

  /**
   * Get current speed vs terminal velocity ratio (useful for debugging)
   */
  public getSpeedRatio(): number {
    const currentSpeed = this.velocity.length();
    return currentSpeed / this.terminalVelocity;
  }

  /**
   * Force stop the particle (stops physics but doesn't destroy)
   */
  public stop(): void {
    this.isActive = false;
    this.velocity.set(0, 0, 0);
    this.angularVelocity = 0;
  }
}
