#!/usr/bin/env node

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function printUsage() {
  const usage = [
    'Usage:',
    '  chatsnip run codex [-- <codex-args...>]',
    '',
    'Examples:',
    '  chatsnip run codex',
    '  chatsnip run codex -- --model gpt-5'
  ];
  process.stderr.write(usage.join('\n') + '\n');
}

function exitWith(code) {
  if (typeof code === 'number') {
    process.exit(code);
  }
  process.exit(1);
}

function runCodex(args) {
  const projectRoot = findProjectRoot(process.cwd());
  if (!ensureHistoryDir(projectRoot)) {
    exitWith(1);
    return;
  }
  const sessionMeta = createSessionMeta(projectRoot, args);
  const transcriptPath = `${sessionMeta.filePath}.transcript`;
  const scriptArgs = ['-q', transcriptPath, 'codex', ...args];
  const child = spawn('script', scriptArgs, { stdio: 'inherit' });

  child.on('error', (err) => {
    if (err && err.code === 'ENOENT') {
      process.stderr.write('chatsnip: required tool not found in PATH (script)\n');
      exitWith(127);
      return;
    }
    process.stderr.write(`chatsnip: failed to start codex (${err.message})\n`);
    exitWith(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.stderr.write(`chatsnip: codex terminated by signal ${signal}\n`);
      exitWith(1);
      return;
    }
    sessionMeta.endedAt = new Date();
    const transcript = formatTranscript(stripAnsi(readTranscript(transcriptPath)));
    writeSessionFile(sessionMeta, transcript);
    exitWith(code);
  });
}

function findProjectRoot(startDir) {
  let dir = startDir;
  while (true) {
    const gitPath = path.join(dir, '.git');
    if (fs.existsSync(gitPath)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return startDir;
    }
    dir = parent;
  }
}

function ensureHistoryDir(projectRoot) {
  const historyDir = path.join(projectRoot, '.chatsnips', 'history');
  try {
    fs.mkdirSync(historyDir, { recursive: true });
    return true;
  } catch (err) {
    process.stderr.write(`chatsnip: failed to create ${historyDir} (${err.message})\n`);
    return false;
  }
}

function createSessionMeta(projectRoot, args) {
  const startedAt = new Date();
  const historyDir = path.join(projectRoot, '.chatsnips', 'history');
  const stamp = formatTimestampForFilename(startedAt);
  const filename = `${stamp}-session.md`;
  const filePath = path.join(historyDir, filename);
  return {
    projectRoot,
    startedAt,
    endedAt: null,
    filePath,
    args
  };
}

function formatTimestampForFilename(date) {
  const iso = date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return iso.replace('T', '_').replace(/:/g, '-');
}

function writeSessionFile(meta, transcript) {
  const lines = [];
  lines.push('# Chatsnip Session');
  lines.push('');
  lines.push(`- Started: ${meta.startedAt.toISOString()}`);
  lines.push(`- Ended: ${meta.endedAt ? meta.endedAt.toISOString() : ''}`);
  lines.push('');
  if (transcript) {
    lines.push('## Transcript (raw)');
    lines.push('```text');
    lines.push(transcript.trimEnd());
    lines.push('```');
    lines.push('');
  }

  try {
    fs.writeFileSync(meta.filePath, lines.join('\n'));
  } catch (err) {
    process.stderr.write(`chatsnip: failed to write session file (${err.message})\n`);
  }
}

function readTranscript(transcriptPath) {
  try {
    const data = fs.readFileSync(transcriptPath, 'utf8');
    try {
      fs.unlinkSync(transcriptPath);
    } catch (err) {
      process.stderr.write(`chatsnip: failed to remove transcript (${err.message})\n`);
    }
    return data;
  } catch (err) {
    process.stderr.write(`chatsnip: failed to read transcript (${err.message})\n`);
    return '';
  }
}

function stripAnsi(text) {
  if (!text) {
    return '';
  }
  // Strip ANSI escape sequences and control chars that corrupt transcripts.
  return text
    .replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x1B\][^\x1B]*\x1B\\/g, '')
    .replace(/\x1B\][^\x07]*\x07/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function formatTranscript(text) {
  if (!text) {
    return '';
  }
  let out = text;
  out = out.replace(/\r/g, '\n');
  out = out.replace(/[^\S\r\n]+/g, ' ');
  out = out.replace(/[ \t]+\n/g, '\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  out = out.replace(/^M+$/gm, '');
  out = out.replace(/^\s*Find and fix a bug in @filename.*$/gm, '');
  out = out.replace(/^\s*\? for shortcuts.*$/gm, '');
  out = out.replace(/^\s*Tip: .*$/gm, '');
  out = out.replace(/^\s*OpenAI Codex.*$/gm, '');
  out = out.replace(/^\s*model: .*$/gm, '');
  out = out.replace(/^\s*directory: .*$/gm, '');
  out = out.replace(/^\s*100% context left.*$/gm, '');
  out = out.replace(/^\s*•?Working.*$/gm, '');
  out = out.replace(/^\s*•?Planning.*$/gm, '');
  out = out.replace(/^\s*search.*$/gm, '');
  out = out.replace(/^[-─]{5,}$/gm, '');
  out = out.replace(/^\s*[›>_]+\s?/gm, '');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    printUsage();
    exitWith(2);
    return;
  }

  const command = argv[0];
  if (command !== 'run') {
    process.stderr.write(`chatsnip: unknown command "${command}"\n`);
    printUsage();
    exitWith(2);
    return;
  }

  const agent = argv[1];
  if (agent !== 'codex') {
    process.stderr.write('chatsnip: only "codex" is supported in v0.1.0\n');
    printUsage();
    exitWith(2);
    return;
  }

  let args = argv.slice(2);
  if (args[0] === '--') {
    args = args.slice(1);
  }

  runCodex(args);
}

main();
