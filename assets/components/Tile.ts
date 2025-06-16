import {
  _decorator,
  Component,
  resources,
  Sprite,
  SpriteFrame,
  EventMouse,
  UITransform,
  ParticleSystem2D,
  Color,
  instantiate,
  Prefab,
  Vec3,
} from 'cc';
import { GameConfig, TileType } from '../constants/GameConfig';
import { SpecialTileType } from '../constants/SpecialTileConfig';
import { TileState } from './states/TileState';
import { IdleState } from './states/IdleState';
import { SelectState } from './states/SelectState';
import { Frame } from './Frame';
import { GameGlobalData } from './GameGlobalData';
import { AnimationManager } from './managers/AnimationManager';

const { ccclass, property } = _decorator;
@ccclass('Tile')
export class Tile extends Component {
  @property(Sprite)
  private sprite: Sprite | null = null;

  @property(Prefab)
  private particleEffect: Prefab | null = null;

  private tileType: TileType = GameConfig.CandyTypes[0];
  private specialType: SpecialTileType = SpecialTileType.NORMAL;
  private isRainbow: boolean = false;
  private callbacks: Array<(tile: Tile) => void> = [];

  private currentState: TileState | null = null;
  private states: Map<string, TileState> = new Map();

  private correspondingFrame: Frame | null = null;

  private mouseDownPos: Vec3 | null = null;
  private isMouseDownOnThis: boolean = false;
  private clickThreshold: number = 10;
  private onRainbowClickCallbacks: Array<(tile: Tile) => void> = [];

  protected __preload(): void {
    if (!this.sprite) throw new Error('Sprite is required');
    if (!this.particleEffect) throw new Error('Particle effect is required');
  }

  protected onLoad(): void {
    this.states.set('idle', new IdleState(this));
    this.states.set('select', new SelectState(this));

    this.changeState('idle');

    this.node.on('mouse-down', this.onMouseDown, this);
    this.node.on('mouse-enter', this.onMouseEnter, this);
    this.node.on('mouse-leave', this.onMouseLeave, this);
    this.node.on('mouse-up', this.onMouseUp, this);
  }

  public addOnClickCallback(callback: (tile: Tile) => void) {
    this.callbacks.push(callback);
  }

  public removeOnClickCallback(callback?: (tile: Tile) => void) {
    if (callback) {
      this.callbacks = this.callbacks.filter(c => c !== callback);
    } else {
      this.callbacks = [];
    }
  }

  public addOnMouseDownCallback(callback: (tile: Tile) => void) {
    this.callbacks.push(callback);
  }

  public removeOnMouseDownCallback(callback?: (tile: Tile) => void) {
    if (callback) {
      this.callbacks = this.callbacks.filter(c => c !== callback);
    }
  }

  public addOnMouseUpCallback(callback: (tile: Tile) => void) {
    this.callbacks.push(callback);
  }

  public removeOnMouseUpCallback(callback?: (tile: Tile) => void) {
    if (callback) {
      this.callbacks = this.callbacks.filter(c => c !== callback);
    } else {
      this.callbacks = [];
    }
  }

  public addOnRainbowClickCallback(callback: (tile: Tile) => void) {
    this.onRainbowClickCallbacks.push(callback);
  }

  public removeOnRainbowClickCallback(callback?: (tile: Tile) => void) {
    if (callback) {
      this.onRainbowClickCallbacks = this.onRainbowClickCallbacks.filter(cb => cb !== callback);
    } else {
      this.onRainbowClickCallbacks = [];
    }
  }

  /**
   * Referenced by button's click event handler
   * in the editor
   * */
  public emitOnMouseDown() {
    for (const callback of this.callbacks) {
      callback(this);
    }
  }

  public emitOnMouseUp() {
    for (const callback of this.callbacks) {
      callback(this);
    }
  }

  public getTileType(): TileType {
    return this.tileType;
  }

  public setTileType(tileType: TileType) {
    this.tileType = tileType;
    this.updateTileAppearance();
  }

  public getSpecialType(): SpecialTileType {
    return this.specialType;
  }

  public setSpecialType(specialType: SpecialTileType) {
    this.specialType = specialType;
    this.isRainbow = specialType === SpecialTileType.RAINBOW;
    this.updateTileAppearance();
  }

