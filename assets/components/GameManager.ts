import { _decorator, Camera, Node, Vec3, Button, tween } from 'cc';
const { ccclass, property } = _decorator;

import { GameConfig } from '../constants/GameConfig';
import { Tile } from './Tile';
import { GameGlobalData } from './GameGlobalData';
import { BoardManager } from './managers/BoardManager';
import { MatchManager } from './managers/MatchManager';
import { AnimationManager, FallTask } from './managers/AnimationManager';
import { InputManager } from './managers/InputManager';
import { ProgressManager } from './managers/ProgressManager';
import { SpecialTileManager } from './managers/SpecialTileManager';
import { ParticleEffectManager } from './managers/ParticleEffectManager';
import { Singleton } from './patterns/Singleton';
import { SpecialTileType } from '../constants/SpecialTileConfig';
import { MilestoneAchievementUI } from './ui/MilestoneAchievementUI';
import { PausePopup } from './ui/PausePopup';
import { GameOverPopup } from './ui/GameOverPopup';
import { Frame } from './Frame';
import { ProgressUI } from './ProgressUI';

@ccclass('GameManager')
export default class GameManager extends Singleton {
  @property(Camera)
  private camera: Camera | null = null;

  @property(Node)
  private celebrationNode: Node | null = null;

  @property(Node)
  private milestoneUINode: Node | null = null;

  @property(Node)
  private progressUINode: Node | null = null;

  @property(PausePopup)
  private pausePopupUI: PausePopup | null = null;

  @property(GameOverPopup)
  private gameOverPopup: GameOverPopup | null = null;

  @property(Button)
  private pauseButton: Button | null = null;

  private boardManager: BoardManager | null = null;
  private matchManager: MatchManager | null = null;
  private animationManager: AnimationManager | null = null;
  private inputManager: InputManager | null = null;
  private specialTileManager: SpecialTileManager | null = null;
  private particleEffectManager: ParticleEffectManager | null = null;
  private milestoneAchievementUI: MilestoneAchievementUI | null = null;
  private pausePopup: PausePopup | null = null;
  private progressUI: ProgressUI | null = null;

  private playerIdleTimeForHint = 0;
  private playerIdleTimeForMaxIdle = 0;
  private canMove = false;
  private firstSelectedTile: Tile | undefined = undefined;
  private secondSelectedTile: Tile | undefined = undefined;
  private swappedTiles: Tile[] = [];
  private triggeredSpecialTiles: Tile[] = [];

  private isGamePaused = false;
  private isGameOver = false;
  private movesRemaining: number = GameConfig.Moves;

  private hintActive: boolean = false;

  protected __preload(): void {
    this.assignManagers();
    if (!this.boardManager) throw new Error('BoardManager is required');
    if (!this.matchManager) throw new Error('MatchManager is required');
    if (!this.animationManager) throw new Error('AnimationManager is required');
    if (!this.inputManager) throw new Error('InputManager is required');
    if (!this.specialTileManager) throw new Error('SpecialTileManager is required');
    if (!this.particleEffectManager) throw new Error('ParticleEffectManager is required');
    if (!this.pausePopup) throw new Error('PausePopup is required');

    this.milestoneAchievementUI = this.milestoneUINode?.getComponent(MilestoneAchievementUI)!;
    this.progressUI = this.progressUINode?.getComponent(ProgressUI)!;
  }

  protected start(): void {
    this.setupProgressManager();
    this.createBoard();
    this.setupPauseButton();
  }

  protected update(dt: number): void {
    this.checkIdleTime(dt);
  }

  private assignManagers(): void {
    this.boardManager = this.node.getComponent(BoardManager);
    this.matchManager = this.node.getComponent(MatchManager);
    this.animationManager = this.node.getComponent(AnimationManager);
    this.inputManager = this.node.getComponent(InputManager);
    this.specialTileManager = this.node.getComponent(SpecialTileManager);
    this.particleEffectManager = this.node.getComponent(ParticleEffectManager);
    this.pausePopup = this.pausePopupUI?.getComponent(PausePopup)!;
  }

  private setupProgressManager(): void {
    ProgressManager.getInstance().onMilestoneCompleted(this.handleMilestoneCompleted.bind(this));
  }

  private setupPauseButton(): void {
    if (this.pausePopup) {
      this.setupPausePopupCallbacks();
      this.setupPauseButtonEvents();
    }
  }

