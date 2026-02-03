import fs from 'node:fs';
import path from 'node:path';
import { Box, render, Text, useApp } from 'ink';
import { useState } from 'react';
import { BackupApp } from './koharu/backup.js';
import { CleanApp } from './koharu/clean.js';
import { CycleSelect as Select } from './koharu/components';
import { GenerateApp } from './koharu/generate.js';
import { HelpApp } from './koharu/help.js';
import { ListApp } from './koharu/list.js';
import { NewApp } from './koharu/new.js';
import { RestoreApp } from './koharu/restore.js';
import { BACKUP_DIR, getBackupList, parseArgs } from './koharu/shared.js';
import { UpdateApp } from './koharu/update.js';

const args = parseArgs();

// 显示帮助
if (args.help) {
  console.log(`
koharu - astro-koharu CLI

用法:
  pnpm koharu              交互式主菜单
  pnpm koharu backup       备份博客内容和配置
  pnpm koharu restore      从备份恢复
  pnpm koharu update       更新主题
  pnpm koharu clean        清理旧备份
  pnpm koharu list         查看所有备份
  pnpm koharu generate     生成内容资产
  pnpm koharu new          新建内容

备份选项:
  --full                   完整备份（包含所有图片和资产）

还原选项:
  --latest                 还原最新备份
  --dry-run                预览将要还原的文件
  --force                  跳过确认提示

更新选项:
  --check                  仅检查更新（不执行）
  --skip-backup            跳过备份步骤
  --force                  跳过确认提示
  --tag <version>          指定目标版本（如 v2.0.0）
  --rebase                 使用 rebase 模式（重写历史，强制备份）
  --dry-run                预览 rebase 操作（不实际执行）

清理选项:
  --keep N                 保留最近 N 个备份，删除其余

生成选项:
  pnpm koharu generate lqips        生成 LQIP 图片占位符
  pnpm koharu generate similarities 生成相似度向量
  pnpm koharu generate summaries    生成 AI 摘要
  pnpm koharu generate all          生成全部
  --model <name>                    指定 LLM 模型 (用于 summaries)
  --force                           强制重新生成 (用于 summaries)

新建选项:
  pnpm koharu new                   交互式选择内容类型
  pnpm koharu new post              新建博客文章
  pnpm koharu new friend            新建友情链接

通用选项:
  --help, -h               显示帮助信息
`);
  process.exit(0);
}

type AppMode = 'menu' | 'backup' | 'restore' | 'update' | 'clean' | 'list' | 'help' | 'generate' | 'new';

function KoharuApp() {
  const { exit } = useApp();
  // 判断是否从主菜单进入（没有命令行参数）
  const [fromMenu] = useState(() => !args.command);
  const [mode, setMode] = useState<AppMode>(() => {
    // 根据命令行参数决定初始模式
    if (args.command === 'backup') return 'backup';
    if (args.command === 'restore') return 'restore';
    if (args.command === 'update') return 'update';
    if (args.command === 'clean') return 'clean';
    if (args.command === 'list') return 'list';
    if (args.command === 'help') return 'help';
    if (args.command === 'generate') return 'generate';
    if (args.command === 'new') return 'new';
    return 'menu';
  });

  const handleComplete = () => {
    if (fromMenu) {
      // 从主菜单进入的，返回主菜单
      setMode('menu');
    } else {
      // 命令行直接进入的，完成后退出
      setTimeout(() => exit(), 100);
    }
  };

  const handleMenuSelect = (value: string) => {
    if (value === 'exit') {
      exit();
      return;
    }
    setMode(value as AppMode);
  };

  // 获取还原用的备份文件
  const getRestoreBackupFile = (): string | undefined => {
    if (args.latest) {
      const backups = getBackupList();
      if (backups.length > 0) {
        return backups[0].path;
      }
    } else if (args.backupFile) {
      if (fs.existsSync(args.backupFile)) {
        return args.backupFile;
      }
      const inBackupDir = path.join(BACKUP_DIR, args.backupFile);
      if (fs.existsSync(inBackupDir)) {
        return inBackupDir;
      }
    }
    return undefined;
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          koharu
        </Text>
        <Text dimColor> - astro-koharu CLI</Text>
      </Box>

      {mode === 'menu' && (
        <Box flexDirection="column">
          <Text>请选择操作:</Text>
          <Select
            visibleOptionCount={10}
            options={[
              { label: '新建 - 创建博客文章或友链', value: 'new' },
              { label: '备份 - 备份博客内容和配置', value: 'backup' },
              { label: '还原 - 从备份恢复', value: 'restore' },
              { label: '更新 - 更新主题', value: 'update' },
              { label: '生成 - 生成内容资产 (LQIP, 相似度, 摘要)', value: 'generate' },
              { label: '清理 - 清理旧备份', value: 'clean' },
              { label: '列表 - 查看所有备份', value: 'list' },
              { label: '帮助 - 查看命令用法', value: 'help' },
              { label: '退出', value: 'exit' },
            ]}
            onChange={handleMenuSelect}
          />
        </Box>
      )}

      {mode === 'backup' && <BackupApp initialFull={args.full} showReturnHint={fromMenu} onComplete={handleComplete} />}

      {mode === 'restore' && (
        <RestoreApp
          initialBackupFile={getRestoreBackupFile()}
          dryRun={args.dryRun}
          force={args.force}
          showReturnHint={fromMenu}
          onComplete={handleComplete}
        />
      )}

      {mode === 'update' && (
        <UpdateApp
          checkOnly={args.check}
          skipBackup={args.skipBackup}
          force={args.force}
          targetTag={args.tag || undefined}
          rebase={args.rebase}
          dryRun={args.dryRun}
          showReturnHint={fromMenu}
          onComplete={handleComplete}
        />
      )}

      {mode === 'clean' && <CleanApp keepCount={args.keep} showReturnHint={fromMenu} onComplete={handleComplete} />}

      {mode === 'list' && <ListApp showReturnHint={fromMenu} onComplete={handleComplete} />}

      {mode === 'help' && <HelpApp showReturnHint={fromMenu} onComplete={handleComplete} />}

      {mode === 'generate' && (
        <GenerateApp
          initialType={args.generateType || undefined}
          initialModel={args.model || undefined}
          force={args.force}
          showReturnHint={fromMenu}
          onComplete={handleComplete}
        />
      )}

      {mode === 'new' && (
        <NewApp initialType={args.newType || undefined} showReturnHint={fromMenu} onComplete={handleComplete} />
      )}
    </Box>
  );
}

render(<KoharuApp />);
