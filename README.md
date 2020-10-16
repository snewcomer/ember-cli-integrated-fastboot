# ember-cli-integrated-fastboot

This ember-cli addon enables using a production FastBoot server during development. This ensures that the eventual environment that you will run your application in will be consistent.

## Overview

`ember-cli-integrated-fastboot` overrides ember cli's `serve` and `build` commands.

1. `serve` - In `development` you can run `ember s` and start a Node cluster with livereload.
2. `build` - ember-cli provides a set of hooks for this addon during a `build`.  We provide a default `www` bash script with these hooks that will be included in your `dist` folder. This is what you will eventually run in production and development to spin up a Node cluster and start accepting requests.

This library uses [ember-alt-fastboot-app-server](https://github.com/snewcomer/ember-alt-fastboot-app-server) and is the necessary plumbing to start a Node cluster process and spin up workers.  The number of workers that will be spun up will depend on the number of cores the machine it runs on.  Say you have 8 cores.  The cluster master will start, spin up 8 workers on the same port and round robin requests to each worker.  Also, this addon is flexible in that if you dist path changes, it will pick up and notify all [Workers](https://nodejs.org/api/worker_threads.html).

Future things it will accomplish:
- Producing an asset that can be deployed.
- Provide tools for writing tests that run against your FastBoot application.

## How is this different than the community version?

The community version doesn't come with the server (aka Node clustering) out of the box. As a result, running in `development` closely follows how this app will run when deployed to users!  Note, many of the addon's hooks will be called in both this library and the community one.  So you don't need to worry that this package as a replacement for `ember-cli-fastboot`.  This simply complements it.

The community [fastboot-app-server](https://github.com/ember-fastboot/fastboot-app-server) also uses Node clustering, but is less flexible.

## Installation

```
npm install --save ember-cli-integrated-fastboot ember-cli-fastboot
```

## Usage

`ember s`, `ember build`, and `ember test` all function with approximately the same API as upstream.

Instead of running `ember s`, to run the app after a `build` without live reload, from the command line type `node dist/fastboot-server/www`.  If you want to use the node inspector, use `node --inpsect-brk dist/fastboot-server/www`.  Then visit `chrome://inspect` in your browser and you can connect to the cluster master instance and then the cluster worker.

Specify custom start scripts for your application in a root level `scripts` folder. You should use `fastboot-server/www` as a starting point.

Here are some other package.json scripts that are useful.  The `postbuild` command is important b/c the eventual dist that needs to be shipped to the server should have the node_modules installed alongside.

- `"prebuild": "rm -rf ./dist ./tmp"`
- `"postbuild": "cd ./dist && npm install"`

## Disabling FastBoot

`FASTBOOT_DISABLED=true node --inspect-brk dist/fastboot-server/www`

This will still run the Node cluster and accept requests.  However, the response will just include your as-is index.html file.

## Customization

You can provide your own `fastboot-server` folder at the root of your project.  This will be eventually included in your `dist` folder when building your application.

```md
├── app
├── fastboot-server
|   ├── www
|   └── cluster-worker.js
|   └── middlewares
```

 The FastBoot instance runs in a [Node vm](https://nodejs.org/api/vm.html) to avoid leaking state to other instances. If any code uses Node globals, you need to provide your own `www` and include them with `sandboxGlobals`. `process` is provided with the default `www` file [here]().


## Order of Operations

- Build runs to completion.
- `postprocessTree('all')`
  - move-webroot
  - ember-cli-fastboot
  - broccoli-asset-rev
