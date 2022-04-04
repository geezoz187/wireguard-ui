'use strict';

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const ByteArray = imports.byteArray;
const St = imports.gi.St;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Config = imports.misc.config;
const SHELL_MINOR = parseInt(Config.PACKAGE_VERSION.split('.')[1]);

const Util = imports.misc.util;

const AppIcon = Gio.icon_new_for_string( Me.dir.get_path() + '/wireguard.svg' );
const Application = new Gio.Application ({application_id: "wireguard.ui"});
Application.register (null);

const LICENSE = "GPLv2";
const VERSION = "v0.1";
const OWNER_NAME = "geezoz187";
const REPO_LINK = "https://github.com/geezoz187/wireguard-ui";


function showAbout() {
    log("showAbout(); called.");
    Gio.Subprocess.new(["/bin/bash", "-c", `zenity --info --no-wrap --text="<span size=\\"large\\">Wireguard Gnome UI</span>\\n\\nVersion: <b>${VERSION}</b>\\nLicense: <b>${LICENSE}</b>\\nRepository: <b>${REPO_LINK}</b>\\nCreated by: <b>${OWNER_NAME}</b>\\n\\n$(wg --version | cut -f1-2 -d'-')"`], Gio.SubprocessFlags.NONE);
}

function notify(txt) {
    Gio.Subprocess.new(["/bin/bash", "-c", `notify-send --icon="${Me.dir.get_path()}/wireguard.png" "Wireguard VPN" "${txt}"`], Gio.SubprocessFlags.NONE);
}

function notifyError(txt) {
    Gio.Subprocess.new(["/bin/bash", "-c", `notify-send --icon="error" "Wireguard VPN" "${txt}"`], Gio.SubprocessFlags.NONE);
}

function importConfigDialog() {
    logToFile("importConfigDialog has been called....");
    //`bash -c  &`
    Gio.Subprocess.new(["/bin/bash", "-c", `${Me.dir.get_path()}/scripts/import-interface.sh ${Me.dir.get_path()}/scripts/copy-interface.sh`], Gio.SubprocessFlags.NONE);
    logToFile("This script should hopefully have opened something...");
}

function checkDependencies() {
    execShell(`bash ${Me.dir.get_path()}/scripts/check-dependencies.sh`);
}

// From https://gjs.guide/guides/gio/subprocesses.html#synchronous-execution
function execShell(cmd) {
    try {
        let [, stdout, stderr, status] = GLib.spawn_command_line_sync(`${cmd}`);
    
        if (status !== 0) {
            if (stderr instanceof Uint8Array)
                stderr = ByteArray.toString(stderr);
    
            logToFile(stderr);
            return "";
        }
    
        if (stdout instanceof Uint8Array)
            stdout = ByteArray.toString(stdout);
    
        return stdout;
    } catch (e) {
        notifyError(e);
        logError(e);
    }
}

function execInterfaceScript(cmd) {
    try {
        let proc = Gio.Subprocess.new(cmd, Gio.SubprocessFlags.NONE);
    
        // NOTE: triggering the cancellable passed to these functions will only
        //       cancel the function NOT the process.
        let cancellable = new Gio.Cancellable();
    
        proc.wait_async(cancellable, (proc, result) => {
            try {
                // Strictly speaking, the only error that can be thrown by this
                // function is Gio.IOErrorEnum.CANCELLED.
                proc.wait_finish(result);
    
                // The process has completed and you can check the exit status or
                // ignore it if you just need notification the process completed.
                if (proc.get_successful()) {
                    logToFile('the process succeeded');
                } else {
                    logToFile('the process failed');
                }
            } catch (e) {
                logError(e);
            } 
        });
    } catch (e) {
        logError(e);
    }
}

function logToFile(txt) {
    execShell(`bash -c "echo '${txt}' >> ${Me.dir.get_path()}/extension.log"`);
}

function updateInterfaces() {
    execInterfaceScript(["/bin/bash", "-c", `${Me.dir.get_path()}/scripts/update-interface-list.sh ~/.wg-interfaces`]);
    return execShell(`bash -c "cat ~/.wg-interfaces | sed -e 's/.conf$//'"`); 
}

/**
 * The interfaceList keeps track of the enabled wireguard interfaces
 */
const interfaceList = {};

/**
 * Tells wireguard to use the given interface as it's new main interface
 * @param {string} wgInterface the interface which wireguard is now supposed to use 
 */
