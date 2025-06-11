import { _decorator, Component, ProgressBar, Label, Node, Color, tween, Vec3, Sprite } from 'cc';
import { ProgressManager, MilestoneData } from './managers/ProgressManager';

const { ccclass, property } = _decorator;

@ccclass('ProgressUI')
export class ProgressUI extends Component {
  @property(ProgressBar)
  private progressBar: ProgressBar | null = null;

  @property(Label)
  private milestoneLabel: Label | null = null;

  @property(Label)
  private scoreLabel: Label | null = null;

  @property(Label)
  private progressLabel: Label | null = null;

  @property(Node)
  private celebrationNode: Node | null = null;

  private progressManager: ProgressManager | null = null;

  protected start(): void {
    this.progressManager = ProgressManager.getInstance();

    if (!this.progressManager) {
      console.error('ProgressManager not found');
      return;
    }

    this.progressManager.onProgressUpdate(this.updateProgressDisplay.bind(this));
    this.progressManager.onMilestoneCompleted(this.onMilestoneCompleted.bind(this));

    this.updateProgressDisplay(this.progressManager.getMilestoneData());
  }

  /**
   * Update the progress bar and labels
   */
  private updateProgressDisplay(data: MilestoneData): void {
    if (this.progressBar) {
      tween(this.progressBar)
        .to(0.5, { progress: data.currentMilestoneProgress }, { easing: 'quadOut' })
        .start();
    }

    if (this.milestoneLabel) {
      this.milestoneLabel.string = `Milestone ${data.currentMilestone + 1}/${data.totalMilestones}`;
    }

    if (this.scoreLabel) {
      this.scoreLabel.string = `Score: ${data.currentScore}`;
    }

    if (this.progressLabel) {
      const currentProgress = Math.floor(data.currentMilestoneProgress * 100);
      this.progressLabel.string = `${currentProgress}%`;
    }
  }

  /**
   * Handle milestone completion with celebration animation
   */
  private onMilestoneCompleted(data: MilestoneData): void {
    this.playCelebrationAnimation();

    this.updateProgressDisplay(data);
  }

  /**
   * Play celebration animation for milestone completion
   */
  private playCelebrationAnimation(): void {
    if (!this.celebrationNode) return;

    this.celebrationNode.setScale(0, 0, 1);
    this.celebrationNode.active = true;

    tween(this.celebrationNode)
      .to(0.3, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
      .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
      .delay(1.5)
      .to(0.3, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
      .call(() => {
        this.celebrationNode!.active = false;
      })
      .start();

    if (this.progressBar) {
      const barSprite = this.progressBar.node.getComponent(Sprite);
      if (barSprite) {
        const originalColor = barSprite.color.clone();
        const celebrationColor = new Color(255, 215, 0, 255);

        tween(barSprite)
          .to(0.2, { color: celebrationColor })
          .to(0.2, { color: originalColor })
          .to(0.2, { color: celebrationColor })
          .to(0.2, { color: originalColor })
          .start();
      }
    }
  }

  /**
   * Reset progress UI for new game
   */
  public resetProgress(): void {
    if (this.progressManager) {
      this.progressManager.resetProgress();
    }
  }

  protected onDestroy(): void {}
}
