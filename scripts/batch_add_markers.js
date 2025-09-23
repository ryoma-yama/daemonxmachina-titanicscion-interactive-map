import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const ADD_MARKER_SCRIPT = path.resolve('scripts/add_marker.js');

const markerPattern = /^(\w+)\s+(\d+)\s+(\d+)\s+(\w+)\s+"([^"]*)"(?:\s+"([^"]*)")?$/u;

function parseMarkerLine(line) {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) {
    return null;
  }

  const match = trimmed.match(markerPattern);
  if (!match) {
    console.warn(`Warning: Could not parse line: ${line.trimEnd()}`);
    return null;
  }

  const [, mapId, x, y, category, name, description] = match;
  return {
    mapId,
    x,
    y,
    category,
    name,
    description: description ?? '',
  };
}

function runAddMarker(markerData, dryRun) {
  const args = [
    ADD_MARKER_SCRIPT,
    markerData.mapId,
    markerData.x,
    markerData.y,
    markerData.category,
    markerData.name,
  ];

  if (markerData.description) {
    args.push(markerData.description);
  }

  if (dryRun) {
    args.push('--dry-run');
  }

  const result = spawnSync('node', args, { encoding: 'utf-8' });

  return {
    success: result.status === 0,
    output: (result.stdout ?? '') + (result.stderr ?? ''),
  };
}

function parseArguments(argv = process.argv.slice(2)) {
  if (argv.length === 0) {
    throw new Error('Usage: node scripts/batch_add_markers.js <input_file> [--dry-run]');
  }

  const args = [...argv];
  const dryRunIndex = args.indexOf('--dry-run');
  const dryRun = dryRunIndex !== -1;

  if (dryRun) {
    args.splice(dryRunIndex, 1);
  }

  const [inputFile] = args;
  if (!inputFile) {
    throw new Error('Input file path is required');
  }

  return { inputFile: path.resolve(inputFile), dryRun };
}

export function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArguments(argv);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const { inputFile, dryRun } = parsed;

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File ${inputFile} does not exist`);
    process.exitCode = 1;
    return;
  }

  console.log(`Processing markers from: ${inputFile}`);
  if (dryRun) {
    console.log('DRY RUN mode - no files will be modified');
  }
  console.log('');

  const lines = fs.readFileSync(inputFile, 'utf-8').split('\n');
  let successCount = 0;
  let errorCount = 0;

  lines.forEach((line, index) => {
    const marker = parseMarkerLine(line);
    if (!marker) {
      return;
    }

    console.log(`Processing line ${index + 1}: ${marker.name}`);
    const { success, output } = runAddMarker(marker, dryRun);

    if (success) {
      successCount += 1;
      if (!dryRun) {
        console.log('  ✓ Added successfully');
      }
    } else {
      errorCount += 1;
      console.log(`  ✗ Failed`);
    }

    if (dryRun || !success) {
      const trimmedOutput = output.trim();
      if (trimmedOutput) {
        const snippet = trimmedOutput.length > 200 ? `${trimmedOutput.slice(0, 200)}...` : trimmedOutput;
        console.log(`    Output: ${snippet}`);
      }
    }
    console.log('');
  });

  const totalProcessed = successCount + errorCount;
  console.log('Summary:');
  console.log(`  Successful: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total processed: ${totalProcessed}`);
}

function isExecutedDirectly(entry = process.argv[1], moduleUrl = import.meta.url) {
  if (!entry) {
    return false;
  }

  try {
    return pathToFileURL(entry).href === moduleUrl;
  } catch {
    return false;
  }
}

if (isExecutedDirectly()) {
  try {
    main();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
