import type { RandomSource } from '@/tools/lootTable/random.ts'
import {
  ENCHANTMENT_PRIMARY_ITEMS,
  ENCHANTMENT_SUPPORT_ITEMS,
  ENCHANTMENT_WEIGHT,
  ENCHANTMENTS_COSTS,
  INCOMPATIBLE_ENCHANTMENTS,
} from '@/tools/lootTable/constants.ts'
import {
  componentDeepCopy,
  createAttributeModifiersComponent,
  createEnchantmentComponent,
  getEnchantmentLevel,
  ITEM_DEFAULT_COMPONENTS,
  ItemStack,
} from '@/tools/lootTable/item.ts'

export class PoolIndexedLootResult {}

// LOOT TABLE FOR JAVA EDITION ---------------------------------------------------------------------
// IMPLEMENTATION NOTE: All reference holder object need to be preprocessed to their inline format

export class LootContextJava {
  random: RandomSource

  constructor(random: RandomSource) {
    this.random = random
  }

  luck: number = 0

  // Level Data
  dayTime: number = 0
  raining: boolean = false
  thundering: boolean = false

  // Loot Params
  this_entity?: any
  last_damage_player?: any
  damage_source?: any
  attacking_entity?: any
  direct_attacking_entity?: any
  origin?: { x: number; y: number; z: number }
  block_state?: { block: string; properties?: Record<string, string | number | boolean> }
  block_entity?: any
  tool?: ItemStack
  explosion_radius?: number
  enchantment_level?: number
  enchantment_active?: boolean

  // Generated from loot params
  enchantments: Map<string, number> = new Map<string, number>() // From attacking_entity
}

export interface LootTableJava {
  type?: string
  random_sequence?: string
  pools?: LootPoolJava[]
  functions?: LootItemFunctionJava[]
}

interface LootPoolJava {
  entries: LootPoolEntriesJava[]
  rolls: NumberProviderJava | number // INT
  bonus_rolls?: NumberProviderJava | number // FLOAT
  conditions?: LootItemConditionJava[]
  functions?: LootItemFunctionJava[]
}

interface LootPoolEntriesJava {
  type: string
  conditions?: LootItemConditionJava[] // Singleton & Composite
  functions?: LootItemFunctionJava[] // Singleton & Composite
  children?: LootPoolEntriesJava[] // Composite
  weight?: number // Singleton
  quality?: number // Singleton
  expand?: boolean // tag
  tag_items?: string[] // NOT STANDARD: For tag, expand items in the specific tag by preprocessor
  name?: string // item, dynamic
  value?: LootTableJava // loot_table
}

export interface NumberProviderJava {
  type: string
  n?: NumberProviderJava | number // binomial INT
  p?: NumberProviderJava | number // binomial FLOAT
  value?: number // constant
  amount?: number // enchantment_level
  target?:
    | string
    | {
        type: string
        target?: string // context
        name?: string // fixed
      } // score
  score?: string // score
  scale?: number // score
  storage?: string // storage
  path?: string // storage
  min?: NumberProviderJava | number // uniform
  max?: NumberProviderJava | number // uniform
}

interface LevelBasedValueJava {
  type: string
  max?: number // clamped
  min?: number // clamped
  value?: LevelBasedValueJava | number // clamped
  denominator?: LevelBasedValueJava | number // fraction
  numerator?: LevelBasedValueJava | number // fraction
  added?: number // levels_squared
  base?: number // linear
  per_level_above_first?: number // linear
  values?: number[] // lookup
  fallback?: LevelBasedValueJava | number // lookup
}

