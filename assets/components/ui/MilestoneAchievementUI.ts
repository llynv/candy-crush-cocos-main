import {
  _decorator,
  Component,
  Node,
  Label,
  Sprite,
  tween,
  Vec3,
  Color,
  UITransform,
  UIOpacity,
  Tween,
  resources,
  SpriteFrame,
  Prefab,
  instantiate,
} from 'cc';
import { ProgressManager } from '../managers/ProgressManager';
import { ParticleEffectManager } from '../managers/ParticleEffectManager';
import { MilestoneData } from '../managers/ProgressManager';

const { ccclass, property } = _decorator;

@ccclass('MilestoneAchievementUI')
export class MilestoneAchievementUI extends Component {
  @property(Node)
  private achievementPanel: Node | null = null;

  @property(Label)
  private titleLabel: Label | null = null;

  @property(Label)
  private levelLabel: Label | null = null;

  @property(Label)
  private messageLabel: Label | null = null;

  @property(Sprite)
  private backgroundSprite: Sprite | null = null;

  @property(Prefab)
  private confettiPrefab: Prefab | null = null;

  public async showMilestoneAchievement(
    milestoneData: MilestoneData,
    callback?: () => void
  ): Promise<void> {
    this.updateLabels(milestoneData);

    this.node.active = true;

    if (this.achievementPanel) {
      this.achievementPanel.setScale(0, 0, 0);
      const panelOpacity = this.achievementPanel.getComponent(UIOpacity);
      if (panelOpacity) {
        panelOpacity.opacity = 255;
      }
    }

    await this.animateEntrance();

    if (this.confettiPrefab) {
      const confetti = instantiate(this.confettiPrefab);
      confetti.setParent(this.node);
      confetti.setPosition(0, 350, 0);
      confetti.setScale(0, 0, 0);
      const confettiOpacity = confetti.getComponent(UIOpacity);
      if (confettiOpacity) {
        confettiOpacity.opacity = 255;
      }
      tween(confetti)
        .to(0.5, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'quadOut' })
        .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'quadIn' })
        .start();
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.animateExit();

    this.node.active = false;
  }

  private updateLabels(milestoneData: MilestoneData): void {
    if (this.titleLabel) {
      this.titleLabel.string = 'MILESTONE ACHIEVED!';
    }

    if (this.levelLabel) {
      this.levelLabel.string = `LEVEL ${milestoneData.currentMilestone}`;
    }

    if (this.messageLabel) {
      this.messageLabel.string = `Congratulations!\nYou've reached level ${milestoneData.currentMilestone}!\nTotal Score: ${milestoneData.currentScore}`;
    }
  }

  private async animateEntrance(): Promise<void> {
    if (!this.achievementPanel) return;

    return new Promise<void>(resolve => {
      tween(this.achievementPanel!)
        .to(0.5, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'quadOut' })
        .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'quadIn' })
        .call(() => {
          resolve();
        })
        .start();
    });
  }

  private async animateExit(callback?: () => void): Promise<void> {
    if (!this.achievementPanel) return;

    return new Promise<void>(resolve => {
      const panelOpacity = this.achievementPanel!.getComponent(UIOpacity);

      if (panelOpacity) {
        tween(panelOpacity).to(0.3, { opacity: 0 }, { easing: 'quadIn' }).start();
      }

      tween(this.achievementPanel!)
        .to(0.3, { scale: new Vec3(0.8, 0.8, 0.8) }, { easing: 'quadIn' })
        .call(() => {
          resolve();
          callback?.();
        })
        .start();
    });
  }

  protected onDestroy(): void {
    if (this.achievementPanel) {
      Tween.stopAllByTarget(this.achievementPanel);
    }
    if (this.backgroundSprite) {
      Tween.stopAllByTarget(this.backgroundSprite);
    }
  }
}
