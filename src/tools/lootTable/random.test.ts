import { describe, expect, it } from 'vitest'
import { createXoroRandomFromRandomSeq, createXoroRandomFromSeed } from '@/tools/lootTable/random.ts'

describe('random', () => {
  it('random Xoroshiro128++', async () => {
    const source = createXoroRandomFromSeed(-1234n);
    source.consume(1000)
    expect(source.nextInt()).toBe(-1633077930)
    expect(source.nextLong()).toBe(9025495727411744799n)
    expect(source.nextFloat()).toBeCloseTo(0.37230647)
    expect(source.nextDouble()).toBeCloseTo(0.5969217415801621)
    expect(source.nextIntWithBound(100)).toBe(68)
    expect(source.nextIntWithBound(100)).toBe(34)
    expect(source.nextIntWithBound(100)).toBe(37)
    expect(source.nextIntWithBound(100)).toBe(43)
    expect(source.nextIntWithBound(100)).toBe(18)
    expect(source.nextGaussian()).toBeCloseTo(-1.049970937060801)
    expect(source.nextGaussian()).toBeCloseTo(0.7235124194896236)
    expect(source.nextInt()).toBe(1362665718)
    expect(source.nextLong()).toBe(-3137480354507206002n)
  })

  it('random from random sequence', async () => {
    const source = createXoroRandomFromRandomSeq(
      'minecraft:chests/trial_chambers/reward',
      -2951183920841657134n,
      0n
    )
    expect(source.seedLo).toBe(4005859919137616206n)
    expect(source.seedHi).toBe(2967592910370780387n)
  })
})