interface LootItemConditionJava {
  condition: string
  terms?: LootItemConditionJava[] // all_of, any_of
  block?: string // block_state_property
  properties?: Record<string, string | { min?: string; max?: string }> // block_state_property
  predicate?: any // damage_source_properties, entity_properties, location_check, match_tool
  active?: boolean // enchantment_active_check
  entity?: string // entity_properties, entity_scores
  scores?: Record<
    string,
    | number
    | {
        min: NumberProviderJava | number
        max: NumberProviderJava | number
      }
  > // entity_scores
  term?: LootItemConditionJava // inverted
  offsetX?: number // location_check
  offsetY?: number // location_check
  offsetZ?: number // location_check
  chance?: NumberProviderJava | number // random_chance FLOAT
  enchantment?: string // random_chance_with_enchanted_bonus, table_bonus
  enchanted_chance?: LevelBasedValueJava | number // random_chance_with_enchanted_bonus
  unenchanted_chance?: number // random_chance_with_enchanted_bonus
  chances?: number[] // table_bonus
  value?:
    | number
    | NumberProviderJava // value_check INT
    | {
        min: NumberProviderJava | number
        max: NumberProviderJava | number
      } // time_check INT, value_check INT
  period?: number // time_check
  range?:
    | number
    | {
        min: NumberProviderJava | number
        max: NumberProviderJava | number
      } // value_check INT
  raining?: boolean // weather_check
  thundering?: boolean // weather_check
}

interface LootItemFunctionJava {
  conditions?: LootItemConditionJava[]
  function: string
  enchantment?: string // apply_bonus, enchanted_count_increase
  formula?: string // apply_bonus
  parameters?: {
    bonusMultiplier?: number // uniform_bonus_count
    extraRounds?: number // binomial_with_bonus_count
    probability?: number // binomial_with_bonus_count
  } // apply_bonus
  exclude?: string[] // copy_components
  include?: string[] // copy_components
  source?:
    | string
    | {
        type: string
        target?: string // context
        source?: string // storage
      } // copy_components, copy_custom_data, copy_name
  ops?: {
    op: string
    source: string
    target: string
  }[] // copy_custom_data
  block?: string // copy_state
  properties?: string[] // copy_state
  count?: NumberProviderJava | number // enchanted_count_increase INT, set_count INT
  limit?:
    | number // enchanted_count_increase
    | {
        min: NumberProviderJava | number
        max: NumberProviderJava | number
      } // limit_count INT
  only_compatible?: boolean // enchant_randomly
  options?: string[] // enchant_randomly NEED EXPAND, enchant_with_levels NEED EXPAND, set_instrument NEED EXPAND
  levels?: NumberProviderJava | number // enchant_with_levels INT
  decoration?: string // exploration_map
  destination?: string // exploration_map
  search_radius?: number // exploration_map
  skip_existing_chunks?: boolean // exploration_map
  zoom?: number // exploration_map
  entity?: string // fill_player_head, set_lore, set_name
  item_filter?: any // filtered
  modifier?: LootItemFunctionJava // filtered, modify_contents
  component?: string // modify_contents, set_contents
  functions?: LootItemFunctionJava[] // sequence
  modifiers?: {
    amount: number | NumberProviderJava // FLOAT
    attribute: string
    id: string
    operation: 'add_value' | 'add_multiplied_base' | 'add_multiplied_total'
    slot: string | string[]
  }[] // set_attributes
  replace?: boolean // set_attributes
  append?: boolean // set_banner_pattern
  patterns?: { color: string; pattern: string }[] // set_banner_pattern
  author?: string // set_book_cover
  generation?: number // set_book_cover
  title?: string | { filtered: string; raw: string } // set_book_cover
  value?: NumberProviderJava | number // set_custom_model_data INT
  components?: Record<string, any> // set_components
  entries?: LootPoolEntriesJava[] // set_contents
  add?: boolean // set_count, set_damage
  tag?: string | any // set_custom_data
  damage?: NumberProviderJava | number // set_damage FLOAT
  enchantments?: Record<string, NumberProviderJava | number> // set_enchantments INT
  colors?: number[] // set_firework_explosion
  fade_colors?: number[] // set_firework_explosion
  trail?: boolean // set_firework_explosion
  twinkle?: boolean // set_firework_explosion
  shape?: string // set_firework_explosion
  flight_duration?: number // set_fireworks
  explosions?: {
    values: {
      colors?: number[]
      fade_colors?: number[]
      trail?: boolean
      twinkle?: boolean
      shape: string
    }[]
    mode: string
    offset?: number // insert, replace_section
    size?: number // replace_section
  } // set_fireworks
  item?: string // set_item
  name?: string | any[] // set_loot_table, set_name
  seed?: number // set_loot_table
  type?: string // set_loot_table
  lore?: string | any[] // set_lore
  mode?: string // set_lore, set_writable_book_pages
  offset?: number // set_lore (insert, replace_section), set_writable_book_pages (insert, replace_section), set_written_book_pages (insert, replace_section)
  size?: number // set_lore (replace_section), set_writable_book_pages (replace_section), set_written_book_pages (replace_section)
  target?: string // set_name
  amplifier?: NumberProviderJava | number // set_ominous_bottle_amplifier INT
  id?: string // set_potion
  effects?: { duration: NumberProviderJava | number; type: string }[] // set_stew_effect INT
  pages?: (string | { filtered: string; text: string })[] // set_writable_book_pages, set_written_book_pages
  toggles?: Record<string, boolean> // toggle_tooltips
}

