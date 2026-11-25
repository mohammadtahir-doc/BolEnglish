#!/usr/bin/env node

/**
 * devkit-state.mjs — Shared state management for devkit workflows
 *
 * Commands:
 *   init [--state <path>] [--skill <name>] [--mode <mode>] [--phases <list>]
 *   get [--state <path>] [key]
 *   set [--state <path>] <key> <value>
 *   advance [--state <path>]
 *   validate [--state <path>]
 *
 * Exit codes:
 *   0 = success
 *   1 = validation or gate refusal (e.g. missing evidence or missing approval)
 *   2 = usage error or file access failure
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATE_PATH = resolve(__dirname, 'state.template.json');
const DEFAULT_STATE_PATH = resolve('.devkit/state.json');

function parseArgs(rawArgs) {
  let command = null;
  const options = {
    statePath: DEFAULT_STATE_PATH,
    skill: null,
    mode: null,
    phases: null,
  };
  const positional = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--state') {
      options.statePath = resolve(rawArgs[++i]);
    } else if (arg === '--skill') {
      options.skill = rawArgs[++i];
    } else if (arg === '--mode') {
      options.mode = rawArgs[++i];
    } else if (arg === '--phases') {
      options.phases = rawArgs[++i].split(',').map(s => s.trim()).filter(Boolean);
    } else if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, options, positional };
}

function printHelp() {
  console.log(`devkit-state.mjs — State management for devkit agent workflows

Usage:
  node devkit-state.mjs <command> [options] [arguments]

Commands:
  init      Initialize a new state.json file from the template
  get       Retrieve full state or a specific key by dot notation
  set       Update a specific key in state (e.g. key=value or dot path)
  advance   Advance to the next phase (enforces evidence & approval gates)
  validate  Validate that a state file adheres to required schema & gates

Options:
  --state <path>    Path to state.json (defaults to .devkit/state.json)
  --skill <name>    Skill name to record during init (e.g. security-audit)
  --mode <mode>     Mode to record during init (lite, standard, full)
  --phases <list>   Comma-separated phase names for custom workflow init
  --help, -h        Show this help message

Exit codes:
  0: Success
  1: Refusal (missing evidence or missing approval on advance, or validation failure)
  2: Error (invalid syntax, path not found, JSON parse error)
`);
}

async function loadTemplate() {
  const content = await readFile(TEMPLATE_PATH, 'utf-8');
  return JSON.parse(content);
}

async function loadState(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`State file not found at: ${filePath}. Run 'init' first.`);
    }
    throw new Error(`Failed to parse state file at ${filePath}: ${err.message}`);
  }
}

async function saveState(filePath, state) {
  state.updated_at = new Date().toISOString();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

function getByPath(obj, pathStr) {
  if (!pathStr) return obj;
  // Handle array indexing like phases[0].status
  const normalized = pathStr.replace(/\[(\w+)\]/g, '.$1');
  const parts = normalized.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function setByPath(obj, pathStr, value) {
  const normalized = pathStr.replace(/\[(\w+)\]/g, '.$1');
  const parts = normalized.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

function parseValue(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback to string
    }
  }
  return raw;
}

function validateState(state) {
  const errors = [];

  if (!state.skill) errors.push('Missing "skill" field');
  if (!state.mode) errors.push('Missing "mode" field');
  if (!Array.isArray(state.phases) || state.phases.length === 0) {
    errors.push('"phases" must be a non-empty array');
    return { valid: false, errors };
  }

  const phaseNames = new Set();
  for (let i = 0; i < state.phases.length; i++) {
    const p = state.phases[i];
    if (!p.name) errors.push(`Phase at index ${i} missing "name"`);
    if (phaseNames.has(p.name)) errors.push(`Duplicate phase name: "${p.name}"`);
    phaseNames.add(p.name);

    if (p.status === 'completed') {
      const hasEvidence = p.evidence && (
        (typeof p.evidence === 'string' && p.evidence.trim().length > 0) ||
        (Array.isArray(p.evidence) && p.evidence.length > 0) ||
        (typeof p.evidence === 'object' && Object.keys(p.evidence).length > 0)
      );
      if (!hasEvidence) {
        errors.push(`Completed phase "${p.name}" has empty evidence`);
      }
      if (p.gate_type === 'approval' && p.approved_by_user !== true) {
        errors.push(`Completed phase "${p.name}" has gate_type "approval" but approved_by_user is not true`);
      }
    }
  }

  if (state.current_phase && !phaseNames.has(state.current_phase)) {
    errors.push(`"current_phase" ("${state.current_phase}") is not in phases list`);
  }

  return { valid: errors.length === 0, errors };
}

async function cmdInit(options) {
  const template = await loadTemplate();
  const now = new Date().toISOString();

  template.started_at = now;
  template.updated_at = now;
  if (options.skill) template.skill = options.skill;
  if (options.mode) template.mode = options.mode;

  if (options.phases && options.phases.length > 0) {
    template.phases = options.phases.map((name, idx) => ({
      name,
      status: idx === 0 ? 'in_progress' : 'pending',
      evidence: null,
      gate_type: name.includes('plan') || name.includes('report') ? 'approval' : 'none',
      approved_by_user: false,
      completed_at: null,
    }));
    template.current_phase = options.phases[0];
    template.current_phase_index = 0;
  } else {
    template.phases[0].status = 'in_progress';
  }

  template.status = 'in_progress';
  await saveState(options.statePath, template);
  console.log(JSON.stringify({ status: 'initialized', path: options.statePath, state: template }, null, 2));
}

async function cmdGet(options, key) {
  const state = await loadState(options.statePath);
  const result = getByPath(state, key);
  if (result === undefined) {
    console.error(JSON.stringify({ error: `Key not found: ${key}` }));
    process.exit(2);
  }
  if (typeof result === 'object' && result !== null) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result);
  }
}

async function cmdSet(options, key, rawVal) {
  if (!key) {
    console.error(JSON.stringify({ error: 'Missing key to set. Usage: set <key> <value>' }));
    process.exit(2);
  }
  const state = await loadState(options.statePath);
  const val = parseValue(rawVal);
  setByPath(state, key, val);
  await saveState(options.statePath, state);
  console.log(JSON.stringify({ status: 'updated', key, value: val }, null, 2));
}

async function cmdAdvance(options) {
  const state = await loadState(options.statePath);

  if (!Array.isArray(state.phases) || state.phases.length === 0) {
    console.error(JSON.stringify({ error: 'Invalid state: no phases defined.' }));
    process.exit(2);
  }

  const currIdx = state.current_phase_index ?? state.phases.findIndex(p => p.name === state.current_phase);
  if (currIdx < 0 || currIdx >= state.phases.length) {
    console.error(JSON.stringify({ error: `Cannot advance: current_phase_index (${currIdx}) out of bounds.` }));
    process.exit(2);
  }

  const currPhase = state.phases[currIdx];

  // 1. Evidence check: must have non-empty evidence
  const hasEvidence = currPhase.evidence && (
    (typeof currPhase.evidence === 'string' && currPhase.evidence.trim().length > 0) ||
    (Array.isArray(currPhase.evidence) && currPhase.evidence.length > 0) ||
    (typeof currPhase.evidence === 'object' && Object.keys(currPhase.evidence).length > 0)
  );

  if (!hasEvidence) {
    console.error(JSON.stringify({
      error: 'REFUSAL_EMPTY_EVIDENCE',
      message: `Cannot advance past phase "${currPhase.name}": evidence is empty. Run checks/tests and record evidence before advancing.`,
      phase: currPhase.name,
    }, null, 2));
    process.exit(1);
  }

  // 2. Gate check: if gate_type is approval, approved_by_user must be true
  const isApprovalGate = currPhase.gate_type === 'approval' || currPhase.is_approval_gate === true;
  if (isApprovalGate && currPhase.approved_by_user !== true) {
    console.error(JSON.stringify({
      error: 'REFUSAL_APPROVAL_REQUIRED',
      message: `Cannot advance past phase "${currPhase.name}": user approval is required (gate_type="approval") but approved_by_user is false.`,
      phase: currPhase.name,
    }, null, 2));
    process.exit(1);
  }

  // Complete current phase
  const now = new Date().toISOString();
  currPhase.status = 'completed';
  currPhase.completed_at = now;

  // Next phase or finalize
  const nextIdx = currIdx + 1;
  if (nextIdx < state.phases.length) {
    state.current_phase_index = nextIdx;
    state.current_phase = state.phases[nextIdx].name;
    state.phases[nextIdx].status = 'in_progress';
  } else {
    state.current_phase = 'completed';
    state.status = 'completed';
    state.completed_at = now;
  }

  await saveState(options.statePath, state);
  console.log(JSON.stringify({
    status: 'advanced',
    completed_phase: currPhase.name,
    next_phase: state.current_phase,
    completed: state.status === 'completed',
  }, null, 2));
}

async function cmdValidate(options) {
  const state = await loadState(options.statePath);
  const result = validateState(state);
  if (!result.valid) {
    console.error(JSON.stringify({ valid: false, errors: result.errors }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ valid: true, skill: state.skill, phase: state.current_phase }, null, 2));
}

async function main() {
  const { command, options, positional } = parseArgs(process.argv.slice(2));

  if (options.help || !command) {
    printHelp();
    process.exit(options.help ? 0 : 2);
  }

  try {
    switch (command) {
      case 'init':
        await cmdInit(options);
        break;
      case 'get':
        await cmdGet(options, positional[0]);
        break;
      case 'set':
        await cmdSet(options, positional[0], positional[1]);
        break;
      case 'advance':
        await cmdAdvance(options);
        break;
      case 'validate':
        await cmdValidate(options);
        break;
      default:
        console.error(JSON.stringify({ error: `Unknown command: ${command}. Use --help for usage.` }));
        process.exit(2);
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(2);
  }
}

main();
