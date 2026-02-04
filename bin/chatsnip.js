#!/usr/bin/env node

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
  const parsed = parseRunArgs(args);

  if (parsed.mode === 'exec') {
    runCodexExec(parsed, sessionMeta);
    return;
  }

  runCodexTui(parsed, sessionMeta);
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
    args,
    prompt: '',
    threadId: ''
  };
}

function formatTimestampForFilename(date) {
  const iso = date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return iso.replace('T', '_').replace(/:/g, '-');
}

function writeSessionFile(meta, assistantMessages, cleanedTranscript, qaTranscript) {
  const lines = [];
  lines.push('# Chatsnip Session');
  lines.push('');
  lines.push(`- Started: ${meta.startedAt.toISOString()}`);
  lines.push(`- Ended: ${meta.endedAt ? meta.endedAt.toISOString() : ''}`);
  if (meta.threadId) {
    lines.push(`- Thread: ${meta.threadId}`);
  }
  lines.push('');
  if (meta.prompt) {
    lines.push(`## User — ${meta.startedAt.toISOString()}`);
    lines.push(meta.prompt);
    lines.push('');
  }
  if (assistantMessages && assistantMessages.length > 0) {
    lines.push(`## Assistant — ${meta.endedAt ? meta.endedAt.toISOString() : ''}`);
    lines.push(assistantMessages.join('\n\n'));
    lines.push('');
  }
  if (qaTranscript) {
    lines.push('## Q&A');
    lines.push(qaTranscript.trimEnd());
    lines.push('');
  } else if (cleanedTranscript) {
    lines.push('## Transcript (cleaned)');
    lines.push('```text');
    lines.push(cleanedTranscript.trimEnd());
    lines.push('```');
    lines.push('');
  }

  try {
    fs.writeFileSync(meta.filePath, lines.join('\n'));
  } catch (err) {
    process.stderr.write(`chatsnip: failed to write session file (${err.message})\n`);
  }
}

