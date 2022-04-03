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


function notify(txt) {
    Gio.Subprocess.new(["/bin/bash", "-c", `notify-send --icon="${Me.dir.get_path()}/wireguard.png" "Wireguard VPN" "${txt}"`], Gio.SubprocessFlags.NONE);
}

function notifyError(txt) {
    Gio.Subprocess.new(["/bin/bash", "-c", `notify-send --icon="error" "Wireguard VPN" "${txt}"`], Gio.SubprocessFlags.NONE);
}

function importConfigDialog() {
    logToFile("importConfigDialog has been called....");
    //`bash -c  &`
    Gio.Subprocess.new(["/bin/bash", "-c", `${Me.dir.get_path()}/import-interface.sh ${Me.dir.get_path()}/copy-interface.sh`], Gio.SubprocessFlags.NONE);
    logToFile("This script should hopefully have opened something...");
}

function checkDependencies() {
    execShell(`bash ${Me.dir.get_path()}/check-dependencies.sh`);
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
    execInterfaceScript(["/bin/bash", "-c", `${Me.dir.get_path()}/update-interface-list.sh ${Me.dir.get_path()}/interfaces`]);
    return execShell(`bash -c "cat ${Me.dir.get_path()}/interfaces | sed -e 's/.conf$//'"`); //
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
    
    if(wgInterface !== null) {
        logToFile(`Enabling interface ${wgInterface}`);
        command_chain += `${wgInterface} `;
    } else {
        command_chain += `$ ` // The dollar will be seen as ignore the first argument
    }
    
    for(let inter of Object.keys(interfaceList)) {
        if(interfaceList[inter] && inter !== wgInterface) {
            logToFile(`Disabling interface ${inter}`);
            command_chain += `${inter} `
        } else {
            //wgInterface == null essentially means that the application wants to 
            //entirely disable wireguard if we wouldn't check here we would disable all interfaces except the active one....
            if(wgInterface !== null)
                logToFile(`Ignoring interface ${inter}`);
            else 
                command_chain += `${inter} `;
        }
    }

    execInterfaceScript(["/bin/bash", "-c", `pkexec ${Me.dir.get_path()}/switch-wg-interface.sh ${command_chain}`]);
    notify(`Wireguard interface switched to '${wgInterface}'`);
}

function openEditorForInterface(wgInterface) {
    logToFile(`Interface ${wgInterface} should now be opened in like gedit with pkexec`);
    execInterfaceScript(["/bin/bash", "-c", `gedit admin:///etc/wireguard/${wgInterface}.conf`]);
}

// Based on https://github.com/tuberry/extension-list ExtensionList._menuItemMaker
function makeInterfaceMenuItem(interfaceName) {
    let item = new PopupMenu.PopupBaseMenuItem();

    // Sets the dot to indicate that it is enabled
    item.setOrnament(interfaceList[interfaceName] ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);

    // This is out main "onclick" event for the individual interface
    item.connect('activate', () => { 
        notify(`Switching intergace to '${interfaceName}'`);
        switchWireguardInterfaceTo(interfaceName);
    });
    item.add_child(new St.Label({
        x_expand: true,
        text: `Interface: ${interfaceName}`,
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

    addButtonItem('emblem-system-symbolic', () => { openEditorForInterface(interfaceName); });
    item.add_child(hbox);
    return item;
}

/**
 * Checks if a given interface name is currently active
 * @returns true if the given interface is active otherwise false
 */
function checkIfInterfaceIsActive(interfaceName) {
    //const res = execShell(`${Me.dir.get_path()}/is-interface-active.sh ${interfaceName}`);
    const res = execShell(`bash -c "ip addr | grep \\" ${interfaceName}:\\""`)
    if(!res || res === "") return;
    
    // I'm not sure if this is necesarry since wg-quick down removes 
    // the entire interface but it's there just in case
    if(res.indexOf("UP") === -1) {
        return false;
    }
    return true;
}

function getIPAddr() {
    let ip = JSON.parse(execShell(`bash -c "curl 'https://api64.ipify.org?format=json'"`));
    if(ip && ip.ip) {
        return ip.ip;
    } else {
        return "<not connected>";
    }
}

var MainIndicator = class MainIndicator extends PanelMenu.Button {

    _buildMenu() {
        var interfaces = updateInterfaces();
        var interfaceArray = interfaces.split("\n");

        this.menu.addMenuItem(new PopupMenu.PopupMenuItem(`IP: ${getIPAddr()}`));

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Adding out wireguard interfaces as menu items
        logToFile("Printing array elements now...");
        for(var inter of interfaceArray) {
            if(inter && inter !== "") {
                interfaceList[inter] = checkIfInterfaceIsActive(inter);
                this.menu.addMenuItem(makeInterfaceMenuItem(inter));
            }
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        //Our control buttons. (TODO: we could replace those with icons)
        this.menu.addAction('Import interface', this.importInterface, null);
        this.menu.addAction('Disable wireguard', this.disableWireguard, null);
        this.menu.addAction('Force refresh interfaces', this.refreshInterfaces, null);
    }

    _init() {
        super._init(0.0, `${Me.metadata.name} Indicator`, false);

        var icon = new St.Icon({
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

    importInterface() {
        importConfigDialog();
        this.menu.removeAll();
        this._buildMenu();
    }

    refreshInterfaces() {
        execShell(`bash -c "rm -f ${Me.dir.get_path()}/interfaces"`);
        notify("Interface list has been refreshed");

        this.menu.removeAll();
        this._buildMenu();
    }

    // Disables wireguard interfaces entirely
    disableWireguard() {
        switchWireguardInterfaceTo(null);
        for(let inter of Object.keys(interfaceList)) {
            interfaceList[inter] = false;
        }
        notify(`Disabling VPN`);
        this.menu.removeAll();
        this._buildMenu();
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