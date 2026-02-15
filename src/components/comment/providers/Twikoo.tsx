import { useEffect, useRef } from 'react';
import { commentConfig } from '@/constants/site-config';
import 'twikoo/dist/twikoo.css' // 必须单独加载 css，不然样式会丢失
// @ts-ignore IDE 找不到类型定义标红
import { init } from 'twikoo/dist/twikoo.nocss.js'
// Config is module-level static data parsed from YAML at build time - won't change at runtime
const config = commentConfig.twikoo;

export default function Twikoo() {
  const twikooInstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config || !containerRef.current) return;

    // 初始化 Twikoo
    const initTwikoo = () => {
      if (!containerRef.current) return;

      // 确保容器元素存在
      const container = containerRef.current;
      
      // 清空容器内容，避免重复初始化
      container.innerHTML = '';

      // 初始化 Twikoo
      init({
        envId: config.envId,
        el: container,
        region: config.region,
        path: config.path ?? window.location.pathname,
        lang: config.lang,
      });
    };
    
    // 加载并初始化 Twikoo
    initTwikoo();

    // Handle Astro page transitions - reload Twikoo when navigating
    const handlePageLoad = () => {
      initTwikoo();
    };
    document.addEventListener('astro:page-load', handlePageLoad);

    return () => {
      document.removeEventListener('astro:page-load', handlePageLoad);
    };
  }, []);

  if (!config) return null;
  

  return <div ref={containerRef} id={config.el?.replace('#', '') || 'tcomment'} />;
}
