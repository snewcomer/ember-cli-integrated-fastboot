'use strict';

const ClusterWorker = require('ember-alt-fastboot-app-server/src/backing-classes/cluster-worker');

class CLIClusterWorker extends ClusterWorker {
  constructor() {
    super(...arguments);
    this.liveReloadPath = this.forkOptions.liveReloadPath;
  }
}

const worker = new CLIClusterWorker();

// Add in live-reload middleware.
require('./middlewares/live-reload')(worker);

worker.start();
