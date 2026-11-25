const process = require('node:process');
const fs = require('node:fs');
const path = require('node:path');
const [bundle, directory, image, index] = process.argv.slice(2);
const read = fs.readFileSync;
const signal = (name) => path.join(directory, name);
function wait(name) {
  const until = Date.now() + 5000;
  while (!fs.existsSync(signal(name))) {
    if (Date.now() > until) throw new Error('worker barrier timed out: ' + name);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
  }
}
// Both contenders observe the old token. Delay the second reclaim until the first holds the replacement lock.
let sawStale = false;
fs.readFileSync = function (file, ...args) {
  if (path.basename(file) === 'index.json' && index === '1') {
    fs.writeFileSync(signal('held'), '');
    wait('attempted');
  }
  const result = read.call(this, file, ...args);
  return result;
};
const list = fs.readdirSync;
fs.readdirSync = function (file, ...args) {
  const names = list.call(this, file, ...args);
  if (path.basename(file) === 'index.lock' && !sawStale) {
    sawStale = true;
    fs.writeFileSync(signal('seen' + index), '');
    wait('seen' + (index === '1' ? '2' : '1'));
    if (index === '2') wait('held');
  }
  return names;
};
const rmdir = fs.rmdirSync;
fs.rmdirSync = function (file, ...args) {
  if (index === '2' && path.basename(file) === '0_1_dead') {
    fs.writeFileSync(signal('attempted'), '');
    throw Object.assign(new Error('generation already replaced'), { code: 'EPERM' });
  }
  return rmdir.call(this, file, ...args);
};
const { HostBackgroundStore, BackgroundCapacityError } = require(bundle);
try {
  new HostBackgroundStore(directory).save('worker-' + index, read(image));
} catch (error) {
  if (!(error instanceof BackgroundCapacityError)) throw error;
  process.exitCode = 9;
}