function switchWireguardInterfaceTo(wgInterface) {
    let command_chain = "";
    
    if(wgInterface !== null && wgInterface !== "<none>") {
        command_chain += `${wgInterface} `;
    } else {
        command_chain += `$ ` // The dollar will be seen as ignore the first argument
    }
    
    for(let inter of Object.keys(interfaceList)) {
        if(interfaceList[inter] && inter !== wgInterface && interfaceList[inter] !== "<none>") {
            command_chain += `${inter} `
        } else {
            //wgInterface == null essentially means that the application wants to 
            //entirely disable wireguard if we wouldn't check here we would disable all interfaces except the active one....
            if(wgInterface === null)
            {
                //TODO: I think this one is unecessary
                if(wgInterface !== "<none>"){
                    command_chain += `${inter} `;
                }
            }
        }
    }

    execInterfaceScript(["/bin/bash", "-c", `pkexec ${Me.dir.get_path()}/scripts/switch-wg-interface.sh ${command_chain}`]);
    if(wgInterface)
        notify(`Wireguard interface switched to '${wgInterface}'`);
}

function openEditorForInterface(wgInterface) {
    execInterfaceScript(["/bin/bash", "-c", `gedit admin:///etc/wireguard/${wgInterface}.conf`]);
}

// Based on https://github.com/tuberry/extension-list ExtensionList._menuItemMaker
function makeInterfaceMenuItem(interfaceName) {
    let item = new PopupMenu.PopupBaseMenuItem();

    // Sets the dot to indicate that it is enabled
    item.setOrnament(interfaceList[interfaceName] ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);

    // This is out main "onclick" event for the individual interface
    item.connect('activate', () => { 
        notify(`Switching interface to '${interfaceName}'`);
        switchWireguardInterfaceTo(interfaceName);
    });
    item.add_child(new St.Label({
        x_expand: true,
        text: `${interfaceName}`,
        style_class: "extension-wg-interface-text"
    }));
    let hbox = new St.BoxLayout({ x_align: St.Align.START });

    // You could probably make this shorter. But why?
    let addButtonItem = (icon, func) => {
        let btn = new St.Button({
            style_class: 'extension-list-prefs-button extension-list-button',
            child: new St.Icon({ icon_name: icon, style_class: 'popup-menu-icon', }),
        });
        btn.connect('clicked', () => { item._getTopMenu().close(); func(); });
        hbox.add_child(btn);
    }

    addButtonItem('emblem-system-symbolic', () => { 
        openEditorForInterface(interfaceName); 
    });

    addButtonItem('edit-delete-symbolic', () => {
        //TODO#1: Delete interface 
    });
    item.add_child(hbox);
    return item;
}

function makeNullInterfaceMenuItem() {
    let item = new PopupMenu.PopupBaseMenuItem();

    //Search through all interfaces if none are enabled this one is
    let found = false;
    for(let key of Object.keys(interfaceList)) {
        if(interfaceList[key]) { found = true; break; }
    }

    // Sets the dot to indicate that it is enabled
    item.setOrnament(!found ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);

    // This is out main "onclick" event for the individual interface
    item.connect('activate', () => { 
        notify(`Disabling wireguard...`);
        switchWireguardInterfaceTo(null);
    });

    let hbox = new St.BoxLayout({ x_align: St.Align.MIDDLE });
    hbox.add_child(new St.Label({
        //x_expand: true,
        x_align: St.Align.MIDDLE,
        text: `<none>`,
        style_class: "extension-wg-interface-text-none"
    }));
    item.add_child(hbox);
    return item;
}



/**
 * Checks if a given interface name is currently active
 * @returns true if the given interface is active otherwise false
 */
function checkIfInterfaceIsActive(interfaceName) {
    const res = execShell(`bash -c "ip addr | grep \\" ${interfaceName}:\\""`)
    if(!res || res === "") return;
    
    // I'm not sure if this is necesarry since wg-quick down removes 
    // the entire interface but it's there just in case
    if(res.indexOf("UP") === -1) {
        return false;
    }
    return true;
}

