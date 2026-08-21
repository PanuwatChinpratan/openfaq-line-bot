import type { StarterFaq } from '../../knowledge/starter-data';

type FlexMessage = { type: 'flex'; altText: string; contents: Record<string, unknown> };

const COLORS = {
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  surface: '#FFFFFF',
  canvas: '#F8FAFC',
  emerald: '#059669',
  emeraldSoft: '#ECFDF5',
  mint: '#A7F3D0',
} as const;

const buttonLabel = (label: string): string => {
  if ([...label].length <= 20) return label;
  const graphemes = [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(label)].map(
    ({ segment }) => segment,
  );
  let compact = '';
  for (const grapheme of graphemes) {
    if ([...`${compact}${grapheme}…`].length > 20) break;
    compact += grapheme;
  }
  return `${compact}…`;
};

const action = (label: string, data: string, emphasis = false) => ({
  type: 'button',
  style: emphasis ? 'primary' : 'secondary',
  color: emphasis ? COLORS.emerald : COLORS.emeraldSoft,
  height: 'sm',
  scaling: true,
  action: { type: 'postback', label: buttonLabel(label), data, displayText: label },
});

type BubbleOptions = {
  eyebrow: string;
  title: string;
  text: string;
  meta?: string;
  buttons?: unknown[];
};

const bubble = ({
  eyebrow,
  title,
  text,
  meta,
  buttons = [],
}: BubbleOptions): Record<string, unknown> => ({
  type: 'bubble',
  size: 'mega',
  header: {
    type: 'box',
    layout: 'vertical',
    backgroundColor: COLORS.ink,
    paddingTop: 'xl',
    paddingBottom: 'xl',
    paddingStart: 'xl',
    paddingEnd: 'xl',
    spacing: 'sm',
    contents: [
      {
        type: 'text',
        text: eyebrow.toUpperCase(),
        color: COLORS.mint,
        weight: 'bold',
        size: 'xs',
        wrap: true,
      },
      {
        type: 'text',
        text: title,
        color: COLORS.surface,
        weight: 'bold',
        wrap: true,
        size: 'xl',
        lineSpacing: '6px',
        scaling: true,
      },
    ],
  },
  body: {
    type: 'box',
    layout: 'vertical',
    backgroundColor: COLORS.canvas,
    spacing: 'lg',
    paddingTop: 'xl',
    paddingBottom: 'xl',
    paddingStart: 'xl',
    paddingEnd: 'xl',
    contents: [
      {
        type: 'text',
        text,
        wrap: true,
        size: 'md',
        lineSpacing: '8px',
        color: COLORS.ink,
        scaling: true,
      },
      ...(meta
        ? [
            {
              type: 'text',
              text: meta,
              wrap: true,
              size: 'xs',
              color: COLORS.muted,
            },
          ]
        : []),
    ],
  },
  ...(buttons.length
    ? {
        footer: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: COLORS.surface,
          spacing: 'sm',
          paddingTop: 'lg',
          paddingBottom: 'xl',
          paddingStart: 'xl',
          paddingEnd: 'xl',
          contents: [{ type: 'separator', color: COLORS.line }, ...buttons],
        },
      }
    : {}),
});
export function welcomeFlex(): FlexMessage {
  return {
    type: 'flex',
    altText: 'ยินดีต้อนรับสู่ OpenFAQ Demo Store',
    contents: bubble({
      eyebrow: 'OpenFAQ · Help Center',
      title: 'ยินดีต้อนรับ',
      text: 'ถามเรื่องการจัดส่ง คืนสินค้า การชำระเงิน คำสั่งซื้อ และการรับประกันได้ทันที',
      meta: 'พิมพ์คำถามเอง หรือเลือกจากเมนูด้านล่าง',
      buttons: [action('ดูหัวข้อคำถาม', 'action=main_menu', true)],
    }),
  };
}
export function mainMenuFlex(): FlexMessage {
  const groups: Array<[string, string]> = [
    ['การจัดส่ง', 'การจัดส่ง'],
    ['การคืนสินค้า', 'การคืนสินค้า'],
    ['การชำระเงิน', 'การชำระเงิน'],
    ['คำสั่งซื้อ', 'คำสั่งซื้อ'],
    ['การรับประกัน', 'การรับประกัน'],
    ['ติดต่อเจ้าหน้าที่', 'contact_staff'],
  ];
  return {
    type: 'flex',
    altText: 'เมนูคำถาม OpenFAQ Demo Store',
    contents: bubble({
      eyebrow: 'OpenFAQ · Help Center',
      title: 'มีอะไรให้ช่วย?',
      text: 'เลือกหมวดหมู่ หรือพิมพ์คำถามด้วยภาษาที่คุณใช้ตามปกติ',
      meta: 'คำตอบอ้างอิงจาก FAQ ที่ผ่านการตรวจสอบแล้ว',
      buttons: groups.map(([label, category]) =>
        action(
          label,
          category === 'contact_staff'
            ? 'action=contact_staff'
            : `action=faq_category&category=${encodeURIComponent(category)}`,
          category === 'contact_staff',
        ),
      ),
    }),
  };
}
export function categoryFlex(category: string, faqs: StarterFaq[]): FlexMessage {
  return {
    type: 'flex',
    altText: `คำถามหมวด ${category}`,
    contents: bubble({
      eyebrow: `หมวด ${category}`,
      title: 'เลือกคำถาม',
      text: 'แตะคำถามที่ใกล้เคียงกับเรื่องที่ต้องการทราบ',
      meta: `${faqs.length} คำถามในหมวดนี้`,
      buttons: faqs
        .slice(0, 10)
        .map((faq) => action(faq.title, `action=faq_detail&faqId=${encodeURIComponent(faq.id)}`))
        .concat(action('กลับเมนูหลัก', 'action=main_menu')),
    }),
  };
}
export function answerFlex(faq: StarterFaq): FlexMessage {
  return {
    type: 'flex',
    altText: faq.title.slice(0, 400),
    contents: bubble({
      eyebrow: faq.category,
      title: faq.title,
      text: faq.answer,
      meta: 'คำตอบจากฐานความรู้ที่ผ่านการตรวจสอบ',
      buttons: [
        action('กลับเมนูหลัก', 'action=main_menu'),
        action('ติดต่อเจ้าหน้าที่', 'action=contact_staff', true),
      ],
    }),
  };
}
export function noticeFlex(title: string, text: string): FlexMessage {
  return {
    type: 'flex',
    altText: title.slice(0, 400),
    contents: bubble({
      eyebrow: 'OpenFAQ · Assist',
      title,
      text,
      buttons: [
        action('กลับเมนูหลัก', 'action=main_menu'),
        action('ติดต่อเจ้าหน้าที่', 'action=contact_staff', true),
      ],
    }),
  };
}
export function validateFlex(message: FlexMessage): boolean {
  return (
    message.type === 'flex' &&
    message.altText.length > 0 &&
    message.altText.length <= 400 &&
    message.contents.type === 'bubble'
  );
}
