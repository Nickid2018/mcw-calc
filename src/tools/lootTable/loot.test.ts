import { describe, expect, it } from 'vitest'
import {
  LootContextJava,
  type LootTableJava,
  fillContainer,
  getRandomItems,
} from '@/tools/lootTable/loot.ts'
import { LegacyRandomSource, createXoroRandomFromSeed } from '@/tools/lootTable/random.ts'

const LOOT_TABLE_TEST = {
  type: 'chest',
  pools: [
    {
      bonus_rolls: 0.0,
      entries: [
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 2.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'enchanted_golden_apple',
        },
        {
          type: 'item',
          name: 'music_disc_otherside',
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: 1.0,
              function: 'set_count',
            },
          ],
          name: 'compass',
          weight: 2,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 2.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'sculk_catalyst',
          weight: 2,
        },
        {
          type: 'item',
          name: 'name_tag',
          weight: 2,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: 1.0,
              function: 'set_count',
            },
            {
              add: false,
              damage: {
                type: 'uniform',
                max: 1.0,
                min: 0.8,
              },
              function: 'set_damage',
            },
            {
              function: 'enchant_with_levels',
              levels: {
                type: 'uniform',
                max: 50.0,
                min: 30.0,
              },
              options: [
                'protection',
                'fire_protection',
                'feather_falling',
                'blast_protection',
                'projectile_protection',
                'respiration',
                'aqua_affinity',
                'thorns',
                'depth_strider',
                'sharpness',
                'smite',
                'bane_of_arthropods',
                'knockback',
                'fire_aspect',
                'looting',
                'sweeping_edge',
                'efficiency',
                'silk_touch',
                'unbreaking',
                'fortune',
                'power',
                'punch',
                'flame',
                'infinity',
                'luck_of_the_sea',
                'lure',
                'loyalty',
                'impaling',
                'riptide',
                'channeling',
                'multishot',
                'quick_charge',
                'piercing',
                'density',
                'breach',
                'binding_curse',
                'vanishing_curse',
                'frost_walker',
                'mending',
              ],
            },
          ],
          name: 'diamond_hoe',
          weight: 2,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: 1.0,
              function: 'set_count',
            },
          ],
          name: 'lead',
          weight: 2,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: 1.0,
              function: 'set_count',
            },
          ],
          name: 'diamond_horse_armor',
          weight: 2,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: 1.0,
              function: 'set_count',
            },
          ],
          name: 'saddle',
          weight: 2,
        },
        {
          type: 'item',
          name: 'music_disc_13',
          weight: 2,
        },
        {
          type: 'item',
          name: 'music_disc_cat',
          weight: 2,
        },
        {
          type: 'item',
          functions: [
            {
              function: 'enchant_with_levels',
              levels: {
                type: 'uniform',
                max: 50.0,
                min: 30.0,
              },
              options: [
                'protection',
                'fire_protection',
                'feather_falling',
                'blast_protection',
                'projectile_protection',
                'respiration',
                'aqua_affinity',
                'thorns',
                'depth_strider',
                'sharpness',
                'smite',
                'bane_of_arthropods',
                'knockback',
                'fire_aspect',
                'looting',
                'sweeping_edge',
                'efficiency',
                'silk_touch',
                'unbreaking',
                'fortune',
                'power',
                'punch',
                'flame',
                'infinity',
                'luck_of_the_sea',
                'lure',
                'loyalty',
                'impaling',
                'riptide',
                'channeling',
                'multishot',
                'quick_charge',
                'piercing',
                'density',
                'breach',
                'binding_curse',
                'vanishing_curse',
                'frost_walker',
                'mending',
              ],
            },
          ],
          name: 'diamond_leggings',
          weight: 2,
        },
        {
          type: 'item',
          functions: [
            {
              function: 'enchant_randomly',
              options: 'swift_sneak',
            },
          ],
          name: 'book',
          weight: 3,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 10.0,
                min: 4.0,
              },
              function: 'set_count',
            },
          ],
          name: 'sculk',
          weight: 3,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 3.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'sculk_sensor',
          weight: 3,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 4.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'candle',
          weight: 3,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 15.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'amethyst_shard',
          weight: 3,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 3.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'experience_bottle',
          weight: 3,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 15.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'glow_berries',
          weight: 3,
        },
        {
          type: 'item',
          functions: [
            {
              function: 'enchant_with_levels',
              levels: {
                type: 'uniform',
                max: 39.0,
                min: 20.0,
              },
              options: [
                'protection',
                'fire_protection',
                'feather_falling',
                'blast_protection',
                'projectile_protection',
                'respiration',
                'aqua_affinity',
                'thorns',
                'depth_strider',
                'sharpness',
                'smite',
                'bane_of_arthropods',
                'knockback',
                'fire_aspect',
                'looting',
                'sweeping_edge',
                'efficiency',
                'silk_touch',
                'unbreaking',
                'fortune',
                'power',
                'punch',
                'flame',
                'infinity',
                'luck_of_the_sea',
                'lure',
                'loyalty',
                'impaling',
                'riptide',
                'channeling',
                'multishot',
                'quick_charge',
                'piercing',
                'density',
                'breach',
                'binding_curse',
                'vanishing_curse',
                'frost_walker',
                'mending',
              ],
            },
          ],
          name: 'iron_leggings',
          weight: 3,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 3.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'echo_shard',
          weight: 4,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 3.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'disc_fragment_5',
          weight: 4,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 3.0,
                min: 1.0,
              },
              function: 'set_count',
            },
            {
              function: 'set_potion',
              id: 'strong_regeneration',
            },
          ],
          name: 'potion',
          weight: 5,
        },
        {
          type: 'item',
          functions: [
            {
              function: 'enchant_randomly',
              options: [
                'protection',
                'fire_protection',
                'feather_falling',
                'blast_protection',
                'projectile_protection',
                'respiration',
                'aqua_affinity',
                'thorns',
                'depth_strider',
                'sharpness',
                'smite',
                'bane_of_arthropods',
                'knockback',
                'fire_aspect',
                'looting',
                'sweeping_edge',
                'efficiency',
                'silk_touch',
                'unbreaking',
                'fortune',
                'power',
                'punch',
                'flame',
                'infinity',
                'luck_of_the_sea',
                'lure',
                'loyalty',
                'impaling',
                'riptide',
                'channeling',
                'multishot',
                'quick_charge',
                'piercing',
                'density',
                'breach',
                'binding_curse',
                'vanishing_curse',
                'frost_walker',
                'mending',
              ],
            },
          ],
          name: 'book',
          weight: 5,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 10.0,
                min: 3.0,
              },
              function: 'set_count',
            },
          ],
          name: 'book',
          weight: 5,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 15.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'bone',
          weight: 5,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 15.0,
                min: 1.0,
              },
              function: 'set_count',
            },
          ],
          name: 'soul_torch',
          weight: 5,
        },
        {
          type: 'item',
          functions: [
            {
              add: false,
              count: {
                type: 'uniform',
                max: 15.0,
                min: 6.0,
              },
              function: 'set_count',
            },
          ],
          name: 'coal',
          weight: 7,
        },
      ],
      rolls: {
        type: 'uniform',
        max: 10.0,
        min: 5.0,
      },
    },
    {
      bonus_rolls: 0.0,
      entries: [
        {
          type: 'empty',
          weight: 75,
        },
        {
          type: 'item',
          name: 'ward_armor_trim_smithing_template',
          weight: 4,
        },
        {
          type: 'item',
          name: 'silence_armor_trim_smithing_template',
        },
      ],
      rolls: 1.0,
    },
  ],
  random_sequence: 'chests/ancient_city',
}

