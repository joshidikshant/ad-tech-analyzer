# Figma Design Prompt: Ad-Tech Analyzer Dashboard

## Project Overview
Design a modern, professional dashboard for analyzing advertising technology on websites. The tool detects ad vendors, header bidding setups, and revenue optimization tactics used by publishers.

## Target Users
- **Primary**: Ad ops teams, publishers, marketing analysts
- **Secondary**: Developers, ad-tech consultants
- **Skill Level**: Mid-level technical users comfortable with web tools

## Design Requirements

### 1. Overall Style
- **Aesthetic**: Clean, data-driven, professional SaaS application
- **Tone**: Trustworthy, efficient, technical but approachable
- **Color Palette**:
  - Primary: Deep blue (#1E40AF) - represents trust, technology
  - Secondary: Teal (#0D9488) - for success states, positive metrics
  - Accent: Amber (#F59E0B) - for warnings, important callouts
  - Neutrals: Slate grays (#64748B, #F1F5F9, #0F172A)
  - Vendor categories: Distinct colors for SSPs, Header Bidding, Identity, etc.

### 2. Layout Structure

#### Header
- Logo/product name on left
- Navigation tabs: Dashboard | History | Settings
- User profile/account dropdown on right
- Subtle shadow or border to separate from main content

#### Main Input Section
- Large, prominent URL input field with:
  - Placeholder: "Enter website URL to analyze (e.g., https://www.nytimes.com)"
  - Icon: Magnifying glass or world icon
  - Device selector: Toggle between Desktop/Mobile with icons
- Primary CTA button: "Analyze" (large, high contrast)
- Secondary button: "Load Sample Data" (subtle, gray)
- Progress indicator during analysis:
  - Animated spinner or progress bar
  - Status text: "Navigating to page..." "Capturing requests..." "Analyzing vendors..."
  - Estimated time remaining

#### Results Section (appears after analysis)

**Overview Cards (top row)**
- 4 metric cards in a grid:
  1. Total Vendors (large number)
  2. SSP Count (with icon)
  3. Header Bidding Detected (yes/no badge)
  4. Network Requests (with performance indicator)
- Each card:
  - Icon representing the metric
  - Large number or value
  - Small description text
  - Subtle background color or gradient

**Vendor Breakdown (middle section)**
- **Left side**: Pie chart showing vendor distribution by category
  - Interactive: hover shows exact count
  - Legend with color coding
  - Clean, modern chart design (not outdated-looking)

- **Right side**: Bar chart showing top vendors by request count
  - Horizontal bars for easy reading
  - Vendor logos if available, or first letter in circle
  - Request count on right side

**Detailed Information Panels (bottom section)**
- Expandable sections (accordion style):

  1. **Prebid.js Configuration**
     - Badge: "Detected" or "Not Found"
     - If detected:
       - Version number
       - Configured bidders (chip/tag format)
       - Timeout settings
       - Currency
     - Collapsible bid response details (table format)

  2. **Google Ad Manager**
     - Badge: "Detected" or "Not Found"
     - If detected:
       - Ad slot details (table)
       - Targeting parameters (key-value pairs)
       - Sizes configured

  3. **Network Requests**
     - Searchable, filterable table
     - Columns: Vendor | Category | URL | Type
     - Color-coded by category
     - Export to CSV button

  4. **Identity Solutions**
     - List of detected ID providers
     - Integration method (first-party, third-party)
     - Privacy indicators

### 3. Component Specifications

#### Typography
- **Headings**:
  - H1: 32px, bold, dark
  - H2: 24px, semibold
  - H3: 18px, medium
- **Body**: 14-16px, regular, good line height (1.5)
- **Captions**: 12px, medium, muted color
- **Font**: Inter, SF Pro, or similar modern sans-serif

#### Buttons
- **Primary**: High contrast, rounded corners (6-8px), shadow on hover
- **Secondary**: Outlined or ghost style
- **States**: Default, hover, active, disabled, loading

#### Cards & Panels
- White background on light gray (#F9FAFB) page
- Border radius: 8-12px
- Subtle shadow: `0 1px 3px rgba(0,0,0,0.1)`
- Padding: 24px internal spacing

#### Charts
- Use libraries like Chart.js or Recharts aesthetic
- Clean, minimal grid lines
- Tooltips on hover with detailed info
- Responsive to container size

#### Data Tables
- Zebra striping (subtle)
- Header row: slightly darker background
- Row hover: highlight
- Pagination at bottom if needed
- Sort indicators on column headers

#### Badges & Tags
- Rounded pills for status (e.g., "Detected", "Active")
- Vendor category tags with consistent colors
- Small, not overwhelming

### 4. Responsive Behavior
- **Desktop**: Full multi-column layout (1200px+ width optimal)
- **Tablet**: Stack some side-by-side elements
- **Mobile**:
  - Single column
  - Larger touch targets
  - Simplified charts (consider mobile-optimized versions)
  - Collapsible sections by default

### 5. Micro-interactions
- Smooth transitions (200-300ms)
- Button hover states (scale slightly, change shadow)
- Loading states for async operations
- Success animation when analysis completes
- Expand/collapse animations for panels

### 6. Accessibility
- High contrast ratios (WCAG AA minimum)
- Focus indicators for keyboard navigation
- Screen reader labels
- Color not sole indicator of meaning

### 7. Empty & Error States
- **Before analysis**: Prominent input section with example
- **Loading**: Animated skeleton screens or spinners
- **Error**: Friendly error message with retry button
- **No data**: Illustration + helpful text

### 8. Additional Features to Consider
- Export analysis as PDF report
- Compare two URLs side-by-side
- Historical analysis timeline
- Share analysis via link
- Dark mode toggle

## Deliverables
1. Desktop layout (1440px width)
2. Tablet layout (768px width)
3. Mobile layout (375px width)
4. Component library (buttons, cards, inputs, charts)
5. Color palette and typography system
6. Iconography set

## Inspiration References
- **Datadog dashboards**: Clean, metric-focused
- **Stripe Dashboard**: Professional, data-driven
- **Vercel Analytics**: Modern, minimalist charts
- **Tailwind UI**: Component quality and polish

## Technical Constraints
- Built with React + Tailwind CSS
- Charts: Recharts library
- Icons: Heroicons or Lucide
- Must work in modern browsers (Chrome, Firefox, Safari, Edge)

---

## Example Screen Descriptions

### Home Screen (Before Analysis)
```
┌─────────────────────────────────────────────────┐
│  [Logo]  Dashboard  History  Settings  [User]  │
├─────────────────────────────────────────────────┤
│                                                 │
│              Ad-Tech Analyzer                   │
│       Reverse engineer any website's            │
│         advertising technology stack            │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ [🌐] Enter URL to analyze                 │ │
│  │      https://                             │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Desktop] [Mobile]                             │
│                                                 │
│  [ Analyze Site ]  [ Load Sample Data ]        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Results Screen
```
┌─────────────────────────────────────────────────┐
│  [Logo]  Dashboard  History  Settings  [User]  │
├─────────────────────────────────────────────────┤
│  Analysis: www.example.com                      │
│                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │  12  │ │  5   │ │  ✓   │ │ 427  │          │
│  │Vendor│ │ SSPs │ │Prebid│ │Reqs  │          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                 │
│  ┌─────────────────┐ ┌─────────────────┐       │
│  │   Pie Chart     │ │   Bar Chart     │       │
│  │   By Category   │ │   Top Vendors   │       │
│  └─────────────────┘ └─────────────────┘       │
│                                                 │
│  ▼ Prebid.js Configuration                     │
│  ┌─────────────────────────────────────────┐   │
│  │ Version: v9.38.0                        │   │
│  │ Bidders: [PubMatic] [Criteo] [Amazon]  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ▼ Google Ad Manager                           │
│  ▼ Network Requests                            │
│  ▼ Identity Solutions                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Color Usage Examples
- **SSPs**: Blue (#3B82F6)
- **Header Bidding**: Purple (#8B5CF6)
- **Ad Server**: Green (#10B981)
- **Identity**: Orange (#F59E0B)
- **DMP**: Pink (#EC4899)
- **Consent**: Indigo (#6366F1)

## Notes
- Prioritize clarity over decoration
- Every element should serve a purpose
- Data should be scannable at a glance
- Design should scale from simple sites (few vendors) to complex (50+ vendors)