const numberProvidersIntJava: Record<
  string,
  (context: LootContextJava, params: NumberProviderJava) => number
> = {
  binomial: (context, params) => {
    const n = getNumberIntJava(context, params.n!)
    const p = getNumberFloatJava(context, params.p!)
    let count = 0
    for (let i = 0; i < n; i++) {
      if (context.random.nextFloat() < p) count++
    }
    return count
  },
  constant: (_, params) => params.value!,
  enchantment_level: () => 0, // NOT SUPPORTED NOW
  score: () => 0, // NOT SUPPORTED NOW
  storage: () => 0, // NOT SUPPORTED NOW
  uniform: (context, params) => {
    const min = getNumberIntJava(context, params.min!)
    const max = getNumberIntJava(context, params.max!)
    if (min >= max) return min
    return context.random.nextIntWithBound(max - min + 1) + min
  },
}

const numberProvidersFloatJava: Record<
  string,
  (context: LootContextJava, params: NumberProviderJava) => number
> = {
  binomial: numberProvidersIntJava.binomial,
  constant: numberProvidersIntJava.constant,
  enchantment_level: numberProvidersIntJava.enchantment_level,
  score: numberProvidersIntJava.score,
  storage: numberProvidersIntJava.storage,
  uniform: (context, params) => {
    const min = getNumberFloatJava(context, params.min!)
    const max = getNumberFloatJava(context, params.max!)
    if (min >= max) return min
    return context.random.nextFloat() * (max - min) + min
  },
}

function getNumberIntJava(context: LootContextJava, provider: NumberProviderJava | number) {
  if (typeof provider === 'number') return provider
  return numberProvidersIntJava[provider.type]?.(context, provider) ?? 0
}

function getNumberFloatJava(context: LootContextJava, provider: NumberProviderJava | number) {
  if (typeof provider === 'number') return provider
  return numberProvidersFloatJava[provider.type]?.(context, provider) ?? 0
}

const levelBasedValueJava: Record<string, (params: LevelBasedValueJava, level: number) => number> =
  {
    clamped: (params, level) => {
      const v = getLevelBasedValueJava(params.value!, level)
      return v < params.min! ? params.min! : v > params.max! ? params.max! : v
    },
    fraction: (params, level) => {
      const d = getLevelBasedValueJava(params.denominator!, level)
      if (d === 0) return 0
      return getLevelBasedValueJava(params.numerator!, level) / d
    },
    levels_squared: (params, level) => {
      return level * level + params.added!
    },
    linear: (params, level) => {
      return params.base! + params.per_level_above_first! * (level - 1)
    },
    lookup: (params, level) => {
      return level <= params.values!.length
        ? params.values![level - 1]
        : getLevelBasedValueJava(params.fallback!, level)
    },
  }

function getLevelBasedValueJava(provider: LevelBasedValueJava | number, level: number) {
  if (typeof provider === 'number') return provider
  return levelBasedValueJava[provider.type]?.(provider, level) ?? 0
}

const lootItemConditionJava: Record<
  string,
  (context: LootContextJava, params: LootItemConditionJava) => boolean
