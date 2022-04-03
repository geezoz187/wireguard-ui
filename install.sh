#!/bin/bash

source ./build.settings.env

bash ./package.sh

EXT_DIR="$HOME/.local/share/gnome-shell/extensions"

if [[ -d "$EXT_DIR/$EXTENSION_NAME" ]]; then
    echo "Directory $EXT_DIR/$EXTENSION_NAME exists. Deleting previous version..."
    rm -rf "$EXT_DIR/$EXTENSION_NAME"
fi

cp -r "./dist/$EXTENSION_NAME" "$EXT_DIR/$EXTENSION_NAME"

bash "./$EXTENSION_NAME/scripts/check-dependencies.sh"

if [ "$?" = 0 ]; then
    echo "Successfully installed extension directory"
    killall -SIGQUIT gnome-shell
fi