'use strict';

// This module allows us to get to the built-in Ember error message for empty node_modules.
// We know that `ember-cli` has been resolved previously, globally, so we use those objects.

module.exports = function(path) {
  const fullyQualified = `${path}.js`;
  const length = fullyQualified.length;

  const emberCLIPath = Object.keys(require.cache).find((value) => {
    return value.lastIndexOf(fullyQualified) === value.length - length;
  });

  return require(emberCLIPath);
}
