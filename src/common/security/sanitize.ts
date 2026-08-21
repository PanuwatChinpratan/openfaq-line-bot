const rules: Array<[RegExp, string]> = [
  [/\b\d{13}\b/g, '[เลขประจำตัวถูกปกปิด]'],
  [/\b(?:\d[ -]?){15,19}\b/g, '[หมายเลขบัตรถูกปกปิด]'],
  [/\b(?:otp|pin)\s*[:=]?\s*\d{4,8}\b/gi, '[รหัสลับถูกปกปิด]'],
  [/\b0\d{8,9}\b/g, '[เบอร์โทรถูกปกปิด]'],
  [/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[อีเมลถูกปกปิด]'],
];
export function maskSensitive(value: string): string {
  return rules.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}
export function containsSensitive(value: string): boolean {
  return maskSensitive(value) !== value || /(?:otp|pin|รหัสผ่าน|เลขบัญชี)/i.test(value);
}
export function normalizeThai(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, ' ')
    .trim();
}
const injection = [
  /ignore (?:all )?previous instructions/i,
  /system prompt/i,
  /เปิดเผย.*(?:prompt|คำสั่งระบบ)/i,
  /ข้อมูลฐานข้อมูลทั้งหมด/i,
  /เรียก\s*url/i,
  /แก้ไข.*(?:คำตอบ|ฐานข้อมูล)/i,
];
export function hasPromptInjection(value: string): boolean {
  return injection.some((rule) => rule.test(value));
}
