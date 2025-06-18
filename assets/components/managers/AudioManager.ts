import { _decorator, AudioClip, AudioSource, Component } from 'cc';
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
export class AudioManager extends Component {
  @property(AudioSource)
  private musicSource!: AudioSource;

  @property([AudioClip])
  private audioClips: AudioClip[] = [];

  @property
  private audioVolume: number = 1.0;

  @property
  private musicVolume: number = 0.5;

  @property
  private isMuted: boolean = false;

  private audioMap: Map<AudioType, AudioClip> = new Map();

  private music: AudioSource | null = null;

  protected initialize(): void {
    this.initializeAudioMap();
    this.setupMusicSource();
  }

  private setupMusicSource(): void {
    if (this.musicSource) {
      this.musicSource.loop = true;
      this.musicSource.volume = this.isMuted ? 0 : this.musicVolume;
    }
  }

  private initializeAudioMap(): void {
    for (let i = 0; i < this.audioClips.length; i++) {
      if (i < Object.keys(AudioType).length / 2) {
        this.audioMap.set(i, this.audioClips[i]);
      }
    }
  }

  public playMusic(type: AudioType = AudioType.BACKGROUND_MUSIC, loop: boolean = true): void {
    if (!this.musicSource) {
      console.warn('AudioManager: musicSource not initialized');
      return;
    }

    if (this.isMuted) return;

    const clip = this.audioMap.get(type);
    if (!clip) {
      console.warn('AudioManager: clip not found for type', type);
      return;
    }

    this.musicSource.clip = clip;
    this.musicSource.loop = loop;
    this.musicSource.play();
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
    if (this.musicSource) {
      this.musicSource.play();
    }
  }

  public setMute(mute: boolean): void {
    this.isMuted = mute;

    console.log(
      `mute: ${mute} - volume: ${this.musicVolume} - MusicSource exists: ${!!this.musicSource}`
    );

    this.musicSource.volume = mute ? 0 : this.musicVolume;
    if (this.musicSource) {
    }
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    if (this.musicSource) {
      this.musicSource.volume = this.isMuted ? 0 : this.musicVolume;
    }
  }

  public toggleMute(): void {
    this.setMute(!this.isMuted);
  }

  public isMusicMuted(): boolean {
    return this.isMuted;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  // public setEffectsVolume(volume: number): void {
  //   this.audioVolume = Math.max(0, Math.min(1, volume));
  // }

  // public playTileMatchSound(): void {
  //   this.playEffect(AudioType.TILE_MATCH);
  // }

  // public playTileSwapSound(): void {
  //   this.playEffect(AudioType.TILE_SWAP);
  // }

  // public playTileSelectSound(): void {
  //   this.playEffect(AudioType.TILE_SELECT);
  // }

  // public playSpecialTileCreatedSound(): void {
  //   this.playEffect(AudioType.SPECIAL_TILE_CREATED);
  // }

  // public playSpecialTileActivatedSound(): void {
  //   this.playEffect(AudioType.SPECIAL_TILE_ACTIVATED);
  // }

  // public playMilestoneCompletedSound(): void {
  //   this.playEffect(AudioType.MILESTONE_COMPLETED);
  // }

  // public playButtonClickSound(): void {
  //   this.playEffect(AudioType.BUTTON_CLICK);
  // }

  // public playGameOverSound(): void {
  //   this.playEffect(AudioType.GAME_OVER);
  // }

  // public playRainbowSpecialSound(): void {
  //   this.playEffect(AudioType.RAINBOW_SPECIAL);
  // }
}
