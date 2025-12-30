type JsonRpcId = number;
type JsonRpcReq = { jsonrpc: "2.0"; id: JsonRpcId; method: string; params?: any };
type JsonRpcRes = { jsonrpc: "2.0"; id: JsonRpcId; result?: any; error?: { code?: number; message: string; data?: any } };

export type NetworkRequest = {
  reqid?: string;
  url?: string;
  method?: string;
  status?: number;
  resourceType?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  [k: string]: any;
};

export type ConsoleMessage = {
  msgid?: number;
  level?: string;
  text?: string;
  url?: string;
  line?: number;
  column?: number;
  timestamp?: number;
  [k: string]: any;
};

export class ChromeDevToolsClient {
  private nextId = 1;
  private pending = new Map<JsonRpcId, (res: JsonRpcRes) => void>();
  private buf = "";
  private ready = false;
  private onData = (chunk: Buffer | string) => this.handleData(chunk.toString());

  constructor(private input = process.stdin, private output = process.stdout) {}

  init(): void {
    if (this.ready) return;
    this.ready = true;
    this.input.setEncoding?.("utf8");
    this.input.on("data", this.onData);
  }

  close(): void {
    if (!this.ready) return;
    this.ready = false;
    this.input.off("data", this.onData);
    for (const resolve of this.pending.values()) resolve({ jsonrpc: "2.0", id: -1, error: { message: "closed" } });
    this.pending.clear();
  }

  async navigateToPage(url: string): Promise<void> {
    try {
      await this.callTool("mcp__chrome-devtools__navigate_page", { type: "url", url });
    } catch {
      return null as any;
    }
  }

  async evaluateScript(fn: string): Promise<any> {
    try {
      return await this.callTool("mcp__chrome-devtools__evaluate_script", { function: fn });
    } catch {
      return null;
    }
  }

  async getNetworkRequests(): Promise<NetworkRequest[]> {
    try {
      return (await this.callTool("mcp__chrome-devtools__list_network_requests", {})) as NetworkRequest[];
    } catch {
      return null as any;
    }
  }

  async getConsoleMessages(level?: string): Promise<ConsoleMessage[]> {
    try {
      const types = level ? [level] : undefined;
      return (await this.callTool("mcp__chrome-devtools__list_console_messages", { types })) as ConsoleMessage[];
    } catch {
      return null as any;
    }
  }

  async waitForCondition(condition: string, timeout: number): Promise<void> {
    const start = Date.now();
    try {
      while (Date.now() - start < timeout) {
        const ok = await this.evaluateScript(`() => { try { return !!(${condition}); } catch { return false; } }`);
        if (ok) return;
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch {
      return null as any;
    }
    return null as any;
  }

  private async callTool(name: string, args: any): Promise<any> {
    this.init();
    const id = this.nextId++;
    const req: JsonRpcReq = { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } };
    const res = await new Promise<JsonRpcRes>((resolve) => {
      this.pending.set(id, resolve);
      this.output.write(JSON.stringify(req) + "\n");
    });
    if (res.error) throw new Error(res.error.message);
    return res.result;
  }

  private handleData(chunk: string) {
    this.buf += chunk;
    while (true) {
      const nl = this.buf.indexOf("\n");
      if (nl < 0) return;
      const line = this.buf.slice(0, nl).trim();
      this.buf = this.buf.slice(nl + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line) as JsonRpcRes;
        const resolve = this.pending.get(msg.id);
        if (resolve) {
          this.pending.delete(msg.id);
          resolve(msg);
        }
      } catch {
        // ignore malformed lines
      }
    }
  }
}

