import {
  _decorator,
  Component,
  Node,
  Label,
  Button,
  Sprite,
  tween,
  Vec3,
  Color,
  UITransform,
  UIOpacity,
  EventHandler,
  Toggle,
  AudioSource,
  Tween,
} from 'cc';
import { AudioManager } from '../managers/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('PausePopup')
export class PausePopup extends Component {
  @property(Node)
  private popupPanel: Node | null = null;

  @property(Node)
  private backgroundOverlay: Node | null = null;

  @property(Button)
  private continueButton: Button | null = null;

  @property(Button)
  private newGameButton: Button | null = null;

  @property(Toggle)
  private soundToggle: Toggle | null = null;

  @property(Label)
  private titleLabel: Label | null = null;

  @property(AudioManager)
  private audioManager: AudioManager | null = null;

  private isVisible = false;
  private onContinueCallback: (() => void) | null = null;
  private onNewGameCallback: (() => void) | null = null;

  protected start(): void {
    this.isVisible = false;
    this.setupButtons();
    this.hide(false);
    this.enhanceVisualStyling();
  }

  private setupButtons(): void {
    if (this.continueButton) {
      this.setupButtonAnimations(this.continueButton);

      const clickHandler = new EventHandler();
      clickHandler.target = this.node;
      clickHandler.component = 'PausePopup';
      clickHandler.handler = 'onContinueClicked';
      // this.continueButton.clickEvents.push(clickHandler);

      this.continueButton.node.on(Node.EventType.TOUCH_END, () => {
        this.onContinueClicked();
      });
    }

    if (this.newGameButton) {
      this.setupButtonAnimations(this.newGameButton);

      const clickHandler = new EventHandler();
      clickHandler.target = this.node;
      clickHandler.component = 'PausePopup';
      clickHandler.handler = 'onNewGameClicked';
      // this.newGameButton.clickEvents.push(clickHandler);

      this.newGameButton.node.on(Node.EventType.TOUCH_END, () => {
        this.onNewGameClicked();
      });
    }

    if (this.soundToggle) {
      const toggleHandler = new EventHandler();
      toggleHandler.target = this.node;
      toggleHandler.component = 'PausePopup';
      toggleHandler.handler = 'onSoundToggled';
      this.soundToggle.checkEvents.push(toggleHandler);

      this.soundToggle.isChecked = true;
    }
  }

  /**
   * Setup hover and click animations for buttons
   */
  private setupButtonAnimations(button: Button): void {
    const buttonNode = button.node;
    const originalScale = buttonNode.scale.clone();
    const sprite = buttonNode.getComponent(Sprite)!;
    const originalColor = sprite.color.clone();

    buttonNode.on(Node.EventType.MOUSE_ENTER, () => {
      tween(buttonNode)
        .to(0.1, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'quadOut' })
        .start();

      tween(sprite)
        .to(0.1, {
          color: new Color(
            originalColor.r + 30,
            originalColor.g + 30,
            originalColor.b + 30,
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
        .to(0.1, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'backOut' })
        .start();
    });

    buttonNode.on(Node.EventType.TOUCH_CANCEL, () => {
      tween(buttonNode).to(0.1, { scale: originalScale }, { easing: 'quadOut' }).start();
    });
  }

  /**
   * Enhance visual styling with glow effects
   */
  private enhanceVisualStyling(): void {
    if (this.popupPanel) {
      tween(this.popupPanel.getComponent(Sprite)!)
        .to(2.0, {
          color: new Color(255, 255, 255, 255),
        })
        .to(2.0, {
          color: new Color(255, 240, 200, 255),
        })
        .union()
        .repeatForever()
        .start();
    }
  }

  /**
   * Show popup with animation
   */
  public show(): void {
    if (this.isVisible) return;

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
      tween(bgOpacity).to(0.3, { opacity: 255 }, { easing: 'quadOut' }).start();
    }

    if (this.popupPanel) {
      Tween.stopAllByTarget(this.popupPanel);

      const panelOpacity = this.popupPanel.getComponent(UIOpacity)!;

      tween(this.popupPanel)
        .parallel(
          tween(this.popupPanel).to(0.6, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }),
          tween(panelOpacity).to(0.3, { opacity: 255 }, { easing: 'quadOut' })
        )
        .start();
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
        .to(0.3, { scale: new Vec3(0.8, 0.8, 1) }, { easing: 'backIn' })
        .start();

      tween(panelOpacity).to(0.3, { opacity: 0 }, { easing: 'quadIn' }).start();
    }

    if (this.backgroundOverlay) {
      const bgOpacity =
        this.backgroundOverlay.getComponent(UIOpacity) ||
        this.backgroundOverlay.addComponent(UIOpacity);

      tween(bgOpacity)
        .to(0.2, { opacity: 0 }, { easing: 'quadIn' })
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
   * Set callbacks for button actions
   */
  public setCallbacks(onContinue: () => void, onNewGame: () => void): void {
    this.onContinueCallback = onContinue;
    this.onNewGameCallback = onNewGame;
  }

  /**
   * Button click handlers
   */
  public onContinueClicked(): void {
    this.hide();
    if (this.onContinueCallback) {
      setTimeout(() => this.onContinueCallback!(), 100);
    }
  }

  public onNewGameClicked(): void {
    this.hide();
    if (this.onNewGameCallback) {
      setTimeout(() => this.onNewGameCallback!(), 100);
    }
  }

  public onSoundToggled(): void {
    if (this.soundToggle) {
      const soundEnabled = this.soundToggle.isChecked;
      this.audioManager!.setMute(!soundEnabled);

      console.log(`Sound toggled: ${soundEnabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get current sound state
   */
  public isSoundEnabled(): boolean {
    if (this.soundToggle) {
      return this.soundToggle.isChecked;
    }
    return !this.audioManager!.isMusicMuted();
  }

  /**
   * Set sound state
   */
  public setSoundEnabled(enabled: boolean): void {
    if (this.soundToggle) {
      this.soundToggle.isChecked = enabled;
      this.audioManager!.setMute(!enabled);
    }
  }

  protected onDestroy(): void {
    if (this.continueButton?.node) {
      this.continueButton.node.off(Node.EventType.TOUCH_END);
    }
    if (this.newGameButton?.node) {
      this.newGameButton.node.off(Node.EventType.TOUCH_END);
    }

    if (this.popupPanel) {
      tween(this.popupPanel).stop();
      const sprite = this.popupPanel.getComponent(Sprite);
      if (sprite) {
        tween(sprite).stop();
      }
    }

    if (this.backgroundOverlay) {
      const bgOpacity = this.backgroundOverlay.getComponent(UIOpacity);
      if (bgOpacity) {
        tween(bgOpacity).stop();
      }
    }

    this.onContinueCallback = null;
    this.onNewGameCallback = null;
  }
}
