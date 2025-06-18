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

export type Shape = 'rectangle' | 'square';

export interface ConfettiConfig {
  initialVelocityMin: Vec3;
  initialVelocityMax: Vec3;
  gravity: number;
  airDensity: number;
  rotationSpeed: number;
  lifetime: number;
  colors: Color[];
  shapes: Shape[];
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

  public setVelocity(velocity: Vec3): void {
    this.velocity = velocity;
  }

  private lifetime: number = 0;
  private maxLifetime: number = 5.0;
  private startTime: number = 0;

  // Physics constants for pixel-based calculations
  private readonly PIXELS_PER_METER: number = 200; // 130 pixels = 1 meter
  private readonly GRAVITY_PIXELS: number = 981; // 9.81 m/s² * 130 pixels/m

  private initialScale: Vec3 = new Vec3(1, 1, 1);
  private fadeStartTime: number = 0.7;
  private currentShape: Shape = 'rectangle';

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
  public launch(config: ConfettiConfig): void {
    this.setupParticle(config);
    this.isActive = true;
    this.startTime = Date.now() / 1000;
    this.node.active = true;
  }

  /**
   * Set up the particle with configuration
   */
  private setupParticle(config: ConfettiConfig): void {
    const finalConfig = { ...config };

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
  private createConfettiShape(shape: Shape): void {
    const uiTransform = this.node.getComponent(UITransform);
    if (!uiTransform) return;

    let width: number, height: number;

    switch (shape) {
      case 'rectangle':
        width = 15;
        height = 10;
        this.dragCoefficient = 0.98;
        break;
      case 'square':
        width = height = 12;
        this.dragCoefficient = 1.05;
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
    if (speed === 0 || !isFinite(speed)) return new Vec3(0, 0, 0);

    // Convert velocity from pixels/s to m/s for calculation
    const speedMS = speed / this.PIXELS_PER_METER;

    // Calculate drag force magnitude in Newtons
    const dragForceMagnitude =
      0.5 * this.dragCoefficient * this.airDensity * this.crossSectionalArea * speedMS * speedMS;

    // Convert back to pixel-based force (N * pixels/m / kg = pixels/s²)
    const dragForcePixels = (dragForceMagnitude * this.PIXELS_PER_METER) / this.mass;

    // Safety check to prevent infinite or NaN values
    if (!isFinite(dragForcePixels) || dragForcePixels > 10000) {
      return new Vec3(0, 0, 0);
    }

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

    // Safety check for net force
    if (!isFinite(netForce.x) || !isFinite(netForce.y)) {
      netForce.set(0, -this.gravity, 0); // Fallback to just gravity
    }

    const currentSpeed = this.velocity.length();
    if (currentSpeed > -this.terminalVelocity) {
      // Apply force to update velocity: F = ma, so a = F/m
      // Since our forces are already in acceleration units (pixels/s²), we can apply directly
      this.velocity.x += netForce.x * deltaTime;
      this.velocity.y += netForce.y * deltaTime;
    }

    // Safety check for velocity
    if (!isFinite(this.velocity.x) || !isFinite(this.velocity.y)) {
      this.velocity.set(0, 0, 0); // Reset to zero if infinite
    }

    // Update position based on velocity
    const currentPos = this.node.position;
    const newX = currentPos.x + this.velocity.x * deltaTime;
    const newY = currentPos.y + this.velocity.y * deltaTime;

    // Safety check for position
    if (isFinite(newX) && isFinite(newY)) {
      this.node.setPosition(newX, newY, currentPos.z);
    }

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
    this.node.destroy();
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

  protected onDestroy(): void {
    if (this.destroyCallback) {
      this.destroyCallback();
    }
  }
}
