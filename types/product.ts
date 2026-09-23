// Коды наличия по данным complexbar.ru; сам текст статуса хранится как есть
// (availability_label) — его и показываем, чтобы совпадать с сайтом.
export type Availability = 'in_stock' | 'out_of_stock' | 'on_order' | 'showroom' | 'other'

export interface ProductVariant {
  name?: string
  image_url: string
  article_number: string
  website_link: string
  availability?: Availability | null
  availability_label?: string | null
  link_broken?: boolean
  price?: number | null
  currency?: string | null
}

export interface Product {
  id: string
  name: string
  brand: string
  article_number?: string
  description: string
  image_url: string
  images?: string[]
  flyer_url?: string
  price_list_url?: string
  advantages: string
  attention_points: string
  website_link?: string
  is_archived?: boolean
  is_supplier_novelty?: boolean
  is_dishwasher_safe?: boolean
  is_microwave_safe?: boolean
  temp_min?: number
  temp_max?: number
  category?: string
  year?: string
  tags?: string
  order_multiple?: string
  variants?: ProductVariant[]
  availability?: Availability | null
  availability_label?: string | null
  link_broken?: boolean
  link_checked_at?: string | null
  site_price?: number | null
  site_currency?: string | null
  rating?: number
  price?: number
  created_by?: string
  updated_by?: string
  bumped_at?: string | null
  created_at: string
}
