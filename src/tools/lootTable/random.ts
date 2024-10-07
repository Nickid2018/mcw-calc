import SparkMD5 from 'spark-md5'

export interface RandomSource {
  nextInt: () => number
  nextLong: () => bigint
  nextIntWithBound: (bound: number) => number
  nextFloat: () => number
  nextDouble: () => number
  nextGaussian: () => number
  nextBoolean: () => boolean
  consume: (times: number) => void
}

export function createXoroRandomFromSeed(seed: bigint): XoroshiroRandomSource {
  const loUnmix = seed ^ 0x6A09E667F3BCC909n
  const hiUnmix = BigInt.asIntN(64, loUnmix - 7046029254386353131n)
  return new XoroshiroRandomSource(mixStafford13(loUnmix), mixStafford13(hiUnmix))
}

export function createXoroRandomFromRandomSeq(
  identifier: string,
  worldSeed: bigint,
  salt: bigint,
  includeSequenceId: boolean = true,
  includeWorldSeed: boolean = true,
): XoroshiroRandomSource {
  const initial = includeWorldSeed ? worldSeed ^ salt : salt
  let loUnmix = initial ^ 0x6A09E667F3BCC909n
  let hiUnmix = BigInt.asIntN(64, loUnmix - 7046029254386353131n)
  if (includeSequenceId) {
    const md5 = SparkMD5.hash(identifier)
    loUnmix ^= BigInt(`0x${md5.slice(0, 16)}`)
    hiUnmix ^= BigInt(`0x${md5.slice(16, 32)}`)
  }
  return new XoroshiroRandomSource(mixStafford13(loUnmix), mixStafford13(hiUnmix))
}

function mixStafford13(l: bigint): bigint {
  l = BigInt.asIntN(64, (l ^ ((l >> 30n) & 0x3FFFFFFFFn)) * -4658895280553007687n)
  l = BigInt.asIntN(64, (l ^ ((l >> 27n) & 0x1FFFFFFFFFn)) * -7723592293110705685n)
  return l ^ ((l >> 31n) & 0x1FFFFFFFFn)
}

function rotateLeft(num: bigint, bits: bigint): bigint {
  return BigInt.asIntN(64, num << bits) | ((num >> (64n - bits)) & ((1n << bits) - 1n))
}

// Marsaglia Polar Gaussian
class MarsagliaPolarGaussian {
  randomSource: RandomSource
  haveNextNextGaussian: boolean = false
  nextNextGaussian: number = 0

  constructor(randomSource: RandomSource) {
    this.randomSource = randomSource
  }

  nextGaussian(): number {
    if (this.haveNextNextGaussian) {
      this.haveNextNextGaussian = false
      return this.nextNextGaussian
    }
    let x, y, d
    do {
      x = 2 * this.randomSource.nextDouble() - 1
      y = 2 * this.randomSource.nextDouble() - 1
      d = x * x + y * y
    } while (d >= 1 || d === 0)
    const r = Math.sqrt((-2 * Math.log(d)) / d)
    this.nextNextGaussian = y * r
    this.haveNextNextGaussian = true
    return x * r
  }
}

// Algorithm: Xoroshiro128++
export class XoroshiroRandomSource implements RandomSource {
  seedLo: bigint = -7046029254386353131n
  seedHi: bigint = 7640891576956012809n
  gaussian: MarsagliaPolarGaussian = new MarsagliaPolarGaussian(this)

  constructor(seedLo: bigint, seedHi: bigint) {
    this.seedLo = BigInt.asIntN(64, seedLo)
    this.seedHi = BigInt.asIntN(64, seedHi)
    if ((this.seedLo | this.seedHi) === 0n) {
      this.seedLo = -7046029254386353131n
      this.seedHi = 7640891576956012809n
    }
  }

  nextDouble(): number {
    return Number(this.nextBits(53)) * 1.110223e-16
  }

  nextFloat(): number {
    return Number(this.nextBits(24)) * 5.9604645e-8
  }

  nextGaussian(): number {
    return this.gaussian.nextGaussian()
  }

  nextInt(): number {
    return Number(BigInt.asIntN(32, this.nextLong()))
  }

  nextIntWithBound(bound: number): number {
    const maxB = BigInt(bound)
    let rand = this.nextLong() & 0xFFFFFFFFn
    let mul = rand * maxB
    let low = mul & 0xFFFFFFFFn
    if (low < bound) {
      const remainder = BigInt.asUintN(32, ~maxB + 1n) % maxB
      while (low < remainder) {
        rand = this.nextLong() & 0xFFFFFFFFn
        mul = rand * maxB
        low = mul & 0xFFFFFFFFn
      }
    }
    return Number(BigInt.asIntN(32, (mul >> 32n) & 0xFFFFFFFFn))
  }

  nextBits(bits: number): bigint {
    return (this.nextLong() >> BigInt(64 - bits)) & ((1n << BigInt(bits)) - 1n)
  }

  nextLong(): bigint {
    const lo = this.seedLo
    const hi = this.seedHi
    const result = BigInt.asIntN(64, rotateLeft(BigInt.asIntN(64, lo + hi), 17n) + lo)
    const xor = lo ^ hi
    this.seedLo = rotateLeft(lo, 49n) ^ xor ^ BigInt.asIntN(64, xor << 21n)
    this.seedHi = rotateLeft(xor, 28n)
    return result
  }

  nextBoolean() {
    return (this.nextLong() & 1n) === 1n
  }

  consume(times: number): void {
    let lo = this.seedLo
    let hi = this.seedHi
    for (let i = 0; i < times; i++) {
      const xor = lo ^ hi
      lo = rotateLeft(lo, 49n) ^ xor ^ BigInt.asIntN(64, xor << 21n)
      hi = rotateLeft(xor, 28n)
    }
    this.seedLo = lo
    this.seedHi = hi
  }
}

// LCG
export class LegacyRandomSource implements RandomSource {
  seed: bigint
  gaussian: MarsagliaPolarGaussian = new MarsagliaPolarGaussian(this)

  constructor(seed: bigint) {
    this.seed = (seed ^ 0x5DEECE66Dn) & 0xFFFFFFFFFFFFn
  }

  next(bits: number): number {
    this.seed = BigInt.asIntN(64, this.seed * 25214903917n + 11n) & 0xFFFFFFFFFFFFn
    return Number(BigInt.asIntN(32, this.seed >> (48n - BigInt(bits))))
  }

  consume(times: number): void {
    for (let i = 0; i < times; i++)
      this.nextInt()
  }

  nextBoolean(): boolean {
    return this.next(1) !== 0
  }

  nextDouble(): number {
    const hi = BigInt(this.next(26))
    const lo = BigInt(this.next(27))
    const base = (hi << 27n) + lo
    return Number(base) * 1.110223e-16
  }

  nextFloat(): number {
    return this.next(24) * 5.9604645e-8
  }

  nextGaussian(): number {
    return this.gaussian.nextGaussian()
  }

  nextInt(): number {
    return this.next(32)
  }

  nextIntWithBound(bound: number): number {
    if ((bound & bound - 1) === 0)
      return Number(BigInt.asIntN(32, BigInt(bound) * BigInt(this.next(31)) >> 31n))
    let num = 0
    let nex = 0
    do {
      nex = this.next(31)
      num = nex % bound
    } while (nex - num + bound - 1 < 0)
    return num
  }

  nextLong(): bigint {
    const hi = BigInt(this.next(32))
    const lo = BigInt(this.next(32))
    return (hi << 32n) + lo
  }
}
