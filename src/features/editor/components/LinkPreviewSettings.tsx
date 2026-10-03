import { useState } from 'react';
import { normalizeOGEndpoint } from '../link-service';

interface Props {
  endpoint: string;
  defaultEndpoint: string;
  onChange: (endpoint: string | null) => void;
}

export default function LinkPreviewSettings({ endpoint, defaultEndpoint, onChange }: Props) {
  const [address, setAddress] = useState(() => new URL(endpoint, location.href).href);
  const [error, setError] = useState('');
  return (
    <form
      className="editor-panel-content"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          onChange(normalizeOGEndpoint(address, location.href));
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : '请检查实例地址。');
        }
      }}
    >
      <p className="editor-muted">使用自己或他人部署的公开实例，实时获取链接卡片。设置只保存在当前浏览器，所有草稿共用。</p>
      <label className="editor-field">
        <span>实例地址</span>
        <input
          type="text"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={address}
          maxLength={2048}
          onChange={(event) => {
            setAddress(event.target.value);
            setError('');
          }}
          placeholder="https://og.example.com"
          aria-describedby="editor-service-hint"
        />
      </label>
      <p id="editor-service-hint" className="editor-muted">
        填写域名会自动使用
        /api/editor/og，也可填写完整接口地址。实例需要允许跨域访问；只会接收需要预览的网页链接，文章原文与草稿不会发送。
      </p>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      <div className="editor-copy-actions">
        <button type="submit" className="editor-button editor-primary">
          使用此实例
        </button>
        <button type="button" className="editor-button" onClick={() => onChange(null)}>
          恢复默认
        </button>
      </div>
      <p className="editor-muted editor-service-default">默认服务：{new URL(defaultEndpoint, location.href).href}</p>
    </form>
  );
}
