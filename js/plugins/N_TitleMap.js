/* 
 * MIT License
 * 
 * Copyright (c) 2020 Nolonar
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

//=============================================================================
// Metadata
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Use a map as title screen.
 * @author Nolonar
 * @url https://github.com/Nolonar/RM_Plugins
 * 
 * @param mapId
 * @text Map ID
 * @desc The id of the map to render as title screen.
 * @type number
 * @min 1
 * @default 1
 * 
 * @param xCoord
 * @text X-coordinate
 * @desc The x-coordinate of the (invisible) player character.
 * @type number
 * @min 0
 * @default 0
 * 
 * @param yCoord
 * @text Y-coordinate
 * @desc The y-coordinate of the (invisible) player character.
 * @type number
 * @min 0
 * @default 0
 * 
 * @param useLatestSavefileMapId
 * @text Use Map from latest save file
 * @desc Whether to use the map of the latest save file as title screen, if one exists.
 * @type boolean
 * @default false
 * 
 * @param titleSwitch
 * @text Title Screen Switch
 * @desc Specify a switch that will be ON when the Title Screen is active, and OFF otherwise.
 * @type switch
 * @default 0
 * 
 * 
 * @help Version 1.1.0
 * 
 * This plugin does not provide plugin commands.
 * 
 * Notes:
 * If you wish to use a map the player can visit during the game, know that
 * this plugin does not load any save games, so all Switches will be off and
 * all Variables will be 0. You can change Switches and Variables, but they
 * will be reset when you return to the Title Screen.
 * 
 * The player character will be transparent and through by default. Use event
 * commands to undo this when needed.
 * 
 * Works with most event command, with a few limitations:
 * 
 *      - Message type commands require user input, which conflicts with the
 *        Title Command window (players can't start a New Game, for instance).
 *        This can be worked around for "Show Text..." by ending your text
 *        message with the \^ control character.
 * 
 *      - Avoid the "Play Movie..." command. Movies will hide the Title Command
 *        window, but players can still interact with it.
 * 
 *      - Scene Control type commands like "Battle Processing..." work, but why
 *        would you even use them on the Title Screen? Remember that all
 *        Switches (including Self Switches) and Variables will be reset when
 *        you return to the Title Screen. You could get into an infinite loop.
 * 
 *      - System Settings type commands work, but most are useless. You can't
 *        have Encounters, so changing them is pointless.
 * 
 *      - "Change Map Name Display..." does nothing.
 * 
 *      - Battle type commands only work in battle, so they won't do anything.
 * 
 * Plugin compatibility:
 * This plugin replaces Scene_Title, so compatibility with plugins that modify
 * Scene_Title is not guaranteed. For best compatibility, this plugin should
 * be placed high in the plugin list.
 * 
 * ============================================================================
 * Notetags
 * ============================================================================
 * 
 * Map Notetag:
 * <titlescreen: mapId, x, y>
 *      If the latest save file was made on a map with this notetag, the title
 *      screen map will be chosen according to the notetag instead.
 *          - mapId: The map ID to use as title screen map.
 *          - x:     The x-coordinate of the (invisible) player character.
 *          - y:     The y-coordinate of the (invisible) player character.
 * 
 *      Example:
 *          <titlescreen: 3, 10, 12>
 *                   The map with ID 3 will be chosen as the title screen map
 *                   instead of the current one. The player character will be
 *                   placed at the coordinates (10, 12).
 */

