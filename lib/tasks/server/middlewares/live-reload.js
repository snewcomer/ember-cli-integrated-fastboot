'use strict';

class LiveReload {
  constructor(worker) {
    this.liveReloadScript = `
      (function() {
        var firstScript = document.getElementsByTagName('script')[0];
        var liveReloadScript = document.createElement('script');
        liveReloadScript.async = true;
        liveReloadScript.src = '${worker.liveReloadPath}';
        firstScript.parentNode.insertBefore(liveReloadScript, firstScript);
      })();
    `;
  }

  middleware(req, res) {
    res.contentType('text/javascript');
    res.send(this.liveReloadScript);
  }
}

module.exports = function(worker) {
  const liveReload = new LiveReload(worker);

  worker.addMiddleware({
    name: 'live-reload',
    value: {
      method: 'get',
      path: '/livereload.js',
      callback: liveReload.middleware.bind(liveReload)
    },
    before: ['static-serve', 'fastboot-glob']
  })
}
