import { spawn, ChildProcess } from 'child_process';
import { createInterface } from 'readline';

interface JsonRpcRes { id: number; result?: any; error?: any; }

export class SpawningChromeDevToolsClient {
  private proc: ChildProcess | null = null;
  private nextId = 1;
  private pending = new Map<number, (res: JsonRpcRes) => void>();

  async init() {
    await this.killZombies();

    this.proc = spawn('npx', ['-y', 'chrome-devtools-mcp@latest'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const rl = createInterface({ input: this.proc.stdout! });
    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line);
        if (msg.id && this.pending.has(msg.id)) {
          this.pending.get(msg.id)!(msg);
          this.pending.delete(msg.id);
        }
      } catch { /* ignore non-JSON output */ }
    });

    this.proc.stderr?.on('data', () => {}); // Consume stderr to prevent deadlock
    this.proc.on('exit', () => this.close());

    // Wait for process to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async killZombies() {
    return new Promise<void>((resolve) => {
      const killer = spawn('pkill', ['-f', 'chrome-devtools-mcp']);
      killer.on('close', () => {
        setTimeout(resolve, 500);
      });
    });
  }

  async callTool(name: string, args: any = {}): Promise<any> {
    if (!this.proc) throw new Error('Client not initialized');
    const id = this.nextId++;
    const req = { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('RPC timeout after 30s'));
      }, 30000);

      this.pending.set(id, (res) => {
        clearTimeout(timeout);
        if (res.error) {
          reject(res.error);
        } else {
          // Extract actual data from MCP content wrapper
          const result = res.result;
          if (result && result.content && Array.isArray(result.content)) {
            // MCP tools return {content: [{type: "text", text: "..."}]}
            const textContent = result.content.find((c: any) => c.type === 'text')?.text || '';

            // For evaluate_script, extract JSON from markdown code blocks
            const jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
              try {
                resolve(JSON.parse(jsonMatch[1]));
                return;
              } catch {
                // If JSON parsing fails, try parsing directly
              }
            }

            // Try parsing as JSON directly (not wrapped in markdown)
            try {
              resolve(JSON.parse(textContent));
              return;
            } catch {
              // Not JSON, return as-is
            }

            // Return the text content as-is
            resolve(textContent);
          } else {
            resolve(result);
          }
        }
      });

      const success = this.proc?.stdin?.write(JSON.stringify(req) + '\n');
      if (!success) {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(new Error('Write buffer full or process closed'));
      }
    });
  }

  async navigateToPage(url: string) {
    return this.callTool('navigate_page', { type: 'url', url });
  }

  async getNetworkRequests() {
    // Use evaluate_script to get structured JSON instead of markdown
    const result = await this.callTool('evaluate_script', {
      function: `() => {
        // Get all resource entries
        const resources = performance.getEntriesByType('resource');
        return resources.map((r, idx) => ({
          reqid: idx + 1,
          url: r.name,
          method: 'GET',
          resourceType: r.initiatorType || 'other',
          status: 200,
          duration: r.duration
        }));
      }`
    });
    return result;
  }

  async evaluateScript(func: string) {
    return this.callTool('evaluate_script', { function: func });
  }

  async waitFor(text: string, timeout: number = 30000) {
    return this.callTool('wait_for', { text, timeout });
  }

  close() {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
    this.pending.clear();
  }
}
