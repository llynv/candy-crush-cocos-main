import { _decorator, Component, tween, Vec3 } from 'cc';
import { Tile } from '../Tile';
import { GameConfig } from '../../constants/GameConfig';
import { BoardManager, GridPosition } from './BoardManager';

const { ccclass } = _decorator;

export interface FallTask {
  tile: Tile;
  fromY: number;
  toY: number;
  x: number;
  isNewTile: boolean;
}

@ccclass('AnimationManager')
export class AnimationManager extends Component {
  private boardManager: BoardManager | null = null;

  public setBoardManager(boardManager: BoardManager): void {
    this.boardManager = boardManager;
  }

  public animateSwap(tile1: Tile, tile2: Tile, callback: () => void): void {
    if (!tile1.node || !tile2.node || !tile1.node.isValid || !tile2.node.isValid) {
      throw new Error('Invalid tiles for swap animation');
    }

    tile1.node.setSiblingIndex(tile2.node.parent!.children.length);

    tween(tile1.node)
      .to(
        0.15,
        {
          position: new Vec3(tile2.node.x, tile2.node.y, tile1.node.position.z),
          scale: new Vec3(1.85, 1.85, 1.0),
        },
        { easing: 'linear' }
      )
      .to(0.15, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'linear' })
      .start();

    tween(tile2.node)
      .to(
        0.3,
        {
          position: new Vec3(tile1.node.x, tile1.node.y, tile2.node.position.z),
        },
        { easing: 'linear' }
      )
      .call(() => {
        callback();
      })
      .start();
  }

  public async animateFall(fallTasks: FallTask[]): Promise<void> {
    if (!this.boardManager) {
      throw new Error('BoardManager not set');
    }

    fallTasks.forEach(task => {
      const { tile, fromY, toY, x, isNewTile } = task;
      const finalPosition = this.boardManager!.getWorldPosition({ x, y: toY });

      if (isNewTile) {
        const spawnHeight = (GameConfig.GridHeight - toY + 1) * GameConfig.TileHeight;
        const startY = finalPosition.y + spawnHeight;
        tile.node.setPosition(finalPosition.x, startY, 0);
        tile.node.setScale(0.8, 0.8, 1.0);
      } else {
        const currentPosition = this.boardManager!.getWorldPosition({ x, y: fromY });
        tile.node.setPosition(currentPosition.x, currentPosition.y, 0);
      }
    });

    const fallDuration = 0.3;
    const animationPromises: Promise<void>[] = [];

    fallTasks.forEach(task => {
      const { tile, toY, x, isNewTile } = task;
      const finalPosition = this.boardManager!.getWorldPosition({ x, y: toY });

      const animationPromise = new Promise<void>(resolve => {
        let tweenChain = tween(tile.node);

        if (isNewTile) {
          tweenChain = tweenChain.to(
            0.1,
            { scale: new Vec3(1.0, 1.0, 1.0) },
            { easing: 'backOut' }
          );
        }

        tweenChain
          .to(
            fallDuration,
            { position: new Vec3(finalPosition.x, finalPosition.y, 0) },
            { easing: 'quartIn' }
          )
          .to(0.1, { scale: new Vec3(1.05, 0.95, 1.0) }, { easing: 'quadOut' })
          .to(0.1, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
          .call(() => resolve())
          .start();
      });

      animationPromises.push(animationPromise);
    });

    await Promise.all(animationPromises);
  }

  public async animateIdleTiles(tileGrid: (Tile | undefined)[][]): Promise<void> {
    for (let i = 0; i < GameConfig.GridHeight; i++) {
      for (let j = 0, x = i; j <= i && x >= 0; j++, x--) {
        const tile = tileGrid[x][j];
        if (tile) {
          tile.onPlayerIdle();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    for (let j = 1; j < GameConfig.GridWidth; j++) {
      for (let i = j, y = GameConfig.GridHeight - 1; i < GameConfig.GridWidth && y >= 0; i++, y--) {
        const tile = tileGrid[y][i];
        if (tile) {
          tile.onPlayerIdle();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  public animateMatchedTiles(matches: Tile[][]): void {}
}
