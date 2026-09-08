// รายชื่อธนาคารในประเทศไทย ใช้สำหรับให้คนหิ้วเลือกตอนตั้งค่าเลขบัญชีรับเงิน
export type ThaiBank = { code: string; name: string; shortName: string };

export const THAI_BANKS: ThaiBank[] = [
  { code: "kbank", name: "ธนาคารกสิกรไทย", shortName: "KBank" },
  { code: "scb", name: "ธนาคารไทยพาณิชย์", shortName: "SCB" },
  { code: "bbl", name: "ธนาคารกรุงเทพ", shortName: "BBL" },
  { code: "ktb", name: "ธนาคารกรุงไทย", shortName: "KTB" },
  { code: "bay", name: "ธนาคารกรุงศรีอยุธยา", shortName: "Krungsri" },
  { code: "ttb", name: "ธนาคารทหารไทยธนชาต", shortName: "TTB" },
  { code: "gsb", name: "ธนาคารออมสิน", shortName: "GSB" },
  { code: "baac", name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", shortName: "ธ.ก.ส." },
  { code: "ghb", name: "ธนาคารอาคารสงเคราะห์", shortName: "GHB" },
  { code: "cimb", name: "ธนาคารซีไอเอ็มบี ไทย", shortName: "CIMB Thai" },
  { code: "uob", name: "ธนาคารยูโอบี", shortName: "UOB" },
  { code: "tisco", name: "ธนาคารทิสโก้", shortName: "TISCO" },
  { code: "kkp", name: "ธนาคารเกียรตินาคินภัทร", shortName: "KKP" },
  { code: "lhbank", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์", shortName: "LH Bank" },
  { code: "icbc", name: "ธนาคารไอซีบีซี (ไทย)", shortName: "ICBC" },
  { code: "tcd", name: "ธนาคารไทยเครดิต", shortName: "Thai Credit" },
  { code: "ibank", name: "ธนาคารอิสลามแห่งประเทศไทย", shortName: "iBank" },
  { code: "citi", name: "ธนาคารซิตี้แบงก์", shortName: "Citibank" },
  { code: "sc", name: "ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)", shortName: "Standard Chartered" },
  { code: "smebank", name: "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย", shortName: "SME D Bank" },
  { code: "exim", name: "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย", shortName: "EXIM Bank" },
];

export function bankNameByCode(code: string | null | undefined): string {
  if (!code) return "";
  const bank = THAI_BANKS.find((b) => b.code === code);
  return bank ? bank.name : code;
}
