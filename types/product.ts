export interface Product {
  id: string
  name: string
  brand: string
  article_number?: string
  description: string
  image_url: string
  images?: string[]
  advantages: string
  attention_points: string
  website_link?: string
  onec_link?: string
  is_archived?: boolean
  category?: string
  rating?: number
  price?: number
  created_at: string
}
