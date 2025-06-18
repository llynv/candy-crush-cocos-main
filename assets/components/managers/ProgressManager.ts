import { _decorator, Component, EventTarget } from 'cc';
import { GameConfig } from '../../constants/GameConfig';
import { Singleton } from '../patterns/Singleton';

const { ccclass } = _decorator;

export interface MilestoneData {
  currentMilestone: number;
  currentScore: number;
  currentMilestoneProgress: number;
  milestoneThreshold: number;
  totalMilestones: number;
}

@ccclass('ProgressManager')
export class ProgressManager extends Singleton {
  private eventTarget = new EventTarget();

  private currentScore = 0;
  private currentMilestone = 0;
  private moveLeft = 0;
  private totalMilestones = GameConfig.MilestoneSystem.milestoneThresholds.length;
  private pendingMilestoneData: { matchCount: number; matchSize: number }[] = [];

  protected onLoad(): void {}

  protected onDestroy(): void {
    this.eventTarget.targetOff(this);

    this.pendingMilestoneData = [];
  }

  /**
   * Add pending score data that will be processed later after all cascades complete
   */
  public addPendingScore(matchCount: number, matchSize: number): void {
    this.pendingMilestoneData.push({ matchCount, matchSize });
  }

  /**
   * Process all pending score data and check for milestone completion
   * This should be called only after all cascades and animations are complete
   */
  public processPendingScores(): boolean {
    if (this.pendingMilestoneData.length === 0) {
      return false;
    }

    let totalPoints = 0;
    for (const data of this.pendingMilestoneData) {
      let points = data.matchCount * GameConfig.MilestoneSystem.pointsPerTile;

      if (data.matchSize >= 5) {
        points += GameConfig.MilestoneSystem.bonusPoints.match5Plus;
      } else if (data.matchSize === 4) {
        points += GameConfig.MilestoneSystem.bonusPoints.match4;
      }

      totalPoints += points;
    }

    this.currentScore += totalPoints;
    this.pendingMilestoneData = [];

    const milestoneCompleted = this.checkMilestoneCompletion();

    this.eventTarget.emit('progress-updated', this.getMilestoneData());

    return milestoneCompleted;
  }

  /**
   * Add score for matches and check for milestone completion
   * This is the old method, kept for backward compatibility but should use processPendingScores instead
   */
  public addScore(matchCount: number, matchSize: number): boolean {
    let points = matchCount * GameConfig.MilestoneSystem.pointsPerTile;

    if (matchSize >= 5) {
      points += GameConfig.MilestoneSystem.bonusPoints.match5Plus;
    } else if (matchSize === 4) {
      points += GameConfig.MilestoneSystem.bonusPoints.match4;
    }

    this.currentScore += points;

    const milestoneCompleted = this.checkMilestoneCompletion();

    this.eventTarget.emit('progress-updated', this.getMilestoneData());

    return milestoneCompleted;
  }

  /**
   * Check if current milestone is completed and advance if necessary
   */
  private checkMilestoneCompletion(): boolean {
    if (this.currentMilestone >= this.totalMilestones) {
      return false;
    }

    const currentThreshold = GameConfig.MilestoneSystem.milestoneThresholds[this.currentMilestone];

    if (this.currentScore >= currentThreshold) {
      this.currentMilestone++;
      this.eventTarget.emit('milestone-completed', this.getMilestoneData());
      return true;
    }

    return false;
  }

  /**
   * Get current milestone data for UI updates
   */
  public getMilestoneData(): MilestoneData {
    const milestoneThreshold =
      this.currentMilestone < this.totalMilestones
        ? GameConfig.MilestoneSystem.milestoneThresholds[this.currentMilestone]
        : GameConfig.MilestoneSystem.milestoneThresholds[this.totalMilestones - 1];

    const previousThreshold =
      this.currentMilestone > 0
        ? GameConfig.MilestoneSystem.milestoneThresholds[this.currentMilestone - 1]
        : 0;

    const progressInCurrentMilestone = this.currentScore - previousThreshold;
    const currentMilestoneRange = milestoneThreshold - previousThreshold;
    const currentMilestoneProgress = Math.min(
      progressInCurrentMilestone / currentMilestoneRange,
      1
    );

    return {
      currentMilestone: this.currentMilestone,
      currentScore: this.currentScore,
      currentMilestoneProgress,
      milestoneThreshold,
      totalMilestones: this.totalMilestones,
    };
  }

  /**
   * Subscribe to progress events
   */
  public onProgressUpdate(callback: (data: MilestoneData) => void): void {
    this.eventTarget.on('progress-updated', callback);
  }

  /**
   * Subscribe to milestone completion events
   */
  public onMilestoneCompleted(callback: (data: MilestoneData) => void): void {
    this.eventTarget.on('milestone-completed', callback);
  }

  /**
   * Unsubscribe from progress events
   */
  public offProgressUpdate(callback: (data: MilestoneData) => void): void {
    this.eventTarget.off('progress-updated', callback);
  }

  /**
   * Unsubscribe from milestone completion events
   */
  public offMilestoneCompleted(callback: (data: MilestoneData) => void): void {
    this.eventTarget.off('milestone-completed', callback);
  }

  /**
   * Reset progress for new game
   */
  public resetProgress(): void {
    this.currentScore = 0;
    this.currentMilestone = 0;
    this.moveLeft = 0;
    this.pendingMilestoneData = [];
    this.eventTarget.emit('progress-updated', this.getMilestoneData());
  }

  /**
   * Get current score
   */
  public getCurrentScore(): number {
    return this.currentScore;
  }

  /**
   * Get current milestone number
   */
  public getCurrentMilestone(): number {
    return this.currentMilestone;
  }

  public getMoveLeft(): number {
    return this.moveLeft;
  }
}
