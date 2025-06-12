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
    this.createUI();
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
   * Create the popup UI programmatically
   */
  private createUI(): void {
    if (!this.popupPanel) {
      this.createPopupPanel();
    }

    if (!this.backgroundOverlay) {
      this.createBackgroundOverlay();
    }

    this.enhanceVisualStyling();
  }

  /**
   * Create the main popup panel
   */
  private createPopupPanel(): void {
    this.popupPanel = new Node('PopupPanel');
    this.node.addChild(this.popupPanel);

    const transform = this.popupPanel.addComponent(UITransform);
    transform.setContentSize(450, 350);

    const sprite = this.popupPanel.addComponent(Sprite);
    sprite.type = Sprite.Type.SLICED;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = new Color(50, 20, 20, 240);

    const borderNode = new Node('Border');
    this.popupPanel.addChild(borderNode);

    const borderTransform = borderNode.addComponent(UITransform);
    borderTransform.setContentSize(460, 360);

    const borderSprite = borderNode.addComponent(Sprite);
    borderSprite.type = Sprite.Type.SLICED;
    borderSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    borderSprite.color = new Color(220, 20, 60, 200);
    borderNode.setSiblingIndex(0);

    this.createPanelContent();
  }

  /**
   * Create the panel content (title, scores, button)
   */
  private createPanelContent(): void {
    if (!this.popupPanel) return;

    const titleNode = new Node('Title');
    this.popupPanel.addChild(titleNode);
    titleNode.setPosition(0, 130, 0);

    const titleTransform = titleNode.addComponent(UITransform);
    titleTransform.setContentSize(400, 60);

    this.titleLabel = titleNode.addComponent(Label);
    this.titleLabel.string = 'GAME OVER';
    this.titleLabel.fontSize = 38;
    this.titleLabel.isBold = true;
    this.titleLabel.color = new Color(220, 20, 60, 255);
    this.titleLabel.enableOutline = true;
    this.titleLabel.outlineColor = new Color(139, 0, 0, 255);
    this.titleLabel.outlineWidth = 4;

    this.titleLabel.enableShadow = true;
    this.titleLabel.shadowColor = new Color(0, 0, 0, 180);
    this.titleLabel.shadowOffset = new Vec2(3, -3);
    this.titleLabel.shadowBlur = 5;

    this.createScoreDisplay();

    this.createHighScoreDisplay();

    this.newGameButton = this.createButton('New Game', 0, -100, new Color(255, 140, 0, 255));
  }

  /**
   * Create score display
   */
  private createScoreDisplay(): void {
    if (!this.popupPanel) return;

    const scoreContainer = new Node('ScoreContainer');
    this.popupPanel.addChild(scoreContainer);
    scoreContainer.setPosition(0, 40, 0);

    const scoreTitleNode = new Node('ScoreTitle');
    scoreContainer.addChild(scoreTitleNode);
    scoreTitleNode.setPosition(0, 20, 0);

    const scoreTitleTransform = scoreTitleNode.addComponent(UITransform);
    scoreTitleTransform.setContentSize(300, 30);

    const scoreTitleLabel = scoreTitleNode.addComponent(Label);
    scoreTitleLabel.string = 'Final Score';
    scoreTitleLabel.fontSize = 22;
    scoreTitleLabel.isBold = true;
    scoreTitleLabel.color = new Color(255, 255, 255, 255);
    scoreTitleLabel.enableOutline = true;
    scoreTitleLabel.outlineColor = new Color(0, 0, 0, 200);
    scoreTitleLabel.outlineWidth = 2;

    const scoreValueNode = new Node('ScoreValue');
    scoreContainer.addChild(scoreValueNode);
    scoreValueNode.setPosition(0, -15, 0);

    const scoreValueTransform = scoreValueNode.addComponent(UITransform);
    scoreValueTransform.setContentSize(350, 40);

    this.scoreLabel = scoreValueNode.addComponent(Label);
    this.scoreLabel.string = '0';
    this.scoreLabel.fontSize = 32;
    this.scoreLabel.isBold = true;
    this.scoreLabel.color = new Color(255, 215, 0, 255);
    this.scoreLabel.enableOutline = true;
    this.scoreLabel.outlineColor = new Color(139, 69, 19, 255);
    this.scoreLabel.outlineWidth = 3;

    this.scoreLabel.enableShadow = true;
    this.scoreLabel.shadowColor = new Color(255, 165, 0, 150);
    this.scoreLabel.shadowOffset = new Vec2(0, 0);
    this.scoreLabel.shadowBlur = 8;
  }

  /**
   * Create high score display
   */
  private createHighScoreDisplay(): void {
    if (!this.popupPanel) return;

    const highScoreContainer = new Node('HighScoreContainer');
    this.popupPanel.addChild(highScoreContainer);
    highScoreContainer.setPosition(0, -25, 0);

    const highScoreTitleNode = new Node('HighScoreTitle');
    highScoreContainer.addChild(highScoreTitleNode);
    highScoreTitleNode.setPosition(0, 20, 0);

    const highScoreTitleTransform = highScoreTitleNode.addComponent(UITransform);
    highScoreTitleTransform.setContentSize(300, 30);

    const highScoreTitleLabel = highScoreTitleNode.addComponent(Label);
    highScoreTitleLabel.string = 'High Score';
    highScoreTitleLabel.fontSize = 20;
    highScoreTitleLabel.isBold = true;
    highScoreTitleLabel.color = new Color(255, 255, 255, 255);
    highScoreTitleLabel.enableOutline = true;
    highScoreTitleLabel.outlineColor = new Color(0, 0, 0, 200);
    highScoreTitleLabel.outlineWidth = 2;

    const highScoreValueNode = new Node('HighScoreValue');
    highScoreContainer.addChild(highScoreValueNode);
    highScoreValueNode.setPosition(0, -15, 0);

    const highScoreValueTransform = highScoreValueNode.addComponent(UITransform);
    highScoreValueTransform.setContentSize(350, 35);

    this.highScoreLabel = highScoreValueNode.addComponent(Label);
    this.highScoreLabel.string = this.highScore.toLocaleString();
    this.highScoreLabel.fontSize = 28;
    this.highScoreLabel.isBold = true;
    this.highScoreLabel.color = new Color(138, 43, 226, 255);
    this.highScoreLabel.enableOutline = true;
    this.highScoreLabel.outlineColor = new Color(72, 61, 139, 255);
    this.highScoreLabel.outlineWidth = 3;
  }

  /**
   * Create a styled button
   */
  private createButton(text: string, x: number, y: number, color: Color): Button {
    const buttonNode = new Node(text + 'Button');
    this.popupPanel!.addChild(buttonNode);
    buttonNode.setPosition(x, y, 0);

    const buttonTransform = buttonNode.addComponent(UITransform);
    buttonTransform.setContentSize(220, 55);

    const buttonSprite = buttonNode.addComponent(Sprite);
    buttonSprite.type = Sprite.Type.SLICED;
    buttonSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    buttonSprite.color = color;

    const button = buttonNode.addComponent(Button);

    const labelNode = new Node('Label');
    buttonNode.addChild(labelNode);

    const labelTransform = labelNode.addComponent(UITransform);
    labelTransform.setContentSize(200, 45);

    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 26;
    label.isBold = true;
    label.color = new Color(255, 255, 255, 255);
    label.enableOutline = true;
    label.outlineColor = new Color(0, 0, 0, 200);
    label.outlineWidth = 2;

    (button as any).backgroundSprite = buttonSprite;

    return button;
  }

  /**
   * Create background overlay
   */
  private createBackgroundOverlay(): void {
    this.backgroundOverlay = new Node('BackgroundOverlay');
    this.node.addChild(this.backgroundOverlay);
    this.backgroundOverlay.setSiblingIndex(0);

    const transform = this.backgroundOverlay.addComponent(UITransform);
    transform.setContentSize(2000, 2000);

    const sprite = this.backgroundOverlay.addComponent(Sprite);
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = new Color(0, 0, 0, 150);
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
    const sprite = (button as any).backgroundSprite as Sprite;
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
   * Enhance visual styling with effects
   */
  private enhanceVisualStyling(): void {
    if (this.popupPanel) {
      tween(this.popupPanel.getComponent(Sprite)!)
        .to(1.5, {
          color: new Color(255, 255, 255, 255),
        })
        .to(1.5, {
          color: new Color(255, 200, 200, 255),
        })
        .union()
        .repeatForever()
        .start();
    }
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
      const panelOpacity =
        this.popupPanel.getComponent(UIOpacity) || this.popupPanel.addComponent(UIOpacity);
      panelOpacity.opacity = 0;
    }

    if (this.backgroundOverlay) {
      const bgOpacity =
        this.backgroundOverlay.getComponent(UIOpacity) ||
        this.backgroundOverlay.addComponent(UIOpacity);
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

    const updateScore = () => {
      currentDisplayScore = Math.min(currentDisplayScore + increment, targetScore);
      this.scoreLabel!.string = Math.floor(currentDisplayScore).toLocaleString();

      if (currentDisplayScore < targetScore) {
        setTimeout(updateScore, (duration * 1000) / steps);
      }
    };

    setTimeout(updateScore, 800);
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
      const panelOpacity =
        this.popupPanel.getComponent(UIOpacity) || this.popupPanel.addComponent(UIOpacity);

      tween(this.popupPanel)
        .to(0.3, { scale: new Vec3(0.6, 0.6, 1) }, { easing: 'backIn' })
        .start();

      tween(panelOpacity).to(0.3, { opacity: 0 }, { easing: 'quadIn' }).start();
    }

    if (this.backgroundOverlay) {
      const bgOpacity =
        this.backgroundOverlay.getComponent(UIOpacity) ||
        this.backgroundOverlay.addComponent(UIOpacity);

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

  protected onDestroy(): void {}
}
