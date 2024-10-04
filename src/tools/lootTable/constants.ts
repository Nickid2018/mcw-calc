// THESE CONSTANTS SHOULD BE GENERATED BY AUTOMATIC PROGRAM

export const INCOMPATIBLE_ENCHANTMENTS: Record<string, string[]> = {
  bane_of_arthropods: ['breach', 'density', 'impaling', 'sharpness', 'smite'],
  blast_protection: ['fire_protection', 'projectile_protection', 'protection'],
  breach: ['bane_of_arthropods', 'density', 'impaling', 'sharpness', 'smite'],
  channeling: ['riptide'],
  density: ['bane_of_arthropods', 'breach', 'impaling', 'sharpness', 'smite'],
  depth_strider: ['frost_walker'],
  fire_protection: ['blast_protection', 'projectile_protection', 'protection'],
  fortune: ['silk_touch'],
  frost_walker: ['depth_strider'],
  impaling: ['bane_of_arthropods', 'breach', 'density', 'sharpness', 'smite'],
  infinity: ['mending'],
  loyalty: ['riptide'],
  mending: ['infinity'],
  multishot: ['piercing'],
  piercing: ['multishot'],
  projectile_protection: ['blast_protection', 'fire_protection', 'protection'],
  protection: ['blast_protection', 'fire_protection', 'projectile_protection'],
  riptide: ['channeling', 'loyalty'],
  sharpness: ['bane_of_arthropods', 'breach', 'density', 'impaling', 'smite'],
  silk_touch: ['fortune'],
  smite: ['bane_of_arthropods', 'breach', 'density', 'impaling', 'sharpness'],
}

export const ENCHANTMENTS_COSTS: Record<string, number[][]> = {
  aqua_affinity: [[1, 41]],
  bane_of_arthropods: [
    [5, 25],
    [13, 33],
    [21, 41],
    [29, 49],
    [37, 57],
  ],
  binding_curse: [[25, 50]],
  blast_protection: [
    [5, 13],
    [13, 21],
    [21, 29],
    [29, 37],
  ],
  breach: [
    [15, 65],
    [24, 74],
    [33, 83],
    [42, 92],
  ],
  channeling: [[25, 50]],
  density: [
    [5, 25],
    [13, 33],
    [21, 41],
    [29, 49],
    [37, 57],
  ],
  depth_strider: [
    [10, 25],
    [20, 35],
    [30, 45],
  ],
  efficiency: [
    [1, 51],
    [11, 61],
    [21, 71],
    [31, 81],
    [41, 91],
  ],
  feather_falling: [
    [5, 11],
    [11, 17],
    [17, 23],
    [23, 29],
  ],
  fire_aspect: [
    [10, 60],
    [30, 80],
  ],
  fire_protection: [
    [10, 18],
    [18, 26],
    [26, 34],
    [34, 42],
  ],
  flame: [[20, 50]],
  fortune: [
    [15, 65],
    [24, 74],
    [33, 83],
  ],
  frost_walker: [
    [10, 25],
    [20, 35],
  ],
  impaling: [
    [1, 21],
    [9, 29],
    [17, 37],
    [25, 45],
    [33, 53],
  ],
  infinity: [[20, 50]],
  knockback: [
    [5, 55],
    [25, 75],
  ],
  looting: [
    [15, 65],
    [24, 74],
    [33, 83],
  ],
  loyalty: [
    [12, 50],
    [19, 50],
    [26, 50],
  ],
  luck_of_the_sea: [
    [15, 65],
    [24, 74],
    [33, 83],
  ],
  lure: [
    [15, 65],
    [24, 74],
    [33, 83],
  ],
  mending: [[25, 75]],
  multishot: [[20, 50]],
  piercing: [
    [1, 50],
    [11, 50],
    [21, 50],
    [31, 50],
  ],
  power: [
    [1, 16],
    [11, 26],
    [21, 36],
    [31, 46],
    [41, 56],
  ],
  projectile_protection: [
    [3, 9],
    [9, 15],
    [15, 21],
    [21, 27],
  ],
  protection: [
    [1, 12],
    [12, 23],
    [23, 34],
    [34, 45],
  ],
  punch: [
    [12, 37],
    [32, 57],
  ],
  quick_charge: [
    [12, 50],
    [32, 50],
    [52, 50],
  ],
  respiration: [
    [10, 40],
    [20, 50],
    [30, 60],
  ],
  riptide: [
    [17, 50],
    [24, 50],
    [31, 50],
  ],
  sharpness: [
    [1, 21],
    [12, 32],
    [23, 43],
    [34, 54],
    [45, 65],
  ],
  silk_touch: [[15, 65]],
  smite: [
    [5, 25],
    [13, 33],
    [21, 41],
    [29, 49],
    [37, 57],
  ],
  soul_speed: [
    [10, 25],
    [20, 35],
    [30, 45],
  ],
  sweeping_edge: [
    [5, 20],
    [14, 29],
    [23, 38],
  ],
  swift_sneak: [
    [25, 75],
    [50, 100],
    [75, 125],
  ],
  thorns: [
    [10, 60],
    [30, 80],
    [50, 100],
  ],
  unbreaking: [
    [5, 55],
    [13, 63],
    [21, 71],
  ],
  vanishing_curse: [[25, 50]],
  wind_burst: [
    [15, 65],
    [24, 74],
    [33, 83],
  ],
}

