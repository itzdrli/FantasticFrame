/**
 * useElectrobunRpc — 封装 Electrobun browser 端的 RPC 调用。
 *
 * 在 Electrobun 桌面环境中，window.__electrobunWebviewId 被注入，
 * 通过 Electroview.defineRPC 与主进程通信。
 * 在普通浏览器中（web 模式），所有调用均退化为 no-op / 返回空值。
 */

import type { FantasticFrameRPCSchema } from '~~/shared/rpc';

type RpcInstance = Awaited<ReturnType<typeof initRpc>>;

// Electrobun browser 端 RPC 实例（懒初始化，模块级单例）
let _rpcPromise: Promise<RpcInstance> | null = null;

async function initRpc(): Promise<ReturnType<typeof import('electrobun/browser')['Electroview']['defineRPC']> | null> {
  // 仅在 Electrobun webview 中可用（window.__electrobunWebviewId 存在）
  if (typeof window === 'undefined' || !(window as any).__electrobunWebviewId) {
    return null;
  }
  try {
    // 使用变量避开 Rollup/Nitro 服务端构建时的静态分析
    const viewPkg = 'electrobun/view';
    const { Electroview } = await import(/* @vite-ignore */ viewPkg);
    const rpc = Electroview.defineRPC<FantasticFrameRPCSchema>({
      handlers: {
        requests: {},
        messages: {},
      },
    });
    new Electroview({ rpc });
    return rpc;
  } catch (err) {
    console.warn('[FantasticFrame] Electrobun RPC 初始化失败:', err);
    return null;
  }
}

function getRpc(): Promise<RpcInstance> {
  if (!_rpcPromise) {
    _rpcPromise = initRpc();
  }
  return _rpcPromise;
}

export const useElectrobunRpc = () => {
  /**
   * 是否运行在 Electrobun 桌面环境
   */
  const isDesktop = (): boolean =>
    typeof window !== 'undefined' && !!(window as any).__electrobunWebviewId;

  /**
   * 打开系统目录选择器，返回用户选中的路径。
   * 非桌面环境或用户取消时返回空字符串。
   */
  const selectExportDir = async (startingFolder?: string): Promise<string> => {
    const rpc = await getRpc();
    if (!rpc) return '';
    try {
      return await rpc.request('selectExportDir', { startingFolder });
    } catch (err) {
      console.error('[FantasticFrame] selectExportDir 失败:', err);
      return '';
    }
  };

  /**
   * 将 base64 data URL 写入指定目录。
   * 成功返回完整写入路径；非桌面环境返回空字符串。
   */
  const saveFile = async (
    dir: string,
    filename: string,
    dataUrl: string,
  ): Promise<string> => {
    const rpc = await getRpc();
    if (!rpc) return '';
    try {
      return await rpc.request('saveFile', { dir, filename, dataUrl });
    } catch (err) {
      console.error('[FantasticFrame] saveFile 失败:', err);
      throw err;
    }
  };

  return { isDesktop, selectExportDir, saveFile };
};
