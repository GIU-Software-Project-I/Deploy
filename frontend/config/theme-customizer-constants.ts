import type { 
  SidebarVariant, 
  SidebarCollapsibleOption, 
  SidebarSideOption, 
  RadiusOption, 
  BrandColor 
} from '@/types/theme-customizer'

// Radius options
export const radiusOptions: RadiusOption[] = [
  { name: "0", value: "0rem" },
  { name: "0.3", value: "0.3rem" },
  { name: "0.5", value: "0.5rem" },
  { name: "0.75", value: "0.75rem" },
  { name: "1.0", value: "1rem" },
]

// Sidebar variant options
export const sidebarVariants: SidebarVariant[] = [
  { name: "Default", value: "sidebar", description: "Standard sidebar layout" },
  { name: "Floating", value: "floating", description: "Floating sidebar with border" },
  { name: "Inset", value: "inset", description: "Inset sidebar with rounded corners" },
]

// Sidebar collapsible options
export const sidebarCollapsibleOptions: SidebarCollapsibleOption[] = [
  { name: "Off Canvas", value: "offcanvas", description: "Slides out of view" },
  { name: "Icon", value: "icon", description: "Collapses to icon only" },
  { name: "None", value: "none", description: "Always visible" },
]

// Sidebar side options
export const sidebarSideOptions: SidebarSideOption[] = [
  { name: "Left", value: "left" },
  { name: "Right", value: "right" },
]

// Define brand colors for custom color inputs
export const baseColors: BrandColor[] = [
  { name: "Background", cssVar: "--background" },
  { name: "Foreground", cssVar: "--foreground" },
  { name: "Card", cssVar: "--card" },
  { name: "Card Foreground", cssVar: "--card-foreground" },
  { name: "Popover", cssVar: "--popover" },
  { name: "Popover Foreground", cssVar: "--popover-foreground" },
  { name: "Primary", cssVar: "--primary" },
  { name: "Primary Foreground", cssVar: "--primary-foreground" },
  { name: "Secondary", cssVar: "--secondary" },
  { name: "Secondary Foreground", cssVar: "--secondary-foreground" },
  { name: "Accent", cssVar: "--accent" },
  { name: "Accent Foreground", cssVar: "--accent-foreground" },
  { name: "Muted", cssVar: "--muted" },
  { name: "Muted Foreground", cssVar: "--muted-foreground" },
  { name: "Destructive", cssVar: "--destructive" },
  { name: "Destructive Foreground", cssVar: "--destructive-foreground" },
  { name: "Border", cssVar: "--border" },
  { name: "Input", cssVar: "--input" },
  { name: "Ring", cssVar: "--ring" },
  { name: "Success", cssVar: "--success" },
  { name: "Success Foreground", cssVar: "--success-foreground" },
  { name: "Warning", cssVar: "--warning" },
  { name: "Warning Foreground", cssVar: "--warning-foreground" },
  { name: "Info", cssVar: "--info" },
  { name: "Info Foreground", cssVar: "--info-foreground" },
  { name: "Sidebar", cssVar: "--sidebar" },
  { name: "Sidebar Foreground", cssVar: "--sidebar-foreground" },
  { name: "Sidebar Primary", cssVar: "--sidebar-primary" },
  { name: "Sidebar Primary Foreground", cssVar: "--sidebar-primary-foreground" },
  { name: "Sidebar Accent", cssVar: "--sidebar-accent" },
  { name: "Sidebar Accent Foreground", cssVar: "--sidebar-accent-foreground" },
  { name: "Sidebar Border", cssVar: "--sidebar-border" },
  { name: "Sidebar Ring", cssVar: "--sidebar-ring" },
  { name: "Chart 1", cssVar: "--chart-1" },
  { name: "Chart 2", cssVar: "--chart-2" },
  { name: "Chart 3", cssVar: "--chart-3" },
  { name: "Chart 4", cssVar: "--chart-4" },
  { name: "Chart 5", cssVar: "--chart-5" },
];
