import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'As variáveis de ambiente do Supabase estão ausentes. ' +
    'Certifique-se de configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  )
}

// Cria o cliente Supabase tipado
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
