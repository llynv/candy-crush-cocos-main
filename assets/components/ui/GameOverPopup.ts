import {
  _decorator,
  Component,
  Node,
  Label,
  Button,
  Sprite,
  tween,
  Vec3,
  Vec2,
  Color,
  UITransform,
  UIOpacity,
  EventHandler,
  sys,
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('GameOverPopup')
export class GameOverPopup extends Component {
  @property(Node)
  private popupPanel: Node | null = null;

  @property(Node)
  private backgroundOverlay: Node | null = null;

  @property(Label)
  private titleLabel: Label | null = null;

  @property(Label)
  private scoreLabel: Label | null = null;

  @property(Label)
  private highScoreLabel: Label | null = null;

  @property(Button)
  private newGameButton: Button | null = null;

  private isVisible = false;
  private onNewGameCallback: (() => void) | null = null;
  private currentScore = 0;
  private highScore = 0;

  protected start(): void {
    this.loadHighScore();
    this.enhanceExistingUI();
    this.setupButtons();
    this.hide(false);
  }

  /**
   * Load high score from local storage
   */
  private loadHighScore(): void {
    const savedHighScore = sys.localStorage.getItem('candyCrushHighScore');
    this.highScore = savedHighScore ? parseInt(savedHighScore) : 0;
  }

  /**
   * Save high score to local storage
   */
  private saveHighScore(): void {
    sys.localStorage.setItem('candyCrushHighScore', this.highScore.toString());
  }

  /**
   * Enhance the existing attached UI components
   */
  private enhanceExistingUI(): void {
    this.enhancePopupPanel();
    this.enhanceBackgroundOverlay();
    this.enhanceTitleLabel();
    this.enhanceScoreLabel();
    this.enhanceNewGameButton();
    this.addVisualEffects();
  }

  /**
   * Enhance the popup panel styling
   */
  private enhancePopupPanel(): void {
    if (!this.popupPanel) return;

    const sprite = this.popupPanel.getComponent(Sprite);
    if (sprite) {
      sprite.color = new Color(40, 15, 25, 245);
    }
  }

  /**
   * Enhance the background overlay
   */
  private enhanceBackgroundOverlay(): void {
    if (!this.backgroundOverlay) return;

    const sprite = this.backgroundOverlay.getComponent(Sprite);
    if (sprite) {
      sprite.color = new Color(0, 0, 0, 180);
    }
  }

  /**
   * Enhance the title label styling
   */
  private enhanceTitleLabel(): void {
    if (!this.titleLabel) return;

    this.titleLabel.string = 'GAME OVER';
    this.titleLabel.fontSize = 30;
    this.titleLabel.isBold = true;
    this.titleLabel.color = new Color(220, 20, 60, 255);

    this.titleLabel.enableOutline = true;
    this.titleLabel.outlineColor = new Color(139, 0, 0, 255);
    this.titleLabel.outlineWidth = 4;

    this.titleLabel.enableShadow = true;
    this.titleLabel.shadowColor = new Color(0, 0, 0, 200);
    this.titleLabel.shadowOffset = new Vec2(4, -4);
    this.titleLabel.shadowBlur = 6;
  }

  /**
   * Enhance the score label styling
   */
  private enhanceScoreLabel(): void {
    if (!this.scoreLabel) return;

    this.scoreLabel.fontSize = 52;
    this.scoreLabel.isBold = true;
    this.scoreLabel.color = new Color(255, 215, 0, 255);

    this.scoreLabel.enableOutline = true;
    this.scoreLabel.outlineColor = new Color(139, 69, 19, 255);
    this.scoreLabel.outlineWidth = 3;

    this.scoreLabel.enableShadow = true;
    this.scoreLabel.shadowColor = new Color(255, 165, 0, 150);
    this.scoreLabel.shadowOffset = new Vec2(2, -2);
    this.scoreLabel.shadowBlur = 8;
  }

  /**
   * Enhance the new game button styling
   */
  private enhanceNewGameButton(): void {
    if (!this.newGameButton) return;

    const sprite = this.newGameButton.getComponent(Sprite);
    if (sprite) {
      sprite.color = new Color(255, 140, 0, 255);
    }

    const labelNode = this.newGameButton.node.getChildByName('Label');
    if (labelNode) {
      const label = labelNode.getComponent(Label);
      if (label) {
        label.string = 'NEW GAME';
        label.fontSize = 14;
        label.isBold = true;
        label.color = new Color(255, 255, 255, 255);

        label.enableOutline = true;
        label.outlineColor = new Color(0, 0, 0, 200);
        label.outlineWidth = 2;

        label.enableShadow = true;
        label.shadowColor = new Color(0, 0, 0, 150);
        label.shadowOffset = new Vec2(1, -1);
        label.shadowBlur = 3;
      }
    }
  }

  /**
   * Add visual effects and animations
   */
  private addVisualEffects(): void {
    this.createFloatingParticles();

    this.addBorderGlow();
  }

  /**
   * Create floating particle effect
   */
  private createFloatingParticles(): void {
    if (!this.popupPanel) return;

    for (let i = 0; i < 8; i++) {
      const particle = new Node(`Particle${i}`);
      this.popupPanel.addChild(particle);

      const transform = particle.addComponent(UITransform);
      transform.setContentSize(6, 6);

      const sprite = particle.addComponent(Sprite);
      sprite.color = new Color(255, 215, 0, 150);

      const angle = (i / 8) * Math.PI * 2;
      const radius = 180 + Math.random() * 40;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      particle.setPosition(x, y, 0);

      tween(particle)
        .to(3.0 + Math.random() * 2, {
          position: new Vec3(x + (Math.random() - 0.5) * 60, y + 20, 0),
        })
        .to(3.0 + Math.random() * 2, {
          position: new Vec3(x, y, 0),
        })
        .union()
        .repeatForever()
        .start();

      tween(sprite)
        .to(1.5, { color: new Color(255, 215, 0, 50) })
        .to(1.5, { color: new Color(255, 215, 0, 150) })
        .union()
        .repeatForever()
        .start();
    }
  }

  /**
   * Add border glow effect to popup panel
   */
  private addBorderGlow(): void {
    if (!this.popupPanel) return;

    const glowNode = new Node('GlowBorder');
    this.popupPanel.addChild(glowNode);
    glowNode.setSiblingIndex(0);

    const transform = glowNode.addComponent(UITransform);
    const popupTransform = this.popupPanel.getComponent(UITransform);
    if (popupTransform) {
      transform.setContentSize(
        popupTransform.contentSize.width + 20,
        popupTransform.contentSize.height + 20
      );
    }

    const sprite = glowNode.addComponent(Sprite);
    sprite.color = new Color(255, 215, 0, 30);

    tween(sprite)
      .to(2.0, { color: new Color(255, 215, 0, 60) })
      .to(2.0, { color: new Color(255, 215, 0, 30) })
      .union()
      .repeatForever()
      .start();
  }

  /**
   * Setup button interactions and animations
   */
  private setupButtons(): void {
    if (this.newGameButton) {
      this.setupButtonAnimations(this.newGameButton);

      const clickHandler = new EventHandler();
      clickHandler.target = this.node;
      clickHandler.component = 'GameOverPopup';
      clickHandler.handler = 'onNewGameClicked';
      this.newGameButton.clickEvents.push(clickHandler);
    }
  }

  /**
   * Setup hover and click animations for buttons
   */
  private setupButtonAnimations(button: Button): void {
    const buttonNode = button.node;
    const originalScale = buttonNode.scale.clone();
    const sprite = button.node.getComponent(Sprite)!;
    const originalColor = sprite.color.clone();

    buttonNode.on(Node.EventType.MOUSE_ENTER, () => {
      tween(buttonNode)
        .to(0.1, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'quadOut' })
        .start();

      tween(sprite)
        .to(0.1, {
          color: new Color(
            originalColor.r + 40,
            originalColor.g + 40,
            originalColor.b + 40,
            originalColor.a
          ),
        })
        .start();
    });

    buttonNode.on(Node.EventType.MOUSE_LEAVE, () => {
      tween(buttonNode).to(0.1, { scale: originalScale }, { easing: 'quadOut' }).start();

      tween(sprite).to(0.1, { color: originalColor }).start();
    });

    buttonNode.on(Node.EventType.TOUCH_START, () => {
      tween(buttonNode)
        .to(0.05, { scale: new Vec3(0.95, 0.95, 1) }, { easing: 'quadOut' })
        .start();
    });

    buttonNode.on(Node.EventType.TOUCH_END, () => {
      tween(buttonNode)
        .to(0.15, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' })
        .to(0.1, { scale: originalScale }, { easing: 'quadOut' })
        .start();
    });

    buttonNode.on(Node.EventType.TOUCH_CANCEL, () => {
      tween(buttonNode).to(0.1, { scale: originalScale }, { easing: 'quadOut' }).start();
    });
  }

  /**
   * Show popup with animation and score
   */
  public show(finalScore: number): void {
    if (this.isVisible) return;

    this.currentScore = finalScore;
    this.checkAndUpdateHighScore();
    this.updateScoreDisplays();

    this.isVisible = true;
    this.node.active = true;

    if (this.popupPanel) {
      this.popupPanel.setScale(0, 0, 1);

      let panelOpacity = this.popupPanel.getComponent(UIOpacity);
      if (!panelOpacity) {
        panelOpacity = this.popupPanel.addComponent(UIOpacity);
      }
      panelOpacity.opacity = 0;
    }

    if (this.backgroundOverlay) {
      let bgOpacity = this.backgroundOverlay.getComponent(UIOpacity);
      if (!bgOpacity) {
        bgOpacity = this.backgroundOverlay.addComponent(UIOpacity);
      }
      bgOpacity.opacity = 0;
    }

    if (this.backgroundOverlay) {
      const bgOpacity = this.backgroundOverlay.getComponent(UIOpacity)!;
      tween(bgOpacity).to(0.4, { opacity: 255 }, { easing: 'quadOut' }).start();
    }

    if (this.popupPanel) {
      const panelOpacity = this.popupPanel.getComponent(UIOpacity)!;

      tween(panelOpacity).to(0.5, { opacity: 255 }, { easing: 'quadOut' }).start();

      tween(this.popupPanel)
        .to(0.2, { scale: new Vec3(0.3, 0.3, 1) }, { easing: 'quadOut' })
        .to(0.4, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' })
        .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
        .start();
    }

    if (this.scoreLabel) {
      let currentDisplayScore = 0;
      tween(this.scoreLabel)
        .to(
          1.5,
          {},
          {
            easing: 'quadOut',
            onUpdate: (target, ratio) => {
              currentDisplayScore = Number(this.currentScore) * (ratio ?? 0);
              target!.string = Math.floor(currentDisplayScore).toLocaleString();
            },
          }
        )
        .start();
    }

    this.animateScoreCounting();
  }

  /**
   * Animate score counting effect
   */
  private animateScoreCounting(): void {
    if (!this.scoreLabel) return;

    let currentDisplayScore = 0;
    const targetScore = this.currentScore;
    const duration = 1.5;
    const steps = 60;
    const increment = targetScore / steps;

    tween(this.scoreLabel)
      .to(duration, { string: this.highScore.toLocaleString() }, { easing: 'quadOut' })
      .start();
  }

  /**
   * Check and update high score
   */
  private checkAndUpdateHighScore(): void {
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      this.saveHighScore();

      this.celebrateNewHighScore();
    }
  }

  /**
   * Celebrate new high score
   */
  private celebrateNewHighScore(): void {
    if (!this.highScoreLabel) return;

    const originalColor = this.highScoreLabel.color.clone();

    tween(this.highScoreLabel)
      .to(0.2, { color: new Color(255, 215, 0, 255) })
      .to(0.2, { color: new Color(255, 255, 255, 255) })
      .to(0.2, { color: new Color(255, 215, 0, 255) })
      .to(0.2, { color: originalColor })
      .start();

    tween(this.highScoreLabel.node)
      .to(0.3, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' })
      .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
      .start();
  }

  /**
   * Update score displays
   */
  private updateScoreDisplays(): void {
    if (this.scoreLabel) {
      this.scoreLabel.string = '0';
    }

    if (this.highScoreLabel) {
      this.highScoreLabel.string = this.highScore.toLocaleString();
    }
  }

  /**
   * Hide popup with animation
   */
  public hide(animate: boolean = true): void {
    if (!this.isVisible && animate) return;

    this.isVisible = false;

    if (!animate) {
      this.node.active = false;
      return;
    }

    if (this.popupPanel) {
      let panelOpacity = this.popupPanel.getComponent(UIOpacity);
      if (!panelOpacity) {
        panelOpacity = this.popupPanel.addComponent(UIOpacity);
      }

      tween(this.popupPanel)
        .to(0.3, { scale: new Vec3(0.6, 0.6, 1) }, { easing: 'backIn' })
        .start();

      tween(panelOpacity).to(0.3, { opacity: 0 }, { easing: 'quadIn' }).start();
    }

    if (this.backgroundOverlay) {
      let bgOpacity = this.backgroundOverlay.getComponent(UIOpacity);
      if (!bgOpacity) {
        bgOpacity = this.backgroundOverlay.addComponent(UIOpacity);
      }

      tween(bgOpacity)
        .to(0.25, { opacity: 0 }, { easing: 'quadIn' })
        .call(() => {
          this.node.active = false;
        })
        .start();
    } else {
      setTimeout(() => {
        this.node.active = false;
      }, 300);
    }
  }

  /**
   * Set callback for new game action
   */
  public setCallback(onNewGame: () => void): void {
    this.onNewGameCallback = onNewGame;
  }

  /**
   * Button click handler
   */
  public onNewGameClicked(): void {
    this.hide();
    if (this.onNewGameCallback) {
      setTimeout(() => this.onNewGameCallback!(), 300);
    }
  }

  /**
   * Get current high score
   */
  public getHighScore(): number {
    return this.highScore;
  }

  /**
   * Reset high score (for testing)
   */
  public resetHighScore(): void {
    this.highScore = 0;
    this.saveHighScore();
    if (this.highScoreLabel) {
      this.highScoreLabel.string = '0';
    }
  }

  protected onDestroy(): void {
    if (this.newGameButton?.node) {
      this.newGameButton.node.off(Node.EventType.MOUSE_ENTER);
      this.newGameButton.node.off(Node.EventType.MOUSE_LEAVE);
      this.newGameButton.node.off(Node.EventType.TOUCH_START);
      this.newGameButton.node.off(Node.EventType.TOUCH_END);
      this.newGameButton.node.off(Node.EventType.TOUCH_CANCEL);
    }

    if (this.popupPanel) {
      tween(this.popupPanel).stop();

      const particles = this.popupPanel.children.filter(child => child.name.startsWith('Particle'));
      for (const particle of particles) {
        tween(particle).stop();
        const sprite = particle.getComponent(Sprite);
        if (sprite) {
          tween(sprite).stop();
        }
      }

      const glowBorder = this.popupPanel.getChildByName('GlowBorder');
      if (glowBorder) {
        const glowSprite = glowBorder.getComponent(Sprite);
        if (glowSprite) {
          tween(glowSprite).stop();
        }
      }
    }

    if (this.backgroundOverlay) {
      const bgOpacity = this.backgroundOverlay.getComponent(UIOpacity);
      if (bgOpacity) {
        tween(bgOpacity).stop();
      }
    }

    if (this.titleLabel?.node) {
      tween(this.titleLabel.node).stop();
    }

    if (this.scoreLabel) {
      tween(this.scoreLabel).stop();
    }

    if (this.highScoreLabel?.node) {
      tween(this.highScoreLabel.node).stop();
      tween(this.highScoreLabel).stop();
    }

    this.onNewGameCallback = null;
  }
}
