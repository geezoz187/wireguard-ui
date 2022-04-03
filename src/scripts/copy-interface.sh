#!/bin/bash

SELECTED_FILE=$1
OVERWRITE=$2
FILENAME=$(basename $SELECTED_FILE)

echo "FILENAME=$FILENAME; SELECTED=$SELECTED_FILE; OVERWRITE=$OVERWRITE;"

# Meaning overwrite is empty so this attempts to check if the file exists and doesn't overwrite
if [ -z "$OVERWRITE" ]; then
    if ! [ -f "/etc/wireguard/$FILENAME" ]; then
        # The file doesn't exist and we can savely copy without risk of overwriting
        echo "/etc/wireguard/$FILENAME doesn't yet exist" >> /tmp/import.log
        cp "$SELECTED_FILE" "/etc/wireguard/$FILENAME"
        chmod og-rwx "/etc/wireguard/*"
        chown root:root "/etc/wireguard/*"
        exit 0
    else
        # Exit code 1 signals the other script to prompt for confirmation and then recall this script with the OVERWRITE parameter set
        # we have to do it this way since we can't call zenity as root, but we need root to read the wireguard directory and check
        # if we need to overwrite the file
        exit 1
    fi
else
    echo "$SELECTED_FILE will be overwritten" >> /tmp/import.log
    rm -f "/etc/wireguard/$FILENAME"
    cp "$SELECTED_FILE" "/etc/wireguard/$FILENAME"
    chmod og-rwx "/etc/wireguard/*"
    chown root:root "/etc/wireguard/*"
    exit 0
fi