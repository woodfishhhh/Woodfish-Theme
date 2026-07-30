#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VSCE_ENTRY = path.resolve('node_modules', '@vscode', 'vsce', 'vsce');
const MAX_VSIX_BYTES = 200 * 1024;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

function assertVsixSize(size, filePath, maximum = MAX_VSIX_BYTES) {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new Error(`Invalid VSIX size for ${filePath}: ${size}`);
  }
  if (size > maximum) {
    throw new Error(`${filePath} is ${size} bytes and exceeds the ${maximum} byte budget`);
  }
}

function readPackageMetadata() {
  return JSON.parse(fs.readFileSync('package.json', 'utf8'));
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
  const invocation = buildPackageInvocation(args);
  fs.mkdirSync(path.dirname(invocation.outputPath), { recursive: true });

  execFileSync(process.execPath, [VSCE_ENTRY, ...invocation.vsceArgs], {
    stdio: 'inherit',
  });

  const size = fs.statSync(invocation.outputPath).size;
  assertVsixSize(size, invocation.outputPath);
  console.log(`VSIX size check passed: ${size} bytes (budget ${MAX_VSIX_BYTES} bytes)`);
  return invocation.outputPath;
}

if (require.main === module) {
  main();
}

module.exports = {
  MAX_VSIX_BYTES,
  assertVsixSize,
  buildPackageInvocation,
  findOutputPath,
  main,
};