> = {
  all_of: (context, params) => params.terms!.every((t) => computeLootItemConditionJava(context, t)),
  any_of: (context, params) => params.terms!.some((t) => computeLootItemConditionJava(context, t)),
  block_state_property: (context, params) => {
    if (!context.block_state) return false
    if (context.block_state.block !== params.block!) return false
    if (!params.properties) return true
    const d = context.block_state!.properties ?? {}
    return Object.entries(params.properties).every((v) => {
      if (typeof v[1] === 'string') return d[v[0]] === v[1]
      const min = Number(v[1].min ?? '0')
      const max = Number(v[1].max ?? '2147483647')
      const now = Number(d[v[0]])
      return min <= now && max >= now
    })
  },
  damage_source_properties: () => true, // NOT SUPPORTED NOW
  enchantment_active_check: (context, params) => context.enchantment_active === params.active!,
  entity_properties: () => true, // NOT SUPPORTED NOW
  entity_scores: () => true, // NOT SUPPORTED NOW
  inverted: (context, params) => !computeLootItemConditionJava(context, params.term!),
  killed_by_player: (context) => context.last_damage_player,
  location_check: () => true, // NOT SUPPORTED NOW
  match_tool: () => true, // NOT SUPPORTED NOW
  random_chance: (context, params) => {
    const chance = getNumberFloatJava(context, params.chance!)
    return context.random.nextFloat() < chance
  },
  random_chance_with_enchanted_bonus: () => true, // NOT SUPPORTED NOW
  survives_explosion: (context) => {
    if (!context.explosion_radius) return true
    return context.random.nextFloat() <= 1 / context.explosion_radius
  },
  table_bonus: (context, params) => {
    const level = context.tool ? getEnchantmentLevel(context.tool, params.enchantment!) : 0
    const chances = params.chances![Math.min(level, params.chances!.length - 1)]
    return context.random.nextFloat() < chances
  },
  time_check: (context, params) => {
    let time = context.dayTime
    if (params.period) time %= params.period
    const value = params.value
    const min =
      typeof value === 'number'
        ? value!
        : value!.min
          ? getNumberIntJava(context, value!.min)
          : -Infinity
    const max =
      typeof value === 'number'
        ? value!
        : value!.max
          ? getNumberIntJava(context, value!.max)
          : Infinity
    return time >= min && time <= max
  },
  value_check: (context, params) => {
    const value = getNumberIntJava(context, params.value! as NumberProviderJava | number)
    const range = params.range!
    const min =
      typeof range === 'number'
        ? range!
        : range!.min
          ? getNumberIntJava(context, range!.min)
          : -Infinity
    const max =
      typeof range === 'number'
        ? range!
        : range!.max
          ? getNumberIntJava(context, range!.max)
          : Infinity
    return value >= min && value <= max
  },
  weather_check: (context, params) => {
    return (
      (!params.raining || params.raining === context.raining) &&
      (!params.thundering || params.thundering === context.thundering)
    )
  },
}

function computeLootItemConditionJava(
  context: LootContextJava,
  condition?: LootItemConditionJava | LootItemConditionJava[],
): boolean {
  if (Array.isArray(condition))
    return condition.every((c) => computeLootItemConditionJava(context, c))
  return condition
    ? (lootItemConditionJava[condition.condition]?.(context, condition) ?? true)
    : true
}

const lootItemFunctionJava: Record<
  string,
  (context: LootContextJava, itemStack: ItemStack, params: LootItemFunctionJava) => ItemStack
