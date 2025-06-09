/**
 * A generic Singleton class that can be extended by any class
 * to implement the Singleton pattern.
 */
export class Singleton {
  private static instance: any;

  /**
   * Gets the singleton instance of the class.
   * Creates a new instance if one doesn't exist.
   */
  public static getInstance(): any {
    if (!Singleton.instance) {
      Singleton.instance = new this();
    }
    return Singleton.instance;
  }

  /**
   * Protected constructor to prevent direct instantiation.
   * Use the instance getter instead.
   */
  protected constructor() {
    if (Singleton.instance) {
      throw new Error('Error: Instantiation failed. Use .instance instead of new operator.');
    }
    Singleton.instance = this;
  }
}
