import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Создаем начальный ответ
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Инициализируем Supabase клиент
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Обновляем куки и в запросе, и в ответе одновременно
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. getUser() — это критично. Он не просто берет куку, 
  // а проверяет токен в Supabase Auth и обновляет его, если он протух.
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')

  // 4. Логика редиректов
  if (!user && !isAuthPage) {
    // Если не авторизован и не на странице логина — на вход
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage) {
    // Если авторизован и на логине — на главную
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  // Оптимизированный matcher: пропускаем статику и специфические файлы
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}