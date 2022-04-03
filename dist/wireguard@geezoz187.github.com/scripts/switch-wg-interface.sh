#!/bin/bash

for i in "${@:2}"
do
    echo "wg-quick down $i" >> extension.log
    wg-quick down $i
done

if ! [ "$" = "$1" ]; then
    echo "es ist nen dollar zeichen" >> extension.log
    wg-quick up $1
fi
