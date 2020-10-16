'use strict';

const relativeRequire = require('../utils/relative-require');
const UpstreamBuildCommand = relativeRequire('ember-cli/lib/commands/build');

class CustomBuildCommand extends UpstreamBuildCommand {
  runTask() {
    // No need to customize the serve command.
    // The serve *task* is what we need to edit.
    // Insert our own custom task.
    this.tasks['Build'] = require('../tasks/build');
    return super.runTask(...arguments);
  }
}

CustomBuildCommand.overrideCore = true;

module.exports = CustomBuildCommand;
