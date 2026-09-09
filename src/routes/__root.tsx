import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() { return <div className="grid min-h-screen place-items-center bg-[#070a12] px-4 text-white"><div className="text-center"><h1 className="text-7xl font-black">404</h1><p className="mt-3 text-slate-500">This Rift doesn't exist.</p><Link to="/" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950">Back to LeagueMate</Link></div></div>; }
function ErrorComponent({error,reset}:{error:Error;reset:()=>void}) { console.error(error); const router=useRouter(); useEffect(()=>{reportLovableError(error,{boundary:"tanstack_root_error_component"});},[error]); return <div className="grid min-h-screen place-items-center bg-[#070a12] px-4 text-white"><div className="max-w-md text-center"><h1 className="text-xl font-bold">Something went wrong.</h1><p className="mt-2 text-sm text-slate-500">Refresh and try again.</p><button onClick={()=>{router.invalidate();reset()}} className="mt-6 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950">Try again</button></div></div>; }

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [
    {charSet:"utf-8"}, {name:"viewport",content:"width=device-width, initial-scale=1"},
    {title:"LeagueMate — Find your next teammate"}, {name:"description",content:"Live League of Legends teammate matchmaking. Find players who are ready to play right now."},
    {property:"og:title",content:"LeagueMate — Find your next teammate"}, {property:"og:description",content:"Live League of Legends teammate matchmaking."}, {property:"og:type",content:"website"},
    {name:"twitter:card",content:"summary_large_image"}
  ], links:[{rel:"stylesheet",href:appCss},{rel:"icon",href:"/favicon.ico",type:"image/x-icon"}]}),
  shellComponent: RootShell, component: RootComponent, notFoundComponent: NotFoundComponent, errorComponent: ErrorComponent,
});
function RootShell({children}:{children:ReactNode}) { return <html lang="en"><head><HeadContent/></head><body>{children}<Scripts/></body></html>; }
function RootComponent() { const {queryClient}=Route.useRouteContext(); return <QueryClientProvider client={queryClient}><Outlet/></QueryClientProvider>; }
