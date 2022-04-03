# Wireguard Gnome Extension

The Linux wireguard client sadly is limited to a very simple command line interface. This project aims to improve that and provide a comprable Wireguard client experience to the Windows client.

Any feature requests are greatly appreciated! 

## Installation

The extension isn't yet published in the gnome extension store. For now you'll have to install it manually:

```
git clone https://github.com/geezoz187/wireguard-ui.git
cd wireguard-ui
./install.sh
```

**Note:** You have to have ```zenity```, ```notify-send```, ```gedit```, and obviously ```wireguard``` installed.

**Ubuntu:** ```sudo apt install zenity notify-send wireguard```

*I haven't tested it on other distro's, if anyone does please let me know!*

## Already Working Features

- [x] Switching betwean interfaces through the gnome tray icon
- [x] Importing config Files
- [x] Quick editor access for editing config files

## ToDo

### Misc

- [ ] Dependency check (with installation of dependencies, i.e. wireguard)
- [ ] Replacing text MenuItems with pictures
- [ ] Adding a add new config menu button with template config
- [ ] Changing Tray Icon based on connection status (green checkmark / red cross)
- [ ] Restart Wireguard Service Button
- [ ] Adding an about page (with version, repo link, etc.)
- [ ] Maybe even a UI Config editor instead of just gedit

### Preferences

- [ ] Make Show IP in TrayIcon optional
- [ ] Make Show Ping in TrayIcon optional
- [ ] Changing the default Wireguard interface on startup
- [ ] Change where to save the interface list (doesn't contain any sensitive data just the interface names)
- [ ] Adding a log window to check the wireguard logs (similar to the windows client)