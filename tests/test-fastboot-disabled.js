/*eslint-env node*/
const { spawn } = require('child_process');
const http = require('http');

const newEnv = { ...process.env, FASTBOOT_DISABLED: 'true' };
const server = spawn('ember', ['s'], { env: newEnv });

process.stdout.write(
  '## waiting for server to start ' +
    '("Build successful" followed by "Static Serve Synchronizing."):\n'
);

let output = ''; // output from the server's stdout (to test when it's ready)
let ok = false; // whether test passed
let run = false; // whether we've already run/are running the test

server.stdout.on('data', (data) => {
  output += data;
  process.stderr.write(data);

  // Only run test once (server will output more to stdout after we start
  // testing)
  if (run) {
    return;
  }

  // Server is ready when "Static Serve Synchronizing" occurs after
  // "Build Successful"
  const buildSuccessful = output.indexOf('Build successful (');
  const ready =
    buildSuccessful != -1 &&
    output.slice(buildSuccessful).includes('Static Serve Synchronizing.');

  if (ready) {
    run = true;
    process.stdout.write('## Running test...\n');

    http.get({ host: 'localhost', port: 4200, path: '/' }, (res) => {
      // Status code == 500 if fastboot failed
      if (res.statusCode != 200) {
        process.stdout.write(
          `## ERROR: GET / returned bad status code: ${res.statusCode}\n`
        );
        process.exit(1);
      } else {
        process.stdout.write('## PASSED: GET / returned 200\n');
        ok = true;
        server.kill();
      }
    });
  }
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

server.on('exit', () => {
  // Exit with proper status code depending on test result
  if (ok) {
    process.exit(0);
  } else {
    process.stderr.write('## `ember s` exited unexpectedly, see above\n');
    process.exit(1);
  }
});

// Always cleanup server (avoids "port already in use")
process.on('exit', () => {
  if (!server.killed) {
    server.kill();
  }
});
