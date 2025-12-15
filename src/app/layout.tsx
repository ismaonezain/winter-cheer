import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@coinbase/onchainkit/styles.css';
import './globals.css';
import { Providers } from './providers';
import FarcasterWrapper from "@/components/FarcasterWrapper";

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <html lang="en">
          <head>
            <meta name="base:app_id" content="693d4c85d19763ca26ddc266" />
          </head>
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            <Providers>
      <FarcasterWrapper>
        {children}
      </FarcasterWrapper>
      </Providers>
          </body>
        </html>
      );
}

export const metadata: Metadata = {
        title: "Winter Cheer NFT Collection",
        description: "Mint unique Christmas anime NFTs! AI-generated based on your Farcaster colors. One per FID.",
        other: { "fc:frame": JSON.stringify({"version":"next","imageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/cebef640-7984-454c-9d56-6f98a2828e89-wSmRtGLvZo5vTTLDELB3QwCbJazh2e","button":{"title":"🎄 Mint Your NFT","action":{"type":"launch_frame","name":"Winter Cheer","url":"https://table-only-559.app.ohara.ai","splashImageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/28c3e0b9-f3bb-488b-979f-a67f983a4303-Q4FIoTRKMgKO8nUg4Gd6w6YiDEygpF","splashBackgroundColor":"#1E3A8A"}}}
        ) }
    };