  private setupPausePopupCallbacks(): void {
    this.pausePopup!.setCallbacks(
      () => {
        this.setGameInteractionEnabled(true);
        GameGlobalData.getInstance().setIsGamePaused(false);
        this.checkMatches();
        this.pausePopup?.hide();
      },
      () => this.startNewGame()
    );
  }

  private setupPauseButtonEvents(): void {
    this.pauseButton?.node.on(Node.EventType.TOUCH_END, () => {
      this.pausePopup?.show();
      console.log(this.pausePopup);
      this.setGameInteractionEnabled(false);
      GameGlobalData.getInstance().setIsGamePaused(true);
    });

    this.pauseButton?.node.on(Node.EventType.TOUCH_START, () => {
      this.animatePauseButtonPress();
    });

    this.pauseButton?.node.on(Node.EventType.TOUCH_END, () => {
      this.animatePauseButtonRelease();
    });

    this.pauseButton?.node.on(Node.EventType.MOUSE_ENTER, () => {
      this.animatePauseButtonHover();
    });

    this.pauseButton?.node.on(Node.EventType.MOUSE_LEAVE, () => {
      this.animatePauseButtonLeave();
    });
  }

  private animatePauseButtonPress(): void {
    tween(this.pauseButton?.node)
      .to(0.1, { scale: new Vec3(0.9, 0.9, 1) }, { easing: 'quadOut' })
      .start();
  }

  private animatePauseButtonRelease(): void {
    tween(this.pauseButton?.node)
      .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
      .start();
  }