> = {
  apply_bonus: (context, itemStack, params) => {
    if (!context.tool) return itemStack
    const level = getEnchantmentLevel(context.tool, params.enchantment!)
    switch (params.formula!) {
      case 'uniform_bonus_count':
        itemStack.count += context.random.nextIntWithBound(
          params.parameters!.bonusMultiplier! * level + 1,
        )
        break
      case 'ore_drops':
        if (level > 0) {
          const num = context.random.nextIntWithBound(level + 2) - 1
          itemStack.count *= (num < 0 ? 0 : num) + 1
        }
        break
      case 'binomial_with_bonus_count':
        for (let i = 0; i < level + params.parameters!.extraRounds!; i++)
          if (context.random.nextFloat() < params.parameters!.probability!) itemStack.count++
        break
    }
    return itemStack
  },
  copy_components: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  copy_custom_data: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  copy_name: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  copy_state: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  enchanted_count_increase: (context, itemStack, params) => {
    if (!context.enchantments.has(params.enchantment!)) return itemStack
    const level = context.enchantments.get(params.enchantment!)!
    itemStack.count += Math.floor(level * getNumberFloatJava(context, params.value!))
    if (params.limit) itemStack.count = Math.min(itemStack.count, params.limit as number)
    return itemStack
  },
  enchant_randomly: (context, itemStack, params) => {
    const filterCompat = itemStack.item !== 'book' && (params.only_compatible ?? true)
    const select = params.options!.filter(
      (s) => !filterCompat || ENCHANTMENT_SUPPORT_ITEMS[s].includes(itemStack.item),
    )
    if (select.length === 0) return itemStack
    const selected = select[context.random.nextIntWithBound(select.length)]
    if (itemStack.item === 'book') itemStack = new ItemStack('enchanted_book', 1)
    const enchantments = itemStack.getOrCreateComponent(
      itemStack.item === 'enchanted_book' ? 'stored_enchantments' : 'enchantments',
      createEnchantmentComponent,
    )
    const level =
      ENCHANTMENTS_COSTS[selected].length === 1
        ? 1
        : context.random.nextIntWithBound(ENCHANTMENTS_COSTS[selected].length) + 1
    if (enchantments.levels.has(selected)) {
      if (level >= enchantments.levels.get(selected)!) enchantments.levels.set(selected, level)
    } else enchantments.levels.set(selected, level)
    return itemStack
  },
  enchant_with_levels: (context, itemStack, params) => {
    let level = getNumberIntJava(context, params.levels!)
    if (!itemStack.components.has('enchantable')) return itemStack
    const enchantValue = itemStack.components.get('enchantable').value as number
    const isBook = itemStack.item === 'book'
    if (itemStack.item === 'book') itemStack = new ItemStack('enchanted_book', 1)
    const pValue = Math.floor(enchantValue / 4) + 1
    level += 1 + context.random.nextIntWithBound(pValue) + context.random.nextIntWithBound(pValue)
    const factor = (context.random.nextFloat() + context.random.nextFloat() - 1) * 0.15
    level *= 1 + factor
    level = Math.round(level)
    level = level < 0 ? 0 : level > 2147483647 ? 2147483647 : level
    let available: [string, number][] = []
    params
      .options!.filter((s) => isBook || ENCHANTMENT_PRIMARY_ITEMS[s].includes(itemStack.item))
      .forEach((e) => {
        for (let i = ENCHANTMENTS_COSTS[e].length - 1; i >= 0; i--) {
          if (ENCHANTMENTS_COSTS[e][i][0] <= level && ENCHANTMENTS_COSTS[e][i][1] >= level) {
            available.push([e, i + 1])
            break
          }
        }
      })
    if (available.length === 0) return itemStack
    const selectedEnchants = []
    let totalWeight = 0
    available.forEach(([k]) => (totalWeight += ENCHANTMENT_WEIGHT[k]))
    if (totalWeight > 0) {
      let sel = context.random.nextIntWithBound(totalWeight)
      let i = 0
      for (; i < available.length; i++) {
        sel -= ENCHANTMENT_WEIGHT[available[i][0]]
        if (sel < 0) break
      }
      selectedEnchants.push(available[i])
    }
    while (context.random.nextIntWithBound(50) <= level) {
      if (selectedEnchants.length > 0) {
        const enchant = selectedEnchants[selectedEnchants.length - 1][0]
        available = available
          .filter(([k]) => k !== enchant)
          .filter(([k]) => !(INCOMPATIBLE_ENCHANTMENTS[enchant]?.includes(k) ?? false))
      }
      if (available.length === 0) break
      totalWeight = 0
      available.forEach(([k]) => (totalWeight += ENCHANTMENT_WEIGHT[k]))
      if (totalWeight > 0) {
        let sel = context.random.nextIntWithBound(totalWeight)
        let i = 0
        for (; i < available.length; i++) {
          sel -= ENCHANTMENT_WEIGHT[available[i][0]]
          if (sel < 0) break
        }
        selectedEnchants.push(available[i])
      }
      level = Math.floor(level / 2)
    }
    const enchantments = itemStack.getOrCreateComponent(
      itemStack.item === 'enchanted_book' ? 'stored_enchantments' : 'enchantments',
      createEnchantmentComponent,
    )
    for (const enchant of selectedEnchants) {
      if (enchantments.levels.has(enchant[0])) {
        if (level >= enchantments.levels.get(enchant[0])!)
          enchantments.levels.set(enchant[0], enchant[1])
      } else enchantments.levels.set(enchant[0], enchant[1])
    }
    return itemStack
  },
  exploration_map: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  explosion_decay: (context, itemStack) => {
    if (context.explosion_radius) {
      const p = 1 / context.explosion_radius
      let count = 0
      for (let i = 0; i < itemStack.count; i++) if (context.random.nextFloat() <= p) count++
      itemStack.count = count
    }
    return itemStack
  },
  fill_player_head: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  filtered: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  furnace_smelt: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  limit_count: (context, itemStack, params) => {
    const limit = params.limit
    const min = typeof limit === 'number' ? limit! : getNumberIntJava(context, limit!.min)
    const max = typeof limit === 'number' ? limit! : getNumberIntJava(context, limit!.max)
    if (itemStack.count > max) itemStack.count = max
    if (itemStack.count < min) itemStack.count = min
    return itemStack
  },
  modify_contents: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  sequence: (context, itemStack, params) =>
    computeLootItemFunctionJava(context, itemStack, params.functions!),
  set_attributes: (context, itemStack, params) => {
    const attributes = itemStack.getOrCreateComponent(
      'attribute_modifiers',
      createAttributeModifiersComponent,
    )
    if (params.replace ?? true) attributes.modifiers = []
    for (const modifier of params.modifiers!) {
      const slots = modifier.slot
      let slot
      if (typeof slots === 'string') {
        slot = slots
        context.random.nextIntWithBound(1)
      } else {
        slot = slots[context.random.nextIntWithBound(slots.length)]
      }
      attributes.modifiers = attributes.modifiers.filter((m) => m.id !== modifier.id)
      attributes.modifiers.push({
        amount: getNumberFloatJava(context, modifier.amount),
        type: modifier.attribute,
        id: modifier.id,
        operation: modifier.operation,
        slot,
      })
    }
    return itemStack
  },
  set_banner_pattern: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_book_cover: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_custom_model_data: (context, itemStack, params) => {
    itemStack.components.set('custom_model_data', getNumberIntJava(context, params.value!))
    return itemStack
  },
  set_components: (_, itemStack, params) => {
    Object.entries(params.components!).forEach(([k, v]) => {
      if (k.startsWith('!')) itemStack.components.delete(k.substring(1))
      else itemStack.components.set(k, componentDeepCopy[k]?.(v) ?? v)
    })
    return itemStack
  },
  set_contents: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_count: (context, itemStack, params) => {
    const num = getNumberIntJava(context, params.count!)
    itemStack.count = params.add ? itemStack.count + num : num
    return itemStack
  },
  set_custom_data: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_damage: (context, itemStack, params) => {
    if (!itemStack.components.has('max_damage') || !itemStack.components.has('damage'))
      return itemStack
    const maxDamage = itemStack.components.get('max_damage')
    const damage = itemStack.components.get('damage')
    const base = params.add ? 1 - damage / maxDamage : 0
    let percent = getNumberFloatJava(context, params.damage!) + base
    percent = percent < 0 ? 0 : percent > 1 ? 1 : percent
    const result = 1 - percent
    itemStack.components.set('damage', Math.floor(result * maxDamage))
    return itemStack
  },
  set_enchantments: (context, itemStack, params) => {
    if (itemStack.item === 'book') {
      const sourceComponents = itemStack.components
      itemStack = new ItemStack('enchanted_book', itemStack.count)
      sourceComponents.forEach((v, k) => {
        if (ITEM_DEFAULT_COMPONENTS.book[k] && ITEM_DEFAULT_COMPONENTS.book[k] !== v)
          itemStack.components.set(k, v)
      })
    }
    const enchantments = itemStack.getOrCreateComponent(
      itemStack.item === 'enchanted_book' ? 'stored_enchantments' : 'enchantments',
      createEnchantmentComponent,
    )
    Object.entries(params.enchantments!).forEach(([k, v]) => {
      const base = params.add ? (enchantments.levels.get(k) ?? 0) : 0
      const value = base + getNumberIntJava(context, v)
      enchantments.levels.set(k, value > 255 ? 255 : value < 0 ? 0 : value)
    })
    return itemStack
  },
  set_firework_explosion: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_fireworks: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_instrument: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_item: (_, itemStack, params) => {
    const sourceComponents = itemStack.components
    const sourceName = itemStack.item
    itemStack = new ItemStack(params.item!, itemStack.count)
    sourceComponents.forEach((v, k) => {
      if (ITEM_DEFAULT_COMPONENTS[sourceName][k] && ITEM_DEFAULT_COMPONENTS[sourceName][k] !== v)
        itemStack.components.set(k, v)
    })
    return itemStack
  },
  set_loot_table: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_lore: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_name: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_ominous_bottle_amplifier: (context, itemStack, params) => {
    const value = getNumberIntJava(context, params.amplifier!)
    itemStack.components.set('ominous_bottle_amplifier', value > 4 ? 4 : value < 0 ? 0 : value)
    return itemStack
  },
  set_potion: (_, itemStack, params) => {
    itemStack.components.set('potion_contents', {
      potion: params.id!,
    })
    return itemStack
  },
  set_stew_effect: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_writable_book_pages: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  set_written_book_pages: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
  toggle_tooltips: (_, itemStack) => itemStack, // NOT SUPPORTED NOW
}

