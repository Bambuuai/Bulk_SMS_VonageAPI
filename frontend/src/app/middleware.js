// import { NextResponse } from 'next/server'
// import { useSelector } from "react-redux";
// import { authenticate } from 'auth-provider'
 
// export function middleware(request) {
//   const { auth, username, isAdmin } = useSelector((state) => state.auth);
 
//   // If the user is authenticated, continue as normal
//   if (auth && username && isAdmin) {
//     return NextResponse.next()
//   }
 
//   // Redirect to login page if not authenticated
//   return NextResponse.redirect(new URL('/login', request.url))
// }
 
// export const config = {
//   matcher: '/',
// }