import { Singleton } from './patterns/singleton';

/**
 * GameGlobalData class that manages global game data using the Singleton pattern.
 * This ensures only one instance of game data exists throughout the application.
 */
export class GameGlobalData extends Singleton {
  private isMouseDown: boolean = false;

  protected constructor() {
    super();
  }

  public getIsMouseDown(): boolean {
    return this.isMouseDown;
  }

  public setIsMouseDown(isMouseDown: boolean): void {
    this.isMouseDown = isMouseDown;
  }
}