function computeLootItemFunctionJava(
  context: LootContextJava,
  itemStack: ItemStack,
  func?: LootItemFunctionJava | LootItemFunctionJava[],
): ItemStack {
  if (Array.isArray(func)) {
    func.forEach((v) => (itemStack = computeLootItemFunctionJava(context, itemStack, v)))
    return itemStack
  }
  return func
    ? (lootItemFunctionJava[func.function]?.(context, itemStack, func) ?? itemStack)
    : itemStack
}

function expandEntry(
  entry: LootPoolEntriesJava,
  lootContext: LootContextJava,
  expanded: LootPoolEntriesJava[],
) {
  if (!computeLootItemConditionJava(lootContext, entry.conditions)) return false
  switch (entry.type) {
    case 'alternatives':
      for (const sub of entry.children!) if (expandEntry(sub, lootContext, expanded)) return true
      return false
    case 'group':
      for (const sub of entry.children!) expandEntry(sub, lootContext, expanded)
      return true
    case 'sequence':
      for (const sub of entry.children!) if (!expandEntry(sub, lootContext, expanded)) return false
      return true
    case 'tag':
      if (entry.expand) {
        for (const item of entry.tag_items!) expanded.push({ type: 'item', name: item }) // MC-212671, not inherit functions
      } else expanded.push(entry)
      break
    default:
      expanded.push(entry)
  }

  return true
}