const EXPECT_OUTPUT = [
  { item: 'saddle', count: 1 },
  { item: 'diamond_horse_armor', count: 1 },
  { item: 'sculk', count: 10 },
  { item: 'coal', count: 6 },
  { item: 'sculk_sensor', count: 2 },
  { item: 'candle', count: 3 },
  { item: 'compass', count: 1 },
  { item: 'bone', count: 7 },
  { item: 'soul_torch', count: 13 },
  { item: 'saddle', count: 1 },
]

const EXPECT_OUTPUT2 = [
  { item: 'diamond_hoe', count: 1 },
  { item: 'candle', count: 4 },
  { item: 'experience_bottle', count: 2 },
  { item: 'soul_torch', count: 5 },
  { item: 'music_disc_13', count: 1 },
  { item: 'candle', count: 2 },
  { item: 'sculk', count: 6 },
  { item: 'potion', count: 1 },
  { item: 'potion', count: 1 },
  { item: 'potion', count: 1 },
  { item: 'echo_shard', count: 2 },
  { item: 'disc_fragment_5', count: 2 },
]

const EXPECT_OUTPUT3 = [
  undefined,
  undefined,
  { item: 'diamond_hoe', count: 1 },
  undefined,
  { item: 'bone', count: 1 },
  undefined,
  undefined,
  undefined,
  undefined,
  { item: 'bone', count: 1 },
  undefined,
  { item: 'experience_bottle', count: 1 },
  undefined,
  undefined,
  { item: 'experience_bottle', count: 2 },
  undefined,
  { item: 'bone', count: 3 },
  undefined,
  undefined,
  { item: 'bone', count: 1 },
  undefined,
  undefined,
  undefined,
  undefined,
  { item: 'diamond_leggings', count: 1 },
  { item: 'lead', count: 1 },
  undefined,
]

describe('loot', () => {
  it('loot table 1 test: /loot', async () => {
    const lootTable = LOOT_TABLE_TEST as LootTableJava
    const random1 = createXoroRandomFromSeed(0n)
    const context1 = new LootContextJava(random1)
    const items1 = getRandomItems(lootTable, context1)
    expect(items1.length).toBe(EXPECT_OUTPUT.length)
    for (let i = 0; i < EXPECT_OUTPUT.length; i++) {
      expect(items1[i].item).toBe(EXPECT_OUTPUT[i].item)
      expect(items1[i].count).toBe(EXPECT_OUTPUT[i].count)
    }

    const random2 = createXoroRandomFromSeed(114n)
    const context2 = new LootContextJava(random2)
    const items2 = getRandomItems(lootTable, context2)
    expect(items2.length).toBe(EXPECT_OUTPUT2.length)
    for (let i = 0; i < EXPECT_OUTPUT2.length; i++) {
      expect(items2[i].item).toBe(EXPECT_OUTPUT2[i].item)
      expect(items2[i].count).toBe(EXPECT_OUTPUT2[i].count)
    }
  })

  it('loot table 2 test: container', async () => {
    const lootTable = LOOT_TABLE_TEST as LootTableJava
    const random1 = new LegacyRandomSource(114n)
    const context1 = new LootContextJava(random1)
    const slots: number[] = []
    for (let i = 0; i < 27; i++) slots.push(i)
    const container1 = fillContainer(slots, lootTable, context1)
    for (let i = 0; i < EXPECT_OUTPUT3.length; i++) {
      expect(container1.get(i)?.item).toBe(EXPECT_OUTPUT3[i]?.item)
      expect(container1.get(i)?.count).toBe(EXPECT_OUTPUT3[i]?.count)
    }
  })
})
