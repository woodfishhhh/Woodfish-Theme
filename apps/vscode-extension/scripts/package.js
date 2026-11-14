#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { EXTENSION_ROOT, VSCE_ENTRY, withStagedRepoFiles } = require('./paths');

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
/** Entries listed by name in the size report; the rest are summed up. */
const REPORT_TOP_ENTRIES = 8;

/** Name and compressed size of every entry, read from the zip's central directory. */
function readZipEntries(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) {
    throw new Error('not a zip file');
  }
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('broken zip central directory');
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    entries.push({
      name: buffer.toString('utf8', offset + 46, offset + 46 + nameLength),
      compressed: buffer.readUInt32LE(offset + 20),
    });
    offset += 46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  return entries;
}

/**
 * The VSIX size and its biggest entries with their share. There is no size limit: the
 * report is there to keep the package as small as it can reasonably be.
 */
function describeVsix(size, entries, top = REPORT_TOP_ENTRIES) {
  const sorted = [...entries].sort((left, right) => right.compressed - left.compressed);
  const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`.padStart(9);
  const share = (bytes) => `${((bytes * 100) / size).toFixed(1)}%`.padStart(6);
  const lines = [`VSIX ${(size / 1024).toFixed(1)} KB, ${entries.length} files:`];
  for (const entry of sorted.slice(0, top)) {
    lines.push(`${kb(entry.compressed)} ${share(entry.compressed)}  ${entry.name}`);
  }
  const rest = sorted.slice(top).reduce((total, entry) => total + entry.compressed, 0);
  if (rest > 0) {
    lines.push(`${kb(rest)} ${share(rest)}  ${sorted.length - top} other files`);
  }
  return lines.join('\n');
}

function readPackageMetadata() {
  return JSON.parse(fs.readFileSync(path.join(EXTENSION_ROOT, 'package.json'), 'utf8'));
}

function extractOutputArgument(args) {
  const forwardedArgs = [];
  let outputArgument;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--out' || argument === '-o') {
      const value = args[index + 1];
      if (!value) {
        throw new Error(`${argument} requires an output path`);
      }
      if (outputArgument !== undefined) {
        throw new Error('Only one package output path may be specified');
      }
      outputArgument = value;
      index += 1;
      continue;
    }

    if (argument.startsWith('--out=') || argument.startsWith('-o=')) {
      const value = argument.slice(argument.indexOf('=') + 1);
      if (!value) {
        throw new Error(`${argument.split('=')[0]} requires an output path`);
      }
      if (outputArgument !== undefined) {
        throw new Error('Only one package output path may be specified');
      }
      outputArgument = value;
      continue;
    }

    forwardedArgs.push(argument);
  }

  return { forwardedArgs, outputArgument };
}

function findOptionValue(args, option) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === option) {
      return args[index + 1];
    }
    if (argument.startsWith(`${option}=`)) {
      return argument.slice(option.length + 1);
    }
  }
  return undefined;
}

function buildDefaultVsixName(args, packageMetadata) {
  const requestedVersion = args.find((argument) => SEMVER_PATTERN.test(argument));
  const version = requestedVersion ?? packageMetadata.version;
  const target = findOptionValue(args, '--target') ?? findOptionValue(args, '-t');
  return [packageMetadata.name, target, version].filter(Boolean).join('-') + '.vsix';
}

function buildPackageInvocation(
  args,
  packageMetadata = readPackageMetadata(),
  cwd = process.cwd(),
  isDirectory = (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()
) {
  const { forwardedArgs, outputArgument } = extractOutputArgument(args);
  const defaultFileName = buildDefaultVsixName(forwardedArgs, packageMetadata);
  let outputPath = path.resolve(cwd, defaultFileName);

  if (outputArgument !== undefined) {
    const requestedPath = path.resolve(cwd, outputArgument);
    outputPath =
      isDirectory(requestedPath) || /[\\/]$/.test(outputArgument)
        ? path.join(requestedPath, defaultFileName)
        : requestedPath;
  }

  return {
    outputPath,
    vsceArgs: ['package', ...forwardedArgs, '--out', outputPath],
  };
}

function findOutputPath(args) {
  return buildPackageInvocation(args).outputPath;
}

function main(args = process.argv.slice(2)) {
  // npm runs workspace scripts inside apps/vscode-extension; resolve a relative --out against
  // the directory the user actually ran `pnpm package` from.
  const invocation = buildPackageInvocation(
    args,
    readPackageMetadata(),
    process.env.INIT_CWD ?? process.cwd()
  );
  fs.mkdirSync(path.dirname(invocation.outputPath), { recursive: true });

  withStagedRepoFiles(() =>
    execFileSync(process.execPath, [VSCE_ENTRY, ...invocation.vsceArgs], {
      cwd: EXTENSION_ROOT,
      stdio: 'inherit',
    })
  );

  const vsix = fs.readFileSync(invocation.outputPath);
  console.log(describeVsix(vsix.length, readZipEntries(vsix)));
  return invocation.outputPath;
}

if (require.main === module) {
  main();
}

module.exports = {
  buildPackageInvocation,
  describeVsix,
  findOutputPath,
  main,
  readZipEntries,
};
