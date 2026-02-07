import { Box, Text } from 'ink';
import { useEffect } from 'react';
import { AUTO_EXIT_DELAY, usePressAnyKey, useRetimer } from './shared';

interface HelpAppProps {
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function HelpApp({ showReturnHint = false, onComplete }: HelpAppProps) {
  const retimer = useRetimer();

  // 监听按键返回主菜单
  usePressAnyKey(showReturnHint, () => {
    onComplete?.();
  });

  // 如果不显示返回提示，直接退出
  useEffect(() => {
    if (!showReturnHint) {
      retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
    }
    return () => retimer();
  }, [showReturnHint, onComplete, retimer]);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>用法:</Text>
        <Text> pnpm koharu 交互式主菜单</Text>
        <Text> pnpm koharu new 新建内容</Text>
        <Text> pnpm koharu backup 备份博客内容和配置</Text>
        <Text> pnpm koharu restore 从备份恢复</Text>
        <Text> pnpm koharu generate 生成内容资产</Text>
        <Text> pnpm koharu clean 清理旧备份</Text>
        <Text> pnpm koharu list 查看所有备份</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>备份选项:</Text>
        <Text> --full 完整备份（包含所有图片和资产）</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>还原选项:</Text>
        <Text> --latest 还原最新备份</Text>
        <Text> --dry-run 预览将要还原的文件</Text>
        <Text> --force 跳过确认提示</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>清理选项:</Text>
        <Text> --keep N 保留最近 N 个备份，删除其余</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>生成选项:</Text>
        <Text> pnpm koharu generate lqips 生成 LQIP 占位符</Text>
        <Text> pnpm koharu generate similarities 生成相似度向量</Text>
        <Text> pnpm koharu generate summaries 生成 AI 摘要</Text>
        <Text> pnpm koharu generate all 生成全部</Text>
        <Text> --model {'<name>'} 指定 LLM 模型</Text>
        <Text> --force 强制重新生成</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>更新选项:</Text>
        <Text> --check 仅检查更新（不执行）</Text>
        <Text> --skip-backup 跳过备份步骤</Text>
        <Text> --force 跳过确认提示</Text>
        <Text> --tag {'<version>'} 指定目标版本（如 v2.0.0）</Text>
        <Text> --rebase 使用 rebase 模式（重写历史，强制备份）</Text>
        <Text> --clean 使用 clean 模式（零冲突，强制备份）</Text>
        <Text> --dry-run 预览操作（不实际执行）</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>新建选项:</Text>
        <Text> pnpm koharu new 交互式选择内容类型</Text>
        <Text> pnpm koharu new post 新建博客文章</Text>
        <Text> pnpm koharu new friend 新建友情链接</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold>通用选项:</Text>
        <Text> --help, -h 显示帮助信息</Text>
      </Box>

      {showReturnHint && (
        <Box marginTop={1}>
          <Text dimColor>按任意键返回主菜单...</Text>
        </Box>
      )}
    </Box>
  );
}
