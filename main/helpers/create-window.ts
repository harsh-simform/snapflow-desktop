import {
  screen,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  Rectangle,
} from "electron";
import Store from "electron-store";
import { join } from "path";

export interface WindowInstance extends BrowserWindow {
  setQuitting?: (value: boolean) => void;
}

export const createWindow = (
  windowName: string,
  options: BrowserWindowConstructorOptions,
  preventClose: boolean = false
): WindowInstance => {
  const key = "window-state";
  const name = `window-state-${windowName}`;
  const store = new Store<Rectangle>({ name });
  const defaultSize = {
    width: options.width,
    height: options.height,
  };
  let state = {};
  let isQuitting = false;

  const restore = () => store.get(key, defaultSize);

  const getCurrentPosition = () => {
    const position = win.getPosition();
    const size = win.getSize();
    return {
      x: position[0],
      y: position[1],
      width: size[0],
      height: size[1],
    };
  };

  const windowWithinBounds = (windowState, bounds) => {
    return (
      windowState.x >= bounds.x &&
      windowState.y >= bounds.y &&
      windowState.x + windowState.width <= bounds.x + bounds.width &&
      windowState.y + windowState.height <= bounds.y + bounds.height
    );
  };

  const resetToDefaults = () => {
    const bounds = screen.getPrimaryDisplay().bounds;
    return Object.assign({}, defaultSize, {
      x: (bounds.width - defaultSize.width) / 2,
      y: (bounds.height - defaultSize.height) / 2,
    });
  };

  const ensureVisibleOnSomeDisplay = (windowState) => {
    const visible = screen.getAllDisplays().some((display) => {
      return windowWithinBounds(windowState, display.bounds);
    });
    if (!visible) {
      // Window is partially or fully not visible now.
      // Reset it to safe defaults.
      return resetToDefaults();
    }
    return windowState;
  };

  const saveState = () => {
    if (!win.isMinimized() && !win.isMaximized()) {
      Object.assign(state, getCurrentPosition());
    }
    store.set(key, state);
  };

  state = ensureVisibleOnSomeDisplay(restore());

  const win = new BrowserWindow({
    ...state,
    ...options,
    icon: join(__dirname, "../resources/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      ...options.webPreferences,
    },
  }) as WindowInstance;

  win.on("close", (event) => {
    // If preventClose is enabled and not quitting, hide window instead of closing
    if (preventClose && !isQuitting) {
      event.preventDefault();
      win.hide();
    } else {
      // Save state when actually closing
      if (!win.isMinimized() && !win.isMaximized()) {
        saveState();
      }
    }
  });

  // Provide method to set quitting flag from outside
  if (preventClose) {
    win.setQuitting = (value: boolean) => {
      isQuitting = value;
    };
  }

  return win;
};
