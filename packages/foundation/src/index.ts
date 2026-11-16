/** Immutable reference values; project configuration cannot replace this layer. */
export const ROOT_REFERENCE_PX = 16;
export const SPACING_PX = Object.freeze([
  0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80,
] as const);
export const CARD_PADDING_PX = Object.freeze({
  compact: 16,
  comfortable: 24,
  spacious: 32,
} as const);
export type RuleCategory =
  'STANDARD / MUST' | 'WDF LOCKED' | 'PROJECT CREATIVE';
export interface FoundationRule {
  readonly id: string;
  readonly category: RuleCategory;
  readonly description: string;
  readonly methods: readonly ('static' | 'browser' | 'manual')[];
  readonly evidence: string;
  readonly reference: string;
}
const rules: FoundationRule[] = [
  {
    id: 'WDF-SPACING-001',
    category: 'WDF LOCKED',
    description: 'Spacing uses the fixed reference scale.',
    methods: ['static', 'browser'],
    evidence: 'Resolved px value and rendered spacing geometry.',
    reference: 'Blueprint §4.2',
  },
  {
    id: 'WDF-CARD-001',
    category: 'WDF LOCKED',
    description: 'Content card padding presets are 16/24/32 reference px.',
    methods: ['static', 'browser'],
    evidence: 'Preset token and rendered content inset.',
    reference: 'Blueprint §4.2',
  },
  {
    id: 'WDF-RESPONSIVE-001',
    category: 'WDF LOCKED',
    description:
      'Viewport differences require an explicit responsive declaration.',
    methods: ['static', 'browser'],
    evidence: 'Declared override and computed geometry at each test width.',
    reference: 'Blueprint §4.2',
  },
  {
    id: 'WDF-FOUNDATION-001',
    category: 'WDF LOCKED',
    description: 'Project configuration cannot overwrite Foundation values.',
    methods: ['static'],
    evidence: 'Schema and reserved namespace rejection.',
    reference: 'Blueprint §5.2',
  },
  {
    id: 'WDF-SCOPE-001',
    category: 'WDF LOCKED',
    description: 'Global, family and variant dependencies remain isolated.',
    methods: ['static'],
    evidence: 'Reference graph and scoped changes.',
    reference: 'Blueprint §5.2–5.3',
  },
  {
    id: 'STD-A11Y-001',
    category: 'STANDARD / MUST',
    description:
      'Relevant WCAG 2.2 AA requirements apply; static tokens cannot establish conformance.',
    methods: ['browser', 'manual'],
    evidence:
      'Scanner, keyboard and assistive technology review as applicable.',
    reference: 'WCAG 2.2 AA; Blueprint §4.4',
  },
  {
    id: 'STD-CONTRAST-001',
    category: 'STANDARD / MUST',
    description:
      'Text and controls meet applicable contrast requirements in their rendered states.',
    methods: ['browser', 'manual'],
    evidence: 'Rendered foreground/background and state evidence.',
    reference: 'WCAG 1.4.3, 1.4.11',
  },
  {
    id: 'STD-KEYBOARD-001',
    category: 'STANDARD / MUST',
    description: 'Native semantics, names, keyboard access and visible focus.',
    methods: ['browser', 'manual'],
    evidence: 'DOM, keyboard navigation and focus screenshots.',
    reference: 'WCAG 2.1.1, 2.4.7, 4.1.2',
  },
  {
    id: 'STD-REFLOW-001',
    category: 'STANDARD / MUST',
    description:
      'Relevant reflow and reduced-motion preferences are respected.',
    methods: ['browser', 'manual'],
    evidence: 'Viewport/zoom, overflow and motion preference checks.',
    reference: 'WCAG 1.4.10; Blueprint §4.4',
  },
  {
    id: 'WDF-TYPE-001',
    category: 'WDF LOCKED',
    description:
      'Role-based typography has real rendered differences and reliable font coverage.',
    methods: ['browser', 'manual'],
    evidence: 'Loaded font, role geometry and Hungarian glyph review.',
    reference: 'Blueprint §4.3',
  },
  {
    id: 'WDF-CONTROL-001',
    category: 'WDF LOCKED',
    description:
      'Default control height target is 44px; it is not a WCAG minimum claim.',
    methods: ['browser'],
    evidence: 'Rendered control geometry.',
    reference: 'Blueprint §4.4',
  },
  {
    id: 'PROJECT-STYLE-001',
    category: 'PROJECT CREATIVE',
    description:
      'Brand colors, typography and composition are project-owned within mandatory requirements.',
    methods: ['manual'],
    evidence: 'Project design review.',
    reference: 'Blueprint §4.1',
  },
];
export const FOUNDATION_RULES: readonly FoundationRule[] = Object.freeze(
  rules.map((rule) =>
    Object.freeze({ ...rule, methods: Object.freeze(rule.methods) }),
  ),
);

export interface ExceptionDeclaration {
  id: string;
  ruleId: string;
  tokenIds: string[];
  reason: string;
  requestedBy: string;
  evidence: string[];
  approval?: { approvedBy: string; approvedAt: string; decisionId: string };
}
// An approval record is evidence, not a bypass capability. M1 grants no exceptions.
