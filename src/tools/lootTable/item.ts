import ITEM_DEFAULT_COMPONENTS_RAW from './item_default_components.json'

export const ITEM_DEFAULT_COMPONENTS = ITEM_DEFAULT_COMPONENTS_RAW as Record<
  string,
  Record<string, any>
>

export const componentDeepCopy: Record<string, (source: any) => any> = {
  enchantments: (source) => {
    return {
      levels: new Map<string, number>(Object.entries(source.levels)),
      show_in_tooltip: source.show_in_tooltip ?? true,
    }
  },
  stored_enchantments: (source) => {
    return {
      levels: new Map<string, number>(Object.entries(source.levels)),
      show_in_tooltip: source.show_in_tooltip ?? true,
    }
  },
  attribute_modifiers: (source) => {
    return {
      modifiers: source.modifiers.map((s: any) => {
        return {
          amount: s.amount,
          type: s.type,
          id: s.id,
          operation: s.operation,
          slot: s.slot,
        }
      }),
      show_in_tooltip: source.show_in_tooltip ?? true,
    }
  },
  potion_contents: (source) => {
    return {
      potion: source.potion,
      custom_color: source.custom_color,
      custom_effects: source.custom_effects ? [...source.custom_effects] : [],
      custom_name: source.custom_name
    }
  },
}

export class ItemStack {
  item: string
  count: number
  components: Map<string, any> = new Map<string, any>()

  constructor(item: string, count: number) {
    this.item = item
    this.count = count
    if (ITEM_DEFAULT_COMPONENTS[item]) {
      const data = ITEM_DEFAULT_COMPONENTS[item]
      Object.entries(data).forEach(([k, v]) =>
        this.components.set(k, componentDeepCopy[k]?.(v) ?? v),
      )
    }
  }

  getOrCreateComponent<T>(name: string, initializer: () => T): T {
    if (this.components.has(name)) return this.components.get(name) as T
    const data = initializer()
    this.components.set(name, data)
    return data
  }

  copyWithCount(count: number) {
    const itemStack = new ItemStack(this.item, count)
    this.components.forEach((v, k) =>
      itemStack.components.set(k, componentDeepCopy[k]?.(v) ?? v),
    )
    return itemStack
  }

  isEmpty() {
    return this.item === 'air' || this.count === 0
  }
}

export const EMPTY = new ItemStack('air', 0)

export function createEnchantmentComponent() {
  return { levels: new Map<string, number>(), show_in_tooltip: true }
}

export function createAttributeModifiersComponent() {
  return {
    modifiers: [] as {
      amount: number
      type: string
      id: string
      operation: 'add_value' | 'add_multiplied_base' | 'add_multiplied_total'
      slot: string | string[]
    }[],
    show_in_tooltip: true,
  }
}

export function getEnchantmentLevel(itemStack: ItemStack, name: string): number {
  if (!itemStack.components.has('enchantments')) return 0
  const enchantments = itemStack.components.get('enchantments').levels
  if (enchantments.has(name)) return enchantments.get(name)
  return 0
}
