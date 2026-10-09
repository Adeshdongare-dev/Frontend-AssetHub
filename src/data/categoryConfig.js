// Defines the mandatory "Configuration" fields captured per category at inventory intake.
// Driving this from a schema (instead of one free-text box) is what lets the Inventory
// grid show a real, structured Configuration column and keeps intake consistent.

export const CATEGORIES = [
  'Laptop', 'Desktop', 'Monitor', 'Server', 'Networking', 'Mobile', 'Printer', 'Peripheral', 'Software',
];

export const CONFIG_SCHEMA = {
  Laptop: [
    { key: 'brandModel', label: 'Brand & Model', type: 'text', placeholder: 'Dell Latitude 5440', required: true },
    { key: 'cpu', label: 'Processor', type: 'text', placeholder: 'Intel Core i7-1355U', required: true },
    { key: 'ram', label: 'RAM', type: 'select', options: ['8 GB', '16 GB', '32 GB', '64 GB'], required: true },
    { key: 'storage', label: 'Storage', type: 'select', options: ['256 GB SSD', '512 GB SSD', '1 TB SSD', '2 TB SSD'], required: true },
    { key: 'os', label: 'Operating System', type: 'select', options: ['Windows 11 Pro', 'Windows 10 Pro', 'macOS Sonoma', 'Ubuntu 24.04 LTS'], required: true },
  ],
  Desktop: [
    { key: 'brandModel', label: 'Brand & Model', type: 'text', placeholder: 'HP EliteDesk 800 G9', required: true },
    { key: 'cpu', label: 'Processor', type: 'text', placeholder: 'Intel Core i5-13500', required: true },
    { key: 'ram', label: 'RAM', type: 'select', options: ['8 GB', '16 GB', '32 GB', '64 GB'], required: true },
    { key: 'storage', label: 'Storage', type: 'select', options: ['256 GB SSD', '512 GB SSD', '1 TB SSD', '2 TB HDD'], required: true },
    { key: 'os', label: 'Operating System', type: 'select', options: ['Windows 11 Pro', 'Windows 10 Pro', 'Ubuntu 24.04 LTS'], required: true },
  ],
  Monitor: [
    { key: 'brandModel', label: 'Brand & Model', type: 'text', placeholder: 'Dell UltraSharp U2724D', required: true },
    { key: 'size', label: 'Screen Size', type: 'select', options: ['21.5"', '23.8"', '27"', '32"', '34" Ultrawide'], required: true },
    { key: 'resolution', label: 'Resolution', type: 'select', options: ['1920x1080', '2560x1440', '3840x2160', '3440x1440'], required: true },
    { key: 'panel', label: 'Panel Type', type: 'select', options: ['IPS', 'VA', 'OLED', 'TN'], required: true },
  ],
  Server: [
    { key: 'brandModel', label: 'Brand & Model', type: 'text', placeholder: 'Dell PowerEdge R750', required: true },
    { key: 'cpu', label: 'Processor', type: 'text', placeholder: '2x Intel Xeon Gold 6338', required: true },
    { key: 'ram', label: 'RAM', type: 'select', options: ['64 GB', '128 GB', '256 GB', '512 GB'], required: true },
    { key: 'storage', label: 'Storage', type: 'text', placeholder: '4x 2TB SAS RAID10', required: true },
    { key: 'formFactor', label: 'Form Factor', type: 'select', options: ['Rack 1U', 'Rack 2U', 'Tower', 'Blade'], required: true },
  ],
  Networking: [
    { key: 'brandModel', label: 'Brand & Model', type: 'text', placeholder: 'Cisco Catalyst 9300-48P', required: true },
    { key: 'deviceType', label: 'Device Type', type: 'select', options: ['Switch', 'Router', 'Firewall', 'Access Point', 'Load Balancer'], required: true },
    { key: 'ports', label: 'Ports / Throughput', type: 'text', placeholder: '48x 1GbE PoE+', required: true },
  ],
  Mobile: [
    { key: 'brandModel', label: 'Brand & Model', type: 'text', placeholder: 'Samsung Galaxy S24', required: true },
    { key: 'storage', label: 'Storage', type: 'select', options: ['64 GB', '128 GB', '256 GB', '512 GB'], required: true },
    { key: 'imei', label: 'IMEI Pattern', type: 'text', placeholder: 'Auto-captured per unit', required: false },
    { key: 'os', label: 'Operating System', type: 'select', options: ['Android 14', 'iOS 18'], required: true },
  ],
  Printer: [
    { key: 'brandModel', label: 'Brand & Model', type: 'text', placeholder: 'HP LaserJet Pro M404dn', required: true },
    { key: 'type', label: 'Print Type', type: 'select', options: ['Mono Laser', 'Color Laser', 'Inkjet', 'Multifunction'], required: true },
    { key: 'connectivity', label: 'Connectivity', type: 'text', placeholder: 'Ethernet, USB, Wi-Fi', required: false },
  ],
  Peripheral: [
    { key: 'brandModel', label: 'Brand & Model', type: 'text', placeholder: 'Logitech MX Keys', required: true },
    { key: 'type', label: 'Type', type: 'select', options: ['Keyboard', 'Mouse', 'Webcam', 'Headset', 'Dock', 'Bag'], required: true },
  ],
  Software: [
    { key: 'brandModel', label: 'Product Name', type: 'text', placeholder: 'Microsoft 365 E3', required: true },
    { key: 'licenseType', label: 'License Type', type: 'select', options: ['Perpetual', 'Annual Subscription', 'Monthly Subscription', 'OEM'], required: true },
    { key: 'seats', label: 'Seats / Users', type: 'text', placeholder: '1', required: false },
  ],
};

// Fallback schema used for any category that doesn't have a dedicated
// schema above — e.g. a custom category added via the Categories module.
export const DEFAULT_CONFIG_SCHEMA = [
  { key: 'brandModel', label: 'Brand & Model', type: 'text', placeholder: 'e.g. Acer TravelMate P4', required: true },
  { key: 'specSummary', label: 'Key Specification', type: 'text', placeholder: 'Short spec summary', required: true },
];

export function getConfigSchema(category) {
  return CONFIG_SCHEMA[category] || DEFAULT_CONFIG_SCHEMA;
}

export function buildConfigSummary(category, values) {
  const schema = getConfigSchema(category);
  return schema
    .filter((f) => values?.[f.key])
    .map((f) => values[f.key])
    .join(' · ');
}

export function emptyConfigValues(category) {
  const schema = getConfigSchema(category);
  return Object.fromEntries(schema.map((f) => [f.key, '']));
}