export const ENCHANTMENT_PRIMARY_ITEMS: Record<string, string[]> = {
  aqua_affinity: [
    'chainmail_helmet',
    'diamond_helmet',
    'golden_helmet',
    'iron_helmet',
    'leather_helmet',
    'netherite_helmet',
    'turtle_helmet',
  ],
  bane_of_arthropods: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  binding_curse: [
    'carved_pumpkin',
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'creeper_head',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'dragon_head',
    'elytra',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'piglin_head',
    'player_head',
    'skeleton_skull',
    'turtle_helmet',
    'wither_skeleton_skull',
    'zombie_head',
  ],
  blast_protection: [
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'turtle_helmet',
  ],
  breach: ['mace'],
  channeling: ['trident'],
  density: ['mace'],
  depth_strider: [
    'chainmail_boots',
    'diamond_boots',
    'golden_boots',
    'iron_boots',
    'leather_boots',
    'netherite_boots',
  ],
  efficiency: [
    'diamond_axe',
    'diamond_hoe',
    'diamond_pickaxe',
    'diamond_shovel',
    'golden_axe',
    'golden_hoe',
    'golden_pickaxe',
    'golden_shovel',
    'iron_axe',
    'iron_hoe',
    'iron_pickaxe',
    'iron_shovel',
    'netherite_axe',
    'netherite_hoe',
    'netherite_pickaxe',
    'netherite_shovel',
    'shears',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
  ],
  feather_falling: [
    'chainmail_boots',
    'diamond_boots',
    'golden_boots',
    'iron_boots',
    'leather_boots',
    'netherite_boots',
  ],
  fire_aspect: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  fire_protection: [
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'turtle_helmet',
  ],
  flame: ['bow'],
  fortune: [
    'diamond_axe',
    'diamond_hoe',
    'diamond_pickaxe',
    'diamond_shovel',
    'golden_axe',
    'golden_hoe',
    'golden_pickaxe',
    'golden_shovel',
    'iron_axe',
    'iron_hoe',
    'iron_pickaxe',
    'iron_shovel',
    'netherite_axe',
    'netherite_hoe',
    'netherite_pickaxe',
    'netherite_shovel',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
  ],
  frost_walker: [
    'chainmail_boots',
    'diamond_boots',
    'golden_boots',
    'iron_boots',
    'leather_boots',
    'netherite_boots',
  ],
  impaling: ['trident'],
  infinity: ['bow'],
  knockback: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  looting: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  loyalty: ['trident'],
  luck_of_the_sea: ['fishing_rod'],
  lure: ['fishing_rod'],
  mending: [
    'bow',
    'brush',
    'carrot_on_a_stick',
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'crossbow',
    'diamond_axe',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_hoe',
    'diamond_leggings',
    'diamond_pickaxe',
    'diamond_shovel',
    'diamond_sword',
    'elytra',
    'fishing_rod',
    'flint_and_steel',
    'golden_axe',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_hoe',
    'golden_leggings',
    'golden_pickaxe',
    'golden_shovel',
    'golden_sword',
    'iron_axe',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_hoe',
    'iron_leggings',
    'iron_pickaxe',
    'iron_shovel',
    'iron_sword',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'mace',
    'netherite_axe',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_hoe',
    'netherite_leggings',
    'netherite_pickaxe',
    'netherite_shovel',
    'netherite_sword',
    'shears',
    'shield',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'stone_sword',
    'trident',
    'turtle_helmet',
    'warped_fungus_on_a_stick',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
    'wooden_sword',
  ],
  multishot: ['crossbow'],
  piercing: ['crossbow'],
  power: ['bow'],
  projectile_protection: [
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'turtle_helmet',
  ],
  protection: [
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'turtle_helmet',
  ],
  punch: ['bow'],
  quick_charge: ['crossbow'],
  respiration: [
    'chainmail_helmet',
    'diamond_helmet',
    'golden_helmet',
    'iron_helmet',
    'leather_helmet',
    'netherite_helmet',
    'turtle_helmet',
  ],
  riptide: ['trident'],
  sharpness: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  silk_touch: [
    'diamond_axe',
    'diamond_hoe',
    'diamond_pickaxe',
    'diamond_shovel',
    'golden_axe',
    'golden_hoe',
    'golden_pickaxe',
    'golden_shovel',
    'iron_axe',
    'iron_hoe',
    'iron_pickaxe',
    'iron_shovel',
    'netherite_axe',
    'netherite_hoe',
    'netherite_pickaxe',
    'netherite_shovel',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
  ],
  smite: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  soul_speed: [
    'chainmail_boots',
    'diamond_boots',
    'golden_boots',
    'iron_boots',
    'leather_boots',
    'netherite_boots',
  ],
  sweeping_edge: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  swift_sneak: [
    'chainmail_leggings',
    'diamond_leggings',
    'golden_leggings',
    'iron_leggings',
    'leather_leggings',
    'netherite_leggings',
  ],
  thorns: [
    'chainmail_chestplate',
    'diamond_chestplate',
    'golden_chestplate',
    'iron_chestplate',
    'leather_chestplate',
    'netherite_chestplate',
  ],
  unbreaking: [
    'bow',
    'brush',
    'carrot_on_a_stick',
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'crossbow',
    'diamond_axe',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_hoe',
    'diamond_leggings',
    'diamond_pickaxe',
    'diamond_shovel',
    'diamond_sword',
    'elytra',
    'fishing_rod',
    'flint_and_steel',
    'golden_axe',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_hoe',
    'golden_leggings',
    'golden_pickaxe',
    'golden_shovel',
    'golden_sword',
    'iron_axe',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_hoe',
    'iron_leggings',
    'iron_pickaxe',
    'iron_shovel',
    'iron_sword',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'mace',
    'netherite_axe',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_hoe',
    'netherite_leggings',
    'netherite_pickaxe',
    'netherite_shovel',
    'netherite_sword',
    'shears',
    'shield',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'stone_sword',
    'trident',
    'turtle_helmet',
    'warped_fungus_on_a_stick',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
    'wooden_sword',
  ],
  vanishing_curse: [
    'bow',
    'brush',
    'carrot_on_a_stick',
    'carved_pumpkin',
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'compass',
    'creeper_head',
    'crossbow',
    'diamond_axe',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_hoe',
    'diamond_leggings',
    'diamond_pickaxe',
    'diamond_shovel',
    'diamond_sword',
    'dragon_head',
    'elytra',
    'fishing_rod',
    'flint_and_steel',
    'golden_axe',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_hoe',
    'golden_leggings',
    'golden_pickaxe',
    'golden_shovel',
    'golden_sword',
    'iron_axe',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_hoe',
    'iron_leggings',
    'iron_pickaxe',
    'iron_shovel',
    'iron_sword',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'mace',
    'netherite_axe',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_hoe',
    'netherite_leggings',
    'netherite_pickaxe',
    'netherite_shovel',
    'netherite_sword',
    'piglin_head',
    'player_head',
    'shears',
    'shield',
    'skeleton_skull',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'stone_sword',
    'trident',
    'turtle_helmet',
    'warped_fungus_on_a_stick',
    'wither_skeleton_skull',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
    'wooden_sword',
    'zombie_head',
  ],
  wind_burst: ['mace'],
}

