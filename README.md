# N_TitleMap
Use a map (with events) as title screen instead of a static image. 

![Screenshot TitleMap][on]

| Project      | Latest release      |
| ------------ | ------------------- |
| N_TitleMap   | [Download][release] |

[All RPG Maker plugins by Nolonar][hub]

## Compatibility
Tested and confirmed working:
- RPG Maker MV
- RPG Maker MZ

## Terms of Use
According to [LICENSE](LICENSE).

## How to use

Enter the ID of the map you would like to display.

![Screenshot plugin manager][setup]

You can see the Map ID in the status bar at the bottom of the RPG Maker UI.

![Screenshot editor][setup2]

## Known issues

- `Play Movie...` command renders video above everything. Player can still interact with title command window, but can't see it.
- Commands belonging to the *Scene Control* group (e.g. `Battle Processing...`) may cause an infinite loop. That's because all Switches (including Self Switches) and Variables are reset when returning to the Title Screen.

  [on]: TitleMap_on.png
  [setup]: TitleMap_setup.png
  [setup2]: TitleMap_setup_2.png

  [hub]: https://github.com/Nolonar/RM_Plugins
  [release]: https://github.com/Nolonar/RM_Plugins-TitleMap/releases/latest/download/N_TitleMap.js
