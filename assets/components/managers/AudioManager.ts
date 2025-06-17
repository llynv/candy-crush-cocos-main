import { _decorator, AudioClip, AudioSource } from 'cc';
import { Singleton } from '../patterns/Singleton';
const { ccclass, property } = _decorator;

export enum AudioType {
  BACKGROUND_MUSIC,
  TILE_MATCH,
  TILE_SWAP,
  TILE_SELECT,
  SPECIAL_TILE_CREATED,
  SPECIAL_TILE_ACTIVATED,
  MILESTONE_COMPLETED,
  BUTTON_CLICK,
  GAME_OVER,
  RAINBOW_SPECIAL,
}

@ccclass('AudioManager')
export class AudioManager extends Singleton {
  @property(AudioSource)
  private musicSource: AudioSource | null = null;

  @property(AudioSource)
  private effectSource: AudioSource | null = null;

  @property([AudioClip])
  private audioClips: AudioClip[] = [];

  @property
  private audioVolume: number = 1.0;

  @property
  private musicVolume: number = 0.5;

  @property
  private isMuted: boolean = false;

  private audioMap: Map<AudioType, AudioClip> = new Map();

  protected onLoad(): void {
    this.initializeAudioMap();
  }

  private initializeAudioMap(): void {
    for (let i = 0; i < this.audioClips.length; i++) {
      if (i < Object.keys(AudioType).length / 2) {
        this.audioMap.set(i, this.audioClips[i]);
      }
    }
  }

  public playMusic(type: AudioType = AudioType.BACKGROUND_MUSIC, loop: boolean = true): void {
    if (this.isMuted || !this.musicSource) return;

    const clip = this.audioMap.get(type);
    if (!clip) return;

    this.musicSource.clip = clip;
    this.musicSource.loop = loop;
    this.musicSource.volume = this.musicVolume;
    this.musicSource.play();
  }

  public playEffect(type: AudioType, volume: number = 1.0): void {
    if (this.isMuted || !this.effectSource) return;

    const clip = this.audioMap.get(type);
    if (!clip) return;

    this.effectSource.playOneShot(clip, volume * this.audioVolume);
  }

  public stopMusic(): void {
    if (this.musicSource) {
      this.musicSource.stop();
    }
  }

  public pauseMusic(): void {
    if (this.musicSource) {
      this.musicSource.pause();
    }
  }

  public resumeMusic(): void {
    if (this.musicSource && !this.isMuted) {
      this.musicSource.play();
    }
  }

  public setMute(mute: boolean): void {
    this.isMuted = mute;

    if (this.musicSource) {
      if (mute) {
        this.musicSource.pause();
      } else {
        this.musicSource.play();
      }
    }
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicSource) {
      this.musicSource.volume = this.musicVolume;
    }
  }

  public setEffectsVolume(volume: number): void {
    this.audioVolume = Math.max(0, Math.min(1, volume));
  }

  public playTileMatchSound(): void {
    this.playEffect(AudioType.TILE_MATCH);
  }

  public playTileSwapSound(): void {
    this.playEffect(AudioType.TILE_SWAP);
  }

  public playTileSelectSound(): void {
    this.playEffect(AudioType.TILE_SELECT);
  }

  public playSpecialTileCreatedSound(): void {
    this.playEffect(AudioType.SPECIAL_TILE_CREATED);
  }

  public playSpecialTileActivatedSound(): void {
    this.playEffect(AudioType.SPECIAL_TILE_ACTIVATED);
  }

  public playMilestoneCompletedSound(): void {
    this.playEffect(AudioType.MILESTONE_COMPLETED);
  }

  public playButtonClickSound(): void {
    this.playEffect(AudioType.BUTTON_CLICK);
  }

  public playGameOverSound(): void {
    this.playEffect(AudioType.GAME_OVER);
  }

  public playRainbowSpecialSound(): void {
    this.playEffect(AudioType.RAINBOW_SPECIAL);
  }
}
