import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ChromeDevToolsClient } from "./chrome-devtools-client.js";
import { classifyNetworkRequests } from "../analyzer/network-classifier.js";
import { queryAdTechAPIs } from "../analyzer/api-query-orchestrator.js";
import { VENDOR_PATTERNS } from "../analyzer/vendor-patterns.js";

// Tool argument interfaces
interface AnalyzeSiteArgs {
  url: string;
  device?: "mobile" | "desktop";
  timeout?: number;
  snapshot?: boolean;
}

interface ListVendorsArgs {
  url: string;
}

interface DetectManagedServiceArgs {
  url: string;
}

interface GetNetworkRequestsArgs {
  url: string;
  category?: string;
  type?: string;
}

// Result cache (simple in-memory for now)
const analysisCache = new Map<string, any>();

// MCP Server implementation
const server = new Server(
  {
    name: "ad-tech-analyzer",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "analyze_site",
        description:
          "Performs comprehensive ad-tech analysis: vendor detection, network classification, managed service detection, Prebid/GAM analysis",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Full URL to analyze (e.g., https://example.com)",
            },
            device: {
              type: "string",
              enum: ["mobile", "desktop"],
              description: "Device emulation (default: desktop)",
            },
            timeout: {
              type: "number",
              description: "Analysis timeout in ms (default: 30000)",
            },
            snapshot: {
              type: "boolean",
              description: "Capture DOM snapshot (default: false)",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "list_vendors",
        description: "Quick vendor identification - returns all detected ad-tech vendors (SSPs, wrappers, analytics)",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to analyze" },
          },
          required: ["url"],
        },
      },
      {
        name: "detect_managed_service",
        description:
          "Detects if site uses managed ad wrapper (Adapex, Freestar, Mediavine, AdPushup, Ezoic, Pubgalaxy, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to check" },
          },
          required: ["url"],
        },
      },
      {
        name: "get_network_requests",
        description: "Retrieves classified network requests with optional filtering by category or type",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
            category: {
              type: "string",
              enum: ["ssp", "ad_server", "header_bidding", "managed_service", "identity", "consent"],
              description: "Filter by vendor category",
            },
            type: {
              type: "string",
              enum: ["script", "xhr", "fetch", "image"],
              description: "Filter by request type",
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "vendor_patterns://list",
        name: "Ad-Tech Vendor Detection Patterns",
        mimeType: "application/json",
        description: "Complete list of regex patterns used to detect ad-tech vendors",
      },
    ],
  };
});

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "vendor_patterns://list") {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(VENDOR_PATTERNS, null, 2),
        },
      ],
    };
  }

  // Check for cached analysis results
  if (uri.startsWith("analysis_results://")) {
    const url = uri.replace("analysis_results://", "");
    const cached = analysisCache.get(url);
    if (cached) {
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(cached, null, 2),
          },
        ],
      };
    }
    throw new Error(`No cached analysis for ${url}`);
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "analyze_site":
        return await handleAnalyzeSite(args as AnalyzeSiteArgs);
      case "list_vendors":
        return await handleListVendors(args as ListVendorsArgs);
      case "detect_managed_service":
        return await handleDetectManagedService(args as DetectManagedServiceArgs);
      case "get_network_requests":
        return await handleGetNetworkRequests(args as GetNetworkRequestsArgs);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool handlers
async function handleAnalyzeSite(args: AnalyzeSiteArgs) {
  const { url, device = "desktop", timeout = 30000 } = args;

  const client = new ChromeDevToolsClient();
  client.init();

  try {
    // Navigate and collect data
    // TODO: Add viewport resizing when ChromeDevToolsClient supports it
    await client.navigateToPage(url);

    // Collect network requests
    const networkRequests = await client.getNetworkRequests();

    // Query APIs
    const apiData = await queryAdTechAPIs(client);

    // Classify network
    const classification = classifyNetworkRequests(networkRequests);

    const result = {
      url,
      timestamp: new Date().toISOString(),
      device,
      vendors: classification.vendors,
      vendor_count: classification.vendors.length,
      ssp_count: classification.ssp_count,
      managed_service: classification.managed_service,
      categories: classification.categories,
      prebid: {
        detected: apiData.pbjs.present,
        config: apiData.pbjs.config,
        bid_responses: apiData.pbjs.bidResponses,
      },
      gam: {
        detected: apiData.gam.present,
        slots: apiData.gam.slots,
        targeting: apiData.gam.targeting,
      },
      managed_services_detected: apiData.managedServices,
      custom_wrappers: apiData.customWrappers,
      network: {
        total_requests: networkRequests.length,
        classified_requests: classification.vendors.length,
      },
    };

    // Cache result
    analysisCache.set(url, result);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } finally {
    client.close();
  }
}

async function handleListVendors(args: ListVendorsArgs) {
  const { url } = args;

  // Check cache first
  const cached = analysisCache.get(url);
  if (cached) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              url,
              vendors: cached.vendors,
              vendor_count: cached.vendor_count,
              categories: cached.categories,
              source: "cache",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Run quick analysis
  const client = new ChromeDevToolsClient();
  client.init();

  try {
    await client.navigateToPage(url);
    const networkRequests = await client.getNetworkRequests();
    const classification = classifyNetworkRequests(networkRequests);

    const result = {
      url,
      vendors: classification.vendors,
      vendor_count: classification.vendors.length,
      categories: classification.categories,
      source: "live",
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } finally {
    client.close();
  }
}

async function handleDetectManagedService(args: DetectManagedServiceArgs) {
  const { url } = args;

  const client = new ChromeDevToolsClient();
  client.init();

  try {
    await client.navigateToPage(url);
    const apiData = await queryAdTechAPIs(client);

    const detected = Object.entries(apiData.managedServices)
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              url,
              managed_services: detected,
              has_managed_service: detected.length > 0,
              all_checks: apiData.managedServices,
            },
            null,
            2
          ),
        },
      ],
    };
  } finally {
    client.close();
  }
}

async function handleGetNetworkRequests(args: GetNetworkRequestsArgs) {
  const { url, category, type } = args;

  const client = new ChromeDevToolsClient();
  client.init();

  try {
    await client.navigateToPage(url);
    let networkRequests = await client.getNetworkRequests();

    // Apply filters
    if (type) {
      networkRequests = networkRequests.filter((req) => req.resourceType === type);
    }

    const classification = classifyNetworkRequests(networkRequests);

    // Filter by category if specified
    let vendors = classification.vendors;
    if (category && classification.categories[category]) {
      vendors = classification.categories[category];
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              url,
              filters: { category, type },
              total_requests: networkRequests.length,
              vendors,
              vendor_count: vendors.length,
            },
            null,
            2
          ),
        },
      ],
    };
  } finally {
    client.close();
  }
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ad-Tech Analyzer MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
