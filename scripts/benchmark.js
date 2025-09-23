#!/usr/bin/env node

/**
 * Performance benchmarking script for Module Federation builds
 * Measures build times, bundle sizes, and loading performance
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BENCHMARK_OUTPUT = 'benchmark-results.json';

function measureBuildTime(command, name) {
  console.log(`📊 Benchmarking: ${name}`);
  const start = performance.now();

  try {
    execSync(command, { stdio: 'inherit' });
    const end = performance.now();
    const duration = Math.round(end - start);
    console.log(`✅ ${name} completed in ${duration}ms`);
    return { name, duration, success: true };
  } catch (error) {
    const end = performance.now();
    const duration = Math.round(end - start);
    console.log(`❌ ${name} failed after ${duration}ms`);
    return { name, duration, success: false, error: error.message };
  }
}

function getBundleSize(buildPath) {
  if (!fs.existsSync(buildPath)) return null;

  const files = fs.readdirSync(buildPath, { recursive: true });
  let totalSize = 0;

  files.forEach(file => {
    const filePath = path.join(buildPath, file);
    if (fs.statSync(filePath).isFile()) {
      totalSize += fs.statSync(filePath).size;
    }
  });

  return Math.round(totalSize / 1024); // KB
}

async function runBenchmarks() {
  const results = {
    timestamp: new Date().toISOString(),
    builds: [],
    bundles: {}
  };

  console.log('🚀 Starting Module Federation benchmarks...\n');

  // Benchmark builds
  const builds = [
    { cmd: 'pnpm build', name: 'Full Build' },
    { cmd: 'lerna run build --scope dashboard', name: 'Dashboard Build' },
    { cmd: 'lerna run build --scope remote', name: 'Remote Build' },
    { cmd: 'lerna run build --scope cloud', name: 'Cloud Build' }
  ];

  for (const build of builds) {
    results.builds.push(measureBuildTime(build.cmd, build.name));
  }

  // Measure bundle sizes
  const bundlePaths = {
    dashboard: 'apps/nextjs-cra/dashboard/.next',
    remote: 'apps/nextjs-cra/remote/build',
    cloud: 'apps/nextjs-cra/cloud/build'
  };

  for (const [name, bundlePath] of Object.entries(bundlePaths)) {
    const size = getBundleSize(bundlePath);
    if (size) {
      results.bundles[name] = size;
      console.log(`📦 ${name} bundle: ${size}KB`);
    }
  }

  // Save results
  fs.writeFileSync(BENCHMARK_OUTPUT, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to ${BENCHMARK_OUTPUT}`);

  return results;
}

if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = { runBenchmarks, measureBuildTime, getBundleSize };