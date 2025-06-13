import {
  _decorator,
  Component,
  ProgressBar,
  Label,
  Node,
  Color,
  tween,
  Vec3,
  Vec2,
  Sprite,
  UITransform,
} from 'cc';
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
  private scoreBackground: Node | null = null;
  private progressBackground: Node | null = null;
  private milestoneBackground: Node | null = null;

  protected start(): void {
    this.progressManager = ProgressManager.getInstance();

    if (!this.progressManager) {
      console.error('ProgressManager not found');
      return;
    }

    this.enhanceUIElements();
    this.progressManager.onProgressUpdate(this.updateProgressDisplay.bind(this));
    this.progressManager.onMilestoneCompleted(this.onMilestoneCompleted.bind(this));

    this.updateProgressDisplay(this.progressManager.getMilestoneData());
  }

  private enhanceUIElements(): void {
    this.enhanceScoreLabel();
    this.enhanceMilestoneLabel();
    this.enhanceProgressLabel();
    this.enhanceProgressBar();
    this.addUIBackgrounds();
  }

  private enhanceScoreLabel(): void {
    if (!this.scoreLabel) return;

    this.scoreLabel.color = new Color(255, 215, 0, 255);
    this.scoreLabel.fontSize = 28;
    this.scoreLabel.isBold = true;
    this.scoreLabel.enableOutline = true;
    this.scoreLabel.outlineColor = new Color(139, 69, 19, 255);
    this.scoreLabel.outlineWidth = 3;

    this.scoreLabel.enableShadow = true;
    this.scoreLabel.shadowColor = new Color(255, 165, 0, 150);
    this.scoreLabel.shadowOffset = new Vec2(0, 0);
    this.scoreLabel.shadowBlur = 8;
  }

  private enhanceMilestoneLabel(): void {
    if (!this.milestoneLabel) return;

    this.milestoneLabel.color = new Color(147, 0, 211, 255);
    this.milestoneLabel.fontSize = 24;
    this.milestoneLabel.isBold = true;
    this.milestoneLabel.enableOutline = true;
    this.milestoneLabel.outlineColor = new Color(255, 255, 255, 255);
    this.milestoneLabel.outlineWidth = 2;

    this.milestoneLabel.enableShadow = true;
    this.milestoneLabel.shadowColor = new Color(0, 0, 0, 100);
    this.milestoneLabel.shadowOffset = new Vec2(1, -1);
    this.milestoneLabel.shadowBlur = 3;
  }

  private enhanceProgressLabel(): void {
    if (!this.progressLabel) return;

    this.progressLabel.color = new Color(0, 255, 255, 255);
    this.progressLabel.fontSize = 22;
    this.progressLabel.isBold = true;
    this.progressLabel.enableOutline = true;
    this.progressLabel.outlineColor = new Color(0, 0, 139, 255);
    this.progressLabel.outlineWidth = 2;
  }

  private enhanceProgressBar(): void {
    if (!this.progressBar) return;

    const barSprite = this.progressBar.barSprite;
    if (barSprite) {
      this.updateProgressBarColor(this.progressBar.progress);
    }

    const barNode = this.progressBar.node;
    if (barNode) {
      tween(barNode)
        .to(0.3, { scale: new Vec3(1.05, 1.05, 1) })
        .to(0.3, { scale: new Vec3(1, 1, 1) })
        .union()
        .repeatForever()
        .start();
    }
  }

  private updateProgressBarColor(progress: number): void {
    if (!this.progressBar?.barSprite) return;

    let color: Color;

    if (progress < 0.3) {
      color = new Color(255, Math.floor(165 * (progress / 0.3)), 0, 255);
    } else if (progress < 0.7) {
      const t = (progress - 0.3) / 0.4;
      color = new Color(255, Math.floor(165 + 90 * t), 0, 255);
    } else {
      const t = (progress - 0.7) / 0.3;
      color = new Color(Math.floor(255 - 255 * t), 255, Math.floor(100 * t), 255);
    }

    this.progressBar.barSprite.color = color;
  }

  private addUIBackgrounds(): void {
    this.createScoreBackground();
    this.createMilestoneBackground();
    this.createProgressBackground();
  }

  private createScoreBackground(): void {
    if (!this.scoreLabel) return;

    this.scoreBackground = new Node('ScoreBackground');
    this.scoreLabel.node.parent?.addChild(this.scoreBackground);
    this.scoreBackground.setPosition(this.scoreLabel.node.position);
    this.scoreBackground.setSiblingIndex(this.scoreLabel.node.getSiblingIndex());

    const transform = this.scoreBackground.addComponent(UITransform);
    transform.setContentSize(120, 50);

    const sprite = this.scoreBackground.addComponent(Sprite);
    sprite.type = Sprite.Type.SLICED;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    sprite.color = new Color(139, 69, 19, 200);

    tween(this.scoreBackground)
      .to(1.0, { scale: new Vec3(1.1, 1.1, 1) })
      .to(1.0, { scale: new Vec3(1, 1, 1) })
      .union()
      .repeatForever()
      .start();
  }

  private createMilestoneBackground(): void {
    if (!this.milestoneLabel) return;

    this.milestoneBackground = new Node('MilestoneBackground');
    this.milestoneLabel.node.parent?.addChild(this.milestoneBackground);
    this.milestoneBackground.setPosition(this.milestoneLabel.node.position);
    this.milestoneBackground.setSiblingIndex(this.milestoneLabel.node.getSiblingIndex());

    const transform = this.milestoneBackground.addComponent(UITransform);
    transform.setContentSize(160, 45);

    const sprite = this.milestoneBackground.addComponent(Sprite);
    sprite.type = Sprite.Type.SLICED;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = new Color(75, 0, 130, 180);
  }

  private createProgressBackground(): void {
    if (!this.progressBar) return;

    this.progressBackground = new Node('ProgressBackground');
    this.progressBar.node.parent?.addChild(this.progressBackground);
    this.progressBackground.setPosition(
      this.progressBar.node.position.x,
      this.progressBar.node.position.y + 5
    );
    this.progressBackground.setSiblingIndex(this.progressBar.node.getSiblingIndex());

    const transform = this.progressBackground.addComponent(UITransform);
    transform.setContentSize(220, 60);

    const sprite = this.progressBackground.addComponent(Sprite);
    sprite.type = Sprite.Type.SLICED;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = new Color(25, 25, 112, 150);

    const borderNode = new Node('ProgressBorder');
    this.progressBackground.addChild(borderNode);

    const borderTransform = borderNode.addComponent(UITransform);
    borderTransform.setContentSize(225, 65);

    const borderSprite = borderNode.addComponent(Sprite);
    borderSprite.type = Sprite.Type.SLICED;
    borderSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    borderSprite.color = new Color(255, 215, 0, 100);
  }

  private updateProgressDisplay(data: MilestoneData): void {
    if (this.progressBar) {
      const targetProgress = data.currentMilestoneProgress;

      tween(this.progressBar)
        .to(
          0.8,
          { progress: targetProgress },
          {
            easing: 'quartOut',
            onUpdate: () => {
              this.updateProgressBarColor(this.progressBar!.progress);
            },
          }
        )
        .start();
    }

    if (this.milestoneLabel) {
      const newText = `Level: ${data.currentMilestone + 1}`;
      if (this.milestoneLabel.string !== newText) {
        this.animateTextChange(this.milestoneLabel, newText);
      }
    }

    if (this.scoreLabel) {
      const newText = `Score: ${data.currentScore.toLocaleString()}`;
      if (this.scoreLabel.string !== newText) {
        this.animateScoreChange(this.scoreLabel, newText);
      }
    }

    if (this.progressLabel) {
      const currentProgress = Math.floor(data.currentMilestoneProgress * 100);
      const newText = `${currentProgress}%`;
      if (this.progressLabel.string !== newText) {
        this.animateTextChange(this.progressLabel, newText);
      }
    }
  }

  private animateTextChange(label: Label, newText: string): void {
    tween(label.node)
      .to(0.1, { scale: new Vec3(1.3, 1.3, 1) })
      .call(() => {
        label.string = newText;
      })
      .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }

  private animateScoreChange(label: Label, newText: string): void {
    const originalColor = label.color.clone();
    const flashColor = new Color(255, 255, 255, 255);

    tween(label).to(0.1, { color: flashColor }).to(0.2, { color: originalColor }).start();

    tween(label.node)
      .to(0.15, { scale: new Vec3(1.4, 1.4, 1) })
      .call(() => {
        label.string = newText;
      })
      .to(0.25, { scale: new Vec3(1, 1, 1) }, { easing: 'elasticOut' })
      .start();
  }

  private onMilestoneCompleted(data: MilestoneData): void {
    this.playEnhancedCelebrationAnimation();
    this.updateProgressDisplay(data);
  }

  private playEnhancedCelebrationAnimation(): void {
    this.celebrateScoreLabel();
    this.celebrateMilestoneLabel();
    this.celebrateProgressBar();

    if (this.celebrationNode) {
      this.celebrationNode.setScale(0, 0, 1);
      this.celebrationNode.active = true;

      tween(this.celebrationNode)
        .to(0.4, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' })
        .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
        .delay(2.0)
        .to(0.4, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
        .call(() => {
          this.celebrationNode!.active = false;
        })
        .start();
    }
  }

  private celebrateScoreLabel(): void {
    if (!this.scoreLabel) return;

    const originalColor = this.scoreLabel.color.clone();
    const colors = [
      new Color(255, 215, 0, 255),
      new Color(255, 255, 255, 255),
      new Color(255, 165, 0, 255),
      new Color(255, 215, 0, 255),
    ];

    let colorIndex = 0;
    const colorTween = tween(this.scoreLabel)
      .repeat(
        4,
        tween()
          .call(() => {
            this.scoreLabel!.color = colors[colorIndex];
            colorIndex = (colorIndex + 1) % colors.length;
          })
          .delay(0.2)
      )
      .call(() => {
        this.scoreLabel!.color = originalColor;
      })
      .start();
  }

  private celebrateMilestoneLabel(): void {
    if (!this.milestoneLabel) return;

    tween(this.milestoneLabel.node)
      .to(0.2, { scale: new Vec3(1.5, 1.5, 1) })
      .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'bounceOut' })
      .start();
  }

  private celebrateProgressBar(): void {
    if (!this.progressBar?.barSprite) return;

    const originalColor = this.progressBar.barSprite.color.clone();
    const rainbowColors = [
      new Color(255, 0, 0, 255),
      new Color(255, 165, 0, 255),
      new Color(255, 255, 0, 255),
      new Color(0, 255, 0, 255),
      new Color(0, 0, 255, 255),
      new Color(75, 0, 130, 255),
      new Color(238, 130, 238, 255),
    ];

    let colorIndex = 0;
    tween(this.progressBar.barSprite)
      .repeat(
        rainbowColors.length,
        tween()
          .call(() => {
            this.progressBar!.barSprite!.color = rainbowColors[colorIndex];
            colorIndex++;
          })
          .delay(0.15)
      )
      .call(() => {
        this.progressBar!.barSprite!.color = originalColor;
      })
      .start();
  }

  public resetProgress(): void {
    if (this.progressManager) {
      this.progressManager.resetProgress();
    }
  }

  protected onDestroy(): void {
    if (this.scoreBackground && this.scoreBackground.isValid) {
      this.scoreBackground.destroy();
    }
    if (this.progressBackground && this.progressBackground.isValid) {
      this.progressBackground.destroy();
    }
    if (this.milestoneBackground && this.milestoneBackground.isValid) {
      this.milestoneBackground.destroy();
    }
  }
}
