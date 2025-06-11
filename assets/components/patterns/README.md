# Singleton Pattern Implementation

This directory contains a reusable Singleton base class that can be extended by any TypeScript class to implement the Singleton pattern with proper type safety.

## Features

- ✅ **Type-safe**: Full TypeScript support with proper generic typing
- ✅ **Per-class instances**: Each subclass maintains its own singleton instance
- ✅ **Memory efficient**: Uses a single Map to store all singleton instances
- ✅ **Testing support**: Methods to destroy instances and clear all singletons
- ✅ **Initialization hooks**: Optional initialize method for setup logic
- ✅ **Error prevention**: Prevents memory leaks and instance confusion

## Basic Usage

### 1. Create a Singleton Class

```typescript
import { Singleton } from './patterns/Singleton';

class ConfigService extends Singleton {
  private config: Record<string, any> = {};

  protected initialize(): void {
    // Optional: Setup logic called once when instance is created
    this.config = {
      apiUrl: 'https://api.example.com',
      debug: false,
    };
  }

  public setConfig(key: string, value: any): void {
    this.config[key] = value;
  }

  public getConfig(key: string): any {
    return this.config[key];
  }
}
```

### 2. Use the Singleton

```typescript
// Get the singleton instance (creates it if it doesn't exist)
const config = ConfigService.getInstance();

// Configure the service
config.setConfig('debug', true);

// Get the same instance from anywhere in your code
const config2 = ConfigService.getInstance();

console.log(config === config2); // true - same instance
console.log(config2.getConfig('debug')); // true
```

## Advanced Examples

### Game State Manager

```typescript
class GameStateManager extends Singleton {
  private level: number = 1;
  private score: number = 0;
  private isGameActive: boolean = false;

  protected initialize(): void {
    console.log('GameStateManager initialized');
    this.resetGame();
  }

  public startGame(): void {
    this.isGameActive = true;
    console.log('Game started');
  }

  public endGame(): void {
    this.isGameActive = false;
    console.log(`Game ended. Final score: ${this.score}`);
  }

  public addScore(points: number): void {
    if (this.isGameActive) {
      this.score += points;
    }
  }

  public levelUp(): void {
    this.level++;
    console.log(`Level up! Now at level ${this.level}`);
  }

  public getGameState() {
    return {
      level: this.level,
      score: this.score,
      isActive: this.isGameActive,
    };
  }

  private resetGame(): void {
    this.level = 1;
    this.score = 0;
    this.isGameActive = false;
  }
}

// Usage
const gameState = GameStateManager.getInstance();
gameState.startGame();
gameState.addScore(100);
gameState.levelUp();
```

### Audio Manager

```typescript
class AudioManager extends Singleton {
  private volume: number = 1.0;
  private isMuted: boolean = false;
  private currentBgm: string | null = null;

  protected initialize(): void {
    // Load saved audio settings
    const savedVolume = localStorage.getItem('game_volume');
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('game_volume', this.volume.toString());
    this.updateAudioVolume();
  }

  public getVolume(): number {
    return this.isMuted ? 0 : this.volume;
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.updateAudioVolume();
  }

  public playBgm(bgmName: string): void {
    if (this.currentBgm !== bgmName) {
      this.currentBgm = bgmName;
      // Implementation for playing background music
      console.log(`Playing BGM: ${bgmName} at volume ${this.getVolume()}`);
    }
  }

  private updateAudioVolume(): void {
    // Implementation for updating actual audio volume
    console.log(`Audio volume updated to: ${this.getVolume()}`);
  }
}
```

## Utility Methods

### Check if Instance Exists

```typescript
if (ConfigService.hasInstance()) {
  console.log('ConfigService instance already exists');
} else {
  console.log('No ConfigService instance yet');
}
```

### Destroy Instance (for testing)

```typescript
// Destroy a specific singleton instance
ConfigService.destroyInstance();

// Verify it's destroyed
console.log(ConfigService.hasInstance()); // false

// Next call will create a new instance
const newConfig = ConfigService.getInstance();
```

### Clear All Instances (for testing)

```typescript
// Clear all singleton instances
Singleton.clearAllInstances();

// All singletons need to be recreated
const config = ConfigService.getInstance(); // New instance
const gameState = GameStateManager.getInstance(); // New instance
```

### Debug: View All Instances

```typescript
// Get all existing singleton instances
const allInstances = Singleton.getAllInstances();
console.log('Active singletons:', allInstances.size);

allInstances.forEach((instance, constructor) => {
  console.log(`- ${constructor.name}:`, instance);
});
```

## Best Practices

### 1. Use Initialization Hook

Override the `initialize()` method for setup logic instead of constructor:

```typescript
class DatabaseManager extends Singleton {
  private connection: any = null;

  protected initialize(): void {
    // This runs once when the singleton is first created
    this.connection = this.createDatabaseConnection();
  }

  private createDatabaseConnection() {
    // Database connection logic
    return { connected: true, host: 'localhost' };
  }
}
```

### 2. Handle Async Initialization

For async setup, use a lazy loading pattern:

```typescript
class ApiService extends Singleton {
  private apiKey: string | null = null;
  private initPromise: Promise<void> | null = null;

  public async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.asyncInitialize();
    }
    return this.initPromise;
  }

  private async asyncInitialize(): Promise<void> {
    // Simulate async API key loading
    this.apiKey = await this.loadApiKey();
  }

  public async makeApiCall(endpoint: string): Promise<any> {
    await this.ensureInitialized();
    // Make API call with this.apiKey
    return { endpoint, apiKey: this.apiKey };
  }

  private async loadApiKey(): Promise<string> {
    // Simulate async loading
    return new Promise(resolve => {
      setTimeout(() => resolve('api-key-12345'), 100);
    });
  }
}
```

### 3. Testing Patterns

```typescript
// In your test files
beforeEach(() => {
  // Clear all singletons before each test
  Singleton.clearAllInstances();
});

afterEach(() => {
  // Optional: Clear singletons after each test
  Singleton.clearAllInstances();
});

// Test singleton behavior
test('ConfigService should maintain single instance', () => {
  const config1 = ConfigService.getInstance();
  const config2 = ConfigService.getInstance();

  expect(config1).toBe(config2);
  expect(ConfigService.hasInstance()).toBe(true);
});
```

## Integration with Your Existing Code

The current `GameManager.ts` uses a different singleton pattern. You can update it to use this new base class:

```typescript
// Before
Singleton.getInstance<ProgressManager>().onMilestoneCompleted(...)

// After (if ProgressManager extends the new Singleton class)
ProgressManager.getInstance().onMilestoneCompleted(...)
```

## Key Benefits

1. **Type Safety**: Full TypeScript intellisense and type checking
2. **Proper Inheritance**: Each subclass has its own singleton instance
3. **Memory Management**: Centralized instance storage with cleanup methods
4. **Testing Support**: Easy to reset and test singleton behavior
5. **Flexibility**: Optional initialization hooks and async support
6. **Performance**: Minimal overhead with efficient Map-based storage

This implementation provides a robust, type-safe singleton pattern that's perfect for game systems like configuration managers, audio controllers, state managers, and service classes.
