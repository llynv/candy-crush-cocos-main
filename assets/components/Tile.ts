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
} from 'cc';
import { GameConfig, TileType } from '../constants/GameConfig';
import { TileState } from './states/TileState';
import { IdleState } from './states/IdleState';
import { SelectState } from './states/SelectState';
import { Frame } from './Frame';
import { GameGlobalData } from './GameGlobalData';
import { TileAnimationHandler } from './animation-handler/TileAnimationHandler';

const { ccclass, property } = _decorator;
@ccclass('Tile')
export class Tile extends Component {
  @property(Sprite)
  private sprite: Sprite | null = null;

  @property(Prefab)
  private particleEffect: Prefab | null = null;

  private tileType: TileType = GameConfig.CandyTypes[0];
  private callbacks: Array<(tile: Tile) => void> = [];

  private currentState: TileState | null = null;
  private states: Map<string, TileState> = new Map();

  private correspondingFrame: Frame | null = null;

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

    const spriteFrame = resources.get(`images/${this.tileType.name}/spriteFrame`, SpriteFrame);

    if (!spriteFrame) throw new Error(`Sprite frame for ${tileType} not found`);
    this.sprite!.spriteFrame = spriteFrame;
    const uiTransform = this.sprite!.node.getComponent(UITransform);
    uiTransform!.setContentSize(50, 50);
  }

  public changeState(stateName: string): void {
    console.log('changeState', stateName);

    // Safety check: ensure states map exists and is not null
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
    for (const callback of this.callbacks) {
      callback(this);
    }

    GameGlobalData.getInstance().setIsMouseDown(false);
  }

  protected onDestroy(): void {
    this.callbacks = [];
    this.node.off('mouse-down', this.onMouseDown, this);
    this.node.off('mouse-enter', this.onMouseEnter, this);
    this.node.off('mouse-leave', this.onMouseLeave, this);
    this.node.off('mouse-up', this.onMouseUp, this);

    this.currentState?.onExit();
  }

  public playParticleEffect(callback?: () => void): void {
    if (!this.particleEffect) {
      console.warn('Particle effect prefab is not assigned');
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
  }

  public playDestroyAnimation(callback?: () => void): void {
    const tileAnimationHandler = this.node.getComponent(TileAnimationHandler);
    if (tileAnimationHandler) {
      tileAnimationHandler.animateDestroy(callback);
    }
  }
}