  public isSpecial(): boolean {
    return this.specialType !== SpecialTileType.NORMAL;
  }

  public setRainbowTile(isRainbow: boolean) {
    this.isRainbow = isRainbow;
    this.updateTileAppearance();
  }

  public isRainbowTile(): boolean {
    return this.isRainbow;
  }

  public canMatchWith(otherTile: Tile): boolean {
    if (this.isRainbow || otherTile.isRainbow) {
      return true;
    }

    return this.tileType === otherTile.tileType;
  }

  private updateTileAppearance() {
    if (this.isRainbow) {
      this.updateRainbowAppearance();
    } else if (this.specialType === SpecialTileType.BOMB) {
      this.updateBombAppearance();
    } else if (this.specialType === SpecialTileType.STRIPED_HORIZONTAL) {
      this.updateStripedAppearance('horizontal');
    } else if (this.specialType === SpecialTileType.STRIPED_VERTICAL) {
      this.updateStripedAppearance('vertical');
    } else if (this.specialType === SpecialTileType.WRAPPED) {
      this.updateWrappedAppearance();
    } else {
      this.updateNormalAppearance();
    }
  }

  private updateNormalAppearance() {
    const spriteFrame = resources.get(`images/${this.tileType.name}/spriteFrame`, SpriteFrame);
    if (!spriteFrame) throw new Error(`Sprite frame for ${this.tileType.name} not found`);

    this.sprite!.spriteFrame = spriteFrame;
    this.sprite!.color = new Color(255, 255, 255, 255);
    const uiTransform = this.sprite!.node.getComponent(UITransform);
    uiTransform!.setContentSize(GameConfig.SpriteSize, GameConfig.SpriteSize);
  }

  private updateBombAppearance() {
    const spriteFrame = resources.get(`images/${this.tileType.name}/spriteFrame`, SpriteFrame);
    if (spriteFrame) {
      this.sprite!.spriteFrame = spriteFrame;
    }

    const uiTransform = this.sprite!.node.getComponent(UITransform);
    uiTransform!.setContentSize(GameConfig.SpriteSize, GameConfig.SpriteSize);

    console.log('updateBombAppearance', this.specialType);
  }

  private updateStripedAppearance(direction: 'horizontal' | 'vertical') {
    const spriteFrame = resources.get(`images/${this.tileType.name}/spriteFrame`, SpriteFrame);
    if (spriteFrame) {
      this.sprite!.spriteFrame = spriteFrame;
    }

    this.sprite!.color = new Color(200, 200, 255, 255);

    const uiTransform = this.sprite!.node.getComponent(UITransform);
    uiTransform!.setContentSize(GameConfig.SpriteSize, GameConfig.SpriteSize);
  }

  private updateWrappedAppearance() {
    const spriteFrame = resources.get(`images/${this.tileType.name}/spriteFrame`, SpriteFrame);
    if (spriteFrame) {
      this.sprite!.spriteFrame = spriteFrame;
    }

    this.sprite!.color = new Color(255, 255, 200, 255);

    const uiTransform = this.sprite!.node.getComponent(UITransform);
    uiTransform!.setContentSize(GameConfig.SpriteSize, GameConfig.SpriteSize);
  }

  private updateRainbowAppearance() {
    this.sprite!.color = new Color(255, 255, 255, 255);

    const rainbowFrame = resources.get(`images/Rainbow Candy/spriteFrame`, SpriteFrame);
    if (rainbowFrame) {
      this.sprite!.spriteFrame = rainbowFrame;
    }

    console.log('updateRainbowAppearance', this.specialType);

    const uiTransform = this.sprite!.node.getComponent(UITransform);
    uiTransform!.setContentSize(GameConfig.SpriteSize, GameConfig.SpriteSize);
  }

  public changeState(stateName: string): void {
    if (!this.states) {
      console.warn('Tile states not initialized or tile has been destroyed');
      return;
    }

    if (!this.states.has(stateName)) return;

    const newState = this.states.get(stateName);
    if (!newState) {
      console.error(`State ${stateName} not found`);
      return;
    }
    if (this.currentState === newState) return;

    this.currentState?.onExit();

    this.currentState = newState;
    this.currentState.onEnter();
  }

  public getCurrentStateName(): string {
    for (const [name, state] of this.states.entries()) {
      if (state === this.currentState) {
        return name;
      }
    }
    return 'unknown';
  }