var MainIndicator = class MainIndicator extends PanelMenu.Button {
    _buildMenuStatusbar() {
        let item = new PopupMenu.PopupBaseMenuItem({ style_class: 'extension-list-item', hover: false });
        let hbox = new St.BoxLayout({ x_align: St.Align.START, x_expand: true });
        let addButtonItem = (icon, func, extra_style) => {
            let btn = new St.Button({
                hover: true,
                x_expand: true,
                style_class: 'extension-list-setting-button extension-list-button',
                child: new St.Icon({ icon_name: icon, style_class: !extra_style ? 'popup-menu-icon' : 'popup-menu-icon ' + extra_style}),
            });
            btn.connect('clicked', func);
            hbox.add_child(btn);
        }

        // - Import Config
        addButtonItem('list-add-symbolic', () => { 
            this.importConfig();
        });
        
        // - Refresh Wireguard Service list
        addButtonItem('view-refresh-symbolic',  () => { 
            this.refreshInterfaceList();
        });

        
        item.add_child(hbox);
        return item;
    }

    // Based on https://github.com/tuberry/extension-list
    _buildMenuToolbar() {
        let item = new PopupMenu.PopupBaseMenuItem({ style_class: 'extension-list-item', hover: false });
        let hbox = new St.BoxLayout({ x_align: St.Align.START, x_expand: true });
        let addButtonItem = (icon, func) => {
            let btn = new St.Button({
                hover: true,
                x_expand: true,
                style_class: 'extension-list-setting-button extension-list-button',
                child: new St.Icon({ icon_name: icon, style_class: 'popup-menu-icon'}),
            });
            btn.connect('clicked', func);
            hbox.add_child(btn);
        }

        // - Settings
        addButtonItem('applications-engineering-symbolic', () => {

        });

        // - About Page
        addButtonItem('dialog-question-symbolic', () => { 
            showAbout();
            logToFile("showing about?");
        });

        
        item.add_child(hbox);
        return item;
    }

    _buildMenu() {
        let interfaces = updateInterfaces();
        let interfaceArray = interfaces.split("\n");
        interfaceArray.push(null);


        this.menu.addMenuItem(this._buildMenuStatusbar());

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Adding out wireguard interfaces as menu items
        for(let inter of interfaceArray) {
            if(inter === null) {
                interfaceList[inter] = false;
                this.menu.addMenuItem(makeNullInterfaceMenuItem());
            } else { 
                if(inter && inter !== "") {
                    interfaceList[inter] = checkIfInterfaceIsActive(inter);
                    this.menu.addMenuItem(makeInterfaceMenuItem(inter));
                }
            }
        }

        

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        //Our control buttons. (TODO: we could replace those with icons)
        //this.menu.addAction('Import interface', this.importConfig, null);
        //this.menu.addAction('Disable wireguard', this.shutdownAllInterfaces, null);
        //this.menu.addAction('Force refresh interfaces', this.refreshInterfaceList, null);

        this.menu.addMenuItem(this._buildMenuToolbar());
    }

    _init() {
        super._init(0.0, `${Me.metadata.name} Indicator`, false);

        let icon = new St.Icon({
            gicon: AppIcon,
            style_class: 'system-status-icon'
        });
        this.actor.add_child(icon);

        this._buildMenu();
        
        this.connect('button-press-event', this.toggleState.bind(this));
        this.connect('touch-event', this.toggleState.bind(this));
    }

    toggleState() {
        this.menu.removeAll();
        this._buildMenu();
    }

    createNewInterface() {
        this.menu.removeAll();
        this._buildMenu();
    }

    importConfig() {
        importConfigDialog();
        this.menu.removeAll();
        this._buildMenu();
    }

    refreshInterfaceList() {
        execShell(`bash -c "rm -f ~/.wg-interfaces"`);
        notify("Interface list has been refreshed");

        this.menu.removeAll();
        this._buildMenu();
    }

    // Disables wireguard interfaces entirely
    shutdownAllInterfaces() {
        switchWireguardInterfaceTo(null);

        for(let inter of Object.keys(interfaceList)) {
            interfaceList[inter] = false;
        }

        notify(`Disabling VPN`);

        this.menu.removeAll();
        this._buildMenu();
    }

    restartWireguard() {
        let activeInterface = null;
        
        for(let inter of Object.keys(interfaceList)) {
            if(interfaceList[inter]) {
                activeInterface = inter;
                break;
            }
        }

        switchWireguardInterfaceTo(null);
        notify("Wireguard interfaces were shutdown.");
        switchWireguardInterfaceTo(activeInterface);
    }
}

// Compatibility with gnome-shell >= 3.32
if (SHELL_MINOR > 30) {
    MainIndicator = GObject.registerClass(
        {GTypeName: 'MainIndicator'},
        MainIndicator
    );
}

// We're going to declare `indicator` in the scope of the whole script so it can
// be accessed in both `enable()` and `disable()`
var indicator = null;

function init() {
    //TODO: check wireguard availability
    log(`initializing ${Me.metadata.name} version ${Me.metadata.version}`);
}


function enable() {
    log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

    indicator = new MainIndicator();

    // The `main` import is an example of file that is mostly live instances of
    // objects, rather than reusable code. `Main.panel` is the actual panel you
    // see at the top of the screen.
    Main.panel.addToStatusArea(`${Me.metadata.name} Indicator`, indicator);
}


function disable() {
    log(`disabling ${Me.metadata.name} version ${Me.metadata.version}`);

    // REMINDER: It's required for extensions to clean up after themselves when
    // they are disabled. This is required for approval during review!
    if (indicator !== null) {
        indicator.destroy();
        indicator = null;
    }
}