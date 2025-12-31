// Auto-generated from Gemini research
export interface VendorPattern {
  url: string;
  type: string[];
  confidence: "high" | "medium" | "low";
}

export interface Vendor {
  name: string;
  patterns: VendorPattern[];
}

export interface VendorCategory {
  category: string;
  vendors: Vendor[];
}

export const VENDOR_PATTERNS: VendorCategory[] = [
  {
    category: "ssp",
    vendors: [
      {
        name: "PubMatic",
        patterns: [
          { url: "ads\\.pubmatic\\.com\\/.*\\.js", type: ["script"], confidence: "high" },
          { url: "pubmatic\\.com\\/AdServer", type: ["xhr", "image"], confidence: "high" },
          { url: "hbopenbid\\.pubmatic\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "OpenX",
        patterns: [
          { url: "servedbyopenx\\.com\\/.*\\.js", type: ["script"], confidence: "high" },
          { url: "openx\\.net", type: ["xhr", "fetch"], confidence: "medium" },
          { url: "rtb\\.openx\\.net", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Rubicon",
        patterns: [
          { url: "(fastlane|ads)\\.rubiconproject\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "prebid-server\\.rubiconproject\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Criteo",
        patterns: [
          { url: "criteo\\.com|criteo\\.net", type: ["script", "xhr"], confidence: "high" },
          { url: "bidder\\.criteo\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Index Exchange",
        patterns: [
          { url: "casalemedia\\.com", type: ["xhr", "image", "script"], confidence: "high" },
          { url: "indexww\\.com", type: ["script"], confidence: "high" },
          { url: "htlb\\.casalemedia\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "AppNexus",
        patterns: [
          { url: "adnxs\\.com", type: ["script", "xhr", "image"], confidence: "high" },
          { url: "ib\\.adnxs\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "TripleLift",
        patterns: [
          { url: "3lift\\.com|tlx\\.3lift\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "GumGum",
        patterns: [
          { url: "gumgum\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "g2\\.gumgum\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Sonobi",
        patterns: [
          { url: "sonobi\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "apex\\.go\\.sonobi\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Sharethrough",
        patterns: [
          { url: "sharethrough\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "btlr\\.sharethrough\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Media.net",
        patterns: [
          { url: "media\\.net", type: ["script", "xhr"], confidence: "high" },
          { url: "prebid\\.media\\.net", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Teads",
        patterns: [
          { url: "teads\\.tv", type: ["script", "xhr"], confidence: "high" },
          { url: "a\\.teads\\.tv", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Kargo",
        patterns: [
          { url: "kargo\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "krk2\\.kargo\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "RichAudience",
        patterns: [
          { url: "richaudience\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "shb\\.richaudience\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Yahoo",
        patterns: [
          { url: "ads\\.yahoo\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "NextMillennium",
        patterns: [
          { url: "nextmillmedia\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "pbs\\.nextmillmedia\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Sparteo",
        patterns: [
          { url: "sparteo\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "bid\\.sparteo\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "YellowBlue",
        patterns: [
          { url: "yellowblue\\.io", type: ["script", "xhr"], confidence: "high" },
          { url: "hb\\.yellowblue\\.io", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "Ingage",
        patterns: [
          { url: "ingage\\.tech", type: ["script", "xhr"], confidence: "high" },
          { url: "ex\\.ingage\\.tech", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "SmileWanted",
        patterns: [
          { url: "smilewanted\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "prebid\\.smilewanted\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "33Across",
        patterns: [
          { url: "33across\\.com|tynt\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Sovrn",
        patterns: [
          { url: "sovrn\\.com|lijit\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Unruly",
        patterns: [
          { url: "unruly\\.co|video\\.unruly\\.co", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Tremor",
        patterns: [
          { url: "tremorhub\\.com|ads\\.tremorhub\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "MediaGrid",
        patterns: [
          { url: "themediagrid\\.com|grid\\.bidswitch\\.net", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "ImproveDigital",
        patterns: [
          { url: "360yield\\.com|ad\\.360yield\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Equativ",
        patterns: [
          { url: "smartadserver\\.com|sascdn\\.com|equativ\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Nobid",
        patterns: [
          { url: "nobid\\.io|ads\\.nobid\\.io", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "RhythmOne",
        patterns: [
          { url: "rhythmone\\.com|1rx\\.io", type: ["script", "xhr"], confidence: "high" }
        ]
      }
    ]
  },
  {
    category: "header_bidding",
    vendors: [
      {
        name: "Prebid.js",
        patterns: [
          { url: "prebid.*\\.js", type: ["script"], confidence: "high" },
          { url: "\\/hb\\/|\\/header-bidding\\/", type: ["script"], confidence: "medium" }
        ]
      },
      {
        name: "Amazon APS",
        patterns: [
          { url: "apstag\\.js", type: ["script"], confidence: "high" },
          { url: "c\\.amazon-adsystem\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Index Wrapper",
        patterns: [
          { url: "js-sec\\.indexww\\.com", type: ["script"], confidence: "high" }
        ]
      }
    ]
  },
  {
    category: "managed_service",
    vendors: [
      {
        name: "Raptive (AdThrive)",
        patterns: [
          { url: "ads\\.adthrive\\.com|cafemedia\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Mediavine",
        patterns: [
          { url: "mediavine\\.com|mv-ad\\.net", type: ["script"], confidence: "high" }
        ]
      },
      {
        name: "Freestar",
        patterns: [
          { url: "freestar\\.com|freestar-static\\.com", type: ["script"], confidence: "high" },
          { url: "a\\.pub\\.network", type: ["script"], confidence: "high" }
        ]
      },
      {
        name: "Ezoic",
        patterns: [
          { url: "ezoic\\.net|ezodn\\.com", type: ["script"], confidence: "high" }
        ]
      },
      {
        name: "AdPushup",
        patterns: [
          { url: "adpushup\\.js|adpushup\\.com|cdn\\.adpushup\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Adapex",
        patterns: [
          { url: "adapex\\.io|aaw\\.adapex\\.io", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "PubGalaxy",
        patterns: [
          { url: "pubgalaxy\\.com|360yield\\.com|titantag\\.com", type: ["script", "xhr"], confidence: "high" },
          { url: "pbs\\.360yield\\.com", type: ["xhr"], confidence: "high" }
        ]
      }
    ]
  },
  {
    category: "ad_server",
    vendors: [
      {
        name: "Google Ad Manager",
        patterns: [
          { url: "gpt\\.js", type: ["script"], confidence: "high" },
          { url: "securepubads\\.g\\.doubleclick\\.net", type: ["xhr", "script"], confidence: "high" },
          { url: "googlesyndication\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Smart AdServer",
        patterns: [
          { url: "smartadserver\\.com|sascdn\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      }
    ]
  },
  {
    category: "identity",
    vendors: [
      {
        name: "ID5",
        patterns: [
          { url: "id5-sync\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "LiveRamp",
        patterns: [
          { url: "liveramp\\.com|ats\\.rlcdn\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      },
      {
        name: "Unified ID 2.0",
        patterns: [
          { url: "unified-id\\.org|uidapi\\.com", type: ["xhr"], confidence: "high" }
        ]
      },
      {
        name: "The Trade Desk",
        patterns: [
          { url: "adsrvr\\.org", type: ["xhr", "image"], confidence: "high" }
        ]
      }
    ]
  },
  {
    category: "consent",
    vendors: [
      {
        name: "OneTrust",
        patterns: [
          { url: "onetrust\\.com|otSDKStub\\.js", type: ["script"], confidence: "high" }
        ]
      },
      {
        name: "Quantcast",
        patterns: [
          { url: "quantcast\\.com|quantcount\\.com|quant\\.js", type: ["script", "xhr", "image"], confidence: "high" }
        ]
      },
      {
        name: "Didomi",
        patterns: [
          { url: "didomi\\.io", type: ["script"], confidence: "high" }
        ]
      },
      {
        name: "TrustArc",
        patterns: [
          { url: "trustarc\\.com|truste-api\\.com", type: ["script", "xhr"], confidence: "high" }
        ]
      }
    ]
  }
];