  public getSprite(): Sprite | null {
    return this.sprite;
  }

  public setFrame(frame: Frame): void {
    this.correspondingFrame = frame;
  }

  public getFrame(): Frame | null {
    return this.correspondingFrame;
  }

  public onPlayerIdle(): void {
    this.currentState?.onPlayerIdle();
  }

  private onMouseDown(event: EventMouse): void {
    this.isMouseDownOnThis = true;
    this.mouseDownPos = new Vec3(event.getLocationX(), event.getLocationY(), 0);

    GameGlobalData.getInstance().setIsMouseDown(true);

    for (const callback of this.callbacks) {
      callback(this);
    }
  }

  private onMouseEnter(event: EventMouse): void {
    if (this.correspondingFrame) {
      this.correspondingFrame.triggerMouseEnter();
    }

    if (!GameGlobalData.getInstance().getIsMouseDown()) return;

    for (const callback of this.callbacks) {
      callback(this);
    }
  }

  private onMouseLeave(event: EventMouse): void {
    if (this.correspondingFrame) {
      this.correspondingFrame.triggerMouseLeave();
    }
  }

  private onMouseUp(event: EventMouse): void {
    const wasMouseDownOnThis = this.isMouseDownOnThis;
    this.isMouseDownOnThis = false;

    if (wasMouseDownOnThis && this.mouseDownPos && this.isRainbowTile()) {
      const mouseUpPos = new Vec3(event.getLocationX(), event.getLocationY(), 0);
      const distance = Vec3.distance(this.mouseDownPos, mouseUpPos);

      if (distance <= this.clickThreshold) {
        for (const callback of this.onRainbowClickCallbacks) {
          callback(this);
        }
        this.mouseDownPos = null;
        GameGlobalData.getInstance().setIsMouseDown(false);
        return;
      }
    }

    this.mouseDownPos = null;

    for (const callback of this.callbacks) {
      callback(this);
    }

    GameGlobalData.getInstance().setIsMouseDown(false);
  }

  protected onDestroy(): void {
    this.callbacks = [];
    this.onRainbowClickCallbacks = [];

    if (this.node && this.node.isValid) {
      this.node.off('mouse-down', this.onMouseDown, this);
      this.node.off('mouse-enter', this.onMouseEnter, this);
      this.node.off('mouse-leave', this.onMouseLeave, this);
      this.node.off('mouse-up', this.onMouseUp, this);
    }

    this.currentState?.onExit();
  }

  public async playParticleEffect(callback?: () => void): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.particleEffect || !this.node || !this.node.isValid) {
        console.warn('Particle effect prefab is not assigned or node is invalid');
        callback?.();
        resolve();
        return;
      }

      const particleNode = instantiate(this.particleEffect);
      this.node.parent!.addChild(particleNode);
      particleNode.setPosition(this.node.getPosition());

      const particleSystem = particleNode.getComponent(ParticleSystem2D);
      if (particleSystem) {
        particleSystem.startColor = this.tileType.color;
        particleSystem.startColorVar = new Color(0, 0, 0, 255);
        particleSystem.endColor = this.tileType.color;
        particleSystem.endColorVar = new Color(0, 0, 0, 255);
        particleSystem.playOnLoad = true;
      }
      callback?.();

      resolve();
    });
  }

  public playDestroyAnimation(callback?: () => void): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.node || !this.node.isValid) {
        console.warn('Cannot play destroy animation: node is null or invalid');
        callback?.();
        resolve();
        return;
      }

      const animationManager = this.node.getComponent(AnimationManager);
      if (animationManager) {
        animationManager.animateDestroy(callback, resolve);
      } else {
        console.warn('AnimationManager not found on tile node');
        callback?.();
        resolve();
      }
    });
  }

  public playCombineEffect(targetTile: Tile, callback?: () => void): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.node || !this.node.isValid || !targetTile.node || !targetTile.node.isValid) {
        console.warn('Cannot play combine effect: node is null or invalid');
        callback?.();
        resolve();
        return;
      }

      const animationManager = this.node.getComponent(AnimationManager);
      if (animationManager) {
        animationManager.animateCombine(this, targetTile, callback, resolve);
      } else {
        console.warn('AnimationManager not found on tile node');
        callback?.();
        resolve();
      }
    });
  }
}
