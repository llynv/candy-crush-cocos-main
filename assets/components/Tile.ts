import {
  _decorator,
  Component,
  resources,
  Sprite,
  SpriteFrame,
  input,
  Input,
  EventTouch,
  Animation,
  EventMouse,
} from 'cc';
import GameConfig from '../constants/GameConfig';
import { TileState } from './states/TileState';
import { IdleState } from './states/IdleState';
import { SelectState } from './states/SelectState';

const { ccclass, property } = _decorator;

@ccclass('Tile')
export class Tile extends Component {
  @property(Sprite)
  private sprite: Sprite | null = null;

  private tileType: string = GameConfig.CandyTypes[0];
  private callbacks: Array<(tile: Tile) => void> = [];

  private currentState: TileState | null = null;
  private states: Map<string, TileState> = new Map();

  protected __preload(): void {
    if (!this.sprite) throw new Error('Sprite is required');
  }

  protected onLoad(): void {
    this.states.set('idle', new IdleState(this));
    this.states.set('select', new SelectState(this));

    this.changeState('idle');

    this.node.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    this.node.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
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
    this.callbacks = this.callbacks.filter(c => c !== callback);
  }

  public addOnMouseUpCallback(callback: (tile: Tile) => void) {
    this.callbacks.push(callback);
  }

  public removeOnMouseUpCallback(callback?: (tile: Tile) => void) {
    this.callbacks = this.callbacks.filter(c => c !== callback);
  }

  /**
   * Referenced by button's click event handler
   * in the editor
   * */
  public emitOnMouseDown() {
    this.currentState?.onMouseDown();

    for (const callback of this.callbacks) {
      callback(this);
    }
  }

  public emitOnMouseUp() {
    this.currentState?.onMouseUp();

    for (const callback of this.callbacks) {
      callback(this);
    }
  }

  public getTileType(): string {
    return this.tileType;
  }

  public setTileType(tileType: string) {
    this.tileType = tileType;
    const spriteFrame = resources.get(`images/${this.tileType}/spriteFrame`, SpriteFrame);

    if (!spriteFrame) throw new Error(`Sprite frame for ${tileType} not found`);
    this.sprite!.spriteFrame = spriteFrame;
  }

  public changeState(stateName: string): void {
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

  public selectTile(): void {
    this.currentState?.onSelect();
  }

  public deselectTile(): void {
    this.currentState?.onDeselect();
  }

  public getSprite(): Sprite | null {
    return this.sprite;
  }

  private onMouseDown(event: EventMouse): void {
    this.currentState?.onMouseDown();

    console.log('onMouseDown');

    for (const callback of this.callbacks) {
      callback(this);
    }
  }

  private onMouseUp(event: EventMouse): void {
    this.currentState?.onMouseUp();

    for (const callback of this.callbacks) {
      callback(this);
    }
  }

  protected onDestroy(): void {
    this.callbacks = [];

    this.currentState?.onExit();

    this.node.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    this.node.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
  }
}
