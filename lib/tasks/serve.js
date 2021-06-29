'use strict';

const assert = require('assert');
const ServeTask = require('ember-cli/lib/tasks/serve');
const Builder = require('ember-cli/lib/models/builder');
const Watcher = require('ember-cli/lib/models/watcher');
const serveURL = require('ember-cli/lib/utilities/get-serve-url');
const CustomFastifyServerTask = require('./server/fastify-server');
const CustomLiveReloadServerTask = require('./server/livereload-server');

/**
 * Forked from:
 * https://github.com/ember-cli/ember-cli/blob/2805962d1c9188ef36ca7f9abec360cbebbd47a6/lib/tasks/serve.js
 *
 * ServeTask is provided to ember-cli using our fastboot-server / cluster-worker primitives from ember-alt-fastboot-app-server in development
 */
class CustomServeTask extends ServeTask {
  constructor() {
    super(...arguments);
  }

  run(options) {
    if (options.port === options.liveReloadPort) {
    	console.log("port === liveReloadPort is not supported, switching to port 35729");
			options.liveReloadPort = 35729;
    }

    // Default some options.
    options.host = options.host || 'localhost';
    options.liveReloadPath = CustomLiveReloadServerTask.getPath(options);

    let builder = new Builder({
      ui: this.ui,
      outputPath: options.outputPath,
      project: this.project,
      environment: options.environment
    });
    this._builder = builder;

    let watcher = new Watcher({
      ui: this.ui,
      builder,
      analytics: this.analytics,
      options
    });

    let fastifyServer = new CustomFastifyServerTask({
      ui: this.ui,
      watcher,
      project: this.project,
    });

    let liveReloadServer = new CustomLiveReloadServerTask({
      ui: this.ui,
      watcher,
      project: this.project
    });

    /* hang until the user exits */
    this._runningPromise = new Promise((resolve) => {
      this._stopRunning = resolve;
    });

    // Start some servers.
    return Promise.all([
      fastifyServer.start(options),
      liveReloadServer.start(options)
    ])
    .then(() => {
      this.ui.writeLine(`Serving on ${serveURL(options, this.project)}`);
      return this._runningPromise;
    })
    .catch((error) => {
      this.ui.writeLine('Error occurred while starting server:');
      this.ui.writeLine(JSON.stringify(error, null, 4));
      return Promise.reject(error);
    });
  }

  /**
   * Exit silently
   *
   * @private
   * @method onInterrupt
   */
  onInterrupt() {
    return this._builder.cleanup().then(() => this._stopRunning());
  }
}

module.exports = CustomServeTask;
