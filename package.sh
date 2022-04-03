#!/bin/bash

source ./build.settings.env

rm -rf dist
mkdir dist
mkdir dist/$EXTENSION_NAME

cp -r src/* dist/$EXTENSION_NAME/
cp -r assets/* dist/$EXTENSION_NAME/

zip -r dist/$EXTENSION_NAME.zip dist/$EXTENSION_NAME