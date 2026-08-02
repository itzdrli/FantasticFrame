/**
 * FantasticFrame — Electrobun RPC Schema
 *
 * 定义 webview（前端）与 bun（主进程）之间的 RPC 协议。
 * 此文件需同时被两侧导入，请勿引入任何特定端的运行时依赖。
 */

/**
 * 参照 electrobun/dist/api/shared/rpc.ts 中的 ElectrobunRPCSchema 接口
 * 此处手动内联类型，避免在 web 端引入 bun-only 包。
 */
export interface FantasticFrameRPCSchema {
  /** bun 端注册的处理方法（webview 可以 request 调用） */
  bun: {
    requests: {
      /**
       * 打开系统目录选择器，返回用户选择的目录路径。
       * 取消时返回空字符串。
       */
      selectExportDir: {
        params: { startingFolder?: string };
        response: string;
      };
      /**
       * 将 base64 data URL 写入指定目录。
       * 返回写入成功后的完整文件路径；失败时抛出错误。
       */
      saveFile: {
        params: {
          /** 目标目录绝对路径 */
          dir: string;
          /** 文件名（含扩展名） */
          filename: string;
          /** 带 data URI 前缀的 base64 字符串：data:image/<type>;base64,… */
          dataUrl: string;
        };
        response: string;
      };
    };
    messages: Record<never, unknown>;
  };
  /** webview 端注册的处理方法（bun 可以调用；目前为空） */
  webview: {
    requests: Record<never, unknown>;
    messages: Record<never, unknown>;
  };
}
