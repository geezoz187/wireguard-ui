# Wireguard Gnome Extension

The prupose of this extension is to mimic the Windows Wireguard client as much as possible and to provide a similar experience on the Gnome Desktop without having to constantly use the command line.
## Features

- [x] Switching betwean interfaces through the tray icon
- [x] UI for importing config files
- [x] Quick editor access for editing config files

## ToDo

### Misc

- [ ] Dependency check within install.sh
- [ ] Dependency check within extension.js
- [ ] Replacing text MenuItems with pictures
- [ ] Adding a add new config menu button with template config
- [ ] Adding a duplicate config menu button
- [ ] Changing Tray Icon based on connection status (green checkmark / red cross)
- [ ] Adding a log window to check the wireguard logs (similar to the windows client)
- [ ] Restart wireguard interface option
- [ ] Adding a about page with link to this repo

### Preferences

- [ ] Make Show IP in TrayIcon optional
- [ ] Make Show Ping in TrayIcon optional
- [ ] Change default wg interface on startup
- [ ] Change were to save the interface list (doesn't contain any valuable data just the interface names)