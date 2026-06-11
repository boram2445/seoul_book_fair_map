export function getMockHeartCount(no: number) {
  return ((no * 37) % 128) + 3;
}
