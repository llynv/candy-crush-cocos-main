import { Component } from 'cc';

export abstract class Singleton extends Component {
  private static instances: Map<Function, any> = new Map();

  /**
   * Gets the singleton instance of the specific subclass.
   * Creates a new instance if one doesn't exist for this subclass.
   */
  public static getInstance<T extends Singleton>(this: new () => T): T {
    if (!Singleton.instances.has(this)) {
      const instance = new this();
      Singleton.instances.set(this, instance);

      if (typeof (instance as any).initialize === 'function') {
        (instance as any).initialize();
      }
    }
    return Singleton.instances.get(this) as T;
  }

  /**
   * Checks if an instance exists for the specific subclass.
   */
  public static hasInstance(this: Function): boolean {
    return Singleton.instances.has(this);
  }

  /**
   * Destroys the singleton instance for the specific subclass.
   * Useful for testing or when you need to reset the singleton.
   */
  public static destroyInstance(this: Function): void {
    Singleton.instances.delete(this);
  }

  /**
   * Gets all existing singleton instances (for debugging).
   */
  public static getAllInstances(): Map<Function, any> {
    return new Map(Singleton.instances);
  }

  /**
   * Clears all singleton instances (useful for testing).
   */
  public static clearAllInstances(): void {
    Singleton.instances.clear();
  }

  /**
   * Optional initialization method that subclasses can override.
   * This is called once when the singleton instance is first created.
   */
  protected initialize(): void {}

  /**
   * Utility method to get the current instance without creating one.
   * Returns null if no instance exists.
   */
  protected static getCurrentInstance<T extends Singleton>(this: new () => T): T | null {
    return Singleton.instances.get(this) || null;
  }
}
