#!/bin/bash

if ! [ -f "$1" ]; then
    # Checks if we have a second parameter and attempts to get 
    # root privileges, then restarts itself
    if [ -z "$2" ]; then
        pkexec $0 $1 rebuild
    else
        # Script is already privileged
        ls -1 /etc/wireguard > "$1"
    fi
fi