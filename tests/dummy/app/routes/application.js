import Route from '@ember/routing/route';

export default Route.extend({
  model() {
    return import('d3').then((d3) => {
      return d3.version;
    }).catch((error) => {
      return "Error: " + error;
    });
  }
});
