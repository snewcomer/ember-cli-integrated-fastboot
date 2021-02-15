'use strict';

// Forked from:
// https://github.com/ember-cli/ember-cli/blob/2805962d1c9188ef36ca7f9abec360cbebbd47a6/lib/tasks/serve.js

const assert = require('assert');
const ServeTask = require('ember-cli/lib/tasks/serve');
const Builder = require('ember-cli/lib/models/builder');
const Watcher = require('ember-cli/lib/models/watcher');
const serveURL = require('ember-cli/lib/utilities/get-serve-url');
const CustomExpressServerTask = require('./server/express-server');
const CustomLiveReloadServerTask = require('./server/livereload-server');

class CustomServeTask extends ServeTask {
  constructor() {
    super(...arguments);
  }

  run(options) {
    // <rdar://54662951> a longterm fix is to support the livereload port being
    // the same as the server port.
    assert(
      options.port != options.liveReloadPort,
      'port === liveReloadPort is not supported'
    );

    // Default some options.
    options.host = options.host || 'localhost';
    options.liveReloadPath = CustomLiveReloadServerTask.getPath(options);

    let builder = new Builder({
      ui: this.ui,
      outputPath: options.outputPath,
      project: this.project,
      environment: options.environment,
    });
    this._builder = builder;

    let watcher = new Watcher({
      ui: this.ui,
      builder,
      analytics: this.analytics,
      options,
    });

    let expressServer = new CustomExpressServerTask({
      ui: this.ui,
      watcher,
    });

    let liveReloadServer = new CustomLiveReloadServerTask({
      ui: this.ui,
      watcher,
      project: this.project,
    });

    /* hang until the user exits */
    this._runningPromise = new Promise((resolve) => {
      this._stopRunning = resolve;
    });

    // Start some servers.
    return Promise.all([
      expressServer.start(options),
      liveReloadServer.start(options),
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
