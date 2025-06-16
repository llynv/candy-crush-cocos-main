import { Singleton } from './patterns/Singleton';

export class GameGlobalData extends Singleton {
  private isMouseDown: boolean = false;
  private isGamePaused: boolean = false;
  private isGameOver: boolean = false;

  public getIsMouseDown(): boolean {
    return this.isMouseDown;
  }

  public setIsMouseDown(isMouseDown: boolean): void {
    this.isMouseDown = isMouseDown;
  }

  public getIsGamePaused(): boolean {
    return this.isGamePaused;
  }

  public setIsGamePaused(isGamePaused: boolean): void {
    this.isGamePaused = isGamePaused;
  }

  public getIsGameOver(): boolean {
    return this.isGameOver;
  }

  public setIsGameOver(isGameOver: boolean): void {
    this.isGameOver = isGameOver;
  }
}
