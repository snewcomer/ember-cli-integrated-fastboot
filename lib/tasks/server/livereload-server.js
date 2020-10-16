'use strict';

const path = require('path');

const Task = require('ember-cli/lib/models/task');
const FSTree = require('fs-tree-diff');
const tinylr = require('tiny-lr');
const walkSync = require('walk-sync');

function isNotRemoved(entryTuple) {
  let operation = entryTuple[0];
  return operation !== 'unlink' && operation !== 'rmdir';
}

function isNotDirectory(entryTuple) {
  let entry = entryTuple[2];
  return entry && !entry.isDirectory();
}

function relativePath(patch) {
  return patch[1];
}

function isNotSourceMapFile(file) {
  return !(/\.map$/.test(file));
}

class CustomLiveReloadServerTask extends Task {
  constructor(taskOptions) {
    super(...arguments);
    this.watcher = taskOptions.watcher;
    this.ui = taskOptions.ui;
    this.project = taskOptions.project;

    // Server state information.
    this._hasCompileError = false;
    this.tree = null;
  }

  static getPath(options) {
    return `//${options.host || options.liveReloadHost}:${options.liveReloadPort}/livereload.js`;
  }

  start(startOptions) {
    if (!startOptions.liveReload) {
      return;
    }

    this.liveReloadServer = tinylr(startOptions);

    this.watcher.on('change', (results) => {
      try {
        this.didChange(results);
      } catch (e) {
        this.ui.writeError(e);
      }
    });

    this.watcher.on('error', this.didChange.bind(this));

    return this.liveReloadServer.listen(startOptions.liveReloadPort, startOptions.liveReloadHost);
  }

  writeSkipBanner(filePath) {
    this.ui.writeLine(`Skipping livereload for: ${filePath}`);
  }

  getDirectoryEntries(directory) {
    return walkSync.entries(directory);
  }

  shouldTriggerReload(options) {
    let result = true;

    if (this.project.liveReloadFilterPatterns.length > 0) {
      let filePath = path.relative(this.project.root, options.filePath || '');

      result = this.project.liveReloadFilterPatterns
        .every(pattern => pattern.test(filePath) === false);

      if (result === false) {
        this.writeSkipBanner(filePath);
      }
    }

    return result;
  }

  didChange(results) {
    let previousTree = this.tree;
    let files;

    if (results.stack) {
      this._hasCompileError = true;
      files = ['LiveReload due to compile error'];
    } else if (this._hasCompileError) {
      this._hasCompileError = false;
      files = ['LiveReload due to resolved compile error'];
    } else if (previousTree && results.directory) {
      this.tree = new FSTree.fromEntries(this.getDirectoryEntries(results.directory), { sortAndExpand: true });
      files = previousTree.calculatePatch(this.tree)
        .filter(isNotRemoved)
        .filter(isNotDirectory)
        .map(relativePath)
        .filter(isNotSourceMapFile);

    } else {
      files = ['LiveReload files'];
    }

    if (this.shouldTriggerReload(results)) {
      this.liveReloadServer.changed({
        body: {
          files,
        },
      });
    }
  }
}

module.exports = CustomLiveReloadServerTask;
