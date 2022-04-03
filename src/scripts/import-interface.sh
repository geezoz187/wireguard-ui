#!/bin/bash

SELECTED_FILE=$(zenity --title "Select Wireguard Config File" --file-selection)

if [ "$?" = 0 ]; then
    FILENAME=$(basename $SELECTED_FILE)

    pkexec $1 $SELECTED_FILE 
    if [ "$?" = 0 ]; then
        zenity --title "Wireguard" --info --text="$FILENAME successfully installed."
    else
        # The config file already exists so we need to ask if we can overwrite it
        zenity --title "Wireguard" --question --text="Do you want to overwrite $FILENAME?"
        if [ "$?" = 0 ]; then
            pkexec $1 $SELECTED_FILE "overwrite"
        else
            zenity --title "Wireguard" --info --text="No changes were made." &
        fi
    fi
fi