function resolvePrompt(args) {
  const hasArgs = args.length > 0;
  const execArgs = [];
  const promptArgs = [];
  let passThrough = false;

  for (const arg of args) {
    if (arg === '--') {
      passThrough = true;
      continue;
    }
    if (!passThrough && arg.startsWith('-')) {
      execArgs.push(arg);
      continue;
    }
    promptArgs.push(arg);
  }

  if (promptArgs.length > 0) {
    return Promise.resolve({ prompt: promptArgs.join(' '), execArgs, pipedPrompt: false });
  }

  if (!process.stdin.isTTY) {
    return readStdin().then((data) => ({
      prompt: data.trim(),
      execArgs,
      pipedPrompt: true
    }));
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Prompt: ', (answer) => {
      rl.close();
      resolve({ prompt: answer.trim(), execArgs, pipedPrompt: false });
    });
  });
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.on('data', (chunk) => {
      data += chunk.toString('utf8');
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function handleJsonLine(line, meta, assistantMessages) {
  try {
    const event = JSON.parse(line);
    if (event.type === 'thread.started' && event.thread_id) {
      meta.threadId = event.thread_id;
    }
    if (event.type === 'item.completed' && event.item) {
      const itemType = event.item.type;
      if (itemType === 'agent_message' || itemType === 'assistant_message' || itemType === 'message') {
        if (typeof event.item.text === 'string' && event.item.text.trim()) {
          assistantMessages.push(event.item.text.trim());
        }
      }
    }
  } catch (err) {
    // Ignore malformed JSON lines to keep the session intact.
  }
}

function parseRunArgs(args) {
  let mode = 'tui';
  const codexArgs = [];
  for (const arg of args) {
    if (arg === '--exec') {
      mode = 'exec';
      continue;
    }
    if (arg === '--tui') {
      mode = 'tui';
      continue;
    }
    codexArgs.push(arg);
  }
  return { mode, codexArgs };
}

function runCodexExec(parsed, sessionMeta) {
  resolvePrompt(parsed.codexArgs)
    .then(({ prompt, execArgs, pipedPrompt }) => {
      if (!prompt) {
        process.stderr.write('chatsnip: prompt required (pass args or pipe via stdin)\n');
        exitWith(2);
        return;
      }
      sessionMeta.prompt = prompt;

      const codexArgs = ['exec', '--json', ...execArgs];
      if (pipedPrompt) {
        codexArgs.push('-');
      } else {
        codexArgs.push(prompt);
      }

      const child = spawn('codex', codexArgs, { stdio: ['pipe', 'pipe', 'inherit'] });
      const assistantMessages = [];
      let jsonBuffer = '';

      if (pipedPrompt) {
        child.stdin.write(prompt);
        child.stdin.end();
      } else {
        child.stdin.end();
      }

      child.stdout.on('data', (chunk) => {
        jsonBuffer += chunk.toString('utf8');
        let index = jsonBuffer.indexOf('\n');
        while (index !== -1) {
          const line = jsonBuffer.slice(0, index).trim();
          jsonBuffer = jsonBuffer.slice(index + 1);
          if (line) {
            handleJsonLine(line, sessionMeta, assistantMessages);
          }
          index = jsonBuffer.indexOf('\n');
        }
      });

      child.on('error', (err) => {
        if (err && err.code === 'ENOENT') {
          process.stderr.write('chatsnip: codex CLI not found in PATH\n');
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
        if (jsonBuffer.trim()) {
          handleJsonLine(jsonBuffer.trim(), sessionMeta, assistantMessages);
        }
        sessionMeta.endedAt = new Date();
        writeSessionFile(sessionMeta, assistantMessages);
        exitWith(code);
      });
    })
    .catch((err) => {
      process.stderr.write(`chatsnip: failed to read prompt (${err.message})\n`);
      exitWith(1);
    });
}

function runCodexTui(parsed, sessionMeta) {
  const transcriptPath = `${sessionMeta.filePath}.transcript`;
  const codexArgs = [...parsed.codexArgs];
  const scriptArgs = ['-q', transcriptPath, 'codex', ...codexArgs];
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
    const transcript = readTranscript(transcriptPath);
    const cleaned = formatTranscript(stripAnsi(transcript));
    const qa = transcriptToQA(cleaned);
    writeSessionFile(sessionMeta, null, cleaned, qa);
    exitWith(code);
  });
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
  out = out.replace(/[╭╮╰╯─│]+/g, '');
  out = out.replace(/^M+$/gm, '');
  out = out.replace(/^\[.*$/gm, '');
  out = out.replace(/^\s*Tip: .*$/gm, '');
  out = out.replace(/^\s*OpenAI Codex.*$/gm, '');
  out = out.replace(/^\s*model: .*$/gm, '');
  out = out.replace(/^\s*directory: .*$/gm, '');
  out = out.replace(/^\s*100% context left.*$/gm, '');
  out = out.replace(/^\s*Find and fix a bug in @filename.*$/gm, '');
  out = out.replace(/^\s*\? for shortcuts.*$/gm, '');
  out = out.replace(/^\s*Summarize recent commits.*$/gm, '');
  out = out.replace(/.*for shortcuts.*$/gm, '');
  out = out.replace(/^\s*Token usage:.*$/gm, '');
  out = out.replace(/^\s*To continue this session, run codex resume.*$/gm, '');
  out = out.replace(/^\s*\/(model|permissions|experimental|skills|review|rename|new|resume|quit).*$/gm, '');
  out = out.replace(/^\s*What would you like me to do in this repo\?.*$/gm, '');
  out = out.replace(/^\s*Not sure what .* refers to\..*$/gm, '');
  out = out.replace(/^\s*•?Working.*$/gm, '');
  out = out.replace(/^\s*•?Planning.*$/gm, '');
  out = out.replace(/^\s*search.*$/gm, '');
  out = out.replace(/^[-─]{5,}$/gm, '');
  out = out.replace(/^\s*[›>_]+\s?/gm, '');
  out = out.replace(/for shortcuts.*?(100% context left)?/gi, '');
  out = out.replace(/100% context left/gi, '');
  out = out.replace(/\/\s*\/model.*$/gi, '');
  out = out.replace(/Token usage:.*$/gi, '');
  out = out.replace(/To continue this session, run codex resume.*$/gi, '');
  const lines = out.split('\n');
  const deduped = [];
  let last = '';
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed) {
      if (last !== '') {
        deduped.push('');
      }
      last = '';
      continue;
    }
    if (trimmed === last) {
      continue;
    }
    deduped.push(trimmed);
    last = trimmed;
  }
  out = deduped.join('\n').replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function transcriptToQA(text) {
  if (!text) {
    return '';
  }

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const pairs = [];
  let currentQ = '';
  let currentA = '';

  for (const line of lines) {
    const isAssistant = line.startsWith('• ');
    const content = isAssistant ? line.replace(/^•\s+/, '') : line;

    if (isAssistant) {
      if (!currentQ) {
        continue;
      }
      currentA = currentA ? `${currentA}\n${content}` : content;
    } else {
      if (currentQ || currentA) {
        pairs.push({ q: currentQ, a: currentA });
      }
      currentQ = content;
      currentA = '';
    }
  }

  if (currentQ || currentA) {
    pairs.push({ q: currentQ, a: currentA });
  }

  if (pairs.length === 0) {
    return '';
  }

  const blocks = [];
  for (let i = 0; i < pairs.length; i += 1) {
    const index = i + 1;
    const q = pairs[i].q || '';
    const a = pairs[i].a || '';
    blocks.push(`**Q${index} (User)**`);
    blocks.push(q || '[No user input captured]');
    blocks.push('');
    blocks.push(`**A${index} (Assistant)**`);
    blocks.push(a || '[No assistant output captured]');
    blocks.push('');
  }

  return blocks.join('\n').trim();
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
