export interface Product {
  id: string
  name: string
  brand: string
  article_number?: string
  description: string
  image_url: string
  images?: string[]
  flyer_url?: string
  advantages: string
  attention_points: string
  website_link?: string
  is_archived?: boolean
  is_supplier_novelty?: boolean
  category?: string
  year?: string
  rating?: number
  price?: number
  created_by?: string
  updated_by?: string
  created_at: string
}
