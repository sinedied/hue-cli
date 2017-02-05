# hue-cli

[![NPM version](https://img.shields.io/npm/v/@sinedied/hue-cli.svg)](https://www.npmjs.com/package/@sinedied/hue-cli)
![Node version](https://img.shields.io/node/v/@sinedied/hue-cli.svg)
[![License](https://img.shields.io/npm/l/@sinedied/hue-cli.svg)](LICENSE)

> Simple command line interface for Philips Hue.

## Installation

```bash
npm install -g @sinedied/hue-cli
```

### Usage

```
Usage: hue [setup|scene|on|off]

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
```
