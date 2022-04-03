#!/bin/bash

EXT_NAME="wireguard@geezoz.github.com"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions"

if [[ -d "$EXT_DIR/$EXT_NAME" ]]; then
    echo "Directory $EXT_DIR/$EXT_NAME exists. Deleting previous version..."
    rm -rf "$EXT_DIR/$EXT_NAME"
fi

cp -r "./$EXT_NAME" "$EXT_DIR/$EXT_NAME"

bash "./$EXT_NAME/check-dependencies.sh"

if [ "$?" = 0 ]; then
    echo "Successfully installed extension directory"
    killall -SIGQUIT gnome-shell
    #echo "To enable the extension restart the gnome shell by pressing Alt+F2 and typing 'restart'."
fi