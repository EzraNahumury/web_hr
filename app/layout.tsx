import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "HR Portal Login",
  description: "Secure access for your HR workspace",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Script defensif untuk mencegah crash "Cannot read properties of null (reading 'dispatchEvent')"
// yang muncul di iOS Safari ketika halaman direstore dari bfcache atau ketika pushState
// dipatch dari konteks yang tidak valid.
const ROUTER_GUARD_SCRIPT = `
(function(){
  try {
    if (typeof window === 'undefined' || !window.history) return;

    // Reload page bila direstore dari bfcache — state internal Next.js router jadi stale di iOS Safari.
    window.addEventListener('pageshow', function(event) {
      if (event && event.persisted) {
        window.location.reload();
      }
    });

    // Guard History.pushState & replaceState agar tidak crash bila dipanggil dengan konteks null.
    var HProto = window.History && window.History.prototype;
    if (HProto) {
      ['pushState', 'replaceState'].forEach(function(fn) {
        var orig = HProto[fn];
        if (typeof orig !== 'function') return;
        HProto[fn] = function() {
          try {
            return orig.apply(this || window.history, arguments);
          } catch (err) {
            console.warn('History.' + fn + ' guarded:', err);
          }
        };
      });
    }
  } catch (err) {
    console.warn('Router guard init failed:', err);
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <Script id="router-guard" strategy="beforeInteractive">
          {ROUTER_GUARD_SCRIPT}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
