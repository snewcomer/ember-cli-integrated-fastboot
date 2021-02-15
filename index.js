'use strict';

const fs = require('fs');
const path = require('path');

const funnel = require('broccoli-funnel');
const merge = require('broccoli-merge-trees');

function configureFingerprints(host) {
  host.options.fingerprint = host.options.fingerprint || {};
  host.options.fingerprint.exclude = host.options.fingerprint.exclude || [];
  host.options.fingerprint.exclude.push(
    '**/assets/chunk.*.js',
    'fastboot-server/**/*'
  );
}

function configureUglify(host) {
  host.options['ember-cli-terser'] = host.options['ember-cli-terser'] || {};
  host.options['ember-cli-terser'].exclude =
    host.options['ember-cli-terser'].exclude || [];
  host.options['ember-cli-terser'].exclude.push('node_modules/**/*');
}

module.exports = {
  name: require('./package').name,

  /**
   * When running tests in testem, redirect requests to new webroot relative path
   * @param {ExpressApplication} app - Express application run by testem
   */
  testemMiddleware(app) {
    // redirect /tests/index.html to /webroot/tests/index.html
    app.get(/\/\d+\/tests\/index\.html/, (req, res) => {
      // example, from /25312117083192/tests/index.html?hidepassed
      // we want to break the path up by '/'
      const urlPartsArray = req.url.split('/');
      // and insert webroot after the random unique number 25312117083192
      urlPartsArray.splice(2, 0, 'webroot');
      // and redirect to the new path
      res.redirect(urlPartsArray.join('/'));
    });

    // redirect /assets/:filename to /webroot/assets/:filename
    app.get('/assets/:filename', (req, res) => {
      // example, from this url http://localhost:7357/22435464252728/webroot/tests/index.html?hidepassed
      // we are trying to get the number 22435464252728
      const uniqueTestUrlNumber = req.headers.referer.split('/')[3];
      // so that we can rewrite /assets/vendor.js to /22435464252728/webroot/assets/vendor.js
      res.redirect(`/${uniqueTestUrlNumber}/webroot${req.url}`);
    });
  },

  included(addon) {
    this._super.included.apply(this, arguments);
    const host = addon._findHost ? addon._findHost() : addon;
    configureFingerprints(host);
    configureUglify(host);
  },

  /**
   * Recent ember-cli removed the "two server" solution for livereload,
   * instead multiplexing them together on a single server. This is not
   * a viable option when we want a production server running separately
   * from a development server.
   *
   * This reinserts a livereload script into the application. The server
   * component for this is in tasks/server/middlewares/live-reload.js.
   *
   * @method contentFor
   * @param {String} type
   * @param {Object} config
   */
  contentFor: function (type, config) {
    if (config.environment !== 'production' && type === 'head') {
      return '<script type="text/javascript" src="/livereload.js"></script>';
    }
  },

  /**
   * This addon's implementation of `treeForFastBootServer`. This addon happens to provide a
   * default `fastboot-server/www` script.
   *
   * @param {*} tree
   */
  treeForFastBootServer(tree) {
    const fastbootServer = funnel(path.join(__dirname, 'fastboot-server'));
    const reduced = merge([tree, fastbootServer].filter(Boolean), {
      overwrite: true,
    });
    return reduced;
  },

  _treeForFastBootServer() {
    // This is implemented as if it were a reduce over the addons.
    let tree;
    this.project.addons.forEach((addon) => {
      if (addon.treeForFastBootServer) {
        tree = addon.treeForFastBootServer(tree);
      }
    });

    // Get the project's fastboot-server directory last.
    const fastbootServerPath = path.join(this.project.root, 'fastboot-server');

    let fastbootServer = null;
    if (fs.existsSync(fastbootServerPath)) {
      fastbootServer = funnel(fastbootServerPath);
    }

    return funnel(
      merge([tree, fastbootServer].filter(Boolean), { overwrite: true }),
      { destDir: 'fastboot-server' }
    );
  },

  // Update the manifest to serve assets from the `webroot` folder instead.
  updateFastBootManifest(manifest) {
    const categories = Object.keys(manifest);
    categories.forEach((category) => {
      if (Array.isArray(manifest[category])) {
        for (let i = 0; i < manifest[category].length; i++) {
          manifest[category][i] = `webroot/${manifest[category][i]}`;
        }
      } else {
        manifest[category] = `webroot/${manifest[category]}`;
      }
    });

    return manifest;
  },

  postprocessTree(type, tree) {
    if (type === 'all') {
      const webroot = funnel(tree, {
        srcDir: '.',
        destDir: 'webroot',
        exclude: ['package.json'],
      });
      const root = funnel(tree, { files: ['package.json'] });
      return merge(
        [root, webroot, this._treeForFastBootServer()].filter(Boolean)
      );
    }

    return tree;
  },

  includedCommands() {
    return require(path.join(__dirname, 'lib/commands'));
  },
};
