'use strict';

const path = require('path');

const Connector = require('ember-alt-fastboot-app-server/src/backing-classes/connector');
const ClusterMaster = require('ember-alt-fastboot-app-server/src/backing-classes/cluster-master');
const serialize = require('ember-alt-fastboot-app-server/src/utils/serialization').serialize;

const Task = require('ember-cli/lib/models/task');
const populateTemplate = require('../../utils/build-error');

class CLIClusterMaster extends ClusterMaster {
  constructor(options) {
    super(...arguments);
    this.liveReloadPath = options.liveReloadPath;
  }

  clusterSetupMaster() {
    // Replace the worker start script to allow for middleware customization.
    const workerOptions = {
      distPath: this.distPath,
      host: this.host,
      port: this.port,
      liveReloadPath: this.liveReloadPath
    };

    return {
      exec: path.join(__dirname, 'cluster-worker.js'),
      args: [serialize(workerOptions)]
    };
  }
}

class CustomExpressServerTask extends Task {
  constructor(taskOptions) {
    super(...arguments);
    this.watcher = taskOptions.watcher;
    this.ui = taskOptions.ui;
  }

  start(startOptions) {
    // Connector is an event emitter that allows communication between the
    // cluster master and workers.
    const connector = new Connector({
      distPath: startOptions.outputPath
    });

    const config = {
      connector,
      host: startOptions.host,
      port: startOptions.port,
      workerCount: 1,
      liveReloadPath: startOptions.liveReloadPath
    };

    const clusterMaster = new CLIClusterMaster(config);

    this.watcher.on('change', (results) => {
      connector.emit('build', results.directory);
    });

    this.watcher.on('error', (error) => {
      clusterMaster.broadcast({ event: 'masterError', response: populateTemplate(error, startOptions) });
    });

    return Promise.resolve()
      .then(() => {
        // This will create the cluster master.
        return clusterMaster.start();
      });
  }
}

module.exports = CustomExpressServerTask;
