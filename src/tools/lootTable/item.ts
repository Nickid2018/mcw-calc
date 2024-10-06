import ITEM_DEFAULT_COMPONENTS_RAW from './item_default_components.json'

const ITEM_DEFAULT_COMPONENTS = ITEM_DEFAULT_COMPONENTS_RAW as Record<string, Record<string, any>>

const componentSanitizer: Record<string, (source: any) => any> = {
  enchantments: (source) => {
    return {
      levels: new Map<string, number>(Object.entries(source.levels)),
      show_in_tooltip: source.show_in_tooltip,
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
        this.components.set(k, componentSanitizer[k]?.(v) ?? v),
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
    Object.entries(this.components).forEach(([k, v]) =>
      itemStack.components.set(k, componentSanitizer[k]?.(v) ?? v),
    )
    return itemStack
  }
}

export function createEnchantmentComponent() {
  return { levels: new Map<string, number>(), show_in_tooltip: true }
}

export function getEnchantmentLevel(itemStack: ItemStack, name: string): number {
  if (!itemStack.components.has('enchantments')) return 0
  const enchantments = itemStack.components.get('enchantments').levels
  if (enchantments.has(name)) return enchantments.get(name)
  return 0
}
