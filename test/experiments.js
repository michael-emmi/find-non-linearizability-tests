var path = require('path');
var cp = require('child_process');
let config = require('../lib/config.js');
let checker = require('../lib/index.js');

async function run(specDir) {
  let specFiles = cp.execSync(`find ${specDir} -name "*.json"`).toString().split('\n');

  for (let specFile of specFiles) {
    let numValues = 2;
    let sequences = 2;
    let invocations = 4;

    console.log(`---`);
    console.log(`Checking specification: ${specFile}`);
    console.log(`---`);

    let result = await checker.testUntrustedMethods(specFile, numValues, sequences, invocations);

    console.log(`---`);
    console.log(`Checking completed for: ${specFile}`);
  }
}

(async () => {
  try {
    await run(path.join(config.resourcesPath, /* FIXME */ "../specs"));
  } catch (e) {
    console.log(`caught: ${e}`);
  }
})();
