import { _decorator, Component, director, ProgressBar, resources, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AssetLoader')
export class AssetLoader extends Component {
  @property(ProgressBar)
  private progressBar!: ProgressBar;

  protected __preload(): void {
    if (!this.progressBar) throw new Error('ProgressBar is required');
    director.preloadScene('GameScene');
    resources.preloadDir('images');
  }

  start() {
    resources.loadDir(
      'images',
      SpriteFrame,
      (finished, total) => {
        this.updateProgressBar(finished / total);
      },
      error => {
        if (error) {
          console.error(error);
        } else {
          this.updateProgressBar(1);
          this.switchToGameScene();
        }
      }
    );
  }

  private updateProgressBar(progress: number) {
    this.progressBar!.progress = progress;
  }

  private switchToGameScene() {
    director.loadScene('GameScene');
  }
}
