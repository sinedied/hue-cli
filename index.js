'use strict';

const pkg = require('./package.json');
const os = require('os');
const path = require('path');
const fs = require('fs');
const hue = require('node-hue-api');
const diacritics = require('diacritics');

const appName = path.basename(process.argv[1]);
const appDescription = 'hue-cli utility';
const configPath = path.join(os.homedir(), '.hue');
const help =
`${appName} ${pkg.version}
Usage: ${appName} [setup|scene|on|off]

Commands:
  setup            Configure hue bridge or show current config
    -l, --list     List bridges on the network
    -i, --ip       Set bridge ip (use first bridge if not specified)
    --force        Force setup if already configured
    
  s, scene <name>  Activate scene starting with <name>
    -l, --list     List scenes, using <name> as optional filter
    -m, --max <n>  Show at most <n> scenes when listing (10 by default)
    
  i, on            Switch all lights on  
  o, off           Switch all lights off
`;

class HueCli {

  constructor(args) {
    this._args = args;
    this._config = {};
    this._loadConfig();

    if (args != null) {
      this._runCommand();
    }
  }

  switchLights(on = false) {
    return this.api
      .lights()
      .then(result => result.lights.map(l => l.id))
      .then(lights => lights.map(l => this.api.setLightState(l, { 'on': on })))
      .then(promises => Promise.all(promises));
  }

  listScenes(name, max, print = false) {
    name = diacritics.remove(name).toLowerCase();
    return this.api
      .scenes()
      .then(scenes => {
        scenes = scenes
          .filter(s => diacritics.remove(s.name).toLowerCase().indexOf(name) >= 0)
          .sort((a, b) => {
            let diff = name ? (a.name.length - name.length) - (b.name.length - name.length) : 0;
            return diff ? diff : new Date(b.lastupdated).getTime() - new Date(a.lastupdated).getTime();
          })
          .slice(0, max);
        return print ?
          scenes.forEach(s => console.log(s.name.toLowerCase())) :
          scenes;
      });
  }

  activateScene(name = '') {
    return this.listScenes(name, 1)
      .then(scenes => {
        if (scenes.length) {
          return this.api.activateScene(scenes[0].id);
        }
        this._exit(`No scene found with the name "${name}"`);
      });
  }

  listBridges() {
    return hue
      .nupnpSearch()
      .then(bridges => {
        bridges.forEach(b => console.log(b.ipaddress));
        return bridges;
      }, () => this._exit('No bridge found'));
  }

  setupBridge(ip = null, force = false) {
    if (this._config.bridge && this._config.user && !force) {
      this._exit(`Bridge already configured at ${this._config.bridge}`, 0);
    }
    return hue
      .nupnpSearch()
      .then((bridges) => {
        let bridge = ip ? bridges.find(b => b.ipaddress === ip) : bridges[0];
        if (bridge) {
          this._config.bridge = bridge.ipaddress;
          this._saveConfig();
          console.log(`Hue bridge found at ${this._config.bridge}`);
          return this.bridge;
        }
        return Promise.reject();
      })
      .catch(() => this._exit('No bridge found'))
      .then(bridge => new hue.api()
        .registerUser(bridge, appDescription)
        .then(user => {
          this._config.user = user;
          this._saveConfig();
          console.log('Linked bridge successfully');
          return user;
      }, () => this._exit('Cannot link, press the button on bridge and try again.')))
  }

  get bridge() {
    return this._config.bridge || this._exit('Bridge not configured, run "hue setup"');
  }

  get user() {
    return this._config.user || this._exit('Bridge not linked, run "hue setup"');
  }

  get api() {
    return new hue.api(this.bridge, this.user);
  }

  _loadConfig() {
    let config;
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      this._config = config || {};
    } catch (e) {
      // Do nothing
    }
  }

  _saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(this._config))
  }

  _help() {
    this._exit(help);
  }

  _exit(error, code = 1) {
    console.error(error);
    process.exit(code);
  }

  _runCommand() {
    const _ = this._args._;
    switch (_[0]) {
      case 's':
      case 'scene':
        let name = _.slice(1).join(' ');
        return this._args.l ? this.listScenes(name, this._args.m, true) : this.activateScene(name);
      case 'setup':
        return this._args.list ? this.listBridges() : this.setupBridge(this._args.ip, this._args.force);
      case 'o':
      case 'off':
        return this.switchLights();
      case 'i':
      case 'on':
        return this.switchLights(true);
      default:
        this._help();
    }
  }

}

new HueCli(require('minimist')(process.argv.slice(2), {
  boolean: ['list', 'force'],
  string: ['ip'],
  number: ['max'],
  alias: {
    l: 'list',
    i: 'ip',
    m: 'max'
  },
  default: {
    m: 10
  }
}));

exports = HueCli;
