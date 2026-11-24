const BOOT_IDS = new Set([
  1001, 1111, 2422, 3005, 3006, 3008, 3009, 3010, 3013, 3020, 3047, 3111, 3117, 3158, 3168, 3170, 3171, 3172, 3173, 3174,
  3175, 3176, 223005, 223006, 223008, 223009, 223020, 223047, 223111, 223158, 771001, 773006, 773009, 773020, 773047,
  773111, 773117, 773158,
]);

const BOOT_NAME =
  /장화|군화|신발|boots?|greaves|treads|footwear|shoes|헤르메스의\s*발걸음|slightly magical|ionian boots|sorcerer'?s shoes|mercury'?s/i;

export function isBootItem(item: { id?: number | null; name: string }): boolean {
  if (item.id != null && BOOT_IDS.has(item.id)) return true;
  return BOOT_NAME.test(item.name.trim());
}

export function withoutBoots<T extends { id?: number | null; name: string }>(items: T[]): T[] {
  return items.filter((item) => !isBootItem(item));
}
