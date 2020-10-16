'use strict';

const relativeRequire = require('../utils/relative-require');
const UpstreamServeCommand = relativeRequire('ember-cli/lib/commands/serve');

class CustomServeCommand extends UpstreamServeCommand {
  runTask() {
    // No need to customize the serve command.
    // The serve *task* is what we need to edit.
    // Insert our own custom task.
    this.tasks['Serve'] = require('../tasks/serve');
    return super.runTask(...arguments);
  }
}

CustomServeCommand.overrideCore = true;

module.exports = CustomServeCommand;
