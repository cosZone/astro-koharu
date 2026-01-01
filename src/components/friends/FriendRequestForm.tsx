import { friendsIntro } from '@constants/friends-config';
import { useClipboard } from 'foxact/use-clipboard';
import { useCallback, useState } from 'react';
import SakuraSVG from '../svg/SakuraSvg';

interface FormData {
  site: string;
  owner: string;
  url: string;
  desc: string;
  image: string;
  color: string;
}

export default function FriendRequestForm() {
  const [formData, setFormData] = useState<FormData>({
    site: '',
    owner: '',
    url: '',
    desc: '',
    image: '',
    color: '#ffc0cb',
  });

  const { copied, copy } = useClipboard({ timeout: 2000 });

  const generateText = useCallback(() => {
    return `site: ${formData.site || '站点名称'}
url: ${formData.url || 'https://example.com'}
owner: ${formData.owner || '您的昵称'}
desc: ${formData.desc || '站点描述'}
image: ${formData.image || 'https://example.com/avatar.jpg'}
color: "${formData.color || '#ffc0cb'}"`;
  }, [formData]);

  const handleCopy = useCallback(() => {
    const yaml = generateText();
    copy(yaml);
  }, [copy, generateText]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [], // 空依赖 - 使用函数式更新
  );

  return (
    <div className="mb-4 w-full">
      <div className="relative overflow-hidden rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-sm md:p-3 dark:border-gray-800 dark:bg-gray-900">
        {/* Cute Corner Decor */}
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-pink-100/50 dark:bg-pink-900/20" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-blue-100/50 dark:bg-blue-900/20" />

        <div className="grid grid-cols-2 gap-12 md:grid-cols-1 md:gap-8">
          {/* Left Side: Form */}
          <div className="relative z-10">
            <div className="mb-6">
              <h2 className="mb-2 flex items-center gap-2 font-black text-2xl text-gray-800 dark:text-white">
                <SakuraSVG className="size-6 animate-spin text-[#FFC0CB] duration-10000" />
                申请友链
              </h2>
              <p className="font-medium text-gray-500 text-sm dark:text-gray-400">{friendsIntro.applyDesc}</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="group relative">
                  <label htmlFor="friend-site" className="mb-1.5 block font-bold text-gray-400 text-xs uppercase tracking-wide">
                    站点名称
                  </label>
                  <input
                    id="friend-site"
                    type="text"
                    name="site"
                    value={formData.site}
                    onChange={handleChange}
                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 font-bold text-gray-700 text-sm transition-all focus:border-pink-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200 dark:focus:border-pink-700 dark:focus:bg-gray-800 dark:focus:ring-pink-900/30"
                    placeholder="我的博客"
                  />
                </div>
                <div className="group relative">
                  <label
                    htmlFor="friend-owner"
                    className="mb-1.5 block font-bold text-gray-400 text-xs uppercase tracking-wide"
                  >
                    昵称
                  </label>
                  <input
                    id="friend-owner"
                    type="text"
                    name="owner"
                    value={formData.owner}
                    onChange={handleChange}
                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 font-bold text-gray-700 text-sm transition-all focus:border-pink-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200 dark:focus:border-pink-700 dark:focus:bg-gray-800 dark:focus:ring-pink-900/30"
                    placeholder="您的昵称"
                  />
                </div>
              </div>

              <div className="group relative">
                <label htmlFor="friend-url" className="mb-1.5 block font-bold text-gray-400 text-xs uppercase tracking-wide">
                  站点链接
                </label>
                <input
                  id="friend-url"
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 font-bold text-gray-700 text-sm transition-all focus:border-pink-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200 dark:focus:border-pink-700 dark:focus:bg-gray-800 dark:focus:ring-pink-900/30"
                  placeholder="https://your-site.com"
                />
              </div>

              <div className="group relative">
                <label htmlFor="friend-desc" className="mb-1.5 block font-bold text-gray-400 text-xs uppercase tracking-wide">
                  站点描述
                </label>
                <textarea
                  id="friend-desc"
                  name="desc"
                  value={formData.desc}
                  onChange={handleChange}
                  rows={2}
                  className="w-full resize-none rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 font-bold text-gray-700 text-sm transition-all focus:border-pink-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200 dark:focus:border-pink-700 dark:focus:bg-gray-800 dark:focus:ring-pink-900/30"
                  placeholder="一句话描述..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="group relative">
                  <label
                    htmlFor="friend-image"
                    className="mb-1.5 block font-bold text-gray-400 text-xs uppercase tracking-wide"
                  >
                    头像链接
                  </label>
                  <input
                    id="friend-image"
                    type="url"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 font-bold text-gray-700 text-sm transition-all focus:border-pink-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200 dark:focus:border-pink-700 dark:focus:bg-gray-800 dark:focus:ring-pink-900/30"
                    placeholder="https://..."
                  />
                </div>
                <div className="group relative">
                  <label
                    htmlFor="friend-color"
                    className="mb-1.5 block font-bold text-gray-400 text-xs uppercase tracking-wide"
                  >
                    主题色
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-xl border-2 border-gray-100 shadow-sm transition-transform hover:scale-105 dark:border-gray-700">
                      <input
                        id="friend-color"
                        type="color"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] cursor-pointer p-0"
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 font-bold text-gray-700 text-sm transition-all focus:border-pink-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200 dark:focus:border-pink-700 dark:focus:bg-gray-800 dark:focus:ring-pink-900/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Preview / Code */}
          <div className="relative flex flex-col justify-center rounded-xl bg-gray-50 p-6 md:p-3 dark:bg-gray-800/50">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-xl uppercase tracking-wider">配置预览</h3>
              <button
                type="button"
                onClick={handleCopy}
                className="group relative px-3 py-2 font-bold text-base transition-transform hover:-translate-y-1 dark:text-white"
              >
                <div className="absolute inset-0 rotate-[1deg] rounded-lg border-2 border-foreground border-dashed transition-all group-hover:rotate-0 dark:border-white"></div>
                {copied ? '已复制!' : '复制配置'}
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-xl border-2 border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-950/50">
              <pre className="whitespace-pre-wrap font-mono text-gray-600 text-xs leading-relaxed dark:text-gray-300">
                {generateText()}
              </pre>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-xl bg-pink-50 p-4 font-medium text-pink-600 text-xs dark:bg-pink-900/20 dark:text-pink-300">
              提示: 复制上方代码并在下方评论区粘贴发送即可，我会收到的～
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
