// Side-effect module: importing it switches the film to the light theme. It must be the FIRST import of src/index.light.ts,
// because ES modules are evaluated in import order and src/config/theme.ts reads the mode the moment it is loaded.
import { setThemeMode } from "./themeMode";

setThemeMode("light");