function createItemStack(entry: LootPoolEntriesJava, lootContext: LootContextJava): ItemStack[] {
  switch (entry.type) {
    case 'item':
      return [
        computeLootItemFunctionJava(lootContext, new ItemStack(entry.name!, 1), entry.functions),
      ]
    case 'loot_table':
      return getRandomItems(entry.value!, lootContext).map((t) =>
        computeLootItemFunctionJava(lootContext, t, entry.functions),
      )
    case 'tag':
      return entry
        .tag_items!.map((t) => new ItemStack(t, 1))
        .map((t) => computeLootItemFunctionJava(lootContext, t, entry.functions))
  }
  return []
}

function splitItemStack(itemStacks: ItemStack[]) {
  return itemStacks
    .map((i) => {
      const stackSize = i.components.get('max_stack_size') ?? 64
      if (i.count <= stackSize) return [i]
      const output: ItemStack[] = []
      while (i.count > stackSize) {
        output.push(i.copyWithCount(stackSize))
        i.count -= stackSize
      }
      output.push(i)
      return output
    })
    .flat()
}

export function getRandomItems(lootTable: LootTableJava, lootContext: LootContextJava) {
  const result: ItemStack[] = []
  for (const pool of lootTable.pools!) {
    if (!computeLootItemConditionJava(lootContext, pool.conditions)) continue
    const rolls =
      getNumberIntJava(lootContext, pool.rolls) +
      (pool.bonus_rolls ? getNumberFloatJava(lootContext, pool.bonus_rolls) * lootContext.luck : 0)
    for (let i = 0; i < rolls; i++) {
      const availableEntries = []
      const weights = []
      let totalWeight = 0
      for (const noExpandEntry of pool.entries) {
        const expandedEntries: LootPoolEntriesJava[] = []
        expandEntry(noExpandEntry, lootContext, expandedEntries)
        for (const entry of expandedEntries) {
          const weight = Math.floor((entry.weight ?? 1) + (entry.quality ?? 0) * lootContext.luck)
          if (weight > 0) {
            availableEntries.push(entry)
            weights.push(weight)
            totalWeight += weight
          }
        }
      }
      if (totalWeight === 0) continue
      let notProcessedItemStacks: ItemStack[] = []
      if (availableEntries.length === 1)
        notProcessedItemStacks = createItemStack(availableEntries[0], lootContext)
      else {
        let selectedWeight = lootContext.random.nextIntWithBound(totalWeight)
        for (let i = 0; i < availableEntries.length; i++) {
          selectedWeight -= weights[i]
          if (selectedWeight < 0) {
            notProcessedItemStacks = createItemStack(availableEntries[i], lootContext)
            break
          }
        }
      }
      result.push(
        ...notProcessedItemStacks.map((i) =>
          computeLootItemFunctionJava(lootContext, i, pool.functions),
        ),
      )
    }
  }
  return splitItemStack(
    result.map((i) => computeLootItemFunctionJava(lootContext, i, lootTable.functions)),
  )
}

