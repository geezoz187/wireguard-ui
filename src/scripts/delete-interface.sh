#!/bin/bash

echo "file=$1; root=$2"

if [ -z "$2" ]; then
    pkexec $0 $1 $2
fi

if [ -f "/etc/wireguard/$1" ]; then
    echo "$1"
fi