import type { StarterFaq } from '../../knowledge/starter-data';

type FlexMessage = { type: 'flex'; altText: string; contents: Record<string, unknown> };
const SHORT_BUTTON_LABELS: Record<string, string> = {};
const buttonLabel = (label: string): string => {
  const compact = SHORT_BUTTON_LABELS[label] ?? label;
  return [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(compact)]
    .slice(0, 20)
    .map(({ segment }) => segment)
    .join('');
};
const readableThai = (text: string): string =>
  [...new Intl.Segmenter('th', { granularity: 'word' }).segment(text)]
    .map(({ segment, isWordLike }) => `${segment}${isWordLike ? '\u200B' : ''}`)
    .join('');
const action = (label: string, data: string) => ({
  type: 'button',
  style: 'secondary',
  height: 'sm',
  scaling: true,
  action: { type: 'postback', label: buttonLabel(label), data, displayText: label },
});
const bubble = (title: string, text: string, buttons: unknown[] = []): Record<string, unknown> => ({
  type: 'bubble',
  size: 'mega',
  header: {
    type: 'box',
    layout: 'vertical',
    backgroundColor: '#16A34A',
    paddingTop: 'xl',
    paddingBottom: 'lg',
    paddingStart: 'xl',
    paddingEnd: 'xl',
    contents: [
      {
        type: 'text',
        text: title,
        color: '#FFFFFF',
        weight: 'bold',
        wrap: true,
        size: 'xl',
        lineSpacing: '4px',
        scaling: true,
      },
    ],
  },
  body: {
    type: 'box',
    layout: 'vertical',
    spacing: 'md',
    paddingTop: 'lg',
    paddingBottom: 'lg',
    paddingStart: 'xl',
    paddingEnd: 'xl',
    contents: [
      {
        type: 'text',
        text: readableThai(text),
        wrap: true,
        size: 'md',
        lineSpacing: '6px',
        color: '#242424',
        scaling: true,
      },
      ...(buttons.length
        ? [
            { type: 'separator', margin: 'lg', color: '#E5E7EB' },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              margin: 'lg',
              contents: buttons,
            },
          ]
        : []),
    ],
  },
});
export function welcomeFlex(): FlexMessage {
  return {
    type: 'flex',
    altText: 'ยินดีต้อนรับสู่ OpenFAQ Demo Store',
    contents: bubble(
      'OpenFAQ Demo Store',
      'สอบถามเรื่องการจัดส่ง คืนสินค้า การชำระเงิน คำสั่งซื้อ และการรับประกันได้ที่นี่',
      [action('เปิดเมนูหลัก', 'action=main_menu')],
    ),
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
    contents: bubble(
      'เมนูคำถาม',
      'เลือกหัวข้อที่ต้องการ',
      groups.map(([label, category]) =>
        action(
          label,
          category === 'contact_staff'
            ? 'action=contact_staff'
            : `action=faq_category&category=${category}`,
        ),
      ),
    ),
  };
}
export function categoryFlex(category: string, faqs: StarterFaq[]): FlexMessage {
  return {
    type: 'flex',
    altText: `คำถามหมวด ${category}`,
    contents: bubble(
      'เลือกคำถาม',
      'ข้อมูลทั้งหมดมาจากแหล่งทางการ',
      faqs
        .slice(0, 10)
        .map((faq) => action(faq.title, `action=faq_detail&faqId=${encodeURIComponent(faq.id)}`))
        .concat(action('กลับเมนูหลัก', 'action=main_menu')),
    ),
  };
}
export function answerFlex(faq: StarterFaq): FlexMessage {
  return {
    type: 'flex',
    altText: faq.title.slice(0, 400),
    contents: bubble(faq.title, faq.answer, [
      action('กลับเมนูหลัก', 'action=main_menu'),
      action('ติดต่อเจ้าหน้าที่', 'action=contact_staff'),
    ]),
  };
}
export function noticeFlex(title: string, text: string): FlexMessage {
  return {
    type: 'flex',
    altText: title.slice(0, 400),
    contents: bubble(title, text, [
      action('กลับเมนูหลัก', 'action=main_menu'),
      action('ติดต่อเจ้าหน้าที่', 'action=contact_staff'),
    ]),
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
