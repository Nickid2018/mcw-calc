import { describe, expect, it } from 'vitest'
import {
  LegacyRandomSource,
  createXoroRandomFromRandomSeq,
  createXoroRandomFromSeed,
} from '@/tools/lootTable/random.ts'

describe('random', () => {
  it('random Xoroshiro128++', async () => {
    const source = createXoroRandomFromSeed(-1234n)
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
      0n,
    )
    expect(source.seedLo).toBe(4005859919137616206n)
    expect(source.seedHi).toBe(2967592910370780387n)
  })

  it('random Legacy LCG', async () => {
    const source = new LegacyRandomSource(114n)
    source.consume(1000)
    expect(source.nextInt()).toBe(1958913903)
    expect(source.nextLong()).toBe(2313057718171599392n)
    expect(source.nextFloat()).toBeCloseTo(0.44635153)
    expect(source.nextDouble()).toBeCloseTo(0.9118417965892536)
    expect(source.nextIntWithBound(100)).toBe(1)
    expect(source.nextIntWithBound(100)).toBe(20)
    expect(source.nextIntWithBound(100)).toBe(40)
    expect(source.nextIntWithBound(100)).toBe(77)
    expect(source.nextIntWithBound(100)).toBe(66)
    expect(source.nextGaussian()).toBeCloseTo(-1.3914054404492375)
    expect(source.nextGaussian()).toBeCloseTo(0.25222511262100356)
    expect(source.nextInt()).toBe(-1997074919)
    expect(source.nextLong()).toBe(7979975594080502642n)
  })
})