export function fillContainer(
  availableSlots: number[],
  lootTable: LootTableJava,
  lootContext: LootContextJava,
) {
  const items = getRandomItems(lootTable, lootContext)
  availableSlots = [...availableSlots]
  availableSlots.sort((a, b) => a - b) // THIS IS JAVASCRIPT
  for (let i = availableSlots.length; i > 1; i--) {
    const sel = lootContext.random.nextIntWithBound(i)
    const swap = availableSlots[i - 1]
    availableSlots[i - 1] = availableSlots[sel]
    availableSlots[sel] = swap
  }
  const splitItems = items.filter((i) => i.count > 1)
  const finalItems = items.filter((i) => i.count === 1)
  while (
    availableSlots.length - splitItems.length - finalItems.length > 0 &&
    splitItems.length > 0
  ) {
    const sel = splitItems.length === 1 ? 0 : lootContext.random.nextIntWithBound(splitItems.length)
    const itemStack = splitItems.splice(sel, 1)[0]
    const maxSplit = Math.floor(itemStack.count / 2)
    const split = maxSplit === 1 ? 1 : lootContext.random.nextIntWithBound(maxSplit) + 1
    const splitItem = itemStack.copyWithCount(split)
    itemStack.count -= split
    if (itemStack.count > 1 && lootContext.random.nextBoolean()) splitItems.push(itemStack)
    else finalItems.push(itemStack)
    if (splitItem.count > 1 && lootContext.random.nextBoolean()) splitItems.push(splitItem)
    else finalItems.push(splitItem)
  }
  finalItems.push(...splitItems)
  for (let i = finalItems.length; i > 1; i--) {
    const sel = lootContext.random.nextIntWithBound(i)
    const swap = finalItems[i - 1]
    finalItems[i - 1] = finalItems[sel]
    finalItems[sel] = swap
  }
  const output = new Map<number, ItemStack>()
  for (const itemStack of finalItems) {
    const index = availableSlots.pop()
    if (!index) break
    if (!itemStack.isEmpty()) output.set(index, itemStack)
  }
  return output
}
