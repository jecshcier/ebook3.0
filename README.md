# ebook3.0
ebook3.0 by electron
## sqlite3 support

[refer to](https://electron.atom.io/docs/tutorial/using-native-node-modules/)

Installing modules and rebuilding for Electron
You can also choose to install modules like other Node projects, and then rebuild the modules for Electron with the electron-rebuild package. This module can get the version of Electron and handle the manual steps of downloading headers and building native modules for your app.

### An example of installing electron-rebuild and then rebuild modules with it:

    npm install --save-dev electron-rebuild

### Every time you run "npm install", run this:

    ./node_modules/.bin/electron-rebuild

### On Windows if you have trouble, try:

    .\node_modules\.bin\electron-rebuild.cmd