export const ENCHANTMENT_SUPPORT_ITEMS: Record<string, string[]> = {
  aqua_affinity: [
    'chainmail_helmet',
    'diamond_helmet',
    'golden_helmet',
    'iron_helmet',
    'leather_helmet',
    'netherite_helmet',
    'turtle_helmet',
  ],
  bane_of_arthropods: [
    'diamond_axe',
    'diamond_sword',
    'golden_axe',
    'golden_sword',
    'iron_axe',
    'iron_sword',
    'mace',
    'netherite_axe',
    'netherite_sword',
    'stone_axe',
    'stone_sword',
    'wooden_axe',
    'wooden_sword',
  ],
  binding_curse: [
    'carved_pumpkin',
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'creeper_head',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'dragon_head',
    'elytra',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'piglin_head',
    'player_head',
    'skeleton_skull',
    'turtle_helmet',
    'wither_skeleton_skull',
    'zombie_head',
  ],
  blast_protection: [
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'turtle_helmet',
  ],
  breach: ['mace'],
  channeling: ['trident'],
  density: ['mace'],
  depth_strider: [
    'chainmail_boots',
    'diamond_boots',
    'golden_boots',
    'iron_boots',
    'leather_boots',
    'netherite_boots',
  ],
  efficiency: [
    'diamond_axe',
    'diamond_hoe',
    'diamond_pickaxe',
    'diamond_shovel',
    'golden_axe',
    'golden_hoe',
    'golden_pickaxe',
    'golden_shovel',
    'iron_axe',
    'iron_hoe',
    'iron_pickaxe',
    'iron_shovel',
    'netherite_axe',
    'netherite_hoe',
    'netherite_pickaxe',
    'netherite_shovel',
    'shears',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
  ],
  feather_falling: [
    'chainmail_boots',
    'diamond_boots',
    'golden_boots',
    'iron_boots',
    'leather_boots',
    'netherite_boots',
  ],
  fire_aspect: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'mace',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  fire_protection: [
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'turtle_helmet',
  ],
  flame: ['bow'],
  fortune: [
    'diamond_axe',
    'diamond_hoe',
    'diamond_pickaxe',
    'diamond_shovel',
    'golden_axe',
    'golden_hoe',
    'golden_pickaxe',
    'golden_shovel',
    'iron_axe',
    'iron_hoe',
    'iron_pickaxe',
    'iron_shovel',
    'netherite_axe',
    'netherite_hoe',
    'netherite_pickaxe',
    'netherite_shovel',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
  ],
  frost_walker: [
    'chainmail_boots',
    'diamond_boots',
    'golden_boots',
    'iron_boots',
    'leather_boots',
    'netherite_boots',
  ],
  impaling: ['trident'],
  infinity: ['bow'],
  knockback: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  looting: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  loyalty: ['trident'],
  luck_of_the_sea: ['fishing_rod'],
  lure: ['fishing_rod'],
  mending: [
    'bow',
    'brush',
    'carrot_on_a_stick',
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'crossbow',
    'diamond_axe',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_hoe',
    'diamond_leggings',
    'diamond_pickaxe',
    'diamond_shovel',
    'diamond_sword',
    'elytra',
    'fishing_rod',
    'flint_and_steel',
    'golden_axe',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_hoe',
    'golden_leggings',
    'golden_pickaxe',
    'golden_shovel',
    'golden_sword',
    'iron_axe',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_hoe',
    'iron_leggings',
    'iron_pickaxe',
    'iron_shovel',
    'iron_sword',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'mace',
    'netherite_axe',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_hoe',
    'netherite_leggings',
    'netherite_pickaxe',
    'netherite_shovel',
    'netherite_sword',
    'shears',
    'shield',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'stone_sword',
    'trident',
    'turtle_helmet',
    'warped_fungus_on_a_stick',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
    'wooden_sword',
  ],
  multishot: ['crossbow'],
  piercing: ['crossbow'],
  power: ['bow'],
  projectile_protection: [
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'turtle_helmet',
  ],
  protection: [
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'turtle_helmet',
  ],
  punch: ['bow'],
  quick_charge: ['crossbow'],
  respiration: [
    'chainmail_helmet',
    'diamond_helmet',
    'golden_helmet',
    'iron_helmet',
    'leather_helmet',
    'netherite_helmet',
    'turtle_helmet',
  ],
  riptide: ['trident'],
  sharpness: [
    'diamond_axe',
    'diamond_sword',
    'golden_axe',
    'golden_sword',
    'iron_axe',
    'iron_sword',
    'netherite_axe',
    'netherite_sword',
    'stone_axe',
    'stone_sword',
    'wooden_axe',
    'wooden_sword',
  ],
  silk_touch: [
    'diamond_axe',
    'diamond_hoe',
    'diamond_pickaxe',
    'diamond_shovel',
    'golden_axe',
    'golden_hoe',
    'golden_pickaxe',
    'golden_shovel',
    'iron_axe',
    'iron_hoe',
    'iron_pickaxe',
    'iron_shovel',
    'netherite_axe',
    'netherite_hoe',
    'netherite_pickaxe',
    'netherite_shovel',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
  ],
  smite: [
    'diamond_axe',
    'diamond_sword',
    'golden_axe',
    'golden_sword',
    'iron_axe',
    'iron_sword',
    'mace',
    'netherite_axe',
    'netherite_sword',
    'stone_axe',
    'stone_sword',
    'wooden_axe',
    'wooden_sword',
  ],
  soul_speed: [
    'chainmail_boots',
    'diamond_boots',
    'golden_boots',
    'iron_boots',
    'leather_boots',
    'netherite_boots',
  ],
  sweeping_edge: [
    'diamond_sword',
    'golden_sword',
    'iron_sword',
    'netherite_sword',
    'stone_sword',
    'wooden_sword',
  ],
  swift_sneak: [
    'chainmail_leggings',
    'diamond_leggings',
    'golden_leggings',
    'iron_leggings',
    'leather_leggings',
    'netherite_leggings',
  ],
  thorns: [
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_leggings',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_leggings',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_leggings',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_leggings',
    'turtle_helmet',
  ],
  unbreaking: [
    'bow',
    'brush',
    'carrot_on_a_stick',
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'crossbow',
    'diamond_axe',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_hoe',
    'diamond_leggings',
    'diamond_pickaxe',
    'diamond_shovel',
    'diamond_sword',
    'elytra',
    'fishing_rod',
    'flint_and_steel',
    'golden_axe',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_hoe',
    'golden_leggings',
    'golden_pickaxe',
    'golden_shovel',
    'golden_sword',
    'iron_axe',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_hoe',
    'iron_leggings',
    'iron_pickaxe',
    'iron_shovel',
    'iron_sword',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'mace',
    'netherite_axe',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_hoe',
    'netherite_leggings',
    'netherite_pickaxe',
    'netherite_shovel',
    'netherite_sword',
    'shears',
    'shield',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'stone_sword',
    'trident',
    'turtle_helmet',
    'warped_fungus_on_a_stick',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
    'wooden_sword',
  ],
  vanishing_curse: [
    'bow',
    'brush',
    'carrot_on_a_stick',
    'carved_pumpkin',
    'chainmail_boots',
    'chainmail_chestplate',
    'chainmail_helmet',
    'chainmail_leggings',
    'compass',
    'creeper_head',
    'crossbow',
    'diamond_axe',
    'diamond_boots',
    'diamond_chestplate',
    'diamond_helmet',
    'diamond_hoe',
    'diamond_leggings',
    'diamond_pickaxe',
    'diamond_shovel',
    'diamond_sword',
    'dragon_head',
    'elytra',
    'fishing_rod',
    'flint_and_steel',
    'golden_axe',
    'golden_boots',
    'golden_chestplate',
    'golden_helmet',
    'golden_hoe',
    'golden_leggings',
    'golden_pickaxe',
    'golden_shovel',
    'golden_sword',
    'iron_axe',
    'iron_boots',
    'iron_chestplate',
    'iron_helmet',
    'iron_hoe',
    'iron_leggings',
    'iron_pickaxe',
    'iron_shovel',
    'iron_sword',
    'leather_boots',
    'leather_chestplate',
    'leather_helmet',
    'leather_leggings',
    'mace',
    'netherite_axe',
    'netherite_boots',
    'netherite_chestplate',
    'netherite_helmet',
    'netherite_hoe',
    'netherite_leggings',
    'netherite_pickaxe',
    'netherite_shovel',
    'netherite_sword',
    'piglin_head',
    'player_head',
    'shears',
    'shield',
    'skeleton_skull',
    'stone_axe',
    'stone_hoe',
    'stone_pickaxe',
    'stone_shovel',
    'stone_sword',
    'trident',
    'turtle_helmet',
    'warped_fungus_on_a_stick',
    'wither_skeleton_skull',
    'wooden_axe',
    'wooden_hoe',
    'wooden_pickaxe',
    'wooden_shovel',
    'wooden_sword',
    'zombie_head',
  ],
  wind_burst: ['mace'],
}

export const ENCHANTMENT_WEIGHT: Record<string, number> = {
  binding_curse: 1,
  channeling: 1,
  infinity: 1,
  silk_touch: 1,
  soul_speed: 1,
  swift_sneak: 1,
  thorns: 1,
  vanishing_curse: 1,
  aqua_affinity: 2,
  blast_protection: 2,
  breach: 2,
  depth_strider: 2,
  fire_aspect: 2,
  flame: 2,
  fortune: 2,
  frost_walker: 2,
  impaling: 2,
  looting: 2,
  luck_of_the_sea: 2,
  lure: 2,
  mending: 2,
  multishot: 2,
  punch: 2,
  respiration: 2,
  riptide: 2,
  sweeping_edge: 2,
  wind_burst: 2,
  bane_of_arthropods: 5,
  density: 5,
  feather_falling: 5,
  fire_protection: 5,
  knockback: 5,
  loyalty: 5,
  projectile_protection: 5,
  quick_charge: 5,
  smite: 5,
  unbreaking: 5,
  efficiency: 10,
  piercing: 10,
  power: 10,
  protection: 10,
  sharpness: 10,
}
