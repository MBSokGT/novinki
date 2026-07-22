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
  rating?: number
  price?: number
  created_by?: string
  updated_by?: string
  created_at: string
}
