import { spawn, ChildProcess } from 'child_process';
import { createInterface } from 'readline';

interface JsonRpcRes { id: number; result?: any; error?: any; }

interface PendingPromise {
  resolve: (res: JsonRpcRes) => void;
  reject: (error: any) => void;
}

export class SpawningChromeDevToolsClient {
  private proc: ChildProcess | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingPromise>();

  async init() {
    await this.killZombies();

    console.log('[ChromeClient] Spawning chrome-devtools-mcp process...');
    this.proc = spawn('npx', [
      '-y',
      'chrome-devtools-mcp@latest',
      '--chrome-arg=--no-sandbox',
      '--chrome-arg=--disable-setuid-sandbox',
      '--chrome-arg=--disable-dev-shm-usage',
      '--chrome-arg=--disable-gpu',
      '--headless'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true
    });

    // Capture stderr for debugging
    let stderrOutput = '';
    this.proc.stderr?.on('data', (data) => {
      const text = data.toString();
      stderrOutput += text;
      console.error('[ChromeClient stderr]', text);
    });

    // Handle process errors
    this.proc.on('error', (err) => {
      console.error('[ChromeClient] Process error:', err);
      this.proc = null;
    });

    // Track if process exits prematurely
    let processExited = false;
    this.proc.on('exit', (code, signal) => {
      console.log(`[ChromeClient] Process exited with code ${code}, signal ${signal}`);
      processExited = true;
      this.close();
    });

    const rl = createInterface({ input: this.proc.stdout! });
    rl.on('line', (line) => {
      console.log('[ChromeClient stdout]', line);
      try {
        const msg = JSON.parse(line);
        if (msg.id && this.pending.has(msg.id)) {
          this.pending.get(msg.id)!.resolve(msg);
          this.pending.delete(msg.id);
        }
      } catch { /* ignore non-JSON output */ }
    });

    // Wait for process to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if process is still alive
    if (!this.proc || processExited) {
      throw new Error(`chrome-devtools-mcp failed to start. stderr: ${stderrOutput}`);
    }

    console.log('[ChromeClient] Process initialized successfully');
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

      this.pending.set(id, { resolve: (res) => {
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
      }, reject });

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
    // Use the actual chrome-devtools-mcp list_network_requests tool
    const result = await this.callTool('list_network_requests', {
      includePreservedRequests: false,
      resourceTypes: [] // Empty array returns all types
    });

    // Parse markdown response into structured format
    // Response format: "reqid=1 GET https://url [success - 200]"
    if (typeof result === 'string') {
      const lines = result.split('\n');
      const requests = [];

      for (const line of lines) {
        // Match pattern: reqid=123 METHOD URL [status - code]
        const match = line.match(/reqid=(\d+)\s+(\w+)\s+(https?:\/\/[^\s]+).*\[.*-\s*(\d+)\]/);
        if (match) {
          const [, reqid, method, url, status] = match;
          requests.push({
            reqid: parseInt(reqid),
            url,
            method,
            status: parseInt(status),
            resourceType: this.guessResourceType(url)
          });
        }
      }

      return requests;
    }

    return result;
  }

  private guessResourceType(url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.js')) return 'script';
    if (urlLower.includes('.css')) return 'stylesheet';
    if (urlLower.match(/\.(png|jpg|jpeg|gif|svg|webp)/)) return 'image';
    if (urlLower.match(/\.(woff|woff2|ttf|eot)/)) return 'font';
    if (urlLower.includes('/xhr') || urlLower.includes('/api/')) return 'xhr';
    return 'other';
  }

  async evaluateScript(func: string) {
    return this.callTool('evaluate_script', { function: func });
  }

  async waitFor(text: string, timeout: number = 30000) {
    return this.callTool('wait_for', { text, timeout });
  }

  close() {
    // Reject all pending promises before cleanup
    for (const [id, promise] of this.pending.entries()) {
      promise.reject(new Error('Client closed'));
    }
    this.pending.clear();

    // Kill the entire process tree
    if (this.proc && this.proc.pid) {
      try {
        // Kill process group (Chrome + all children)
        process.kill(-this.proc.pid, 'SIGKILL');
      } catch {
        // Fallback if process group kill fails
        this.proc.kill('SIGKILL');
      }
      this.proc = null;
    }
  }
}
