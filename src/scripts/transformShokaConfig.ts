// 旧 Shoka 配置文件转换
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

type Config = {
  category_map: Record<string, string>;
};

function transformShokaConfig() {
  try {
    // 从项目根目录读取 _config.yml 文件
    const configPath = path.join(process.cwd(), '_config.yml');

    // 添加文件存在性检查
    if (!fs.existsSync(configPath)) {
      console.log('配置文件不存在，使用默认配置:', configPath);
      return null;
    }
    const fileContents = fs.readFileSync(configPath, 'utf8');

    // 解析 YAML
    const config: Config = yaml.load(fileContents) as Config;

    if (!config) return null;
    // 提取 category_map
    const categoryMap = config.category_map || {};
    console.log('读取到的分类映射:', categoryMap); // 添加调试日志
    return { categoryMap };
  } catch (error) {
    console.error('转换分类配置时出错:', error);
    return null;
  }
}

export default transformShokaConfig;