  private animatePauseButtonHover(): void {
    tween(this.pauseButton?.node)
      .to(0.1, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'quadOut' })
      .start();
  }

  private animatePauseButtonLeave(): void {
    tween(this.pauseButton?.node)
      .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
      .start();
  }

  private async handleMilestoneCompleted(): Promise<void> {
    console.log('Milestone completed! Starting celebration sequence...');

    this.canMove = false;
    GameGlobalData.getInstance().setIsMouseDown(false);

    const milestoneData = ProgressManager.getInstance().getMilestoneData();

    if (this.milestoneAchievementUI) {
      this.milestoneAchievementUI.showMilestoneAchievement(milestoneData);
    }
    this.clearBoard();
    this.boardManager!.initializeBoard();
    this.resetFrames();

    const currentTileGrid = this.boardManager!.getTileGrid();

    const tileAnimationPromise = this.animationManager!.animateMilestoneCelebration(
      currentTileGrid,
      this.celebrationNode!
    );

    await Promise.all([tileAnimationPromise]);

    this.setupTileCallbacks();
    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;

    this.movesRemaining = GameConfig.Moves;
    this.updateMovesDisplay(this.movesRemaining);

    await this.resetTile();
    await this.checkMatches();
  }

  private clearBoard(): void {
    const tileGrid = this.boardManager!.getTileGrid();

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (tile && tile.node && tile.node.isValid) {
          tile.node.destroy();
        }
        this.boardManager!.setTileAt(x, y, undefined);
      }
    }
  }

  private async createBoard(isFrameExist: boolean = false): Promise<void> {
    this.canMove = false;
    if (!isFrameExist) {
      this.boardManager!.createFrames();
    }
    GameGlobalData.getInstance().setIsMouseDown(true);
    this.boardManager!.initializeBoard();
    this.setupTileCallbacks();
    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;

    await this.checkMatches();

    this.updateMovesDisplay(this.movesRemaining);
  }

  private setupTileCallbacks(): void {
    const tileGrid = this.boardManager!.getTileGrid();

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (tile) {
          tile.addOnMouseDownCallback(this.tileDown.bind(this));
          tile.addOnMouseUpCallback(this.tileDown.bind(this));
          tile.addOnRainbowClickCallback(this.handleRainbowClick.bind(this));
        }
      }
    }
  }

  private checkIdleTime(dt: number): void {
    this.playerIdleTimeForHint += dt;
    this.playerIdleTimeForMaxIdle += dt;
    if (this.playerIdleTimeForHint >= GameConfig.HintTime) {
      this.playerIdleTimeForHint = 0;
      this.showHint();
    }
    if (this.playerIdleTimeForMaxIdle >= GameConfig.MaxIdleTime) {
      this.playerIdleTimeForMaxIdle = 0;
      this.animationManager!.animateIdleTiles(this.boardManager!.getTileGrid());
    }
  }

  private tileDown(tile: Tile): void {
    if (GameGlobalData.getInstance().getIsGamePaused() || this.isGameOver || !this.canMove) return;

    this.playerIdleTimeForHint = 0;
    this.playerIdleTimeForMaxIdle = 0;

    if (!this.firstSelectedTile || this.firstSelectedTile === tile) {
      this.firstSelectedTile = tile;
      tile.changeState('select');
    } else {
      this.secondSelectedTile = tile;

      const tileCoords = this.boardManager!.getTileCoords();
      const firstCoords = tileCoords.get(this.firstSelectedTile)!;
      const secondCoords = tileCoords.get(this.secondSelectedTile)!;

      const dx = Math.abs(firstCoords.x - secondCoords.x);
      const dy = Math.abs(firstCoords.y - secondCoords.y);

      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        this.canMove = false;
        this.swapTiles();
      } else {
        this.firstSelectedTile.changeState('idle');
        this.firstSelectedTile = tile;
        tile.changeState('select');
        this.secondSelectedTile = undefined;
      }
    }
  }

  private isInBounds(coord: { x: number; y: number }): boolean {
    return (
      coord.x >= 0 &&
      coord.x < GameConfig.GridWidth &&
      coord.y >= 0 &&
      coord.y < GameConfig.GridHeight
    );
  }

  private swapTiles(): void {
    if (!this.firstSelectedTile || !this.secondSelectedTile) {
      this.canMove = true;
      GameGlobalData.getInstance().setIsMouseDown(false);
      return;
    }

    const tileCoords = this.boardManager!.getTileCoords();
    const tileGrid = this.boardManager!.getTileGrid();

    const firstSelectedTileCoords = tileCoords.get(this.firstSelectedTile);
    const secondSelectedTileCoords = tileCoords.get(this.secondSelectedTile);

    if (!firstSelectedTileCoords || !secondSelectedTileCoords) {
      console.error('Selected tile coordinates not found - tiles may have been destroyed');
      this.tileUp();
      this.canMove = true;
      GameGlobalData.getInstance().setIsMouseDown(false);
      return;
    }

    if (!this.isInBounds(firstSelectedTileCoords) || !this.isInBounds(secondSelectedTileCoords)) {
      console.error('Selected tile coordinates are out of bounds');
      this.tileUp();
      this.canMove = true;
      GameGlobalData.getInstance().setIsMouseDown(false);
      return;
    }

    this.performTileSwap(tileGrid, tileCoords, firstSelectedTileCoords, secondSelectedTileCoords);
  }

  private performTileSwap(
    tileGrid: (Tile | undefined)[][],
    tileCoords: Map<Tile, { x: number; y: number }>,
    firstSelectedTileCoords: { x: number; y: number },
    secondSelectedTileCoords: { x: number; y: number }
  ): void {
    if (!this.firstSelectedTile || !this.secondSelectedTile) return;

    this.swappedTiles = [this.firstSelectedTile, this.secondSelectedTile];

    tileGrid[firstSelectedTileCoords.y][firstSelectedTileCoords.x] = this.secondSelectedTile;
    tileGrid[secondSelectedTileCoords.y][secondSelectedTileCoords.x] = this.firstSelectedTile;

    tileCoords.set(this.secondSelectedTile, {
      x: firstSelectedTileCoords.x,
      y: firstSelectedTileCoords.y,
    });
    tileCoords.set(this.firstSelectedTile, {
      x: secondSelectedTileCoords.x,
      y: secondSelectedTileCoords.y,
    });

    this.animationManager!.animateSwap(this.firstSelectedTile, this.secondSelectedTile, () =>
      this.checkMatches(true)
    );

    this.firstSelectedTile = tileGrid[firstSelectedTileCoords.y][firstSelectedTileCoords.x];
    this.secondSelectedTile = tileGrid[secondSelectedTileCoords.y][secondSelectedTileCoords.x];

    if (!this.firstSelectedTile || !this.secondSelectedTile) return;

    tileCoords.set(this.firstSelectedTile, {
      x: firstSelectedTileCoords.x,
      y: firstSelectedTileCoords.y,
    });
    tileCoords.set(this.secondSelectedTile, {
      x: secondSelectedTileCoords.x,
      y: secondSelectedTileCoords.y,
    });
  }

  private async checkMatches(isSwapCheck: boolean = false): Promise<void> {
    if (GameGlobalData.getInstance().getIsGamePaused()) return;

    const tileGrid = this.boardManager!.getTileGrid();
    const matches = this.matchManager!.findMatches(tileGrid);

    if (isSwapCheck && this.swappedTiles.some(tile => tile.isRainbowTile())) {
      matches.push(this.swappedTiles);
    }

    if (matches.length > 0) {
      if (isSwapCheck) {
        this.processMove();
      }

      await this.removeTileGroup(matches);
      await this.resetTile();
      this.tileUp();
    } else {
      const isMilestoneCompleted = await this.checkMilestoneCompleted();

      if (isMilestoneCompleted) return;

      if (isSwapCheck) {
        this.swapTiles();
      } else {
        this.canMove = true;
        GameGlobalData.getInstance().setIsMouseDown(false);
        this.resetFrames();

        this.checkGameOverConditions();
      }
      this.tileUp();
    }
  }

  private async checkMilestoneCompleted(): Promise<boolean> {
    const isMilestoneCompleted = ProgressManager.getInstance().processPendingScores();

    if (!isMilestoneCompleted) return false;

    const currentTileGrid = this.boardManager!.getTileGrid();
    let hasValidTiles = false;
    for (let y = 0; y < GameConfig.GridHeight && !hasValidTiles; y++) {
      for (let x = 0; x < GameConfig.GridWidth && !hasValidTiles; x++) {
        const tile = currentTileGrid[y][x];
        if (tile && tile.node && tile.node.isValid) {
          hasValidTiles = true;
        }
      }
    }

    if (hasValidTiles) {
      await this.handleMilestoneCompleted();
    } else {
      console.warn('No valid tiles found for milestone animation, creating new board directly');
      this.clearBoard();
      this.createBoard();
    }

    return true;
  }

  private resetFrames(): void {
    const tileGrid = this.boardManager!.getTileGrid();
    const frameGrid = this.boardManager!.getFrameGrid();

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        if (tileGrid[y][x] && frameGrid[y][x]) {
          tileGrid[y][x]!.setFrame(frameGrid[y][x]!);
        }
      }
    }
  }

  private resetTileFromExistingTile(
    tileGrid: (Tile | undefined)[][],
    frameGrid: (Frame | undefined)[][],
    columnTiles: Array<{ tile: Tile; currentY: number }>,
    fallTasks: FallTask[],
    x: number
  ): void {
    for (let y = GameConfig.GridHeight - 1; y >= 0; y--) {
      if (tileGrid[y][x] !== undefined) {
        columnTiles.push({
          tile: tileGrid[y][x]!,
          currentY: y,
        });
      }
    }

    for (let y = 0; y < GameConfig.GridHeight; y++) {
      this.boardManager!.setTileAt(x, y, undefined);
    }

    for (let i = 0; i < columnTiles.length; i++) {
      const tileData = columnTiles[i];
      const targetY = GameConfig.GridHeight - 1 - i;

      this.boardManager!.setTileAt(x, targetY, tileData.tile);
      tileData.tile.setFrame(frameGrid[targetY][x]!);

      if (tileData.currentY === targetY) {
        continue;
      }

      fallTasks.push({
        tile: tileData.tile,
        fromY: tileData.currentY,
        toY: targetY,
        x: x,
        isNewTile: false,
      });
    }
  }

  private resetTileFromVirtualTile(
    tileGrid: (Tile | undefined)[][],
    frameGrid: (Frame | undefined)[][],
    columnTiles: Array<{ tile: Tile; currentY: number }>,
    fallTasks: FallTask[],
    x: number
  ): void {
    const emptySpaces = GameConfig.GridHeight - columnTiles.length;
    if (emptySpaces > 0) {
      const virtualTiles = this.boardManager!.getVirtualTilesForColumn(x, emptySpaces);

      for (let i = 0; i < virtualTiles.length; i++) {
        const targetY = GameConfig.GridHeight - columnTiles.length - 1 - i;
        const virtualTile = virtualTiles[i];

        this.boardManager!.setTileAt(x, targetY, virtualTile);

        virtualTile.addOnMouseDownCallback(this.tileDown.bind(this));
        virtualTile.addOnMouseUpCallback(this.tileDown.bind(this));
        virtualTile.addOnRainbowClickCallback(this.handleRainbowClick.bind(this));

        virtualTile.setFrame(frameGrid[targetY][x]!);

        const startFromY = -(i + 1);

        fallTasks.push({
          tile: virtualTile,
          fromY: startFromY,
          toY: targetY,
          x: x,
          isNewTile: false,
        });
      }
    }
  }

  private async resetTile(): Promise<void> {
    const fallTasks: FallTask[] = [];
    const tileGrid = this.boardManager!.getTileGrid();
    const frameGrid = this.boardManager!.getFrameGrid();
    const tileCoords = this.boardManager!.getTileCoords();

    for (let x = 0; x < GameConfig.GridWidth; x++) {
      const columnTiles: Array<{ tile: Tile; currentY: number }> = [];

      this.resetTileFromExistingTile(tileGrid, frameGrid, columnTiles, fallTasks, x);
      this.resetTileFromVirtualTile(tileGrid, frameGrid, columnTiles, fallTasks, x);
    }

    this.boardManager!.refillVirtualGrid();

    if (fallTasks.length === 0) {
      await this.checkMatches();
      return;
    }

    await this.animationManager!.animateFall(fallTasks);

    if (!this.hasSwappablePair()) {
      await this.shuffleBoard();
    }

    await this.checkMatches();
  }

  private tileUp(): void {
    this.firstSelectedTile?.changeState('idle');
    this.secondSelectedTile?.changeState('idle');

    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;
  }

  private handleCombineTile(
    match: Tile[],
    tileCoords: Map<Tile, { x: number; y: number }>,
    combineCallbacks: Array<() => void>,
    centerTile: Tile
  ): void {
    console.log(
      'match special tile',
      match.length === 4 ? SpecialTileType.BOMB : SpecialTileType.RAINBOW
    );
    combineCallbacks.push(async () => {
      const combinedTiles = match.filter(tile => tile !== centerTile);
      await this.specialTileManager!.createSpecialTile(
        centerTile,
        match.length === 4 ? SpecialTileType.BOMB : SpecialTileType.RAINBOW,
        combinedTiles,
        () => {
          for (const tile of combinedTiles) {
            if (tile.node && tile.node.isValid) {
              tile.node.destroy();
            }
          }
        }
      );
    });

    for (const tile of match) {
      if (tile === centerTile) continue;
      if (!tileCoords.has(tile)) {
        continue;
      }
      this.boardManager!.clearTileAt(tileCoords.get(tile)!.x, tileCoords.get(tile)!.y);
    }
  }

  private async handleSpecialTileDestroy(
    tile: Tile,
    onTileDestroyed: () => void,
    coords: { x: number; y: number },
    matchTiles: Set<Tile>
  ): Promise<boolean> {
    const swapTile =
      tile === this.firstSelectedTile
        ? (this.secondSelectedTile ?? tile)
        : (this.firstSelectedTile ?? tile);

    if (tile.isSpecial()) {
      const isPlayerSwap = this.swappedTiles && this.swappedTiles.indexOf(tile) !== -1;

      const affectedTiles = this.specialTileManager!.activateSpecialTile(
        tile,
        swapTile,
        coords,
        isPlayerSwap
      );

      if (affectedTiles.length > 0) {
        affectedTiles.forEach(tile => matchTiles.add(tile));
      }

      const ranbowSwapCount = this.swappedTiles.filter(t => t.isRainbowTile()).length;

      if (isPlayerSwap && ranbowSwapCount == 2) {
        await this.animationManager!.animateDoubleRainbow(
          this.swappedTiles[0],
          this.swappedTiles[1],
          this.swappedTiles
        );
        await this.resolveDestroyAllForRainbow(this.swappedTiles);
        return true;
      }

      if (!isPlayerSwap && tile.isRainbowTile()) {
        onTileDestroyed();
      }
    }

    return false;
  }

  private async handleDestroyMatchTiles(
    matchTiles: Set<Tile>,
    onTileDestroyed: () => void,
    tileCoords: Map<Tile, { x: number; y: number }>,
    destroyCallbacks: Array<() => void>
  ): Promise<boolean> {
    for (const tile of matchTiles) {
      if (!tileCoords.has(tile) || !tileCoords.get(tile)!) {
        onTileDestroyed();
        continue;
      }

      const coords = tileCoords.get(tile)!;

      const isSpecialTileDestroyed = await this.handleSpecialTileDestroy(
        tile,
        onTileDestroyed,
        coords,
        matchTiles
      );

      if (isSpecialTileDestroyed) {
        return true;
      }

      destroyCallbacks.push(async () => {
        if (!tile || !tile.node || !tile.node.isValid) {
          onTileDestroyed();
          return;
        }

        if (tile.isSpecial()) {
          this.particleEffectManager!.playSpecialTileDestroyEffect(
            tile.node.getWorldPosition(),
            tile.node.parent!,
            tile.getSpecialType()
          );
        }

        await tile.playDestroyAnimation();

        if (!tile.isSpecial()) {
          await tile.playParticleEffect();
        }

        tile.node.destroy();
        onTileDestroyed();
      });

      this.boardManager!.clearTileAt(coords.x, coords.y);
    }

    return false;
  }

  private removeTileGroup(matches: Tile[][]): Promise<void> {
    return new Promise<void>(async resolve => {
      const tileCoords = this.boardManager!.getTileCoords();
      const matchTiles: Set<Tile> = new Set();
      let tilesDestroyed = 0;

      const combineCallbacks: Array<() => void> = [];

      for (const match of matches) {
        const isMatchSpecial = match.length >= 4 && match.every(tile => !tile.isRainbowTile());
        const centerTile = match.find(tile => this.swappedTiles.indexOf(tile) !== -1) ?? match[0];

        if (isMatchSpecial) {
          this.handleCombineTile(match, tileCoords, combineCallbacks, centerTile);
        } else {
          match.forEach(tile => matchTiles.add(tile));
        }
        ProgressManager.getInstance().addPendingScore(match.length, match.length);
      }

      if (combineCallbacks.length !== 0) {
        await Promise.all(combineCallbacks.map(callback => callback()));
        resolve();
        return;
      }

      const destroyCallbacks: Array<() => void> = [];

      const onTileDestroyed = () => {
        tilesDestroyed++;
        if (tilesDestroyed >= matchTiles.size) {
          resolve();
        }
      };

      const isSpecialTileDestroyed = await this.handleDestroyMatchTiles(
        matchTiles,
        onTileDestroyed,
        tileCoords,
        destroyCallbacks
      );

      if (isSpecialTileDestroyed) {
        resolve();
        return;
      }

      await Promise.all(destroyCallbacks.map(callback => callback()));
      this.swappedTiles = [];
    });
  }

  private async resolveDestroyAllForRainbow(swappedTiles: Tile[]): Promise<void> {
    return new Promise<void>(async resolve => {
      const destroyCallbacks: Map<number, Array<() => void>> = new Map();
      const tileCoords = this.boardManager!.getTileCoords();
      const allTiles = this.boardManager!.getTileGrid();
      const tilePositions = swappedTiles.map(tile => tileCoords.get(tile)!);

      for (const tiles of allTiles) {
        for (const tile of tiles) {
          if (!tile) continue;

          const tilePosition = tileCoords.get(tile)!;

          const distance = Math.max(
            Math.min(
              Math.abs(tilePosition.x - tilePositions[0].x),
              Math.abs(tilePosition.x - tilePositions[1].x)
            ),
            Math.min(
              Math.abs(tilePosition.y - tilePositions[0].y),
              Math.abs(tilePosition.y - tilePositions[1].y)
            )
          );

          destroyCallbacks.set(distance, [
            ...(destroyCallbacks.get(distance) ?? []),
            async () => {
              await tile.playDestroyAnimation();
              await tile.playParticleEffect();

              if (tile.node && tile.node.isValid) {
                tile.node.destroy();
              }

              onTileDestroyed();
            },
          ]);

          this.boardManager!.clearTileAt(tilePosition.x, tilePosition.y);
        }
      }

      let tilesDestroyed = 0;

      const onTileDestroyed = () => {
        tilesDestroyed++;
        if (tilesDestroyed >= GameConfig.GridWidth * GameConfig.GridHeight) {
          resolve();
        }
      };

      for (let depth = 0; depth <= Math.max(GameConfig.GridWidth, GameConfig.GridHeight); depth++) {
        const callbacks = destroyCallbacks.get(depth);
        if (callbacks) {
          await Promise.all(callbacks.map(callback => callback()));
        }
      }
    });
  }

  /**
   * Set game interaction enabled/disabled
   */
  private setGameInteractionEnabled(enabled: boolean): void {
    if (this.boardManager) {
      const tileGrid = this.boardManager.getTileGrid();
      for (let y = 0; y < tileGrid.length; y++) {
        for (let x = 0; x < tileGrid[y].length; x++) {
          const tile = tileGrid[y][x];
          if (tile) {
            const button = tile.getComponent(Button);
            if (button) {
              button.interactable = enabled;
            }
          }
        }
      }
    }
  }

  /**
   * Start a new game
   */
  public startNewGame(): void {
    console.log('Starting new game...');

    GameGlobalData.getInstance().setIsGamePaused(false);
    this.isGameOver = false;
    this.canMove = false;
    this.movesRemaining = GameConfig.Moves;

    if (this.gameOverPopup) {
      this.gameOverPopup.hide(false);
    }

    const progressManager = ProgressManager.getInstance();
    if (progressManager) {
      progressManager.resetProgress();
    }

    this.clearBoard();
    this.createBoard(true);

    this.setGameInteractionEnabled(true);

    this.updateMovesDisplay(this.movesRemaining);

    console.log('New game started!');
  }

  /**
   * Check for game over conditions
   */
  private checkGameOverConditions(): void {
    if (this.isGameOver || GameGlobalData.getInstance().getIsGamePaused()) return;

    if (this.movesRemaining <= 0) {
      this.triggerGameOver();
    }
  }

  /**
   * Trigger game over sequence
   */
  private triggerGameOver(): void {
    console.log('Game Over - No moves remaining!');

    this.isGameOver = true;
    this.canMove = false;

    this.setGameInteractionEnabled(false);
    GameGlobalData.getInstance().setIsGameOver(true);

    const progressManager = ProgressManager.getInstance();
    const finalScore = progressManager ? progressManager.getCurrentScore() : 0;

    if (this.gameOverPopup) {
      this.gameOverPopup!.show(finalScore);

      this.gameOverPopup!.setCallback(() => {
        this.startNewGame();
      });
    }
  }

  /**
   * Process a player move
   */
  private processMove(): void {
    if (this.isGameOver) return;

    this.movesRemaining--;

    if (this.movesRemaining < 0) {
      this.movesRemaining = 0;
    }

    this.updateMovesDisplay(this.movesRemaining);
  }

  /**
   * Update moves display
   */
  private updateMovesDisplay(movesRemaining: number): void {
    if (this.progressUI) {
      this.progressUI.updateMovesDisplay(movesRemaining);
    } else {
      console.log(`Moves remaining: ${movesRemaining}`);
    }
  }

  private async handleRainbowClick(rainbowTile: Tile): Promise<void> {
    if (GameGlobalData.getInstance().getIsGamePaused() || this.isGameOver || !this.canMove) return;

    this.canMove = false;
    this.playerIdleTimeForHint = 0;
    this.playerIdleTimeForMaxIdle = 0;

    const affectedTiles = this.specialTileManager!.activateSpecialTile(
      rainbowTile,
      rainbowTile,
      { x: 0, y: 0 },
      false,
      true
    );

    console.log('affectedTiles', affectedTiles);

    await this.animationManager!.animateRainbowClickEffect(rainbowTile);

    const tileCoords = this.boardManager!.getTileCoords();
    const rainbowCoords = tileCoords.get(rainbowTile);
    if (rainbowCoords) {
      this.boardManager!.clearTileAt(rainbowCoords.x, rainbowCoords.y);
    }

    for (const tile of affectedTiles) {
      if (!tile || !tile.node || !tile.node.isValid) {
        continue;
      }

      tile.playDestroyAnimation();
      await tile.playParticleEffect();

      if (tile.node && tile.node.isValid) {
        tile.node.destroy();
      }
      await new Promise(resolve => this.scheduleOnce(resolve, 0.05));

      const tilePosition = tileCoords.get(tile)!;
      if (tilePosition) {
        this.boardManager!.clearTileAt(tilePosition.x, tilePosition.y);
      }
    }

    ProgressManager.getInstance().addPendingScore(affectedTiles.length, affectedTiles.length);

    this.processMove();

    await this.resetTile();
  }

  /**
   * Find a swappable pair of tiles that would result in a match
   */
  private findSwappablePair(): [Tile, Tile] | null {
    const tileGrid = this.boardManager!.getTileGrid();
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (!tile) continue;

        if (x < GameConfig.GridWidth - 1) {
          const neighbor = tileGrid[y][x + 1];
          if (neighbor && this.wouldSwapResultInMatch(tile, neighbor, tileGrid)) {
            return [tile, neighbor];
          }
        }

        if (y < GameConfig.GridHeight - 1) {
          const neighbor = tileGrid[y + 1][x];
          if (neighbor && this.wouldSwapResultInMatch(tile, neighbor, tileGrid)) {
            return [tile, neighbor];
          }
        }
      }
    }
    return null;
  }

  /**
   * Helper: would swapping these two tiles result in a match?
   */
  private wouldSwapResultInMatch(
    tileA: Tile,
    tileB: Tile,
    tileGrid: (Tile | undefined)[][]
  ): boolean {
    let ax = -1,
      ay = -1,
      bx = -1,
      by = -1;
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        if (tileGrid[y][x] === tileA) {
          ay = y;
          ax = x;
        }
        if (tileGrid[y][x] === tileB) {
          by = y;
          bx = x;
        }
      }
    }
    if (ax === -1 || ay === -1 || bx === -1 || by === -1) return false;

    tileGrid[ay][ax] = tileB;
    tileGrid[by][bx] = tileA;

    const matches = this.matchManager!.findMatches(tileGrid);

    tileGrid[ay][ax] = tileA;
    tileGrid[by][bx] = tileB;
    return matches.length > 0;
  }

  /**
   * Show a hint by pulsing two swappable tiles
   */
  private async showHint(): Promise<void> {
    if (this.hintActive) return;
    const pair = this.findSwappablePair();
    if (!pair) return;
    this.hintActive = true;
    await Promise.all([
      pair[0].getComponent(AnimationManager)?.animatePulse(10),
      pair[1].getComponent(AnimationManager)?.animatePulse(10),
    ]);
    this.hintActive = false;
  }

  /**
   * Returns true if there is at least one swappable pair on the board
   */
  private hasSwappablePair(): boolean {
    return this.findSwappablePair() !== null;
  }

  /**
   * Shuffle the board until there is at least one swappable pair
   */
  private async shuffleBoard(): Promise<void> {
    const tileGrid = this.boardManager!.getTileGrid();
    const allTiles = this.collectAllTiles(tileGrid);

    let attempts = 0;
    do {
      this.shuffleArray(allTiles);
      this.repositionTiles(allTiles, tileGrid);
      this.updateTileCoordinates(tileGrid);
      attempts++;

      if (attempts > 20) break;
    } while (!this.hasSwappablePair());
  }

  private collectAllTiles(tileGrid: (Tile | undefined)[][]): Tile[] {
    const allTiles: Tile[] = [];
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (tile) allTiles.push(tile);
      }
    }
    return allTiles;
  }

  private shuffleArray(array: Tile[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private repositionTiles(allTiles: Tile[], tileGrid: (Tile | undefined)[][]): void {
    let idx = 0;
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        if (tileGrid[y][x]) {
          tileGrid[y][x] = allTiles[idx++];
          const world = this.boardManager!.getWorldPosition({ x, y });
          tileGrid[y][x]!.node.setPosition(world.x, world.y, 0);
        }
      }
    }
  }

  private updateTileCoordinates(tileGrid: (Tile | undefined)[][]): void {
    const tileCoords = this.boardManager!.getTileCoords();
    tileCoords.clear();
    for (let y = 0; y < GameConfig.GridHeight; y++) {
      for (let x = 0; x < GameConfig.GridWidth; x++) {
        const tile = tileGrid[y][x];
        if (tile) {
          tileCoords.set(tile, { x, y });
        }
      }
    }
  }

  protected onDestroy(): void {
    if (this.pauseButton?.node) {
      this.pauseButton.node.off(Node.EventType.TOUCH_END);
      this.pauseButton.node.off(Node.EventType.TOUCH_START);
      this.pauseButton.node.off(Node.EventType.MOUSE_ENTER);
      this.pauseButton.node.off(Node.EventType.MOUSE_LEAVE);
    }

    const progressManager = ProgressManager.getInstance();
    if (progressManager) {
      progressManager.offMilestoneCompleted(this.handleMilestoneCompleted.bind(this));
    }

    if (this.pausePopup) {
      this.pausePopup.destroy();
    }

    if (this.pauseButton?.node) {
      tween(this.pauseButton.node).stop();
    }

    this.firstSelectedTile = undefined;
    this.secondSelectedTile = undefined;
    this.swappedTiles = [];
    this.triggeredSpecialTiles = [];
  }
}
