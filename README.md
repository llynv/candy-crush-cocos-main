# Candy Crush for Cocos Creator 3.8.6 🍬

A simple match-3 game modified from [digitsensitive](https://github.com/digitsensitive)'s [match-3 example](https://github.com/digitsensitive/phaser3-typescript/tree/master/src/games/candy-crush). The project originally ran on the [Phaser3 Game Engine](https://phaser.io/phaser3). Some game and asset management logic has been changed to run within Cocos Creator 3.8.6.

## Getting Started 🚀

Follow these steps to get the project running:

1. Clone the repository.
2. Open Cocos Dashboard (Log in if needed).
3. Make sure you have Cocos Creator 3.8.6 installed (if not, visit the "Installs" tab, click on "Install Editor" and proceed with version 3.8.6).
4. Navigate to the "Projects" tab and click on "Add Project".
5. Select the directory where you cloned the repository and click "Select Project".
6. Open the project by double clicking on the project name.
7. Make sure the preview scene option at the top center of the editor is set to "LoadScene", not "Current Scene" or "GameScene".
8. Click on the play button next to the preview scene option.
9. The game should now be running in your default browser.

## Setting up for development 🛠️

To start developing, run `npm install` in the project directory to install all dev dependencies.

> [!note]
> The project is setup to use Prettier as the default formatter. Don't forget to set it up in your editor of choice.

## Building the project 📦

To build the project, follow these steps:

1. Open the project in Cocos Creator.
2. Click on the "Build" button at the top right corner of the editor.
3. Within the build windows, click on "New Build Task".
4. Make sure the "Platform" option is set to "Web Mobile".
5. Click on the "Import build config" button at the top right corner of the window and open the default build config file [buildConfig_web-mobile.json](buildConfig_web-mobile.json).
6. Click "Build" at the bottom right corner of the window.
7. The build process will start immediately and you will find the build output in the `build/web-mobile/` directory after it completes.
8. You can either open the `index.html` file in your browser or click on "Run" at the bottom right corner of the build task to run the game in your default browser.

## License 📄

See the [LICENSE](LICENSE) file for details on the project itself and see [ASSET_LICENSE](ASSET_LICENSE) for details on the assets used in the project.
