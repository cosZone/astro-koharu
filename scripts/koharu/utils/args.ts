import type { GenerateType } from '../constants/generate';

export interface ParsedArgs {
  command: string;
  full: boolean;
  latest: boolean;
  list: boolean;
  dryRun: boolean;
  force: boolean;
  help: boolean;
  keep: number | null;
  backupFile: string;
  // Generate command options
  generateType: GenerateType | 'all' | null;
  model: string | null;
  // Update command options
  check: boolean;
  skipBackup: boolean;
}

/**
 * 解析命令行参数
 */
const GENERATE_TYPES = ['lqips', 'similarities', 'summaries', 'all'] as const;

export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
  const args: ParsedArgs = {
    command: '',
    full: false,
    latest: false,
    list: false,
    dryRun: false,
    force: false,
    help: false,
    keep: null,
    backupFile: '',
    generateType: null,
    model: null,
    check: false,
    skipBackup: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--full') {
      args.full = true;
    } else if (arg === '--latest') {
      args.latest = true;
    } else if (arg === '--list') {
      args.list = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--keep' && argv[i + 1]) {
      const n = Number.parseInt(argv[i + 1], 10);
      if (!Number.isNaN(n) && n > 0) {
        args.keep = n;
      }
      i++;
    } else if (arg === '--model' && argv[i + 1]) {
      args.model = argv[i + 1];
      i++;
    } else if (arg === '--check') {
      args.check = true;
    } else if (arg === '--skip-backup') {
      args.skipBackup = true;
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      if (!args.command) {
        args.command = arg;
      } else if (args.command === 'generate' && !args.generateType) {
        // For generate command, second positional arg is the type
        if (GENERATE_TYPES.includes(arg as (typeof GENERATE_TYPES)[number])) {
          args.generateType = arg as GenerateType | 'all';
        }
      } else {
        args.backupFile = arg;
      }
    }
  }

  return args;
}
