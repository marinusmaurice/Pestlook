
<style>
#erd { width: 100%; padding: 0; }
#erd svg { width: 100%; height: auto; }
</style>
<div id="erd"></div>
<script type="module">
import mermaid from 'https://esm.sh/mermaid@11/dist/mermaid.esm.min.mjs';
const dark = matchMedia('(prefers-color-scheme: dark)').matches;
await document.fonts.ready;
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  fontFamily: '"Anthropic Sans", sans-serif',
  themeVariables: {
    darkMode: dark,
    fontSize: '12px',
    fontFamily: '"Anthropic Sans", sans-serif',
    lineColor: dark ? '#9c9a92' : '#73726c',
    textColor: dark ? '#c2c0b6' : '#3d3d3a',
    primaryColor: dark ? '#3C3489' : '#EEEDFE',
    primaryTextColor: dark ? '#CECBF6' : '#26215C',
    primaryBorderColor: dark ? '#7F77DD' : '#534AB7',
    secondaryColor: dark ? '#085041' : '#E1F5EE',
    secondaryTextColor: dark ? '#9FE1CB' : '#04342C',
    secondaryBorderColor: dark ? '#1D9E75' : '#0F6E56',
    tertiaryColor: dark ? '#3d3d3a' : '#F1EFE8',
    tertiaryTextColor: dark ? '#D3D1C7' : '#2C2C2A',
    tertiaryBorderColor: dark ? '#888780' : '#5F5E5A',
  },
});

const diagram = `erDiagram
  organizations {
    uuid id PK
    string name
    string subscription_plan
    int monitoring_point_quota
    timestamp created_at
  }

  users {
    uuid id PK
    uuid org_id FK
    string email
    string full_name
    string role
    boolean is_active
    timestamp created_at
  }

  farms {
    uuid id PK
    uuid org_id FK
    string name
    string address
    float latitude
    float longitude
    timestamp created_at
  }

  fields {
    uuid id PK
    uuid farm_id FK
    uuid org_id FK
    string name
    json geo_boundary
    float area_hectares
    string crop_type
    string season
    timestamp created_at
  }

  trap_types {
    uuid id PK
    string name
    string description
  }

  monitoring_points {
    uuid id PK
    uuid org_id FK
    uuid farm_id FK
    uuid field_id FK
    uuid created_by FK
    string name
    string point_type
    float latitude
    float longitude
    uuid trap_type_id FK
    boolean is_active
    string notes
    timestamp created_at
  }

  pests {
    uuid id PK
    uuid org_id FK
    string common_name
    string scientific_name
    string category
    string default_capture_mode
    string description
    string image_url
    boolean is_system_pest
    timestamp created_at
  }

  monitoring_point_pests {
    uuid id PK
    uuid monitoring_point_id FK
    uuid pest_id FK
    boolean allow_unknown
    boolean is_active
    timestamp assigned_at
    uuid assigned_by FK
  }

  scouting_sessions {
    uuid id PK
    uuid org_id FK
    uuid scouter_id FK
    timestamp started_at
    timestamp completed_at
    string weather_conditions
    string notes
  }

  pest_observations {
    uuid id PK
    uuid session_id FK
    uuid monitoring_point_id FK
    uuid pest_id FK
    boolean is_unknown_pest
    string unknown_pest_description
    string capture_mode
    int count
    boolean present
    float captured_lat
    float captured_lng
    json photo_urls
    string notes
    timestamp observed_at
  }

  organizations ||--o{ users : "has"
  organizations ||--o{ farms : "owns"
  organizations ||--o{ pests : "creates"
  organizations ||--o{ monitoring_points : "owns"
  farms ||--o{ fields : "contains"
  farms ||--o{ monitoring_points : "grouped under"
  fields ||--o{ monitoring_points : "scoped to"
  trap_types ||--o{ monitoring_points : "type of"
  users ||--o{ monitoring_points : "created by"
  monitoring_points ||--o{ monitoring_point_pests : "monitors"
  pests ||--o{ monitoring_point_pests : "assigned via"
  users ||--o{ monitoring_point_pests : "assigned by"
  users ||--o{ scouting_sessions : "conducts"
  organizations ||--o{ scouting_sessions : "belongs to"
  scouting_sessions ||--o{ pest_observations : "contains"
  monitoring_points ||--o{ pest_observations : "observed at"
  pests ||--o{ pest_observations : "identifies"
`;

const { svg } = await mermaid.render('erd-svg', diagram);
document.getElementById('erd').innerHTML = svg;

document.querySelectorAll('#erd svg .node').forEach(node => {
  const firstPath = node.querySelector('path[d]');
  if (!firstPath) return;
  const d = firstPath.getAttribute('d');
  const nums = d.match(/-?[\d.]+/g)?.map(Number);
  if (!nums || nums.length < 8) return;
  const xs = [nums[0], nums[2], nums[4], nums[6]];
  const ys = [nums[1], nums[3], nums[5], nums[7]];
  const x = Math.min(...xs), y = Math.min(...ys);
  const w = Math.max(...xs) - x, h = Math.max(...ys) - y;
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x); rect.setAttribute('y', y);
  rect.setAttribute('width', w); rect.setAttribute('height', h);
  rect.setAttribute('rx', '8');
  for (const a of ['fill', 'stroke', 'stroke-width', 'class', 'style']) {
    if (firstPath.hasAttribute(a)) rect.setAttribute(a, firstPath.getAttribute(a));
  }
  firstPath.replaceWith(rect);
});

document.querySelectorAll('#erd svg .row-rect-odd path, #erd svg .row-rect-even path').forEach(p => {
  p.setAttribute('stroke', 'none');
});
</script>