(() => {
    const PLUGIN_NAME = "N_TitleMap";

    const parameters = PluginManager.parameters(PLUGIN_NAME);
    parameters.mapId = Number(parameters.mapId) || 1;
    parameters.xCoord = Number(parameters.xCoord) || 0;
    parameters.yCoord = Number(parameters.yCoord) || 0;
    parameters.useLatestSavefileMapId = parameters.useLatestSavefileMapId === "true";
    parameters.titleSwitch = Number(parameters.titleSwitch) || 0;

    function isMV() {
        return Utils.RPGMAKER_NAME === "MV";
    }

    //=========================================================================
    // Scene_TitleMap
    //=========================================================================
    const Scene_Title_old = Scene_Title;
    Scene_Title = class Scene_TitleMap extends Scene_Map {
        initialize() {
            super.initialize();
            this._isMapChanging = false;
            this._isMapLoaded = false;
        }

        async create() {
            Scene_Title_old.prototype.create.call(this);

            // Scene_Map will create its own window layer later on.
            this.oldWindows = [...this._windowLayer.children];
            this.removeChild(this._windowLayer);

            // Sets the title screen's map.
            if (this.needsFadeIn()) {
                // Prevents previous map flickering on Scene_TitleMap.
                // Must be called before getMapData() for some reason...
                $dataMap = null;

                const mapData = await this.getMapData();
                $gamePlayer.reserveTransfer(mapData.id, mapData.x, mapData.y, 2, 0);

                // Keep player character hidden.
                $gamePlayer._transparent = $gamePlayer._through = true;
            }

            // Performs the initial transfer.
            super.create();
        }

        async getMapData() {
            let mapId = parameters.mapId;
            let x = parameters.xCoord, y = parameters.yCoord;

            // Retrieve info from latest save file.
            if (parameters.useLatestSavefileMapId && DataManager.isAnySavefileExists()) {
                await DataManager.loadGame(DataManager.latestSavefileId());
                mapId = $gameMap.mapId();
                x = $gamePlayer._x;
                y = $gamePlayer._y;

                const map = await this.loadMap(mapId);
                if (map.meta && "titlescreen" in map.meta) {
                    const parts = map.meta.title.replace(/\s/g, "").split(",");
                    mapId = Number(parts[0]);
                    x = Number(parts[1]);
                    y = Number(parts[2]);
                }

                if (parameters.titleSwitch)
                    $gameSwitches.setValue(parameters.titleSwitch, true);
            }

            return {
                id: mapId,
                x: x,
                y: y
            };
        }

        async loadMap(mapId) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const src = `Map${mapId.padZero(3)}.json`;
                const url = `data/${src}`;
                const errorHandler = () => {
                    if (!isMV())
                        DataManager.onXhrError("$dataMap", src, url);

                    reject();
                };
                xhr.open("GET", url);
                xhr.overrideMimeType("application/json");
                xhr.onload = () => {
                    if (xhr.status < 400) {
                        const result = JSON.parse(xhr.responseText);
                        DataManager.onLoad(result);
                        resolve(result);
                    } else {
                        errorHandler();
                    }
                };
                xhr.onerror = errorHandler;
                xhr.send();
            });
        }

        createAllWindows() {
            super.createAllWindows();
            this.oldWindows.forEach(c => this.addWindow(c));
        }

        onMapLoaded() {
            super.onMapLoaded();
            this.createForeground.call(this);
        }

        start() {
            super.start();
            this.playTitleMusic();
        }

        onTransfer() {
            this.fadeOutForTransfer();
            // MV Scene_Map doesn't have an onTransfer() function.
            if (super.onTransfer)
                super.onTransfer();
        }

        onTransferEnd() {
            // Don't call super.onTransferEnd() to avoid opening the map name window,
            // autosaving, and playing the map's BGM/BGS.
            this.fadeInForTransfer();
        }

        stop() {
            this.stopVideo();
            super.stop();
        }

        needsFadeIn() {
            return [
                Scene_Options,
                Scene_Load
            ].every(scene => !SceneManager.isPreviousScene(scene));
        }

        needsSlowFadeOut() {
            return false;
        }

        isMenuEnabled() {
            return false;
        }

        isMapTouchOk() {
            return false;
        }

        // MV compatibility layer.
        isFading() {
            return isMV() ? this.isBusy() : super.isFading();
        }

        shouldAutosave() {
            return false;
        }

        update() {
            if (!this.isBusy())
                this._commandWindow.open();

            if (this._isMapChanging && this._isMapLoaded && !this.isFading()) {
                // Move player character to designated coordinates.
                $gamePlayer.performTransfer();
                // Force spriteset to recreate the map.
                this._spriteset.createLowerLayer();
                this._spriteset.createUpperLayer();

                this.onTransferEnd();
                this._isMapChanging = false;
            }

            super.update();
        }

        updateMain() {
            $gameMap.update(this.isActive());
            $gameTimer.update(this.isActive());
            $gameScreen.update();
        }

        updateScene() {
            if (SceneManager.isSceneChanging())
                return;

            this.updateTransferPlayer();
            this.updateCallDebug();
        }

        updateTransferPlayer() {
            if (!$gamePlayer.isTransferring() || this._isMapChanging)
                return;

            // Avoid SceneManager.goto() to ensure the command
            // window remains responsive during the transfer.
            this._isMapChanging = true;
            this._isMapLoaded = false;
            this.loadMap($gamePlayer.newMapId()).then(data => {
                $dataMap = data;
                this._isMapLoaded = true;
            });
            this.onTransfer();
        }

        terminate() {
            super.terminate();

            if (SceneManager.isNextScene(Scene_Map) || SceneManager._nextScene instanceof Scene_Map) {
                // Ensure $gameMap and $gameScreen are in the default state.
                $gameMap = new Game_Map();
                $gameScreen = new Game_Screen();

                // Stops Scene_Map from triggering an autosave.
                $dataMap = null;
            }
        }

        stopVideo() {
            if (isMV()) {
                if (!Graphics.isVideoPlaying())
                    return;

                Graphics._video.pause();
                Graphics._onVideoEnd();
            } else {
                if (!Video.isPlaying())
                    return;

                Video._element.pause();
                Video._onEnd();
            }
        }

        commandNewGame() {
            // Prevent scroll position, screen tone and weather from
            // changing before title screen has finished fading out.
            const previousMap = $gameMap;
            const previousScreen = $gameScreen;
            DataManager.setupNewGame();
            $gameMap = previousMap;
            $gameScreen = previousScreen;

            this._commandWindow.close();
            this.fadeOutAll();
            SceneManager.goto(Scene_Map);
        }
    }

    // JavaScript does not support multiple inheritance, so we
    // need to copy the properties of Scene_Title separately.
    for (const p of Object.keys(Scene_Title_old.prototype).filter(p => !(p in Scene_Title.prototype))) {
        Scene_Title.prototype[p] = Scene_Title_old.prototype[p];
    }

    //=========================================================================
    // Scene_Load
    //=========================================================================
    const Scene_Load_onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
    Scene_Load.prototype.onLoadSuccess = function () {
        Scene_Load_onLoadSuccess.call(this);

        // Stops Scene_Map from triggering an autosave.
        $dataMap = null;
    };
})();